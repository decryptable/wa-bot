import type { proto } from "@whiskeysockets/baileys";
import type createWhatsappSocket from "../lib/socket";
import utils from "../lib/utils";

const pingCommand = {
    name: "ping",
    description: "Ping the bot",
    execute: async (socket: ReturnType<typeof createWhatsappSocket>, {
        jid,
        msg,
        args,
    }: {
        jid: string;
        msg: proto.IWebMessageInfo,
        args: string[];
    }) =>
    {
        const sock = await socket
        // system information
        let message;

        sock.sendPresenceUpdate("composing", jid)

        const nodeVersion = process.version;
        const appVersion = process.env.APP_VERSION || "1.0.0";
        const appName = process.env.APP_NAME || "WA Bot API";
        const appAuthor = process.env.APP_AUTHOR || "Decryptable";
        const appDescription = process.env.APP_DESCRIPTION || "Decryptable Bot";
        const appEnv = process.env.NODE_ENV || "development";

        const systeminformation = await utils.allSystemInformation();

        const formatRecursive = (obj: any, indent: string = ""): string =>
        {
            let result = "";
            for (const key in obj)
            {
                if (typeof obj[key] === "object" && obj[key] !== null)
                {
                    result += `${indent}*${key}*:\n${formatRecursive(obj[key], indent + "  ")}`;
                } else
                {
                    result += `${indent}*${key}:* ${obj[key]}\n`;
                }
            }
            return result;
        };

        if (args.length > 0)
        {
            message = `Pong! 🏓\n${args.join(",")}`;
        } else
        {
            message = `Pong! 🏓`;
        }

        message += `\n*App name:* ${appName}`
        message += `\n*Author:* ${appAuthor}`
        message += `\n*App version:* ${appVersion}`
        message += `\n*About:* ${appDescription}`
        message += `\n*Environment:* ${appEnv}`
        message += `\n*NodeJS version:* ${nodeVersion}`
        message += `\n`
        message += formatRecursive(systeminformation);

        sock.sendPresenceUpdate("unavailable", jid)

        sock.sendMessage(jid, { text: message }, {
            quoted: msg
        });
    }
}

export default pingCommand;