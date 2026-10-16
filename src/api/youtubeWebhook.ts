import express from 'express';
import {XMLParser} from 'fast-xml-parser';
import {container} from '@sapphire/framework';

let isServerStarted = false;
const recentNotifications = new Set<string>();

export const startYoutubeWebhook = () => {
    if (isServerStarted) return;
    isServerStarted = true;

    const app = express();
    const parser = new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: false
    });

    app.use(express.text({ type: ['application/atom+xml', 'application/xml', 'text/xml'] }));

    app.use((req, _res, next) => {
        console.log(`[INCOMING WEBHOOK] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        if (req.body) {
            console.log('Body:', req.body);
        }
        next();
    });

    app.get('/youtube/callback', (req, res) => {
        const challenge = req.query['hub.challenge'];
        if (challenge) return res.status(200).send(challenge);
        return res.status(404).end();
    });

    app.post('/youtube/callback', (req, res) => {
        try {
            if (!req.body) {
                container.logger.warn('[Webhook] Received empty body in YouTube callback');
                return res.status(200).end();
            }

            const jsonObj = parser.parse(req.body);
            const entry = jsonObj.feed?.entry;

            if (entry) {
                const entries = Array.isArray(entry) ? entry : [entry];

                for (const item of entries) {
                    const videoId = item['yt:videoId'];
                    const channelId = item['yt:channelId'];
                    const publishedStr = item.published;

                    if (videoId && channelId) {
                        if (recentNotifications.has(videoId)) {
                            container.logger.info(`[Webhook] Skipped duplicate webhook notification for video: ${videoId}`);
                            continue;
                        }

                        if (publishedStr) {
                            const publishedTime = new Date(publishedStr).getTime();
                            const now = Date.now();
                            const MAX_AGE_MS = 15 * 60 * 1000;

                            if ((now - publishedTime) > MAX_AGE_MS) {
                                container.logger.info(`[Webhook] Ignored late webhook/edit for old video: ${videoId}`);
                                continue;
                            }
                        }

                        recentNotifications.add(videoId);
                        setTimeout(() => recentNotifications.delete(videoId), 10 * 60 * 1000);

                        container.client.emit('youtubeNotification', { videoId, channelId });
                    }
                }
            }
        } catch (error) {
            container.logger.error('[Webhook] XML Parsing error:', error);
        }

        res.status(200).end();
    });

    app.listen(3005, () => container.logger.info('YouTube Webhook server listening on port 3005'));
};