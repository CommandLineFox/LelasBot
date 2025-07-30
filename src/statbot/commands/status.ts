import {Command} from '@sapphire/framework';
import {Subcommand} from "@sapphire/plugin-subcommands";
import {Message, PermissionFlagsBits} from 'discord.js';
import {addSeriesOptions, handleStatbotRequest,} from '../../utils/statBotApiUtils';

export class StatusCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "statbot-statuses",
            description: 'Query Statbot status data',
            detailedDescription: "Query Statbot API data for statuses",
            requiredUserPermissions: [PermissionFlagsBits.ManageGuild],
        });
    }

    public override registerApplicationCommands(registry: Subcommand.Registry): void {
        registry.registerChatInputCommand((builder) =>
            builder
                .setName("statbot-statuses")
                .setDescription("Query Statbot status data")
                .addSubcommand(cmd => {
                    addSeriesOptions(cmd);
                    return cmd
                        .setName("series")
                        .setDescription("Status series data");
                }), { idHints: [] }
        );
    }

    public override async chatInputRun(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply();

        const group = "statuses";
        const sub = interaction.options.getSubcommand(true);
        const guildId = interaction.guildId!;

        const result = await handleStatbotRequest({ group, sub, guildId, getOption: (name) => interaction.options.get(name) });

        if (!result.success) {
            await interaction.editReply({ content: `${result.error}` });
            return;
        }

        const buffer = Buffer.from(JSON.stringify(result.data, null, 2), "utf-8");
        await interaction.editReply({
            content: `Here's your Statbot data for \`${group}/${sub}\``,
            files: [{ attachment: buffer, name: `${group}-${sub}.json` }]
        });
    }

    public override async messageRun(message: Message): Promise<void> {
        const args = message.content.trim().split(/\s+/);
        if (args.length < 2) {
            await message.reply("Usage: `!statbot-statuses <sub> [key=value ...]`");
            return;
        }

        const [, sub, ...optionArgs] = args;
        const group = "statuses";

        const options: Record<string, string> = {};
        for (const arg of optionArgs) {
            const [key, ...rest] = arg.split("=");
            if (!key || !rest.length) continue;
            options[key] = rest.join("=");
        }

        const result = await handleStatbotRequest({ group, sub, guildId: message.guildId!, getOption: (name) => options[name] });

        if (!result.success) {
            await message.reply(`${result.error}`);
            return;
        }

        const buffer = Buffer.from(JSON.stringify(result.data, null, 2), "utf-8");
        await message.reply({
            content: `Here's your Statbot data for \`${group}/${sub}\``,
            files: [{ attachment: buffer, name: `${group}-${sub}.json` }]
        });
    }
}