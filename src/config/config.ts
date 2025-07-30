import {GatewayIntentBits} from "discord-api-types/v10";
import {Partials} from "discord.js";
import * as dotenv from "dotenv";

export type ClientConfig = {
    token: string;
    owners: string[];
};

export type ClientOptions = {
    disableMentions: "all" | "everyone" | "none";
    partials: Partials[];
    intents: GatewayIntentBits[];
    loadMessageCommandListeners: boolean;
};

export type DatabaseConfig = {
    name: string;
    url: string;
};

export type ApiConfig = {
    statbotApiKey: string;
}

export class Config {
    private static instance: Config;
    private clientConfig: ClientConfig;
    private clientOptions: ClientOptions;
    private databaseConfig: DatabaseConfig;
    private apiConfig: ApiConfig;

    private constructor(clientConfig: ClientConfig, clientOptions: ClientOptions, databaseConfig: DatabaseConfig, apiConfig: ApiConfig) {
        this.clientConfig = clientConfig;
        this.clientOptions = clientOptions;
        this.databaseConfig = databaseConfig;
        this.apiConfig = apiConfig;
    }

    public static getInstance(): Config {
        if (!this.instance) {
            dotenv.config();

            const clientConfig: ClientConfig = {
                token: process.env.TOKEN!,
                owners: (process.env["OWNERS"] ?? "").split(",").filter(Boolean),
            };

            const clientOptions: ClientOptions = {
                disableMentions: (process.env.DISABLE_MENTIONS as any) ?? "none",
                partials: (process.env.PARTIALS ?? "").split(",").filter(Boolean).map((p) => p.trim() as unknown as Partials),
                intents: (process.env.INTENTS ?? "").split(",").filter(Boolean).map((i) => (GatewayIntentBits as any)[i.trim()]),
                loadMessageCommandListeners:
                    process.env.LOAD_MESSAGE_COMMAND_LISTENERS === "true",
            };

            const databaseConfig: DatabaseConfig = {
                name: process.env.DB_NAME!,
                url: process.env.DB_URL!,
            };

            const apiConfig: ApiConfig = {
                statbotApiKey: process.env.STATBOTAPI ?? "",
            }

            this.instance = new Config(
                clientConfig,
                clientOptions,
                databaseConfig,
                apiConfig
            );
        }

        return this.instance;
    }

    public getClientConfig(): ClientConfig {
        return this.clientConfig;
    }

    public getClientOptions(): ClientOptions {
        return this.clientOptions;
    }

    public getDatabaseConfig(): DatabaseConfig {
        return this.databaseConfig;
    }

    public getApiConfig(): ApiConfig {
        return this.apiConfig;
    }
}