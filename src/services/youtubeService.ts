import {container} from '@sapphire/framework';
import {Config} from "../config/config";
import Database from "../database/database";

export class YouTubeService {
    private static HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
    private static CALLBACK_URL = Config.getInstance().getApiConfig().youtubeWebhookUrl;

    public static async subscribe(channelId: string) {
        const body = new URLSearchParams({
            'hub.callback': this.CALLBACK_URL,
            'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
            'hub.verify': 'async',
            'hub.mode': 'subscribe',
            'hub.lease_seconds': '864000'
        });

        try {
            const res = await fetch(this.HUB_URL, {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (res.ok) {
                container.logger.info(`[YouTube] Subscribed to channel: ${channelId}`);
            }
        } catch (err) {
            container.logger.error(`[YouTube] Subscription failed for ${channelId}`, err);
        }
    }

    public static async unsubscribe(channelId: string) {
        const body = new URLSearchParams({
            'hub.callback': this.CALLBACK_URL,
            'hub.topic': `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`,
            'hub.verify': 'async',
            'hub.mode': 'unsubscribe'
        });

        try {
            const res = await fetch(this.HUB_URL, {
                method: 'POST',
                body,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (res.ok) {
                container.logger.info(`[YouTube] Unsubscribed from channel: ${channelId}`);
            } else {
                container.logger.error(`[YouTube] Unsubscribe request failed for ${channelId}: ${res.statusText}`);
            }
        } catch (err) {
            container.logger.error(`[YouTube] Unsubscribe error for ${channelId}`, err);
        }
    }

    public static async subscribeToAll() {
        const guilds = await Database.getInstance()!.getAllGuilds();
        const uniqueChannels = new Set<string>();

        for (const guild of guilds) {
            guild.youtubeNotifications?.channels?.forEach(c => uniqueChannels.add(c.channelId));
        }

        for (const channelId of uniqueChannels) {
            await this.subscribe(channelId);
        }
    }

    public static startAutoRefresh() {
        setInterval(() => {
            container.logger.info('[YouTube] Running weekly subscription refresh...');
            this.subscribeToAll();
        }, 1000 * 60 * 60 * 24 * 7);
    }
}