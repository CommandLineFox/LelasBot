import {CommandInteraction} from "discord.js";
import {Config} from "../config/config";

const STATBOT_API_KEY = Config.getInstance().getApiConfig().statbotApiKey;

/**
 * Run a specific statbot API request
 * @param url The url to run
 * @param guildId ID of the guild
 */
export async function runApiRequest(url: string, guildId: string): Promise<Response> {
    const isFullUrl = url.startsWith("http://") || url.startsWith("https://");
    const requestUrl = isFullUrl ? url : `https://api.statbot.net/v1/guilds/${guildId}/${url}`;

    const response = await fetch(requestUrl, {
        headers: {
            "Authorization": `Bearer ${STATBOT_API_KEY}`,
            "Content-Type": "application/json",
        },
    });

    return response;
}

/**
 * Run a full list of basic statbot API requests for general checks sake
 * @param interaction The interaction to edit to
 */
export async function runFullCheck(interaction: CommandInteraction): Promise<void> {
    const urls = [
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/series?by_member=true&by_channel=true&by_flag=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/series?interval=hour&order=asc",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/series?whitelist_members[]=399624330268508162&whitelist_roles[]=1123592030120063027&whitelist_channels[]=1123604393497985054",

        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/series?by_member=true&by_channel=true&by_state=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/series?voice_states[]=self_mute",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/series?whitelist_voice_channels[]=1123604393497985054",

        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/series?by_member=true&by_activity=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/series?whitelist_activities[]=1",

        "https://api.statbot.net/v1/guilds/1123334635145936986/membercounts/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/membercounts/series?interval=week&order=desc",

        "https://api.statbot.net/v1/guilds/1123334635145936986/statuses/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/statuses/series?interval=month&order=asc",

        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members/series?stats[]=text&stats[]=voice",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members/series?stats[]=voice&whitelist_members[]=399624330268508162",

        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/channels/series?stats[]=text&stats[]=voice",

        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/sums",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/sums?whitelist_channels[]=1123604393497985054",

        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/sums",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/sums?voice_states[]=afk",

        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members?whitelist_roles[]=1123592030120063027",

        "https://api.statbot.net/v1/guilds/1123334635145936986/channels/1123604393497985054",

        "https://api.statbot.net/v1/guilds/1123334635145936986/channels",

        "https://api.statbot.net/v1/activities",

        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/tops/activities",
        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/tops/activities?page=1&page_size=50",

        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/members",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/members?full=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/members?whitelist_members[]=399624330268508162",

        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/channels",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/channels?full=true",

        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/members",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/members?full=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/members?voice_states[]=server_mute",

        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/channels",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/channels?full=true"
    ];

    let successfulUrlCount = 0;
    const failedUrls = [];

    for (const [index, url] of urls.entries()) {
        await interaction.editReply(`Running request ${index + 1} of ${urls.length}...`);
        const response = await runApiRequest(url, interaction.guildId!);

        if (!response.ok) {
            failedUrls.push(url);
        } else {
            successfulUrlCount++;
        }

        await new Promise(res => setTimeout(res, 5000));
    }

    await interaction.editReply(`Finished running ${successfulUrlCount} requests. Failed requests: ${failedUrls.length !== 0 ? failedUrls.join(", ") : "None"}`);
}