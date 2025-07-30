import {Command} from '@sapphire/framework';
import {Subcommand} from "@sapphire/plugin-subcommands";
import {Message, PermissionFlagsBits} from 'discord.js';
import {addSeriesOptions, addMemberFilterOptions, addPaginationOptions, addSelectOption, handleStatbotRequest,} from '../../utils/statBotApiUtils';

export class ActivitiesCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "statbot-activities",
            description: 'Query Statbot activity data',
            detailedDescription: "Query Statbot API data for activities",
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("statbot-activities")
                .setDescription("Query Statbot activity data")
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addMemberFilterOptions(cmd);
                    return cmd
                        .setName("series")
                        .setDescription("Activity series data")
                        .addStringOption(opt =>
                            opt.setName("whitelist_activities")
                                .setDescription("Comma-separated activity IDs to whitelist")
                        )
                        .addStringOption(opt =>
                            opt.setName("blacklist_activities")
                                .setDescription("Comma-separated activity IDs to blacklist")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_activity")
                                .setDescription("Group by activity?")
                        )
                        .addBooleanOption(opt =>
                            opt.setName("by_member")
                                .setDescription("Group by member?")
                        );
                })
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    addMemberFilterOptions(cmd);
                    addPaginationOptions(cmd);
                    addSelectOption(cmd);
                    return cmd
                        .setName("tops")
                        .setDescription("Top activities")
                        .addStringOption(opt =>
                            opt.setName("whitelist_activities")
                                .setDescription("Comma-separated activity IDs to whitelist")
                        )
                        .addStringOption(opt =>
                            opt.setName("blacklist_activities")
                                .setDescription("Comma-separated activity IDs to blacklist")
                        );
                }), { idHints: [] }
        );
    }

    public override async chatInputRun(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply();

        const group = "activities";
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
            await message.reply("Usage: `!statbot-activities <sub> [key=value ...]`");
            return;
        }

        const [, sub, ...optionArgs] = args;
        const group = "activities";

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