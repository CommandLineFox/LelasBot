import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {MessageFlags, StringSelectMenuBuilder, ActionRowBuilder, StringSelectMenuInteraction, PermissionFlagsBits} from 'discord.js';
import {GuildService} from '../../services/guildService';
import {CustomResponse} from '../../types/customResponse';

export class ChannelCommand extends Command {
    private guildService = new GuildService();

    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'channel',
            description: 'Manage tracked YouTube channels',
            detailedDescription: 'Add, remove, clear, or choose the current YouTube channel for this guild',
            runIn: CommandOptionsRunTypeEnum.GuildText,
            preconditions: ['UptimeCheck'],
            requiredUserPermissions: PermissionFlagsBits.ManageGuild
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName(this.name)
                .setDescription(this.description)
                .addSubcommand(cmd =>
                    cmd.setName('add')
                        .setDescription('Add a YouTube channel')
                        .addStringOption(opt => opt.setName('id').setDescription('YouTube channel ID').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('remove')
                        .setDescription('Remove a tracked channel')
                        .addStringOption(opt => opt.setName('id').setDescription('YouTube channel ID').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('clear')
                        .setDescription('Clear all tracked channels'))
                .addSubcommand(cmd =>
                    cmd.setName('current')
                        .setDescription('Choose the current channel from a dropdown'))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();
        let result: CustomResponse = { success: false, message: 'Unknown command.' };

        switch (sub) {
            case 'add': {
                const ytId = interaction.options.getString('id', true);
                result = await this.guildService.addChannel(interaction.guildId!, ytId);
                break;
            }
            case 'remove': {
                const ytId = interaction.options.getString('id', true);
                result = await this.guildService.removeChannel(interaction.guildId!, ytId);
                break;
            }
            case 'clear': {
                result = await this.guildService.clearChannels(interaction.guildId!);
                break;
            }
            case 'current': {
                const channels = await this.guildService.getChannels(interaction.guildId!);
                if (!channels || channels.length === 0) {
                    await interaction.editReply({ content: 'No channels are tracked yet.' });
                    return;
                }

                const menu = new StringSelectMenuBuilder()
                    .setCustomId('channel-current')
                    .setPlaceholder('Select a channel to set as current')
                    .addOptions(channels.map(c => ({
                        label: c.channelId,
                        value: c.channelId
                    })));

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

                await interaction.editReply({ content: 'Choose the current channel:', components: [row] });

                try {
                    const choice = await interaction.channel!.awaitMessageComponent({
                        filter: (i) => i.customId === 'channel-current' && i.user.id === interaction.user.id,
                        time: 60_000
                    }) as StringSelectMenuInteraction;

                    const chosen = choice.values[0];
                    await this.guildService.setCurrentChannel(interaction.guildId!, chosen);

                    await choice.update({ content: `Set current channel to **${chosen}**.`, components: [] });
                } catch {
                    await interaction.editReply({ content: 'Selection timed out.', components: [] });
                }
                return;
            }
        }

        await interaction.editReply({ content: result.message });
    }
}