import {Document} from 'mongoose';
import Database from '../database/database';
import {CustomResponse} from '../types/customResponse';
import {Guild, YouTubeNotificationsConfig, YouTubeChannelConfig,} from '../types/guild';
import {setValue, unsetValue, addToArray, removeFromArray, removeAllFromArray,} from '../utils/databaseUtils';

export class GuildService {
    /**
     * Fetch the full guild configuration object.
     * Returns `null` if the guild does not exist.
     * @param guildId Discord guild (server) ID
     */
    public async getGuildConfig(guildId: string): Promise<Guild | null> {
        const database = Database.getInstance();
        if (!database) {
            return null;
        }

        const guildDocument = await database.getGuild(guildId) as Document | null;
        if (!guildDocument) {
            return null;
        }

        const youtubeNotifications = guildDocument.get('youtubeNotifications') as YouTubeNotificationsConfig | undefined;
        return { id: guildDocument.get('id'), youtubeNotifications: youtubeNotifications };
    }

    /**
     * Create or replace the YouTube notifications block for a guild.
     * @param guildId Discord guild ID
     * @param cfg New notifications configuration
     */
    public async setNotifications(guildId: string, cfg: YouTubeNotificationsConfig): Promise<CustomResponse> {
        return setValue(
            guildId,
            'youtubeNotifications',
            cfg,
            'Notifications are already configured.',
            'Notifications configured successfully.',
            'Failed to configure notifications.'
        );
    }

    /**
     * Remove the YouTube notifications block for a guild.
     * @param guildId Discord guild ID
     */
    public async unsetNotifications(guildId: string): Promise<CustomResponse> {
        return unsetValue(
            guildId,
            'youtubeNotifications',
            'Notifications are not set.',
            'Notifications cleared.',
            'Failed to clear notifications.'
        );
    }

    /**
     * Set the polling interval (in seconds) for checking YouTube.
     * @param guildId Discord guild ID
     * @param seconds Poll interval in seconds
     */
    public async setPollInterval(guildId: string, seconds: number): Promise<CustomResponse> {
        return setValue(
            guildId,
            'youtubeNotifications.pollIntervalSeconds',
            seconds,
            'Poll interval is already that value.',
            `Poll interval set to ${seconds} second(s).`,
            'Failed to update poll interval.'
        );
    }

    /**
     * Remove the polling interval setting for a guild.
     * @param guildId Discord guild ID
     */
    public async unsetPollInterval(guildId: string): Promise<CustomResponse> {
        return unsetValue(
            guildId,
            'youtubeNotifications.pollIntervalSeconds',
            'Poll interval is not set.',
            'Poll interval cleared.',
            'Failed to clear poll interval.'
        );
    }

    /**
     * Retrieve the polling interval (in seconds) for a guild.
     * Returns `null` if not set or guild not found.
     * @param guildId Discord guild ID
     */
    public async getPollInterval(guildId: string): Promise<number | null> {
        const cfg = await this.getGuildConfig(guildId);
        return cfg?.youtubeNotifications?.pollIntervalSeconds ?? null;
    }

    /**
     * Add a YouTube channel configuration to a guild.
     * @param guildId Discord guild ID
     * @param channel Full YouTubeChannelConfig to add
     */
    public async addChannel(guildId: string, channel: YouTubeChannelConfig): Promise<CustomResponse> {
        return addToArray(
            guildId,
            'youtubeNotifications.channels',
            channel,
            'Channel is already being tracked.',
            'Channel added successfully.',
            'Failed to add channel.'
        );
    }

    /**
     * Remove a tracked YouTube channel from a guild.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID to remove
     */
    public async removeChannel(guildId: string, channelId: string): Promise<CustomResponse> {
        return removeFromArray(
            guildId,
            'youtubeNotifications.channels',
            { channelId },
            false,
            'Channel not found.',
            'Channel removed successfully.',
            'Failed to remove channel.'
        );
    }

    /**
     * Remove all tracked YouTube channels from a guild.
     * @param guildId Discord guild ID
     */
    public async clearChannels(guildId: string): Promise<CustomResponse> {
        return removeAllFromArray(
            guildId,
            'youtubeNotifications.channels',
            'All channels cleared.',
            'Failed to clear channels.'
        );
    }

    /**
     * Retrieve all tracked channels for a guild.
     * Returns `null` if a guild or notifications block is not found.
     * @param guildId Discord guild ID
     */
    public async getChannels(guildId: string): Promise<YouTubeChannelConfig[] | null> {
        const cfg = await this.getGuildConfig(guildId);
        return cfg?.youtubeNotifications?.channels ?? null;
    }

