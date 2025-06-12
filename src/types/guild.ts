/**
 * How and where to notify for a single YouTube channel.
 * You can also individually disable any of the three checks here.
 */
export interface YouTubeChannelConfig {
    /** The YouTube channel’s unique ID, */
    channelId: string;

    /** Discord channel ID to send “new video uploaded” messages */
    uploadDiscordChannelId: string;

    /** Discord channel ID to send “went live” messages */
    liveDiscordChannelId: string;

    /** Discord channel ID to send “stream scheduled” messages */
    scheduleDiscordChannelId: string;

    /** Optional: only send upload alerts if true */
    uploadEnabled?: boolean;

    /** Optional: only send live alerts if true */
    liveEnabled?: boolean;

    /** Optional: only send schedule alerts if true */
    scheduleEnabled?: boolean;

    /** Optional: mention these role IDs on upload alerts */
    uploadMentionRoleIds?: string[];

    /** Optional: mention these role IDs on live alerts */
    liveMentionRoleIds?: string[];

    /** Optional: mention these role IDs on scheduled-stream alerts */
    scheduleMentionRoleIds?: string[];
}

/**
 * The full guild-level config for your bot.
 * Here you can set global toggles (applies to every channel listed).
 */
export interface YouTubeNotificationsConfig {
    /** Poll interval in minutes (how often you check the YouTube API) */
    pollIntervalMinutes?: number;

    /** All the channels this guild cares about */
    channels: YouTubeChannelConfig[];
}

/**
 * Your persistent representation in the database:
 * each guild gets one of these documents.
 */
export interface Guild {
    /** Discord guild (server) ID */
    id: string;

    /**
     * If undefined, the bot does nothing in this guild.
     * Otherwise, you get global toggles + per-channel overrides.
     */
    youtubeNotifications?: YouTubeNotificationsConfig;
}
