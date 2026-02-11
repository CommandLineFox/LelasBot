import {Document} from "mongoose";
import Database from "../database/database";
import {CustomResponse} from "../types/customResponse";

/**
 * Set a value in the database
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param value Value to be assigned
 * @param alreadySetMessage Error message for when a value is already set
 * @param successMessage Success message
 * @param errorMessage Eror message for if the value fails to be set
 * @returns Response indicating success or failure
 */
export async function setValue(guildId: string, databaseLocation: string, value: any, alreadySetMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    const currentValue = guild.get(databaseLocation);
    if (currentValue === value) {
        return { success: false, message: alreadySetMessage };
    }

    guild.set(databaseLocation, value);
    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}

/**
 * Unset a value in the database
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param notSetMessage Error when message isn't set
 * @param successMessage Success message
 * @param errorMessage Eror message for if the value fails to be set
 * @returns Response indicating success or failure
 */
export async function unsetValue(guildId: string, databaseLocation: string, notSetMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    const currentValue = guild.get(databaseLocation);
    if (!currentValue) {
        return { success: false, message: notSetMessage };
    }

    guild.set(databaseLocation, undefined);
    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}

/**
 * Add a value to an array in the database
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param value Value to be assigned
 * @param existsMessage Whether the message already exists
 * @param successMessage Success message
 * @param errorMessage Eror message for if the value fails to be set
 * @returns Response indicating success or failure
 */
export async function addToArray(guildId: string, databaseLocation: string, value: any, existsMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    const array = guild.get(databaseLocation) || [];
    if (array.includes(value)) {
        return { success: false, message: existsMessage };
    }

    array.push(value);
    guild.set(databaseLocation, array);
    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}

/**
 * Remove a value from an array in the database by value or index
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param valueOrIndex Value to be removed or index of the value to be removed
 * @param isIndex Flag to indicate if the second parameter is an index
 * @param notExistsMessage Error message for when the value or index does not exist
 * @param successMessage Success message
 * @param errorMessage Error message for if the value fails to be removed
 * @returns Response indicating success or failure
 */
export async function removeFromArray(guildId: string, databaseLocation: string, valueOrIndex: any, isIndex: boolean, notExistsMessage: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    const array = guild.get(databaseLocation) || [];
    let index: number;

    if (isIndex) {
        index = valueOrIndex;
        if (index < 0 || index >= array.length) {
            return { success: false, message: notExistsMessage };
        }
    } else {
        if (typeof valueOrIndex === 'object') {
            index = array.findIndex((element: any) =>
                Object.entries(valueOrIndex).every(
                    ([key, val]) => element?.[key] === val
                )
            );
        } else {
            index = array.indexOf(valueOrIndex);
        }
        if (index === -1) {
            return { success: false, message: notExistsMessage };
        }
    }

    array.splice(index, 1);
    guild.set(databaseLocation, array);
    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}

/**
 * Remove all values from an array in the database
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param successMessage Success message
 * @param errorMessage Error message if the operation fails
 * @returns Response indicating success or failure
 */
export async function removeAllFromArray(guildId: string, databaseLocation: string, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    guild.set(databaseLocation, []);

    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}

/**
 * Reposition a value in the database
 * @param guildId ID of the guild
 * @param databaseLocation Location of the object
 * @param oldIndex Old index of the element
 * @param newIndex New index of the element
 * @param successMessage Success message
 * @param errorMessage Eror message for if the value fails to be set
 * @returns Response indicating success or failure
 */
export async function repositionArrayItem(guildId: string, databaseLocation: string, oldIndex: number, newIndex: number, successMessage: string, errorMessage: string): Promise<CustomResponse> {
    const database = Database.getInstance();
    if (!database) {
        return { success: false, message: "There was an error fetching the database." };
    }

    const guild = await database.getGuild(guildId) as Document | null;
    if (!guild) {
        return { success: false, message: "There was an error fetching the guild." };
    }

    const array = guild.get(databaseLocation) || [];
    if (oldIndex < 0 || oldIndex >= array.length || newIndex < 0 || newIndex >= array.length || oldIndex === newIndex) {
        return { success: false, message: "Invalid index." };
    }

    const [item] = array.splice(oldIndex, 1);
    array.splice(newIndex, 0, item);

    guild.set(databaseLocation, array);
    try {
        await guild.save();
        return { success: true, message: successMessage };
    } catch (error) {
        return { success: false, message: errorMessage };
    }
}