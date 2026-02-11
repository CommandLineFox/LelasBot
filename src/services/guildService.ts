import {Document} from 'mongoose';
import Database from '../database/database';
import {CustomResponse} from '../types/customResponse';
import {Guild, YouTubeNotificationsConfig, YouTubeChannelConfig,} from '../types/guild';
import {
    setValue,
    unsetValue,
    removeFromArray,
    removeAllFromArray, addToArray,
} from '../utils/databaseUtils';

export class GuildService {
    /**
     * Fetch the full guild configuration object
     * Returns `null` if the guild does not exist
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
     * Create or replace the YouTube notifications block for a guild
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
     * Remove the YouTube notifications block for a guild
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
     * Add a YouTube channel configuration to a guild
     * @param guildId Discord guild ID
     * @param channelOrId Config or channel ID
     */
    public async addChannel(guildId: string, channelOrId: YouTubeChannelConfig | string): Promise<CustomResponse> {
        const channel: YouTubeChannelConfig = typeof channelOrId === 'string'
            ? {
                channelId: channelOrId,
                uploadDiscordChannelId: '',
                liveDiscordChannelId: '',
                scheduleDiscordChannelId: '',
                uploadEnabled: true,
                liveEnabled: true,
                scheduleEnabled: true,
                uploadMentionRoleId: '',
                liveMentionRoleId: '',
                scheduleMentionRoleId: ''
            } : channelOrId;

        const res = await addToArray(
            guildId,
            'youtubeNotifications.channels',
            channel,
            'Channel is already being tracked.',
            'Channel added successfully.',
            'Failed to add channel.'
        );

        if (res.success) {
            await this.setCurrentChannel(guildId, channel.channelId);
        }

        return res;
    }

    /**
     * Remove a tracked YouTube channel from a guild.
     * @param guildId Discord guild ID
     * @param channelId Channel ID
     */
    public async removeChannel(guildId: string, channelId: string): Promise<CustomResponse> {
        const res = await removeFromArray(
            guildId,
            'youtubeNotifications.channels',
            { channelId },
            false,
            'Channel not found.',
            'Channel removed successfully.',
            'Failed to remove channel.'
        );

        if (res.success) {
            const current = await this.getCurrentChannel(guildId);
            if (current === channelId) {
                await this.setCurrentToLastOrClear(guildId);
            }
        }

        return res;
    }

    /**
     * Remove all tracked YouTube channels from a guild
     * @param guildId Discord guild ID
     */
    public async clearChannels(guildId: string): Promise<CustomResponse> {
        const res = await removeAllFromArray(
            guildId,
            'youtubeNotifications.channels',
            'All channels cleared.',
            'Failed to clear channels.'
        );

        if (res.success) {
            await this.clearCurrentChannel(guildId);
        }

        return res;
    }

    /**
     * Retrieve all tracked channels for a guild
     * Returns `null` if a guild or notifications block is not found
     * @param guildId Discord guild ID
     */
    public async getChannels(guildId: string): Promise<YouTubeChannelConfig[] | null> {
        const cfg = await this.getGuildConfig(guildId);
        return cfg?.youtubeNotifications?.channels ?? null;
    }

