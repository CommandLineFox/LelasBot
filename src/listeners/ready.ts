import {Listener} from '@sapphire/framework';
import {TextChannel} from "discord.js";
import Database from "../database/database";
import {BotClient} from "../types/client";
import {Guild} from "../types/guild";
import {getLatestScheduledStream, getLatestStream, getLatestVideo} from "../utils/youtubeUtils";

export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, once: true, event: "ready" });
    }

    /**
     * Run method for the client.on("ready") event
     * @param client The client that just logged in
     */
    public run(client: BotClient): void {
        const { username, id } = client.user!;
        this.container.logger.info(`Successfully logged in as ${username} (${id})`);

        const pollLoop = async () => {
            try {
                const guilds: Guild[] = await Database.getInstance()!.getAllGuilds();
                const totalGuilds = guilds.length || 1;
                const pollIntervalMs = 60_000 * totalGuilds;

                for (const guild of guilds) {
                    if (!guild.youtubeNotifications?.channels?.length) continue;

                    for (const channel of guild.youtubeNotifications.channels) {
                        const channelId = channel.channelId;

                        try {
                            const uploadEnabled = await client.getGuildService().getUploadEnabled(guild.id, channelId);
                            if (uploadEnabled) {
                                const videoId = await getLatestVideo(client, guild.id, channelId);
                                await this.postUpload(videoId, channelId, client, guild);
                            }

                            const liveEnabled = await client.getGuildService().getLiveEnabled(guild.id, channelId);
                            if (liveEnabled) {
                                const liveId = await getLatestStream(client, guild.id, channelId);
                                await this.postLiveStream(liveId, channelId, client, guild);
                            }

                            const scheduledEnabled = await client.getGuildService().getScheduleEnabled(guild.id, channelId);
                            if (scheduledEnabled) {
                                const scheduledId = await getLatestScheduledStream(client, guild.id, channelId);
                                await this.postScheduledStream(scheduledId, channelId, client, guild);
                            }
                        } catch (err) {
                            this.container.logger.error(
                                `Error checking YouTube for guild ${guild.id}, channel ${channelId}`,
                                err
                            );
                        }
                    }
                }

                setTimeout(pollLoop, pollIntervalMs);
            } catch (err) {
                this.container.logger.error('Error in YouTube polling loop', err);
                setTimeout(pollLoop, 60_000);
            }
        };

        // Start immediately
        pollLoop();
    }

    /**
     * Posts the latest uploaded video into the server
     * @param videoId Video to post
     * @param channelId YouTube channel ID
     * @param client The bot client
     * @param guild The Discord guild
     * @private
     */
    private async postUpload(videoId: string | null, channelId: string, client: BotClient, guild: Guild): Promise<void> {
        if (!videoId) {
            return;
        }

        const uploadsChannelId = await client.getGuildService().getUploadDiscordChannelId(guild.id, channelId);
        if (!uploadsChannelId) {
            return;
        }

        const uploadRoleId = await client.getGuildService().getUploadMentionRoleId(guild.id, channelId);
        if (!uploadRoleId) {
            return;
        }

        const uploadChannel = await client.channels.fetch(uploadsChannelId);
        if (!uploadChannel || !(uploadChannel instanceof TextChannel)) {
            return;
        }

        const discordGuild = await client.guilds.fetch(guild.id);
        const uploadRole = await discordGuild.roles.fetch(uploadRoleId);
        if (!uploadRole) {
            return;
        }

        await uploadChannel.send(`<@&${uploadRoleId}> new video available! https://www.youtube.com/watch?v=${videoId}`);
    }

    /**
     * Posts a live stream notification
     * @param videoId Video ID of the live stream
     * @param channelId YouTube channel ID
     * @param client The bot client
     * @param guild The Discord guild
     * @private
     */
    private async postLiveStream(videoId: string | null, channelId: string, client: BotClient, guild: Guild): Promise<void> {
        if (!videoId) {
            return;
        }

        const liveChannelId = await client.getGuildService().getLiveDiscordChannelId(guild.id, channelId);
        if (!liveChannelId) {
            return;
        }

        const liveRoleId = await client.getGuildService().getLiveMentionRoleId(guild.id, channelId);
        if (!liveRoleId) {
            return;
        }

        const liveChannel = await client.channels.fetch(liveChannelId);
        if (!liveChannel || !(liveChannel instanceof TextChannel)) {
            return;
        }

        const discordGuild = await client.guilds.fetch(guild.id);
        const liveRole = await discordGuild.roles.fetch(liveRoleId);
        if (!liveRole) {
            return;
        }

        await liveChannel.send(`<@&${liveRoleId}> is now live! https://www.youtube.com/watch?v=${videoId}`);
    }

    /**
     * Posts a scheduled/upcoming stream notification
     * @param videoId Video ID of the scheduled stream
     * @param channelId YouTube channel ID
     * @param client The bot client
     * @param guild The Discord guild
     * @private
     */
    private async postScheduledStream(videoId: string | null, channelId: string, client: BotClient, guild: Guild): Promise<void> {
        if (!videoId) {
            return;
        }

        const scheduledChannelId = await client.getGuildService().getScheduleDiscordChannelId(guild.id, channelId);
        if (!scheduledChannelId) {
            return;
        }

        const scheduledRoleId = await client.getGuildService().getScheduleMentionRoleId(guild.id, channelId);
        if (!scheduledRoleId) {
            return;
        }

        const scheduledChannel = await client.channels.fetch(scheduledChannelId);
        if (!scheduledChannel || !(scheduledChannel instanceof TextChannel)) {
            return;
        }

        const discordGuild = await client.guilds.fetch(guild.id);
        const scheduledRole = await discordGuild.roles.fetch(scheduledRoleId);
        if (!scheduledRole) {
            return;
        }

        await scheduledChannel.send(`<@&${scheduledRoleId}> upcoming stream! https://www.youtube.com/watch?v=${videoId}`);
    }
}