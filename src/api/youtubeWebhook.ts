import express from 'express';
import {XMLParser} from 'fast-xml-parser';
import {container} from '@sapphire/framework';

export const startYoutubeWebhook = () => {
    const app = express();
    const parser = new XMLParser();
    app.use(express.text({ type: ['application/atom+xml', 'application/xml'] }));

    app.get('/youtube/callback', (req, res) => {
        const challenge = req.query['hub.challenge'];
        if (challenge) return res.status(200).send(challenge);
        return res.status(404).end();
    });

    app.post('/youtube/callback', (req, res) => {
        try {
            const jsonObj = parser.parse(req.body);
            const entry = jsonObj.feed?.entry;

            if (entry) {
                const entries = Array.isArray(entry) ? entry : [entry];

                for (const item of entries) {
                    const videoId = item['yt:videoId'];
                    const channelId = item['yt:channelId'];

                    if (videoId && channelId) {
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