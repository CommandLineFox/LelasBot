import {Config} from "../config/config";
import {BotClient} from "../types/client";
import {YouTubePlaylistResponse, YouTubeVideosResponse} from "../types/data";

const YOUTUBE_API_KEY = Config.getInstance().getApiConfig().youtubeApiKey;

/**
 * Get or cache the uploads playlist ID for a channel.
 * This only costs 1 unit via `channels.list?part=contentDetails`.
 * The result is cached in the DB for efficiency.
 *
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
async function getUploadsPlaylistId(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    let playlistId = await client.getGuildService().getUploadsPlaylist(guildId, channelId);
    if (playlistId) {
        return playlistId;
    }

    const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
        return null;
    }

    const data = await res.json() as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] };
    playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
    if (playlistId) {
        await client.getGuildService().setUploadsPlaylist(guildId, channelId, playlistId);
    }

    return playlistId;
}

/**
 * Get the latest upload video ID from a channel’s uploads playlist.
 * Uses `playlistItems.list` (1 unit).
 *
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
async function getLatestUploadId(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    const playlistId = await getUploadsPlaylistId(client, guildId, channelId);
    if (!playlistId) {
        return null;
    }

    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=1&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
        return null;
    }

    const data = await res.json() as YouTubePlaylistResponse;
    return data.items?.[0]?.contentDetails?.videoId ?? null;
}

/**
 * Check the live status of a video.
 * Uses `videos.list` (1 unit).
 *
 * @param videoId YouTube video ID
 * @returns "live" if currently streaming, "upcoming" if scheduled, "none" otherwise
 */
async function getVideoLiveStatus(videoId: string): Promise<"live" | "upcoming" | "none"> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
        return "none";
    }

    const data = await res.json() as YouTubeVideosResponse;
    const details = data.items?.[0]?.liveStreamingDetails;
    if (!details) {
        return "none";
    }

    if (details.actualStartTime && !details.actualEndTime) {
        return "live";
    }

    if (details.scheduledStartTime && !details.actualStartTime) {
        return "upcoming";
    }

    return "none";
}

/**
 * Check whether the channel is already being checked.
 *
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
function isAlreadyChecking(client: BotClient, guildId: string, channelId: string): boolean {
    return client.getCurrentChecks().get(guildId)?.get(channelId) ?? false;
}

/**
 * Mark a channel as being checked.
 *
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
function markChecking(client: BotClient, guildId: string, channelId: string) {
    const guildMap = client.getCurrentChecks().get(guildId) ?? new Map<string, boolean>();
    guildMap.set(channelId, true);
    client.getCurrentChecks().set(guildId, guildMap);
}

/**
 * Unmark a channel as being checked.
 *
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
 * Get the latest non-livestream video of a channel.
 * Uses `playlistItems.list` for uploads (1 unit).
 *
 * @param client The bot client
 * @param guildId Discord guild ID
 * @param channelId YouTube channel ID
 */
export async function getLatestVideo(client: BotClient, guildId: string, channelId: string): Promise<string | null> {
    if (isAlreadyChecking(client, guildId, channelId)) {
        return null;
    }

    markChecking(client, guildId, channelId);

    try {
        const videoId = await getLatestUploadId(client, guildId, channelId);
        if (!videoId) {
            return null;
        }

        const lastUpload = await client.getGuildService().getLastUpload(guildId, channelId);
        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);

        if (videoId === lastUpload || videoId === lastLive) {
            return null;
        }

        const status = await getVideoLiveStatus(videoId);
        if (status !== "none") {
            return null;
        }

        await client.getGuildService().setLastUpload(guildId, channelId, videoId);
        return videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}

/**
 * Get the latest currently live stream of a channel.
 * Uses `playlistItems.list` + `videos.list` (1 unit each).
 *
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
        const videoId = await getLatestUploadId(client, guildId, channelId);
        if (!videoId) {
            return null;
        }

        const status = await getVideoLiveStatus(videoId);
        if (status !== "live") {
            return null;
        }

        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);
        if (videoId === lastLive) {
            return null;
        }

        const lastScheduled = await client.getGuildService().getLastScheduledStream(guildId, channelId);
        if (videoId === lastScheduled) {
            await client.getGuildService().clearLastScheduledStream(guildId, channelId);
        }

        await client.getGuildService().setLastLive(guildId, channelId, videoId);
        return videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}

/**
 * Get the latest scheduled (upcoming) stream of a channel.
 * Uses `playlistItems.list` + `videos.list` (1 unit each).
 *
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
        const videoId = await getLatestUploadId(client, guildId, channelId);
        if (!videoId) {
            return null;
        }

        const status = await getVideoLiveStatus(videoId);
        if (status !== "upcoming") {
            return null;
        }

        const lastScheduled = await client.getGuildService().getLastScheduledStream(guildId, channelId);
        const lastLive = await client.getGuildService().getLastLive(guildId, channelId);

        if (videoId === lastScheduled || videoId === lastLive) {
            return null;
        }

        await client.getGuildService().setLastScheduledStream(guildId, channelId, videoId);
        return videoId;
    } finally {
        unmarkChecking(client, guildId, channelId);
    }
}