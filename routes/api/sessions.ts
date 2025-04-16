import { getAllSessions } from "@/lib/sessions"
import logger from "@/lib/logger"

export default async (req: Request) =>
{
    if (req.method !== "GET") return Response.json({ message: "Method not allowed!" }, { status: 405 })
        
    const url = new URL(req.url)

    logger.info({ req }, `${req.method} ${url.pathname}`)

    return Response.json({
        sessions: getAllSessions()
    })
}