declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * Standard Node environment
         */
        readonly NODE_ENV: 'development' | 'production' | 'test';

        /** Your Discord bot token */
        readonly TOKEN: string;
        /** Comma-separated list of owner IDs */
        readonly OWNERS: string;

        /** How mentions are disabled: "all" | "everyone" | "none" */
        readonly DISABLE_MENTIONS: 'all' | 'everyone' | 'none';
        /** Comma-separated Partials (e.g. "Message,Channel") */
        readonly PARTIALS: string;
        /** Comma-separated Gateway intents (e.g. "Guilds,MessageContent") */
        readonly INTENTS: string;
        /** "true" or "false" */
        readonly LOAD_MESSAGE_COMMAND_LISTENERS: 'true' | 'false';

        /** Mongo DB database name */
        readonly DB_NAME: string;
        /** Mongo DB connection URL */
        readonly DB_URL: string;
    }
}