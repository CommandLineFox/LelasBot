import {Config} from "../config/config";

const YOUTUBE_API_KEY = Config.getInstance().getApiConfig().youtubeApiKey;

/**
 * Check the live status of a video.
 * Uses `videos.list` (1 unit).
 *
 * @param videoId YouTube video ID
 * @returns "live" if currently streaming, "upcoming" if scheduled, "none" otherwise
 */
export async function getVideoLiveStatus(videoId: string): Promise<"live" | "upcoming" | "none"> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
        return "none";
    }

    const data = await res.json() as any;
    const item = data.items?.[0];

    if (!item) return "none";

    const broadcastStatus = item.snippet?.liveBroadcastContent;

    if (broadcastStatus === "live") {
        return "live";
    }

    if (broadcastStatus === "upcoming") {
        return "upcoming";
    }

    return "none";
}