import logger from "@/lib/logger";
import { createOrGetSession, isSessionExist } from "@/lib/sessions";
import { isJidGroup, isJidUser, proto, type AnyMessageContent } from "@whiskeysockets/baileys";
import { z } from "zod";

const schema = z.object({
    jid: z.string().refine(
        (val) => isJidGroup(val) || isJidUser(val),
        { message: "`jid` must be a valid user or group JID" }
    ),
    file: z.string().url(),
    caption: z.string().min(5).optional(),
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
    if (req.method !== "POST") return Response.json({ message: "Method not allowed!" }, { status: 405 });

    const url = new URL(req.url)

    const body = await req.json();

    const parse = schema.safeParse(body);
    if (!parse.success)
    {
        return Response.json({ error: parse.error.errors }, { status: 400 });
    }


    const { jid, file, caption, mentions, reply } = parse.data;

    const fileUrl = new URL(file);

    try
    {
        const headResponse = await fetch(fileUrl.toString(), { method: "HEAD" });
        if (!headResponse.ok)
        {
            return Response.json({ error: "Failed to fetch the file URL!" }, { status: 400 });
        }

        const contentType = headResponse.headers.get("content-type");
        if (!contentType || !contentType.startsWith("image/"))
        {
            return Response.json({ error: "The provided URL is not a valid video!" }, { status: 400 });
        }
    } catch (error)
    {
        return Response.json({ error: "Unable to validate the file URL!" }, { status: 400 });
    }

    logger.info({ req, params }, `${req.method} ${url.pathname}`)

    const { sessionId } = params;

    try
    {
        if (!await isSessionExist(sessionId))
        {
            return Response.json({ error: "Session not found!" }, { status: 404 });
        }

        const socket = await createOrGetSession(sessionId);

        let params: AnyMessageContent = {
            image: {
                url: fileUrl,
            },
            caption,
            mentions,
        }

        const result = await socket.sendMessage(jid as string, params, reply ? {
            quoted: reply
        } : undefined);

        return Response.json({
            message: "Message sent successfully",
            result: {
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