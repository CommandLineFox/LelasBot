import {Listener} from '@sapphire/framework';
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
                const pollIntervalMs = 30_000 * totalGuilds; // 30s per guild

                for (const guild of guilds) {
                    if (!guild.youtubeNotifications) continue;

                    for (const channel of guild.youtubeNotifications.channels) {
                        const channelId = channel.channelId;

                        try {
                            // Video
                            const videoId = await getLatestVideo(client, guild.id, channelId);
                            if (videoId) {
                                this.container.logger.info(`New video detected: ${videoId} in guild ${guild.id}`);
                                // TODO: Send Discord notification
                            }

                            // Live
                            const liveId = await getLatestStream(client, guild.id, channelId);
                            if (liveId) {
                                this.container.logger.info(`Live stream detected: ${liveId} in guild ${guild.id}`);
                                // TODO: Send Discord notification
                            }

                            // Scheduled
                            const scheduledId = await getLatestScheduledStream(client, guild.id, channelId);
                            if (scheduledId) {
                                this.container.logger.info(`Scheduled stream detected: ${scheduledId} in guild ${guild.id}`);
                                // TODO: Send Discord notification
                            }
                        } catch (err) {
                            this.container.logger.error(
                                `Error checking YouTube for guild ${guild.id}, channel ${channelId}`,
                                err
                            );
                        }
                    }
                }

                // Schedule next poll
                setTimeout(pollLoop, pollIntervalMs);
            } catch (err) {
                this.container.logger.error('Error in YouTube polling loop', err);
                // Retry in 1 minute on global error
                setTimeout(pollLoop, 60_000);
            }
        };

        // Start immediately
        pollLoop();
    }
}