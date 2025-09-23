import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {MessageFlags} from 'discord.js';
import {GuildService} from '../../services/guildService';
import {CustomResponse} from '../../types/customResponse';

export class ChannelCommand extends Command {
    private guildService = new GuildService();

    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'channel',
            description: 'Manage tracked YouTube channels',
            detailedDescription: 'Add or remove tracked YouTube channels for this guild',
            runIn: CommandOptionsRunTypeEnum.GuildText,
            preconditions: ['UptimeCheck']
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
                        .addStringOption(opt => opt.setName('id').setDescription('YouTube channel ID').setRequired(true))
                        .addChannelOption(opt => opt.setName('discord').setDescription('Discord channel for notifications').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('remove')
                        .setDescription('Remove a tracked channel')
                        .addStringOption(opt => opt.setName('id').setDescription('YouTube channel ID').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('clear')
                        .setDescription('Clear all tracked channels'))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        let result: CustomResponse = { success: false, message: 'Unknown command.' };

        if (sub === 'add') {
            const ytId = interaction.options.getString('id', true);
            const discordChannel = interaction.options.getChannel('discord', true);
            result = await this.guildService.addChannel(interaction.guildId!, {
                channelId: ytId,
                uploadDiscordChannelId: discordChannel.id,
                liveDiscordChannelId: discordChannel.id,
                scheduleDiscordChannelId: discordChannel.id
            });
        } else if (sub === 'remove') {
            const ytId = interaction.options.getString('id', true);
            result = await this.guildService.removeChannel(interaction.guildId!, ytId);
        } else if (sub === 'clear') {
            result = await this.guildService.clearChannels(interaction.guildId!);
        }

        await interaction.editReply({ content: result.message });
    }
}