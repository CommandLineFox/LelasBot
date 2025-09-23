import {Command, CommandOptionsRunTypeEnum} from '@sapphire/framework';
import {MessageFlags} from 'discord.js';
import {GuildService} from '../../services/guildService';
import {CustomResponse} from '../../types/customResponse';

export class LiveCommand extends Command {
    private guildService = new GuildService();

    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'live',
            description: 'Configure live alerts for a YouTube channel',
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
                    cmd.setName('enable')
                        .setDescription('Enable/disable live alerts')
                        .addStringOption(o => o.setName('id').setDescription('YouTube channel ID').setRequired(true))
                        .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('channel')
                        .setDescription('Set Discord channel for live alerts')
                        .addStringOption(o => o.setName('id').setDescription('YouTube channel ID').setRequired(true))
                        .addChannelOption(o => o.setName('discord').setDescription('Discord channel').setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('roles')
                        .setDescription('Set mention roles for live alerts')
                        .addStringOption(o => o.setName('id').setDescription('YouTube channel ID').setRequired(true))
                        .addStringOption(o => o.setName('roles').setDescription('Comma separated role IDs').setRequired(true)))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();
        let result: CustomResponse = { success: false, message: 'Unknown option.' };

        const guildId = interaction.guildId!;
        if (sub === 'enable') {
            result = await this.guildService.setLiveEnabled(guildId, interaction.options.getString('id', true), interaction.options.getBoolean('enabled', true));
        } else if (sub === 'channel') {
            result = await this.guildService.setLiveDiscordChannelId(guildId, interaction.options.getString('id', true), interaction.options.getChannel('discord', true).id);
        } else if (sub === 'roles') {
            const roles = interaction.options.getString('roles', true).split(',').map(r => r.trim());
            result = await this.guildService.setLiveMentionRoleIds(guildId, interaction.options.getString('id', true), roles);
        }

        await interaction.editReply({ content: result.message });
    }
}