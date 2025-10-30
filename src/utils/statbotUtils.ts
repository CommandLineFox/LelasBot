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
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/series?by_member=true&by_channel=true&by_flag=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/series?by_member=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/membercounts/series",
        "https://api.statbot.net/v1/guilds/1123334635145936986/statuses/series?limit=2",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members/series?stats[]=text&stats[]=voice",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/channels/series?stats[]=text",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/sums",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/sums",
        "https://api.statbot.net/v1/activities",
        "https://api.statbot.net/v1/guilds/1123334635145936986/channels/1123604352641273977",
        "https://api.statbot.net/v1/guilds/1123334635145936986/channels",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/channels/series?stats[]=text&stats[]=voice",
        "https://api.statbot.net/v1/guilds/1123334635145936986/counts/members/series?stats[]=text",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/members?full=true&blacklist_roles[]=1123334635145936986",
        "https://api.statbot.net/v1/guilds/1123334635145936986/messages/tops/channels?full=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/members",
        "https://api.statbot.net/v1/guilds/1123334635145936986/voice/tops/channels?full=true",
        "https://api.statbot.net/v1/guilds/1123334635145936986/activities/tops/activities",
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