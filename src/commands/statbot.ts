import {Command, container} from '@sapphire/framework';
import {Subcommand} from "@sapphire/plugin-subcommands";
import axios from "axios";
import {Message, PermissionFlagsBits} from 'discord.js';
import {Config} from "../config/config";

type StatbotResult =
    | { success: true; data: unknown }
    | { success: false; error: string };

export class StatBotCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ping",
            description: 'Check if the bot is responsive',
            detailedDescription: "Check if the bot is responsive",
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild]
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("statbot")
                .setDescription("Query Statbot API data")
                .addSubcommandGroup(group =>
                    group
                        .setName("messages")
                        .setDescription("Query message stats")
                        .addSubcommand(cmd =>
                            cmd
                                .setName("series")
                                .setDescription("Get message series data")
                                .addIntegerOption(opt =>
                                    opt.setName("start")
                                        .setDescription("Start timestamp (ms)")
                                )
                                .addIntegerOption(opt =>
                                    opt.setName("end")
                                        .setDescription("End timestamp (ms)")
                                )
                                .addIntegerOption(opt =>
                                    opt.setName("timezone_offset")
                                        .setDescription("Timezone offset in hours")
                                )
                                .addStringOption(opt =>
                                    opt.setName("interval")
                                        .setDescription("Interval: hour/day/week/month")
                                        .addChoices(
                                            { name: "hour", value: "hour" },
                                            { name: "day", value: "day" },
                                            { name: "week", value: "week" },
                                            { name: "month", value: "month" }
                                        )
                                )
                                .addIntegerOption(opt =>
                                    opt.setName("limit")
                                        .setDescription("Max number of results")
                                )
                                .addStringOption(opt =>
                                    opt.setName("order")
                                        .setDescription("Sort order")
                                        .addChoices(
                                            { name: "Ascending", value: "asc" },
                                            { name: "Descending", value: "desc" }
                                        )
                                )
                                .addBooleanOption(opt =>
                                    opt.setName("bot")
                                        .setDescription("Only bot users?")
                                )
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("tops-members")
                                .setDescription("Top message members")
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("sums")
                                .setDescription("Total message counts")
                        )
                )
                .addSubcommandGroup(group =>
                    group
                        .setName("voice")
                        .setDescription("Query voice stats")
                        .addSubcommand(cmd =>
                            cmd
                                .setName("series")
                                .setDescription("Get voice series data")
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("tops-members")
                                .setDescription("Top voice members")
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("sums")
                                .setDescription("Total voice stats")
                        )
                )
                .addSubcommandGroup(group =>
                    group
                        .setName("activities")
                        .setDescription("Query activity stats")
                        .addSubcommand(cmd =>
                            cmd
                                .setName("series")
                                .setDescription("Activity series data")
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("tops")
                                .setDescription("Top activities")
                        )
                )
                .addSubcommandGroup(group =>
                    group
                        .setName("members")
                        .setDescription("Query member stats")
                        .addSubcommand(cmd =>
                            cmd
                                .setName("counts")
                                .setDescription("Members with counts")
                        )
                        .addSubcommand(cmd =>
                            cmd
                                .setName("counts-series")
                                .setDescription("Series counts of members")
                                .addStringOption(opt =>
                                    opt.setName("stats")
                                        .setDescription("Stats to include")
                                        .setRequired(true)
                                        .addChoices(
                                            { name: "text", value: "text" },
                                            { name: "voice", value: "voice" }
                                        )
                                )
                        )
                )
                .addSubcommandGroup(group =>
                    group
                        .setName("channels")
                        .setDescription("Query channel stats")
                        .addSubcommand(cmd =>
                            cmd
                                .setName("counts-series")
                                .setDescription("Series counts of channels")
                                .addStringOption(opt =>
                                    opt.setName("stats")
                                        .setDescription("Stats to include")
                                        .setRequired(true)
                                        .addChoices(
                                            { name: "text", value: "text" },
                                            { name: "voice", value: "voice" }
                                        )
                                )
                        )
                ), { idHints: ["1400062238710169684"] }
        );
    }

    public override async chatInputRun(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply();

        const group = interaction.options.getSubcommandGroup(true);
        const sub = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        const result = await this.handleStatbotRequest({ group, sub, guildId, getOption: (name) => interaction.options.get(name) });

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
        if (args.length < 3) {
            await message.reply("Usage: `!statbot <group> <sub> [key=value ...]`");
            return;
        }

        const [, group, sub, ...optionArgs] = args;

        const options: Record<string, string> = {};
        for (const arg of optionArgs) {
            const [key, ...rest] = arg.split("=");
            if (!key || !rest.length) continue;
            options[key] = rest.join("=");
        }

        const result = await this.handleStatbotRequest({ group, sub, guildId: message.guildId!, getOption: (name) => options[name] });

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

    /**
     * Make an API call to the statbot API
     * @param context The API call context
     * @return The json body
     */
    private async handleStatbotRequest(context: { group: string; sub: string; guildId: string; getOption: (name: string) => any; }): Promise<StatbotResult> {
        const { group, sub, guildId, getOption } = context;

        const endpointMap: Record<string, Record<string, string>> = {
            messages: {
                series: `/v1/guilds/${guildId}/messages`,
                "tops-members": `/v1/guilds/${guildId}/messages/tops/members`,
                sums: `/v1/guilds/${guildId}/messages/sums`
            },
            voice: {
                series: `/v1/guilds/${guildId}/voice`,
                "tops-members": `/v1/guilds/${guildId}/voice/tops/members`,
                sums: `/v1/guilds/${guildId}/voice/sums`
            },
            activities: {
                series: `/v1/guilds/${guildId}/activities`,
                tops: `/v1/guilds/${guildId}/activities/tops/activities`
            },
            members: {
                counts: `/v1/guilds/${guildId}/counts/members`,
                "counts-series": `/v1/guilds/${guildId}/counts/members/series`
            },
            channels: {
                "counts-series": `/v1/guilds/${guildId}/counts/channels/series`
            }
        };

        const endpoint = endpointMap[group]?.[sub];
        if (!endpoint) {
            return { success: false, error: `Unknown endpoint for group: ${group}, sub: ${sub}` };
        }

        const params = new URLSearchParams();
        const opts = ["start", "end", "timezone_offset", "interval", "limit", "order", "bot", "stats"];
        for (const opt of opts) {
            const optionValue = getOption(opt);
            const value = (optionValue as any)?.value ?? optionValue;

            if (value !== null && value !== undefined) {
                params.append(opt, value.toString().trim());
            }
        }

        const url = `https://api.statbot.net${endpoint}?${params.toString()}`;
        const token = Config.getInstance().getApiConfig().statbotApiKey;

        container.logger.info(`Making Statbot API request: ${url}`);

        try {
            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json"
                },
                timeout: 10000
            });

            const remaining = parseInt(res.headers["x-ratelimit-remaining"]);
            const resetIn = parseInt(res.headers["x-ratelimit-reset"]);
            const retryAfter = parseInt(res.headers["retry-after"]);

            if (res.status === 429 || remaining === 0) {
                const wait = retryAfter || resetIn || "a few";
                return { success: false, error: `Rate limited. Please wait ${wait} seconds before retrying.` };
            }

            return { success: true, data: res.data };

        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                const status = err.response?.status ?? "unknown";
                const message = err.response?.data?.message || err.message;
                return { success: false, error: `Error ${status}: ${message}` };
            }
            return { success: false, error: `Unexpected error: ${err.message}` };
        }
    }
}