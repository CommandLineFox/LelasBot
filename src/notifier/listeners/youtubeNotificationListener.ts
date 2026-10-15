import {Listener} from '@sapphire/framework';
import Database from "../../database/database";
import {getVideoLiveStatus} from "../../utils/youtubeUtils";
import {BotClient} from "../../types/client";

export class YouTubeNotificationListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: 'youtubeNotification',
        });
    }

    private processingLocks = new Set<string>();

    public async run(payload: { videoId: string, channelId: string }) {
        const { videoId, channelId } = payload;
        const lockKey = `${videoId}-${channelId}`;

        if (this.processingLocks.has(lockKey)) return;
        this.processingLocks.add(lockKey);

        setTimeout(() => this.processingLocks.delete(lockKey), 5000);

        const client = this.container.client as BotClient;
        this.container.logger.info(`[YouTube Webhook] Processing Video: ${videoId} | Channel: ${channelId}`);

        try {
            const relevantGuilds = await Database.getInstance()!.getGuildsByYouTubeChannel(channelId);

            if (relevantGuilds.length === 0) {
                return;
            }

            const status = await getVideoLiveStatus(videoId);

            await Promise.all(
                relevantGuilds.map(async (guild) => {
                    const guildId = guild.id;
                    const gs = client.getGuildService();

                    if (status === "live") {
                        const lastLive = await gs.getLastLive(guildId, channelId);
                        if (videoId === lastLive) {
                            return;
                        }

                        if (await gs.getLiveEnabled(guildId, channelId)) {
                            await this.postNotification(client, guildId, channelId, videoId, "live");
                            await gs.setLastLive(guildId, channelId, videoId);
                        }
                    } else if (status === "upcoming") {
                        const lastScheduled = await gs.getLastScheduledStream(guildId, channelId);
                        if (videoId === lastScheduled) {
                            return;
                        }

                        if (await gs.getScheduleEnabled(guildId, channelId)) {
                            await this.postNotification(client, guildId, channelId, videoId, "scheduled");
                            await gs.setLastScheduledStream(guildId, channelId, videoId);
                        }
                    } else {
                        const lastUpload = await gs.getLastUpload(guildId, channelId);
                        if (videoId === lastUpload) {
                            return;
                        }

                        if (await gs.getUploadEnabled(guildId, channelId)) {
                            await this.postNotification(client, guildId, channelId, videoId, "upload");
                            await gs.setLastUpload(guildId, channelId, videoId);
                        }
                    }
                })
            );
        } catch (error) {
            this.container.logger.error(`[YouTube Listener Error]`, error);
        }
    }

    private async postNotification(client: BotClient, guildId: string, channelId: string, videoId: string, type: "upload" | "live" | "scheduled") {
        const gs = client.getGuildService();
        let discordChannelId: string | null;
        let roleId: string | null;
        let message: string;

        if (type === "live") {
            discordChannelId = await gs.getLiveDiscordChannelId(guildId, channelId);
            roleId = await gs.getLiveMentionRoleId(guildId, channelId);
            message = "stream started!";
        } else if (type === "scheduled") {
            discordChannelId = await gs.getScheduleDiscordChannelId(guildId, channelId);
            roleId = await gs.getScheduleMentionRoleId(guildId, channelId);
            message = "stream scheduled!";
        } else {
            discordChannelId = await gs.getUploadDiscordChannelId(guildId, channelId);
            roleId = await gs.getUploadMentionRoleId(guildId, channelId);
            message = "new video uploaded!";
        }

        if (!discordChannelId) return;

        try {
            const channel = await client.channels.fetch(discordChannelId);
            if (channel && channel.isSendable()) {
                const mention = roleId ? `<@&${roleId}> ` : "";
                await channel.send(`${mention}${message} \nhttps://www.youtube.com/watch?v=${videoId}`);
            }
        } catch (err) {
            this.container.logger.error(`[Discord Post Error] Guild: ${guildId}`, err);
        }
    }
}