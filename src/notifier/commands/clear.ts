import {Command, CommandOptionsRunTypeEnum} from "@sapphire/framework";
import {MessageFlags, PermissionFlagsBits} from "discord.js";
import {GuildService} from "../../services/guildService";
import {CustomResponse} from "../../types/customResponse";

export class ClearCommand extends Command {
    private guildService = new GuildService();

    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'clear',
            description: 'Reset the state of last seen urls',
            detailedDescription: 'Reset the state of last seen urls',
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
                    cmd.setName('upload')
                        .setDescription('Reset the last upload url for the current channel'))
                .addSubcommand(cmd =>
                    cmd.setName('live')
                        .setDescription('Reset the last live url for the current channel'))
                .addSubcommand(cmd =>
                    cmd.setName('scheduled')
                        .setDescription("Reset the last scheduled url for the current channel"))
        );
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();
        let result: CustomResponse = { success: false, message: 'Unknown command.' };


        const currentId = await this.guildService.getCurrentChannel(interaction.guildId!);
        if (!currentId) {
            await interaction.editReply({ content: 'No current channel set. Use `/channel current` first.' });
            return;
        }

        switch (sub) {
            case 'upload': {
                result = await this.guildService.clearLastUpload(interaction.guildId!, currentId);
                break;
            }
            case 'live': {
                result = await this.guildService.clearLastLive(interaction.guildId!, currentId);
                break;
            }
            case 'scheduled': {
                result = await this.guildService.clearLastScheduledStream(interaction.guildId!, currentId);
                break;
            }
        }

        await interaction.editReply({ content: result.message });
    }
}