    /**
     * Retrieve configuration for a specific tracked channel
     * Returns `null` if not found
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getChannelConfig(guildId: string, channelId: string): Promise<YouTubeChannelConfig | null> {
        const channels = await this.getChannels(guildId);
        return channels?.find(c => c.channelId === channelId) ?? null;
    }

    /**
     * Find the index of a channel in the guild’s channel array
     * Returns -1 if not found.
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    private async findChannelIndex(guildId: string, channelId: string): Promise<number> {
        const channels = await this.getChannels(guildId);
        return channels?.findIndex(c => c.channelId === channelId) ?? -1;
    }

    /**
     * Enable or disable upload alerts for a specific channel
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
     * Get whether the upload alert is enabled or disabled
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
     * Get whether the live alert is enabled or disabled
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveEnabled ?? null;
    }

    /**
     * Enable or disable scheduled stream alerts for a specific channel.
     * @param guildId Discord guild ID
     * @param channelId Channel ID
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
     * Get whether the scheduled stream alert is enabled or disabled
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleEnabled ?? null;
    }

    /**
     * Enable or disable short alerts for a specific channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param enabled `true` to enable, `false` to disable
     */
    public async setShortEnabled(guildId: string, channelId: string, enabled: boolean): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.shortEnabled`,
            enabled,
            `Short alerts already ${enabled ? 'enabled' : 'disabled'}.`,
            `Short alerts ${enabled ? 'enabled' : 'disabled'}.`,
            'Failed to update shortEnabled.'
        );
    }

    /**
     * Get whether the short alert is enabled or disabled
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getShortEnabled(guildId: string, channelId: string): Promise<boolean | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.shortEnabled ?? null;
    }

    /**
     * Set the channel that uploads are pointed to
     * @param guildId Discord channel ID
     * @param channelId Youtube channel ID
     * @param discordChannelId Discord channel ID to send in
     */
    public async setUploadDiscordChannelId(guildId: string, channelId: string, discordChannelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadDiscordChannelId`,
            discordChannelId,
            'Upload Discord channel is already set to that ID.',
            'Upload Discord channel updated.',
            'Failed to update uploadDiscordChannelId.'
        );
    }

    /**
     * Get the channel that uploads are sent to
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadDiscordChannelId ?? null;
    }

    /**
     * Set the channel that streams are pointed to
     * @param guildId Discord channel ID
     * @param channelId Youtube channel ID
     * @param discordChannelId Discord channel ID to send in
     */
    public async setLiveDiscordChannelId(guildId: string, channelId: string, discordChannelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.liveDiscordChannelId`,
            discordChannelId,
            'Live Discord channel is already set to that ID.',
            'Live Discord channel updated.',
            'Failed to update liveDiscordChannelId.'
        );
    }

    /**
     * Get the channel that streams are sent to
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveDiscordChannelId ?? null;
    }

    /**
     * Set the channel that scheduled streams are pointed to
     * @param guildId Discord channel ID
     * @param channelId Youtube channel ID
     * @param discordChannelId Discord channel ID to send in
     */
    public async setScheduleDiscordChannelId(guildId: string, channelId: string, discordChannelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.scheduleDiscordChannelId`,
            discordChannelId,
            'Schedule Discord channel is already set to that ID.',
            'Schedule Discord channel updated.',
            'Failed to update scheduleDiscordChannelId.'
        );
    }

    /**
     * Get the channel that scheduled streams are sent to
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleDiscordChannelId ?? null;
    }

    /**
     * Set the channel that shorts are pointed to
     * @param guildId Discord channel ID
     * @param channelId Youtube channel ID
     * @param discordChannelId Discord channel ID to send in
     */
    public async setShortDiscordChannelId(guildId: string, channelId: string, discordChannelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.shortDiscordChannelId`,
            discordChannelId,
            'Short Discord channel is already set to that ID.',
            'Short Discord channel updated.',
            'Failed to update shortDiscordChannelId.'
        );
    }

    /**
     * Get the channel that shorts are sent to
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getShortDiscordChannelId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.shortDiscordChannelId ?? null;
    }

    /**
     * Set the role that's going to be mentioned when an upload is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roleId Role ID
     */
    public async setUploadMentionRoleId(guildId: string, channelId: string, roleId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadMentionRoleId`,
            roleId,
            'Upload mention role already set to that ID.',
            'Upload mention role updated.',
            'Failed to update uploadMentionRoleId.'
        );
    }

    /**
     * Get the ID of the role that's mentioned when an upload is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadMentionRoleId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadMentionRoleId ?? null;
    }

    /**
     * Set the role that's going to be mentioned when a stream is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roleId Role ID
     */
    public async setLiveMentionRoleId(guildId: string, channelId: string, roleId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.liveMentionRoleId`,
            roleId,
            'Live mention role already set to that ID.',
            'Live mention role updated.',
            'Failed to update liveMentionRoleId.'
        );
    }

    /**
     * Get the ID of the role that's mentioned when a stream is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLiveMentionRoleId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.liveMentionRoleId ?? null;
    }

    /**
     * Set the role that's going to be mentioned when a scheduled stream is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roleId Role ID
     */
    public async setScheduleMentionRoleId(guildId: string, channelId: string, roleId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.scheduleMentionRoleId`,
            roleId,
            'Schedule mention role already set to that ID.',
            'Schedule mention role updated.',
            'Failed to update scheduleMentionRoleId.'
        );
    }

    /**
     * Get the ID of the role that's mentioned when a scheduled stream is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getScheduleMentionRoleId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.scheduleMentionRoleId ?? null;
    }

    /**
     * Set the role that's going to be mentioned when a short is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param roleId Role ID
     */
    public async setShortMentionRoleId(guildId: string, channelId: string, roleId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.shortMentionRoleId`,
            roleId,
            'Short mention role already set to that ID.',
            'Short mention role updated.',
            'Failed to update shortMentionRoleId.'
        );
    }

    /**
     * Get the ID of the role that's mentioned when a short is sent
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getShortMentionRoleId(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.shortMentionRoleId ?? null;
    }

    /**
     * Set the last uploaded video ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param videoId ID of the last uploaded video
     */
    public async setLastUpload(guildId: string, channelId: string, videoId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastUpload`,
            videoId,
            'Last upload already set to that video.',
            'Last upload updated.',
            'Failed to update lastUpload.'
        );
    }

    /**
     * Get the last uploaded video ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLastUpload(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.lastUpload ?? null;
    }

    /**
     * Clear the last uploaded video ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async clearLastUpload(guildId: string, channelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return unsetValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastUpload`,
            'No last upload to clear.',
            'Last upload cleared.',
            'Failed to clear lastUpload.'
        );
    }

    /**
     * Set the last live stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param liveId ID of the last live stream
     */
    public async setLastLive(guildId: string, channelId: string, liveId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastLive`,
            liveId,
            'Last live stream already set to that ID.',
            'Last live stream updated.',
            'Failed to update lastLive.'
        );
    }

    /**
     * Get the last live stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLastLive(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.lastLive ?? null;
    }

    /**
     * Clear the last live stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async clearLastLive(guildId: string, channelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return unsetValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastLive`,
            'No last live stream to clear.',
            'Last live stream cleared.',
            'Failed to clear lastLive.'
        );
    }

    /**
     * Set the last scheduled stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param scheduledId ID of the last scheduled stream
     */
    public async setLastScheduledStream(guildId: string, channelId: string, scheduledId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastScheduledStream`,
            scheduledId,
            'Last scheduled stream already set to that ID.',
            'Last scheduled stream updated.',
            'Failed to update lastScheduledStream.'
        );
    }

    /**
     * Get the last scheduled stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getLastScheduledStream(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.lastScheduledStream ?? null;
    }

    /**
     * Clear the last scheduled stream ID for a specific YouTube channel
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async clearLastScheduledStream(guildId: string, channelId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return unsetValue(
            guildId,
            `youtubeNotifications.channels.${idx}.lastScheduledStream`,
            'No last scheduled stream to clear.',
            'Last scheduled stream cleared.',
            'Failed to clear lastScheduledStream.'
        );
    }

    /**
     * Set the YouTube channel ID of the channel that's currently being managed
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async setCurrentChannel(guildId: string, channelId: string): Promise<CustomResponse> {
        return setValue(
            guildId,
            'youtubeNotifications.currentChannelId',
            channelId,
            'That channel is already set as current.',
            `Current channel set to ${channelId}`,
            'Failed to set current channel.'
        );
    }

    /**
     * Get the YouTube channel ID of the channel that's currently being managed
     * @param guildId Discord guild ID
     */
    public async getCurrentChannel(guildId: string): Promise<string | null> {
        const cfg = await this.getGuildConfig(guildId);
        return cfg?.youtubeNotifications?.currentChannelId ?? null;
    }

    /**
     * Set the uploads playlist
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     * @param playlistId YouTube uploads playlist ID
     */
    public async setUploadsPlaylist(guildId: string, channelId: string, playlistId: string): Promise<CustomResponse> {
        const idx = await this.findChannelIndex(guildId, channelId);
        if (idx < 0) return { success: false, message: 'Channel not found.' };
        return setValue(
            guildId,
            `youtubeNotifications.channels.${idx}.uploadsPlaylistId`,
            playlistId,
            'Uploads playlist already set to that ID.',
            'Uploads playlist updated.',
            'Failed to set the uploads playlist.'
        )
    }

    /**
     * Get the uploads playlist
     * @param guildId Discord guild ID
     * @param channelId YouTube channel ID
     */
    public async getUploadsPlaylist(guildId: string, channelId: string): Promise<string | null> {
        const cfg = await this.getChannelConfig(guildId, channelId);
        return cfg?.uploadsPlaylistId ?? null;
    }

    /**
     * Clear the current active channel for settings
     * @param guildId ID of the guild
     */
    public async clearCurrentChannel(guildId: string): Promise<CustomResponse> {
        return unsetValue(
            guildId,
            'youtubeNotifications.currentChannelId',
            'No current channel set.',
            'Current channel cleared.',
            'Failed to clear current channel.'
        );
    }

    /**
     * Set the current channel that's being managed
     * @param guildId Discord guild ID
     * @private
     */
    private async setCurrentToLastOrClear(guildId: string): Promise<void> {
        const channels = await this.getChannels(guildId);
        if (channels && channels.length > 0) {
            const last = channels[channels.length - 1];
            await this.setCurrentChannel(guildId, last.channelId);
        } else {
            await this.clearCurrentChannel(guildId);
        }
    }
}