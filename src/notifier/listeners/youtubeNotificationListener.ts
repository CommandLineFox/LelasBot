import {Listener} from '@sapphire/framework';
import Database from "../../database/database";
import {getVideoLiveStatus} from "../../utils/youtubeUtils";
import {BotClient} from "../../types/client";

export class YouTubeNotificationListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            event: 'youtubeNotification'
        });
    }

    public async run(payload: { videoId: string, channelId: string }) {
        const { videoId, channelId } = payload;
        const client = this.container.client as BotClient;

        this.container.logger.info(`[YouTube Webhook] Processing Video: ${videoId} | Channel: ${channelId}`);

        try {
            const guilds = await Database.getInstance()!.getAllGuilds();
            const relevantGuilds = guilds.filter(g =>
                g.youtubeNotifications?.channels?.some(c => c.channelId === channelId)
            );

            if (relevantGuilds.length === 0) return;

            const status = await getVideoLiveStatus(videoId);

            for (const guild of relevantGuilds) {
                const guildId = guild.id;

                const lastUpload = await client.getGuildService().getLastUpload(guildId, channelId);
                const lastLive = await client.getGuildService().getLastLive(guildId, channelId);
                const lastScheduled = await client.getGuildService().getLastScheduledStream(guildId, channelId);

                if (status === "live") {
                    if (videoId === lastLive) continue;

                    const enabled = await client.getGuildService().getLiveEnabled(guildId, channelId);
                    if (enabled) {
                        await this.postNotification(client, guildId, channelId, videoId, "live");
                        await client.getGuildService().setLastLive(guildId, channelId, videoId);
                        await client.getGuildService().setLastUpload(guildId, channelId, videoId);

                        if (videoId === lastScheduled) {
                            await client.getGuildService().clearLastScheduledStream(guildId, channelId);
                        }
                    }
                } else if (status === "upcoming") {
                    if (videoId === lastScheduled || videoId === lastLive) continue;

                    const enabled = await client.getGuildService().getScheduleEnabled(guildId, channelId);
                    if (enabled) {
                        await this.postNotification(client, guildId, channelId, videoId, "scheduled");
                        await client.getGuildService().setLastScheduledStream(guildId, channelId, videoId);
                    }
                } else {
                    if (videoId === lastUpload || videoId === lastLive || videoId === lastScheduled) {
                        continue;
                    }

                    const enabled = await client.getGuildService().getUploadEnabled(guildId, channelId);
                    if (enabled) {
                        await this.postNotification(client, guildId, channelId, videoId, "upload");
                        await client.getGuildService().setLastUpload(guildId, channelId, videoId);
                    }
                }
            }
        } catch (error) {
            this.container.logger.error(`[YouTube Listener Error]`, error);
        }
    }

    private async postNotification(client: BotClient, guildId: string, channelId: string, videoId: string, type: "upload" | "live" | "scheduled") {
        const guildService = client.getGuildService();
        let discordChannelId: string | null = null;
        let roleId: string | null = null;
        let message = "";

        switch (type) {
            case "upload":
                discordChannelId = await guildService.getUploadDiscordChannelId(guildId, channelId);
                roleId = await guildService.getUploadMentionRoleId(guildId, channelId);
                message = "new video uploaded!";
                break;
            case "live":
                discordChannelId = await guildService.getLiveDiscordChannelId(guildId, channelId);
                roleId = await guildService.getLiveMentionRoleId(guildId, channelId);
                message = "stream started!";
                break;
            case "scheduled":
                discordChannelId = await guildService.getScheduleDiscordChannelId(guildId, channelId);
                roleId = await guildService.getScheduleMentionRoleId(guildId, channelId);
                message = "stream scheduled!";
                break;
        }

        if (!discordChannelId || !roleId) return;

        try {
            const channel = await client.channels.fetch(discordChannelId);
            if (channel && channel.isSendable()) {
                await channel.send(`<@&${roleId}> ${message} \nhttps://www.youtube.com/watch?v=${videoId}`);
            }
        } catch (err) {
            this.container.logger.error(`[Discord Post Error] Guild: ${guildId}`, err);
        }
    }
}