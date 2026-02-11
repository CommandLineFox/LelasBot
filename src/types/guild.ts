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

    /** Discord channel ID to send "short uploaded" messages */
    shortDiscordChannelId?: string;

    /** Optional: only send upload alerts if true */
    uploadEnabled?: boolean;

    /** Optional: only send live alerts if true */
    liveEnabled?: boolean;

    /** Optional: only send schedule alerts if true */
    scheduleEnabled?: boolean;

    /** Optional: only send shorts separately if true */
    shortEnabled?: boolean;

    /** Optional: mention theis role ID on upload alerts */
    uploadMentionRoleId?: string;

    /** Optional: mention this role ID on live alerts */
    liveMentionRoleId?: string;

    /** Optional: mention this role ID on scheduled-stream alerts */
    scheduleMentionRoleId?: string;

    /** Optional: mention this role ID on short alerts */
    shortMentionRoleId?: string;

    /** Optional: Last uploaded video */
    lastUpload?: string;

    /** Optional: Last found livestream */
    lastLive?: string;

    /** Optional: Last scheduled stream */
    lastScheduledStream?: string;

    /** Optional: Uploads playlist to fetch from */
    uploadsPlaylistId?: string;
}

/**
 * The full guild-level config for your bot.
 * Here you can set global toggles (applies to every channel listed).
 */
export interface YouTubeNotificationsConfig {
    /** All the channels this guild cares about */
    channels: YouTubeChannelConfig[];

    /** ID of the channel that's currently being managed */
    currentChannelId: string;
}

/**
 * Persistent representation in the database:
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