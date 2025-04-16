import type { proto } from "@whiskeysockets/baileys";
import type createWhatsappSocket from "../lib/socket";
import utils from "@/lib/utils";
import logger from "@/lib/logger";

const pingCommand = {
    name: "logout",
    description: "Logout from the session",
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

        const phoneNumber = utils.jidToPhoneNumber(jid)

        if (!sock.user?.id.includes(phoneNumber)) {
            logger.warn({
                senderJid: jid,
                adminJid: sock.authState.creds.me?.id
            }, "Forbidden command triggered!")

            return;
        };
        
        sock.sendPresenceUpdate("composing", jid)

        await sock.sendMessage(jid, {
            text: `Successfully disconnect for WhatsApp account`,
            mentions: [jid]
        }, {
            quoted: msg
        })

        sock.sendPresenceUpdate("unavailable", jid)

        sock.logout()
    }
}

export default pingCommand;