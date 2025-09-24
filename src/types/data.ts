/**
 * Represents a YouTube video from playlistItems.list
 */
export interface YouTubePlaylistItem {
    contentDetails: {
        videoId: string;
        videoPublishedAt: string;
    };
    snippet?: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails?: {
            [key: string]: { url: string; width?: number; height?: number };
        };
    };
}

/**
 * Response from playlistItems.list
 */
export interface YouTubePlaylistResponse {
    items?: YouTubePlaylistItem[];
    nextPageToken?: string;
    pageInfo?: {
        totalResults: number;
        resultsPerPage: number;
    };
}

/**
 * Represents the liveStreamingDetails part from videos.list
 */
export interface YouTubeVideoLiveDetails {
    actualStartTime?: string;
    actualEndTime?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    concurrentViewers?: string;
    activeLiveChatId?: string;
}

/**
 * Represents a YouTube video from videos.list
 */
export interface YouTubeVideoItem {
    id: string;
    snippet?: {
        title: string;
        description: string;
        publishedAt: string;
        channelId: string;
        channelTitle: string;
        thumbnails?: {
            [key: string]: { url: string; width?: number; height?: number };
        };
    };
    liveStreamingDetails?: YouTubeVideoLiveDetails;
}

/**
 * Response from videos.list
 */
export interface YouTubeVideosResponse {
    items?: YouTubeVideoItem[];
}
