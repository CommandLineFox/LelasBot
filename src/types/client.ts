import {SapphireClient} from '@sapphire/framework';
import {getRootData} from '@sapphire/pieces';
import type {ClientOptions} from 'discord.js';
import {join} from "node:path";
import {GuildService} from "../services/guildService";

export class BotClient extends SapphireClient {
    private rootData = getRootData();
    private currentChecks = new Map<string, Map<string, boolean>>();
    private guildService = new GuildService();

    public constructor(options: ClientOptions) {
        super(options);

        this.stores.registerPath(join(this.rootData.root, 'notifier'));
        this.stores.registerPath(join(this.rootData.root, 'statbot'));
    }

    public getCurrentChecks(): Map<string, Map<string, boolean>> {
        return this.currentChecks;
    }

    public getGuildService(): GuildService {
        return this.guildService;
    }
}