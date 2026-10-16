import {Listener} from '@sapphire/framework';
import {startYoutubeWebhook} from "../api/youtubeWebhook";
import {YouTubeService} from "../services/youtubeService";
import {BotClient} from "../types/client";

export class ClientReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, once: true, event: "clientReady" });
    }

    /**
     * Run method for the client.on("ready") event
     * @param client The client that just logged in
     */
    public async run(client: BotClient): Promise<void> {
        const { username, id } = client.user!;
        this.container.logger.info(`Successfully logged in as ${username} (${id})`);

        startYoutubeWebhook();
        await YouTubeService.subscribeToAll();
        YouTubeService.startAutoRefresh();
    }
}