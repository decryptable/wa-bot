import { getAllContacts, isSessionExist } from "@/lib/sessions";
import logger from "@/lib/logger";

export default async (req: Request, params: { sessionId: string }) =>
{
    if (req.method !== "GET") return Response.json({ message: "Method not allowed!" }, { status: 405 })


    const url = new URL(req.url)

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

        return Response.json({ message: "All contacts retrieved successfully!", contacts: await getAllContacts(sessionId) });
    } catch (error)
    {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return Response.json({ message: errorMessage }, { status: 500 });
    }
};