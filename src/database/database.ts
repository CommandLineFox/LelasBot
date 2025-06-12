import {container} from "@sapphire/framework";
import mongoose, {Document, Model, Schema} from "mongoose";
import {DatabaseConfig} from "../types/config";
import {Guild as GuildType, YouTubeChannelConfig, YouTubeNotificationsConfig} from "../types/guild";

/**
 * Sub‐schema: a single YouTube channel’s settings.
 */
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

/**
 * Sub‐schema: guild‐wide notifications' config.
 */
const youtubeNotificationsSchema = new Schema<YouTubeNotificationsConfig>(
    {
        pollIntervalMinutes: { type: Number, default: 5 },
        channels: {
            type: [youtubeChannelSchema],
            required: true,
            validate: {
                validator: (arr: any[]) => arr.length > 0,
                message: "A guild must configure at least one YouTube channel."
            }
        }
    },
    { _id: false }
);

/**
 * Top‐level guild schema.
 */
const guildSchema = new Schema<GuildType>(
    {
        id: { type: String, required: true, unique: true },
        youtubeNotifications: { type: youtubeNotificationsSchema, default: undefined }
    },
    { timestamps: true }
);

/**
 * Instead of
 *   `interface GuildDocument extends GuildType, Document { … }`
 * we use a **type alias** to combine them:
 */
type GuildDocument = GuildType & Document;

/** Create the Mongoose model */
const GuildModel: Model<GuildDocument> = mongoose.model<GuildDocument>(
    "Guild",
    guildSchema
);

/**
 * Central MongoDB connector + accessors.
 */
export default class Database {
    private static instance: Database | null = null;
    private readonly guilds = GuildModel;

    private constructor(private config: DatabaseConfig) {
        mongoose.set("strictQuery", true);
    }

    /**
     * Singleton accessor.
     */
    public static getInstance(config?: DatabaseConfig): Database {
        if (!this.instance) {
            if (!config) {
                throw new Error("DatabaseConfig required to initialize Database");
            }
            this.instance = new Database(config);
        }
        return this.instance;
    }

    /**
     * Connect to MongoDB.
     */
    public async connect(): Promise<void> {
        try {
            await mongoose.connect(this.config.url, { dbName: this.config.name });
            console.log("MongoDB connected");
        } catch (err) {
            console.log("MongoDB connection error:", err);
            throw err;
        }
    }

    /**
     * Disconnect from MongoDB.
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        container.logger.info("MongoDB disconnected");
    }

    /**
     * Get or create a guild document.
     */
    private async getOrCreateGuild(id: string): Promise<GuildDocument> {
        return this.guilds
            .findOneAndUpdate(
                { id },
                { $setOnInsert: { id } },
                { new: true, upsert: true }
            )
            .exec();
    }

    /**
     * Read the YouTube config for a guild.
     */
    public async getYouTubeConfig(
        guildId: string
    ): Promise<YouTubeNotificationsConfig | undefined> {
        const guild = await this.getOrCreateGuild(guildId);
        return guild.youtubeNotifications;
    }

    /**
     * Upsert the YouTube config for a guild.
     */
    public async setYouTubeConfig(
        guildId: string,
        cfg: YouTubeNotificationsConfig
    ): Promise<YouTubeNotificationsConfig> {
        const updated = await this.guilds
            .findOneAndUpdate(
                { id: guildId },
                { youtubeNotifications: cfg },
                { new: true, upsert: true }
            )
            .exec();
        return updated.youtubeNotifications!;
    }
}