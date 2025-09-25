import mongoose, {Document, Model, Schema} from 'mongoose';
import {DatabaseConfig} from '../config/config';
import {YouTubeNotificationsConfig, YouTubeChannelConfig,} from '../types/guild';

interface GuildDocument extends Document {
    id: string;
    youtubeNotifications?: YouTubeNotificationsConfig;
}

const youtubeChannelSchema = new Schema<YouTubeChannelConfig>(
    {
        channelId: { type: String, required: true },
        uploadDiscordChannelId: { type: String },
        liveDiscordChannelId: { type: String },
        scheduleDiscordChannelId: { type: String },

        uploadEnabled: { type: Boolean, default: true },
        liveEnabled: { type: Boolean, default: true },
        scheduleEnabled: { type: Boolean, default: true },

        uploadMentionRoleId: { type: String, default: null },
        liveMentionRoleId: { type: String, default: null },
        scheduleMentionRoleId: { type: String, default: null },

        lastUpload: { type: String },
        lastLive: { type: String },
        lastScheduledStream: { type: String },

        uploadsPlaylistId: { type: String },
    },
    { _id: false }
);

const youtubeNotificationsSchema = new Schema<YouTubeNotificationsConfig>(
    {
        channels: { type: [youtubeChannelSchema], required: true, default: [] },
        currentChannelId: { type: String, required: false },
    },
    { _id: false }
);

const guildSchema = new Schema<GuildDocument>(
    {
        id: { type: String, required: true, unique: true },
        youtubeNotifications: { type: youtubeNotificationsSchema, required: false },
    }
);

const GuildModel: Model<GuildDocument> = mongoose.models.Guild || mongoose.model<GuildDocument>('Guild', guildSchema);

export default class Database {
    private static instance: Database;

    private constructor(private cfg: DatabaseConfig) {
        mongoose.set('strictQuery', false);
    }

    /**
     * Get or create the singleton
     */
    public static getInstance(cfg?: DatabaseConfig): Database | null {
        if (!Database.instance) {
            if (!cfg) {
                console.info("Couldn't find database config, using default values.");
                return null;
            }

            Database.instance = new Database(cfg);
        }
        return Database.instance;
    }

    /**
     * Open connection
     */
    public async connect(): Promise<void> {
        await mongoose.connect(this.cfg.url, { dbName: this.cfg.name });
        console.info('Connected to MongoDB');
    }

    /**
     * Close connection
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.info('Disconnected from MongoDB');
    }

    /**
     * Get a specific guild
     * @param id Discord guild ID
     */
    public async getGuild(id: string) {
        let guild = await GuildModel.findOne({ id });
        if (!guild) {
            guild = new GuildModel({
                id,
                youtubeNotifications: {
                    channels: []
                }
            });
            await guild.save();
        }
        return guild;
    }

    /**
     * Return all guilds
     */
    public async getAllGuilds() {
        return GuildModel.find().lean();
    }
}