    /**
     * Retrieve configuration for a specific tracked channel.
     * Returns `null` if not found.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getChannelConfig(guildId: string, channelId: string): Promise<YouTubeChannelConfig | null> {
        const channels = await this.getChannels(guildId);
        return channels?.find(c => c.channelId === channelId) ?? null;
    }

    /**
     * Find the index of a channel in the guild’s channels array.
     * Returns -1 if not found.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    private async findChannelIndex(guildId: string, channelId: string): Promise<number> {
        const channels = await this.getChannels(guildId);
        return channels?.findIndex(c => c.channelId === channelId) ?? -1;
    }

    /**
     * Enable or disable upload alerts for a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param enabled `true` to enable, `false` to disable
     */
    public async setUploadEnabled(guildId: string, channelId: string, enabled: boolean): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadEnabled`,
            enabled,
            `Upload alerts already ${enabled ? 'enabled' : 'disabled'}.`,
            `Upload alerts ${enabled ? 'enabled' : 'disabled'}.`,
            'Failed to update uploadEnabled.'
        );
    }

    /**
     * Retrieve the upload-enabled flag for a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadEnabled ?? null;
    }

    /**
     * Enable or disable live alerts for a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param enabled `true` to enable, `false` to disable
     */
    public async setLiveEnabled(guildId: string, channelId: string, enabled: boolean): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.liveEnabled`,
            enabled,
            `Live alerts already ${enabled ? 'enabled' : 'disabled'}.`,
            `Live alerts ${enabled ? 'enabled' : 'disabled'}.`,
            'Failed to update liveEnabled.'
        );
    }

    /**
     * Retrieve the live-enabled flag for a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveEnabled ?? null;
    }

    /**
     * Enable or disable schedule alerts for a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param enabled `true` to enable, `false` to disable
     */
    public async setScheduleEnabled(guildId: string, channelId: string, enabled: boolean): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.scheduleEnabled`,
            enabled,
            `Schedule alerts already ${enabled ? 'enabled' : 'disabled'}.`,
            `Schedule alerts ${enabled ? 'enabled' : 'disabled'}.`,
            'Failed to update scheduleEnabled.'
        );
    }

    /**
     * Retrieve the schedule-enabled flag for a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleEnabled ?? null;
    }

    /**
     * Set the Discord channel ID for upload alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param discordChan Discord channel ID
     */
    public async setUploadDiscordChannelId(guildId: string, channelId: string, discordChan: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadDiscordChannelId`,
            discordChan,
            'Upload Discord channel is already set to that ID.',
            'Upload Discord channel updated.',
            'Failed to update uploadDiscordChannelId.'
        );
    }

    /**
     * Retrieve the Discord channel ID for upload alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadDiscordChannelId ?? null;
    }

    /**
     * Set the Discord channel ID for live alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param discordChan Discord channel ID
     */
    public async setLiveDiscordChannelId(guildId: string, channelId: string, discordChan: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.liveDiscordChannelId`,
            discordChan,
            'Live Discord channel is already set to that ID.',
            'Live Discord channel updated.',
            'Failed to update liveDiscordChannelId.'
        );
    }

    /**
     * Retrieve the Discord channel ID for live alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveDiscordChannelId ?? null;
    }

    /**
     * Set the Discord channel ID for scheduled-stream alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param discordChan Discord channel ID
     */
    public async setScheduleDiscordChannelId(guildId: string, channelId: string, discordChan: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.scheduleDiscordChannelId`,
            discordChan,
            'Schedule Discord channel is already set to that ID.',
            'Schedule Discord channel updated.',
            'Failed to update scheduleDiscordChannelId.'
        );
    }

    /**
     * Retrieve the Discord channel ID for scheduled-stream alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleDiscordChannelId ?? null;
    }

    /**
     * Set the mention-role IDs for upload alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roles Array of Discord role IDs
     */
    public async setUploadMentionRoleIds(guildId: string, channelId: string, roles: string[]): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadMentionRoleIds`,
            roles,
            'Upload mention roles already set.',
            'Upload mention roles updated.',
            'Failed to update uploadMentionRoleIds.'
        );
    }

    /**
     * Retrieve the mention-role IDs for upload alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadMentionRoleIds(guildId: string, channelId: string): Promise<string[] | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadMentionRoleIds ?? null;
    }

    /**
     * Set the mention-role IDs for live alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roles Array of Discord role IDs
     */
    public async setLiveMentionRoleIds(
        guildId: string, channelId: string, roles: string[]): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.liveMentionRoleIds`,
            roles,
            'Live mention roles already set.',
            'Live mention roles updated.',
            'Failed to update liveMentionRoleIds.'
        );
    }

    /**
     * Retrieve the mention-role IDs for live alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveMentionRoleIds(guildId: string, channelId: string): Promise<string[] | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveMentionRoleIds ?? null;
    }

    /**
     * Set the mention-role IDs for scheduled-stream alerts on a specific channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roles Array of Discord role IDs
     */
    public async setScheduleMentionRoleIds(guildId: string, channelId: string, roles: string[]): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.scheduleMentionRoleIds`,
            roles,
            'Schedule mention roles already set.',
            'Schedule mention roles updated.',
            'Failed to update scheduleMentionRoleIds.'
        );
    }

    /**
     * Retrieve the mention-role IDs for scheduled-stream alerts on a channel.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleMentionRoleIds(guildId: string, channelId: string): Promise<string[] | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleMentionRoleIds ?? null;
    }
}