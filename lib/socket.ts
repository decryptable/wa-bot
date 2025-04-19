import makeWASocket, { Browsers, DisconnectReason, isJidBroadcast, isJidGroup, isJidNewsletter, isJidStatusBroadcast, isJidUser, proto, useMultiFileAuthState, type Contact } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import logger from "@/lib/logger"
import fs from "fs-extra"
import path from "path"
import NodeCache from "node-cache"
import { getAllContacts, removeSession, saveContactsToSession } from "./sessions"
import utils from "./utils"
import Long from "long"


const command_prefix = utils.getCommandPrefix()
const commands_handler_dir = "./commands/";
const appName = utils.getAppName();
const appVersion = utils.getAppVersion();

export let LOGGED_IN = true;
/**
 * Asynchronously loads command modules from a specified directory and returns them as a record.
 *
 * This function reads all TypeScript files (`.ts`) from the `commands_handler_dir` directory,
 * dynamically imports each file, and extracts the command object. The command name is determined
 * from the `name`, `commandName`, or `command` property of the imported module. Each command is
 * then stored in a record with the command name as the key.
 *
 * @returns {Promise<Record<string, any>>} A promise that resolves to a record of commands,
 * where the keys are command names and the values are the corresponding command objects.
 *
 * @throws {Error} If there is an issue reading the directory or importing a command file.
 */
const loadCommands = async (): Promise<Record<string, any>> =>
{
    const files = fs.readdirSync(commands_handler_dir).filter((file) => file.endsWith(".ts"));
    const commands: Record<string, any> = {};

    for (const file of files)
    {
        const filePath = path.resolve(commands_handler_dir, file);
        logger.info(`Loading command from: ${filePath}`);

        const command = (await import(filePath)).default;
        const commandName = command.name || command.commandName || command.command;

        if (commandName)
        {
            logger.info(`Command loaded: ${command_prefix}${commandName}`);
            commands[commandName] = command;
        }
    }

    return commands;
};



/**
 * Creates a WhatsApp socket connection using the provided session ID.
 * This function initializes the socket with various event listeners to handle
 * authentication, group updates, call rejections, connection updates, and incoming messages.
 *
 * @param sessionId - A unique identifier for the session, used to manage authentication state.
 * @returns A promise that resolves to the initialized WhatsApp socket instance.
 *
 * @remarks
 * - The function uses `useMultiFileAuthState` to manage authentication credentials.
 * - It listens to multiple events such as `creds.update`, `groups.update`, `call`, 
 *   `group-participants.update`, `connection.update`, and `messages.upsert`.
 * - Automatically handles reconnection logic when the connection is closed, unless the user is logged out.
 * - Processes incoming messages to execute commands based on a predefined command prefix.
 *
 * @example
 * ```typescript
 * const sessionId = "my-session-id";
 * const socket = await createWhatsappSocket(sessionId);
 * socket.sendMessage("123456789@s.whatsapp.net", { text: "Hello, World!" });
 * ```
 */
