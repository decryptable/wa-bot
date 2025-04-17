import { createOrGetSession, isSessionExist } from "@/lib/sessions";
import logger from "@/lib/logger";
import { z } from "zod";
import { isJidGroup, isJidUser, proto } from "@whiskeysockets/baileys";

const schema = z.object({
    jid: z.string().refine(
        (val) => isJidGroup(val) || isJidUser(val),
        { message: "`jid` must be a valid user or group JID" }
    ),
    text: z.string().min(5),
    mentions: z.array(z.string()).optional(),
    reply: z.custom<proto.IWebMessageInfo>((val) =>
    {
        if (!val) return true;
        return typeof val === "object" && "key" in val && "message" in val;
    }, {
        message: "`reply` must be a valid IWebMessageInfo object"
    }).optional()
});

export default async (req: Request, params: { sessionId: string }) =>
{
    if (req.method !== "POST") return Response.json({ message: "Method not allowed!" }, { status: 405 })


    const url = new URL(req.url)
    const body = await req.json()


    const parse = schema.safeParse(body);
    if (!parse.success)
    {
        return Response.json({ error: parse.error }, { status: 400 });
    }

    const { jid, text, mentions, reply } = parse.data;

    logger.info({ req, params }, `${req.method} ${url.pathname}`)

    const { sessionId } = params;
    try
    {
        if (!await isSessionExist(sessionId))
        {
            return Response.json({ error: "Session not found!" }, {
                status: 201
            });
        }

        const socket = await createOrGetSession(sessionId)


        const result = await socket.sendMessage(jid, {
            text,
            mentions: mentions ?? []
        }, reply ? {
            quoted: reply
        } : undefined);

        return Response.json({
            message: "Message sended successfully", result: {
                key: result?.key,
                message: result?.message
            }
        });
    } catch (error)
    {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
};