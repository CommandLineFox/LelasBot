import mongoose, {Document, Model, Schema} from 'mongoose';
import {DatabaseConfig} from '../config/config';
import {YouTubeNotificationsConfig, YouTubeChannelConfig,} from '../types/guild';

/**
 * We only declare the shape *inside* the Document that Mongoose uses.
 * We do NOT extend your Guild interface here to avoid the `id`‐property clash.
 */
interface GuildDocument extends Document {
    /** must match your `Guild.id` */
    id: string;
    /** optional notifications block */
    youtubeNotifications?: YouTubeNotificationsConfig;
}

const youtubeChannelSchema = new Schema<YouTubeChannelConfig>(
    {
        channelId: { type: String, required: true },
        uploadDiscordChannelId: { type: String, required: true },
        liveDiscordChannelId: { type: String, required: true },
        scheduleDiscordChannelId: { type: String, required: true },

        uploadEnabled: { type: Boolean, default: true },
        liveEnabled: { type: Boolean, default: true },
        scheduleEnabled: { type: Boolean, default: true },

        uploadMentionRoleIds: { type: [String], default: [] },
        liveMentionRoleIds: { type: [String], default: [] },
        scheduleMentionRoleIds: { type: [String], default: [] },
    },
    { _id: false }
);

const youtubeNotificationsSchema = new Schema<YouTubeNotificationsConfig>({ pollIntervalSeconds: { type: Number, default: 30 }, channels: { type: [youtubeChannelSchema], required: true }, }, { _id: false });

const guildSchema = new Schema<GuildDocument>({ id: { type: String, required: true, unique: true }, youtubeNotifications: { type: youtubeNotificationsSchema, required: false }, }, { timestamps: true });

const GuildModel: Model<GuildDocument> = mongoose.models.Guild || mongoose.model<GuildDocument>('Guild', guildSchema);

export default class Database {
    private static instance: Database;

    private constructor(private cfg: DatabaseConfig) {
        mongoose.set('strictQuery', false);
    }

    /** Get or create the singleton */
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

    /** Open connection */
    public async connect(): Promise<void> {
        await mongoose.connect(this.cfg.url, { dbName: this.cfg.name });
        console.info('🗄️  Connected to MongoDB');
    }

    /** Close connection */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.info('🗄️  Disconnected from MongoDB');
    }

    /**
     * Return the raw guild document as a plain JS object,
     * matching your `Guild` interface shape exactly.
     */
    public async getGuild(id: string) {
        return GuildModel.findOne({ id }).lean();
    }
}