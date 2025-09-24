import {Config} from "../config/config";
import {BotClient} from "../types/client";
import {YouTubeSearchItem, YouTubeSearchResponse} from "../types/data";

const YOUTUBE_API_KEY = Config.getInstance().getApiConfig().youtubeApiKey;

/**
 * Fetch the YouTube data
 * @param channelId YouTube channel ID
 * @param type Type of check to make
 */
async function fetchYouTubeData(channelId: string, type: 'video' | 'live' | 'upcoming'): Promise<YouTubeSearchItem | null> {
    const maxResults = 1;

    let url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet&order=date&maxResults=${maxResults}`;

    if (type === 'live') {
        url += '&eventType=live&type=video';
    } else if (type === 'upcoming') {
        url += '&eventType=upcoming&type=video';
    } else {
        url += '&type=video';
    }

    console.log(url);
    const res = await fetch(url);
    console.log(res);
    if (!res.ok) {
        return null;
    }

    const data = await res.json() as YouTubeSearchResponse;
    console.log(data);
    return data.items?.[0] ?? null;
}

/**
 * Check whether the channel as being currently checked
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
function isAlreadyChecking(client: BotClient, guildId: string, channelId: string): boolean {
    return client.getCurrentChecks().get(guildId)?.get(channelId) ?? false;
}

/**
 * Mark the channel as being currently checked
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
function markChecking(client: BotClient, guildId: string, channelId: string) {
    const guildMap = client.getCurrentChecks().get(guildId) ?? new Map();
    guildMap.set(channelId, true);
    client.getCurrentChecks().set(guildId, guildMap);
}

/**
 * Unmark the channel as being currently checked
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
function unmarkChecking(client: BotClient, guildId: string, channelId: string) {
    const guildMap = client.getCurrentChecks().get(guildId);
    if (!guildMap) {
        return;
    }

    guildMap.delete(channelId);
    if (guildMap.size === 0) {
        client.getCurrentChecks().delete(guildId);
    }
}

/**
 * Get the latest video of a channel
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
export async function getLatestVideo(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    if (isAlreadyChecking(client, guildId, channelId)) return null;
    markChecking(client, guildId, channelId);

    try {
        const video = await fetchYouTubeData(channelId, 'video');
        if (!video) {
            return null;
        }

        const lastUpload = await client.getGuildService().getLastUpload(guildId, channelId);
        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);

        if (video.id.videoId === lastUpload || video.id.videoId === lastLive) {
            return null;
        }

        await client.getGuildService().setLastUpload(guildId, channelId, video.id.videoId);
        return video.id.videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}

/**
 * Get the latest stream of a channel
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
export async function getLatestStream(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    if (isAlreadyChecking(client, guildId, channelId)) {
        return null;
    }

    markChecking(client, guildId, channelId);

    try {
        const live = await fetchYouTubeData(channelId, 'live');
        if (!live) {
            return null;
        }

        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);
        const lastScheduled = await client.getGuildService().getLastScheduledStream(guildId, channelId);

        if (live.id.videoId === lastLive) {
            return null;
        }

        if (live.id.videoId === lastScheduled) {
            await client.getGuildService().clearLastScheduledStream(guildId, channelId);
        }

        await client.getGuildService().setLastLive(guildId, channelId, live.id.videoId);
        return live.id.videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}

/**
 * Get the latest scheduled stream of a channel
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
export async function getLatestScheduledStream(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    if (isAlreadyChecking(client, guildId, channelId)) {
        return null;
    }

    markChecking(client, guildId, channelId);

    try {
        const upcoming = await fetchYouTubeData(channelId, 'upcoming');
        if (!upcoming) {
            return null;
        }

        const lastScheduled = await client.getGuildService().getLastScheduledStream(guildId, channelId);
        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);

        if (upcoming.id.videoId === lastScheduled || upcoming.id.videoId === lastLive) {
            return null;
        }

        await client.getGuildService().setLastScheduledStream(guildId, channelId, upcoming.id.videoId);
        return upcoming.id.videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}