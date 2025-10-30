import {Client} from "discord.js";

/**
 * Checks if the bot's uptime exceeds the specified minimum time.
 * @param client The bot client
 * @returns The remaining time in milliseconds if the bot hasn't reached the uptime or null
 */
export function getRemainingUptime(client: Client): number | null {
    const minUptime = 5
    const currentTime = Date.now();
    const botStartTime = client.readyTimestamp ?? currentTime;

    const elapsedTime = currentTime - botStartTime;

    if (elapsedTime >= minUptime) {
        return null;
    }

    return minUptime - elapsedTime;
}