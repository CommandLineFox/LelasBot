import {Command} from '@sapphire/framework';
import {Subcommand} from "@sapphire/plugin-subcommands";
import {Message, PermissionFlagsBits} from 'discord.js';
import {addSeriesOptions, addBotOption, addMemberFilterOptions, addChannelFilterOptions, addPaginationOptions, addSelectOption, addFullOption, handleStatbotRequest,} from '../../utils/statBotApiUtils';

export class VoiceCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "statbot-voice",
            description: 'Query Statbot voice data',
            detailedDescription: "Query Statbot API data for voice",
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("statbot-voice")
                .setDescription("Query Statbot voice data")
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addBotOption(cmd);
                    addMemberFilterOptions(cmd);
                    addChannelFilterOptions(cmd);
                    return cmd
                        .setName("series")
                        .setDescription("Get voice series data")
                        .addStringOption(opt =>
                            opt.setName("voice_states")
                                .setDescription("Comma-separated voice states to include")
                                .addChoices(
                                    { name: "normal", value: "normal" },
                                    { name: "afk", value: "afk" },
                                    { name: "self_mute", value: "self_mute" },
                                    { name: "self_deaf", value: "self_deaf" },
                                    { name: "server_mute", value: "server_mute" },
                                    { name: "server_deaf", value: "server_deaf" }
                                )
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_channel")
                                .setDescription("Group by channel?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_member")
                                .setDescription("Group by member?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_state")
                                .setDescription("Group by voice state type?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_flag")
                                .setDescription("Group by message flag?")
                        );
                })
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addBotOption(cmd);
                    addMemberFilterOptions(cmd);
                    addChannelFilterOptions(cmd);
                    addPaginationOptions(cmd);
                    addSelectOption(cmd);
                    addFullOption(cmd);
                    return cmd
                        .setName("tops-members")
                        .setDescription("Top voice members")
                        .addStringOption(opt =>
                            opt.setName("voice_states")
                                .setDescription("Comma-separated voice states to include")
                                .addChoices(
                                    { name: "normal", value: "normal" },
                                    { name: "afk", value: "afk" },
                                    { name: "self_mute", value: "self_mute" },
                                    { name: "self_deaf", value: "self_deaf" },
                                    { name: "server_mute", value: "server_mute" },
                                    { name: "server_deaf", value: "server_deaf" }
                                )
                        );
                })
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addBotOption(cmd);
                    addMemberFilterOptions(cmd);
                    addChannelFilterOptions(cmd);
                    addPaginationOptions(cmd);
                    addSelectOption(cmd);
                    addFullOption(cmd);
                    return cmd
                        .setName("tops-channels")
                        .setDescription("Top voice channels")
                        .addStringOption(opt =>
                            opt.setName("voice_states")
                                .setDescription("Comma-separated voice states to include")
                                .addChoices(
                                    { name: "normal", value: "normal" },
                                    { name: "afk", value: "afk" },
                                    { name: "self_mute", value: "self_mute" },
                                    { name: "self_deaf", value: "self_deaf" },
                                    { name: "server_mute", value: "server_mute" },
                                    { name: "server_deaf", value: "server_deaf" }
                                )
                        );
                })
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addBotOption(cmd);
                    addMemberFilterOptions(cmd);
                    addChannelFilterOptions(cmd);
                    return cmd
                        .setName("sums")
                        .setDescription("Total voice stats")
                        .addStringOption(opt =>
                            opt.setName("voice_states")
                                .setDescription("Comma-separated voice states to include")
                                .addChoices(
                                    { name: "normal", value: "normal" },
                                    { name: "afk", value: "afk" },
                                    { name: "self_mute", value: "self_mute" },
                                    { name: "self_deaf", value: "self_deaf" },
                                    { name: "server_mute", value: "server_mute" },
                                    { name: "server_deaf", value: "server_deaf" }
                                )
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_channel")
                                .setDescription("Group by channel?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_member")
                                .setDescription("Group by member?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_state")
                                .setDescription("Group by voice state type?")
                        );
                }), { idHints: [] }
        );
    }

    public override async chatInputRun(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply();

        const group = "voice";
        const sub = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        const result = await handleStatbotRequest({ group, sub, guildId, getOption: (name) => interaction.options.get(name) });

        if (!result.success) {
            await interaction.editReply({ content: `${result.error}` });
            return;
        }

        const buffer = Buffer.from(JSON.stringify(result.data, null, 2), "utf-8");
        await interaction.editReply({
            content: `Here's your Statbot data for \`${group}/${sub}\``,
            files: [{ attachment: buffer, name: `${group}-${sub}.json` }]
        });
    }

    public override async messageRun(message: Message): Promise<void> {
        const args = message.content.trim().split(/\s+/);
        if (args.length < 2) {
            await message.reply("Usage: `!statbot-voice <sub> [key=value ...]`");
            return;
        }

        const [, sub, ...optionArgs] = args;
        const group = "voice";

        const options: Record<string, string> = {};
        for (const arg of optionArgs) {
            const [key, ...rest] = arg.split("=");
            if (!key || !rest.length) continue;
            options[key] = rest.join("=");
        }

        const result = await handleStatbotRequest({ group, sub, guildId: message.guildId!, getOption: (name) => options[name] });

        if (!result.success) {
            await message.reply(`${result.error}`);
            return;
        }

        const buffer = Buffer.from(JSON.stringify(result.data, null, 2), "utf-8");
        await message.reply({
            content: `Here's your Statbot data for \`${group}/${sub}\``,
            files: [{ attachment: buffer, name: `${group}-${sub}.json` }]
        });
    }
}