const createWhatsappSocket = async (sessionId: string): Promise<ReturnType<typeof makeWASocket>> =>
{
    const contextInfo: proto.IContextInfo = {
        expiration: 10,
        disappearingMode: {
            initiatedByMe: true,
            initiator: 1,
            trigger: 1,
        },
        externalAdReply: {
            thumbnail: fs.readFileSync("./public/icon.png"),
            sourceUrl: `author: ${utils.getAppAuthor()}`,
            mediaUrl: `author: ${utils.getAppAuthor()}`,
            mediaType: 1,
            body: `${utils.getAppDescription()} - v${utils.getAppVersion()}`,
            title: utils.getAppName(),
            showAdAttribution: true,
            renderLargerThumbnail: true
        },
    }

    const commands = await loadCommands();
    const commands_list = Object.keys(commands).map((command) =>
    {
        return `\`\`\`${command_prefix}${command}\`\`\` - ${commands[command].description || "No description available"}`;
    });

    const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

    const commands_list_message = `Available commands:\n${commands_list.join("\n")}`;


    const sessionPath = `.sessions/${sessionId}`;
    const qrFilePath = path.join(sessionPath, "qr.txt");

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    const socket = makeWASocket({
        printQRInTerminal: false,
        qrTimeout: 30 * 1000,
        logger: logger,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        shouldIgnoreJid (jid)
        {
            const isNewsletter = isJidNewsletter(jid);
            const isBroadcast = isJidBroadcast(jid);
            const isStatus = isJidStatusBroadcast(jid);

            return isNewsletter || isBroadcast || isStatus;
        },
        markOnlineOnConnect: true,
        browser: Browsers.windows(appName),
        auth: state,
        patchMessageBeforeSending (msg, recipientJids)
        {
            const mergeContextInfo = (original?: proto.IContextInfo): proto.IContextInfo => ({
                ...(original || {}),
                ...(contextInfo || {}),
            });

            if (msg.extendedTextMessage)
            {
                msg.extendedTextMessage.contextInfo = mergeContextInfo(msg.extendedTextMessage.contextInfo);
            }

            if (msg.imageMessage)
            {
                msg.imageMessage.contextInfo = mergeContextInfo(msg.imageMessage.contextInfo);
            }

            if (msg.videoMessage)
            {
                msg.videoMessage.contextInfo = mergeContextInfo(msg.videoMessage.contextInfo);
            }

            if (msg.stickerMessage)
            {
                msg.stickerMessage.contextInfo = mergeContextInfo(msg.stickerMessage.contextInfo);
            }

            if (msg.documentMessage)
            {
                msg.documentMessage.contextInfo = mergeContextInfo(msg.documentMessage.contextInfo);
            }

            if (msg.contactMessage)
            {
                msg.contactMessage.contextInfo = mergeContextInfo(msg.contactMessage.contextInfo);
            }

            if (msg.ptvMessage)
            {
                msg.ptvMessage.contextInfo = mergeContextInfo(msg.ptvMessage.contextInfo);
            }

            return msg;
        },
    })

    socket.ev.on('creds.update', saveCreds)

    socket.ev.on('contacts.upsert', data =>
    {
        // Filter out duplicate contacts based on their `id`
        const uniqueContacts = data.filter((contact, index, self) =>
            index === self.findIndex(c => c.id === contact.id)
        );

        // Sort contacts by `name`
        uniqueContacts.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        saveContactsToSession(uniqueContacts, sessionId);
    });

    socket.ev.on("contacts.update", async data =>
    {
        // Filter out duplicate contacts based on their `id`
        const uniqueContacts = data.filter((contact, index, self) =>
            index === self.findIndex(c => c.id === contact.id)
        );

        let oldContacts = await getAllContacts(sessionId);

        // Combine old and new contacts, then filter by unique `id`
        const combinedContacts = [...oldContacts, ...uniqueContacts];
        const mergedContacts = combinedContacts.filter((contact, index, self) =>
            index === self.findIndex(c => c.id === contact.id)
        );

        // Sort contacts by `name`
        const validContacts = mergedContacts
            .filter(contact => contact.id !== undefined) as Contact[];
        validContacts.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        saveContactsToSession(validContacts, sessionId);
    });
    socket.ev.on('groups.update', async ([event]) =>
    {
        const metadata = await socket.groupMetadata(event.id as string)
        groupCache.set(event.id as string, metadata)
    })

    socket.ev.on("call", (callEvent =>
    {
        try
        {
            callEvent.forEach(call =>
            {
                logger.info(call, "Call rejected!")
                socket.rejectCall(call.id, call.from)
            })
        } catch (error)
        {
            logger.error(error, "Error in 'call' event!")
        }
    }))

    socket.ev.on('group-participants.update', async (event) =>
    {
        const metadata = await socket.groupMetadata(event.id)
        groupCache.set(event.id, metadata)
    })

    socket.ev.on('connection.update', async (update) =>
    {
        const { connection, lastDisconnect, isNewLogin, isOnline, qr } = update;

        if (connection === 'close')
        {
            logger.warn(lastDisconnect, "Connection closed")

            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect)
            {
                createWhatsappSocket(sessionId);
            } else
            {
                logger.info(`Session ${sessionId} logged out.`);
                LOGGED_IN = false;
                if (socket.authState.creds.me?.id)
                {
                    removeSession(sessionId);
                }
            }
        }

        if (isNewLogin)
        {
            logger.info(`Connected to ${appName}!`);
            fs.removeSync(qrFilePath)
        }

        if (qr)
        {
            try
            {

                if (!fs.existsSync(sessionPath))
                {
                    fs.mkdirSync(sessionPath, { recursive: true });
                }


                fs.writeFileSync(qrFilePath, qr);
                logger.info(`QR code saved to ${qrFilePath}`);
            } catch (error)
            {
                logger.error(error, `Failed to save QR code for session ${sessionId}`);
            }
        }

        if (connection === 'open')
        {
            logger.info('Connection opened');
            fs.removeSync(qrFilePath)
        }

        if (connection === 'connecting')
        {
            logger.info('Connecting to Whatsapp...');
        }

        if (isOnline)
        {
            fs.removeSync(qrFilePath)
        }
    });


    socket.ev.on("messages.upsert", async (m) =>
    {
        try
        {
            if (!m.messages || m.messages.length === 0) return



            const msg = m.messages[0]
            logger.info(m, "new message!")

            if (msg.key && msg.key.remoteJid === "status@broadcast") return


            if (m.type === "notify" && msg.message?.conversation)
            {
                const command = msg.message.conversation.split(" ")[0].replace(command_prefix, "");
                const args = msg.message.conversation
                    .replace(command_prefix + command, "")
                    .split("|")
                    .map(arg => arg.trim())
                    .filter(arg => arg.length > 0);
                const jid = msg.key.remoteJid || msg.key.participant as string;
                const phoneNumber = utils.jidToPhoneNumber(jid)

                const isCommand = msg.message.conversation.startsWith(command_prefix);
                if (!isCommand) return;

                if (command === "help" || command === "commands")
                {
                    if (Object.keys(commands).length === 0)
                    {
                        await socket.sendMessage(jid, { text: "No commands available." });
                        return;
                    }

                    await socket.sendMessage(jid, { text: commands_list_message, contextInfo, });
                    return;
                }

                if (commands[command])
                {
                    logger.info(`Executing command: ${command} from ${phoneNumber} ${args.length > 0 ? `with args: ${args}` : ""}`);
                    commands[command].execute(socket, { jid, msg, args });
                }
            }

            if (m.type === "notify" && msg.message?.extendedTextMessage?.text)
            {
                const command = msg.message.extendedTextMessage.text.split(" ")[0].replace(command_prefix, "");
                const args = msg.message.extendedTextMessage.text
                    .replace(command_prefix + command, "")
                    .split("|")
                    .map(arg => arg.trim())
                    .filter(arg => arg.length > 0);
                const jid = msg.key.remoteJid || msg.key.participant as string;
                const phoneNumber = utils.jidToPhoneNumber(jid)

                const isCommand = msg.message.extendedTextMessage.text.startsWith(command_prefix);
                if (!isCommand) return;

                if (command === "help" || command === "commands")
                {
                    if (Object.keys(commands).length === 0)
                    {
                        await socket.sendMessage(jid, { text: "No commands available." });
                        return;
                    }

                    await socket.sendMessage(jid, { text: commands_list_message, contextInfo });
                    return;
                }

                if (commands[command])
                {
                    logger.info(`Executing command: ${command} from ${phoneNumber} ${args.length > 0 ? `with args: ${args}` : ""}`);
                    commands[command].execute(socket, { jid, msg, args });
                }
            }

            if (m.type === "notify" && msg.message?.ephemeralMessage?.message.extendedTextMessage.text)
            {
                const command = msg.message?.ephemeralMessage?.message.extendedTextMessage.text.split(" ")[0].replace(command_prefix, "");
                const args = msg.message?.ephemeralMessage?.message.extendedTextMessage.text
                    .replace(command_prefix + command, "")
                    .split("|")
                    .map(arg => arg.trim())
                    .filter(arg => arg.length > 0);
                const jid = msg.key.remoteJid || msg.key.participant as string;
                const phoneNumber = utils.jidToPhoneNumber(jid)

                const isCommand = msg.message?.ephemeralMessage?.message.extendedTextMessage.text.startsWith(command_prefix);
                if (!isCommand) return;

                if (command === "help" || command === "commands")
                {
                    if (Object.keys(commands).length === 0)
                    {
                        await socket.sendMessage(jid, { text: "No commands available." });
                        return;
                    }

                    await socket.sendMessage(jid, { text: commands_list_message, contextInfo });
                    return;
                }

                if (commands[command])
                {
                    logger.info(`Executing command: ${command} from ${phoneNumber} ${args.length > 0 ? `with args: ${args}` : ""}`);
                    commands[command].execute(socket, { jid, msg, args });
                }
            }
        } catch (error)
        {
            logger.error(error, "Error in 'message.upsert' event!")
        }
    })
    return socket;
}



export default createWhatsappSocket