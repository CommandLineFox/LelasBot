import axios from "axios";
import {SlashCommandSubcommandBuilder} from 'discord.js';
import {Config} from "../config/config";

/**
 * Add series options to commands
 * @param cmd The command to add to
 */
export function addSeriesOptions(cmd: SlashCommandSubcommandBuilder) {
    return cmd
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
                .setDescription("Timezone offset (-12 to 14 hrs)")
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
                .setDescription("Max results (>= 1)")
        )
        .addStringOption(opt =>
            opt.setName("order")
                .setDescription("Sort order (asc/desc)")
                .addChoices(
                    { name: "Ascending", value: "asc" },
                    { name: "Descending", value: "desc" }
                )
        );
}

/**
 * Add member filter options to commands
 * @param cmd The command to add to
 */
export function addMemberFilterOptions(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addStringOption(opt =>
            opt.setName("whitelist_members")
                .setDescription("Comma-separated member IDs to whitelist")
        )
        .addStringOption(opt =>
            opt.setName("blacklist_members")
                .setDescription("Comma-separated member IDs to blacklist")
        )
        .addStringOption(opt =>
            opt.setName("whitelist_roles")
                .setDescription("Comma-separated role IDs to whitelist")
        )
        .addStringOption(opt =>
            opt.setName("blacklist_roles")
                .setDescription("Comma-separated role IDs to blacklist")
        );
}

/**
 * Add channel filter options to commands
 * @param cmd The command to add to
 */
export function addChannelFilterOptions(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addStringOption(opt =>
            opt.setName("whitelist_channels")
                .setDescription("Comma-separated channel IDs to whitelist")
        )
        .addStringOption(opt =>
            opt.setName("blacklist_channels")
                .setDescription("Comma-separated channel IDs to blacklist")
        )
        .addStringOption(opt =>
            opt.setName("whitelist_voice_channels")
                .setDescription("Comma-separated voice channel IDs to whitelist")
        )
        .addStringOption(opt =>
            opt.setName("blacklist_voice_channels")
                .setDescription("Comma-separated voice channel IDs to blacklist")
        );
}

/**
 * Add pagination options to commands
 * @param cmd The command to add to
 */
export function addPaginationOptions(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addIntegerOption(opt =>
            opt.setName("page_size")
                .setDescription("Results per page (requires 'page')")
                .setMinValue(1)
        )
        .addIntegerOption(opt =>
            opt.setName("page")
                .setDescription("Page number (requires 'page_size')")
                .setMinValue(1)
        );
}

/**
 * Add select option to commands
 * @param cmd The command to add to
 */
export function addSelectOption(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addStringOption(opt =>
            opt.setName("select")
                .setDescription("Comma-separated Discord IDs to select")
        );
}

/**
 * Add full option to commands
 * @param cmd The command to add to
 */
export function addFullOption(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addBooleanOption(opt =>
            opt.setName("full")
                .setDescription("Include full optional fields?")
        );
}

/**
 * Add bot option to commands
 * @param cmd The command to add to
 */
export function addBotOption(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addBooleanOption(opt =>
            opt.setName("bot")
                .setDescription("Only include bot users?")
        );
}

/**
 * Add required 'stats' option to commands
 * @param cmd The command to add to
 */
export function addRequiredStatsOption(cmd: SlashCommandSubcommandBuilder) {
    return cmd
        .addStringOption(opt =>
            opt.setName("stats")
                .setDescription("Stats to include (text/voice)")
                .setRequired(true)
                .addChoices(
                    { name: "text", value: "text" },
                    { name: "voice", value: "voice" }
                )
        );
}


export type StatbotResult =
    | { success: true; data: unknown }
    | { success: false; error: string };


/**
 * Make an API call to the Statbot API
 * @param context The API call context
 * @return The json body
 */
export async function handleStatbotRequest(context: { group: string; sub: string; guildId: string; getOption: (name: string) => any; }): Promise<StatbotResult> {
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
    const opts = [
        "start", "end", "timezone_offset", "interval", "limit", "order", "bot", "stats",
        "whitelist_members", "blacklist_members", "whitelist_roles", "blacklist_roles",
        "whitelist_channels", "blacklist_channels", "whitelist_voice_channels", "blacklist_voice_channels",
        "by_channel", "by_member", "by_flag", "voice_states", "by_state",
        "whitelist_activities", "blacklist_activities", "by_activity",
        "page_size", "page", "select", "full"
    ];
    for (const opt of opts) {
        const optionValue = getOption(opt);
        const value = (optionValue as any)?.value ?? optionValue;

        if (value !== null && value !== undefined) {
            if (opt.endsWith("s") && (opt.startsWith("whitelist_") || opt.startsWith("blacklist_") || opt === "voice_states" || opt === "select")) {
                const values = String(value).split(',').map(s => s.trim()).filter(s => s.length > 0);
                for (const item of values) {
                    params.append(opt, item);
                }
            } else {
                params.append(opt, value.toString().trim());
            }
        }
    }

    const url = `https://api.statbot.net${endpoint}?${params.toString()}`;
    const token = Config.getInstance().getApiConfig().statbotApiKey;

    try {
        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json"
            },
            timeout: 10000
        });

        const remaining = parseInt(res.headers["x-ratelimit-remaining"] as string);
        const resetIn = parseInt(res.headers["x-ratelimit-reset"] as string);
        const retryAfter = parseInt(res.headers["retry-after"] as string);

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