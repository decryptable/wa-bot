import fs from "fs-extra";
import createWhatsappSocket from "@/lib/socket";
import logger from "./logger";
import { type Contact } from "@whiskeysockets/baileys";

const sessionPromises: Record<string, ReturnType<typeof createWhatsappSocket>> = {};

/**
 * Get or create a WhatsApp session by sessionId.
 */
export const createOrGetSession = async (sessionId: string): Promise<ReturnType<typeof createWhatsappSocket>> =>
{
    // If session is being created, return the existing Promise
    if (await sessionPromises[sessionId])
    {
        return sessionPromises[sessionId];
    }

    // Otherwise, create a new session and cache the Promise
    sessionPromises[sessionId] = createWhatsappSocket(sessionId);

    return sessionPromises[sessionId];
};

/**
 * Initialize all existing sessions from the .sessions folder.
 */
export const initializeAllSessions = async (): Promise<void> =>
{
    const sessionsPath = `.sessions`;

    try
    {
        if (!fs.existsSync(sessionsPath))
        {
            logger.info("No sessions folder found. Skipping initialization.");
            return;
        }

        const sessionIds = fs.readdirSync(sessionsPath).filter((file) =>
        {
            const sessionPath = `${sessionsPath}/${file}`;
            return fs.statSync(sessionPath).isDirectory();
        });

        for (const sessionId of sessionIds)
        {
            if (!sessionPromises[sessionId])
            {
                logger.info(`Initializing session: ${sessionId}`);
                sessionPromises[sessionId] = createWhatsappSocket(sessionId);
            }
        }

        logger.info(`All sessions initialized successfully. Total: ${sessionIds.length}`);
    } catch (error)
    {
        logger.error(error, "Failed to initialize sessions.");
        throw new Error("Failed to initialize sessions.");
    }
};

/**
 * Remove a WhatsApp session by sessionId.
 */
export const removeSession = async (sessionId: string): Promise<void> =>
{
    if (await sessionPromises[sessionId])
    {
        const sessionPath = `.sessions/${sessionId}`;
        try
        {
            const socket = await sessionPromises[sessionId];

            if (socket.ws.isClosed)
            {
                fs.removeSync(sessionPath);
            }
        } catch (error)
        {
            logger.error(error, `Failed to clean up session ${sessionId}`);
        }
        delete sessionPromises[sessionId];
        logger.info(`Session ${sessionId} removed successfully.`);
    }
};

/**
 * Get all session IDs.
 */
export const getAllSessions = (): string[] =>
{
    return Object.keys(sessionPromises); // Return only the session IDs
};

/**
 * Check if a session exists by sessionId.
 */
export const isSessionExist = async (sessionId: string): Promise<boolean> =>
{
    // Check if session is being created
    if (await sessionPromises[sessionId])
    {
        return true;
    }

    // Check if session folder exists
    const sessionPath = `.sessions/${sessionId}`;
    if (fs.existsSync(sessionPath))
    {
        // Recreate session if folder exists but not in memory
        sessionPromises[sessionId] = createWhatsappSocket(sessionId);
        return true;
    }

    return false; // Session does not exist
};

/**
 * Save contacts to a session file.
 */
export const saveContactsToSession = async (contacts: Contact[], sessionId: string): Promise<void> =>
{
    logger.info(`Saving ${contacts.length} contacts for session ID: ${sessionId}`)
    const sessionPath = `.sessions/${sessionId}`;
    const contactsFilePath = `${sessionPath}/contacts.json`;

    try
    {
        if (!fs.existsSync(sessionPath))
        {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        await fs.writeJSON(contactsFilePath, contacts, { spaces: 2 });
        logger.info(`Contacts saved successfully for session ${sessionId}`);
    } catch (error)
    {
        logger.error(error, `Failed to save contacts for session ${sessionId}`);
        throw new Error(`Failed to save contacts for session ${sessionId}`);
    }
};

/**
 * Get all contacts from a session file.
 */
export const getAllContacts = async (sessionId: string): Promise<Contact[]> =>
{
    const sessionPath = `.sessions/${sessionId}`;
    const contactsFilePath = `${sessionPath}/contacts.json`;

    try
    {
        if (!fs.existsSync(contactsFilePath))
        {
            logger.warn(`Contacts file not found for session ${sessionId}`);
            return [];
        }

        const contacts = await fs.readJSON(contactsFilePath);
        logger.info(`Contacts loaded successfully for session ${sessionId}`);
        return contacts;
    } catch (error)
    {
        logger.error(error, `Failed to load contacts for session ${sessionId}`);
        throw new Error(`Failed to load contacts for session ${sessionId}`);
    }
};