import { createOrGetSession, isSessionExist } from "@/lib/sessions";
import logger from "@/lib/logger";

export default async (req: Request, params: { sessionId: string }) =>
{
    if (req.method !== "GET") return Response.json({ message: "Method not allowed!" }, { status: 405 })

    const url = new URL(req.url)

    logger.info({ req, params }, `${req.method} ${url.pathname}`)

    const { sessionId } = params;

    try
    {
        if (await isSessionExist(sessionId))
        {
            return Response.json({ error: "Failed to initialize the session because it already exists!" }, {
                status: 201
            });
        }

        await createOrGetSession(sessionId)

        return Response.json({ message: `Session ${sessionId} initialized successfully.` });
    } catch (error)
    {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
};