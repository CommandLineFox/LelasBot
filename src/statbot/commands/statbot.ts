import {Command, CommandOptionsRunTypeEnum} from "@sapphire/framework";
import {AttachmentBuilder, PermissionFlagsBits} from "discord.js";
import {runApiRequest, runFullCheck} from "../../utils/statbotUtils";

export class StatbotCommand extends Command {

    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: 'statbot',
            description: 'Statbot API tests',
            detailedDescription: 'Run a specific statbot API request or run a full collection of requests',
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
                    cmd.setName('test')
                        .setDescription('Run a specific statbot API request')
                        .addStringOption(opt =>
                            opt.setName('request')
                                .setDescription('Statbot API request')
                                .setRequired(true)))
                .addSubcommand(cmd =>
                    cmd.setName('full')
                        .setDescription('Run a full collection of statbot API requests')))
    }

    public override async chatInputRun(interaction: Command.ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case "test": {
                const request = interaction.options.getString('request', true);
                const response = await runApiRequest(request, interaction.guildId!);

                const data = await response.json();
                const jsonString = JSON.stringify(data, null, 2);

                if (jsonString.length > 500) {
                    const file = new AttachmentBuilder(Buffer.from(jsonString, 'utf-8'), {
                        name: 'statbot-response.json',
                    });
                    await interaction.editReply({ content: 'Response too long, sending as file:', files: [file] });
                } else {
                    await interaction.editReply(`\`\`\`json\n${jsonString}\n\`\`\``);
                }

                break;
            }
            case "full": {
                await runFullCheck(interaction);
                break;
            }
        }
    }
}