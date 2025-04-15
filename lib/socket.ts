import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState, type UserFacingSocketConfig } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import utils from "@/lib/utils"
import logger from "@/lib/logger"
import fs from "fs-extra"
import path from "path"
import NodeCache from "node-cache"


const command_prefix = process.env.COMMAND_PREFIX || "!";
const commands_handler_dir = "./commands/";

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

const commands = await loadCommands();
const commands_list = Object.keys(commands).map((command) =>
{
    return `${command_prefix}${command} - ${commands[command].description || "No description available"}`;
});

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })

const commands_list_message = `Available commands:\n${commands_list}`;


/**
 * Creates and initializes a WhatsApp Web socket connection with the provided configuration options.
 * 
 * This function sets up event listeners for various WhatsApp events, such as connection updates,
 * group updates, participant updates, incoming messages, and call events. It also handles
 * authentication state management, QR code generation, and reconnection logic.
 * 
 * @param {...UserFacingSocketConfig[]} opts - Optional configuration options for the socket.
 * 
 * @returns {Promise<ReturnType<typeof makeWASocket>>} A promise that resolves to the initialized WhatsApp socket instance.
 * 
 * @remarks
 * - The function uses multi-file authentication state stored in the `.sessions` directory.
 * - It caches group metadata for efficient access.
 * - Automatically rejects incoming calls and logs the events.
 * - Handles commands sent via messages, with support for a command prefix and argument parsing.
 * - Reconnects automatically if the connection is closed due to reasons other than logout.
 * - Sends a notification message when the connection is established and the user is online.
 * 
 * @example
 * ```typescript
 * const socket = await createWhatsappSocket();
 * socket.sendMessage("123456789@s.whatsapp.net", { text: "Hello, World!" });
 * ```
 */
const createWhatsappSocket = async (...opts: UserFacingSocketConfig[]): Promise<ReturnType<typeof makeWASocket>> =>
{
    const { state, saveCreds } = await useMultiFileAuthState(".sessions")

    const socket = makeWASocket({
        printQRInTerminal: false,
        logger: logger,
        syncFullHistory: false,
        cachedGroupMetadata: async (jid) => groupCache.get(jid),
        shouldIgnoreJid (jid)
        {
            const disabledJid = ["@newsletter", "@bot", "3F214E7E1377071F2B0E"]

            return disabledJid.some(disabled => jid.includes(disabled))
        },
        markOnlineOnConnect: true,
        browser: Browsers.windows(process.env.APP_NAME || "Desktop"),
        ...{ ...opts, auth: state },
    })

    socket.ev.on('creds.update', saveCreds)

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

    socket.ev.on('connection.update', (update) =>
    {
        const { connection, lastDisconnect, isNewLogin, isOnline, qr, legacy } = update
        if (connection === 'close')
        {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            logger.info('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect)
            if (shouldReconnect)
            {
                createWhatsappSocket()
            } else
            {
                logger.info('Connection closed. You are logged out.')
                fs.removeSync('.sessions')
                logger.info('Session removed.')
                createWhatsappSocket()
            }
        }
        if (isNewLogin)
        {
            logger.info('New login detected')
        }
        if (qr)
        {
            utils.printQR(qr)
        }

        if (connection === 'open')
        {
            logger.info('Connection opened')
        }

        if (connection === 'connecting')
        {
            logger.info('Connecting to Whatsapp...')
        }

        if (isOnline)
        {
            socket.sendMessage(socket.user?.id as string, {
                text: "You're now online!"
            })
        }

        if (legacy)
        {
            logger.info('Legacy connection detected')
        }

        if (connection === 'connecting' && !isOnline)
        {
            logger.info('You are offline')
        }
    })

    socket.ev.on("messages.upsert", async (m) =>
    {
        try
        {
            if (!m.messages || m.messages.length === 0) return

            const msg = m.messages[0]

            if (msg.key && msg.key.remoteJid === "status@broadcast") return


            if (m.type === "notify" && msg.message?.conversation)
            {
                const command = msg.message.conversation.split(" ")[0].replace(command_prefix, "");
                const args = msg.message.conversation
                    .replace(command_prefix + command, "")
                    .split("|")
                    .map((arg) => arg.trim());
                const jid = msg.key.participant || msg.key.remoteJid as string;

                const isCommand = msg.message.conversation.startsWith(command_prefix);
                if (!isCommand) return;

                if (command === "help" || command === "commands")
                {
                    if (Object.keys(commands).length === 0)
                    {
                        await socket.sendMessage(jid, { text: "No commands available." });
                        return;
                    }

                    await socket.sendMessage(jid, { text: commands_list_message });
                    return;
                }

                if (commands[command])
                {
                    logger.info(`Executing command: ${command} from ${jid} with args: ${args.length > 0 ? args : "-"}`);
                    commands[command].execute(socket, { jid, msg, args });
                }
            }
            else if (m.type === "notify" && msg.message?.extendedTextMessage?.text)
            {
                const command = msg.message.extendedTextMessage.text.split(" ")[0].replace(command_prefix, "");
                const args = msg.message.extendedTextMessage.text
                    .replace(command_prefix + command, "")
                    .split("|")
                    .map((arg) => arg.trim());
                const jid = msg.key.participant || msg.key.remoteJid as string;

                const isCommand = msg.message.extendedTextMessage.text.startsWith(command_prefix);
                if (!isCommand) return;

                if (command === "help" || command === "commands")
                {
                    if (Object.keys(commands).length === 0)
                    {
                        await socket.sendMessage(jid, { text: "No commands available." });
                        return;
                    }

                    await socket.sendMessage(jid, { text: commands_list_message });
                    return;
                }

                if (commands[command])
                {
                    logger.info(`Executing command: ${command} from ${jid} with args: ${args.length > 0 ? args : "-"}`);
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