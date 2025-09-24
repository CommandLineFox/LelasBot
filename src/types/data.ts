export interface YouTubeSearchItem {
    id: { videoId: string };
    snippet: {
        title: string;
        description: string;
        publishedAt: string;
    };
}

export interface YouTubeSearchResponse {
    items?: YouTubeSearchItem[];
}