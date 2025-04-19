import { createOrGetSession, isSessionExist } from "@/lib/sessions";
import logger from "@/lib/logger";
import utils from "@/lib/utils";

const command_prefix = utils.getCommandPrefix();

const logout_command = `${command_prefix}logout`

export default async (req: Request, params: { sessionId: string }) =>
{
    if (req.method !== "GET")
    {
        return Response.json({ message: "Method not allowed!" }, { status: 405 });
    }

    const url = new URL(req.url);

    logger.info({ req, params }, `${req.method} ${url.pathname}`);

    const { sessionId } = params;

    try
    {
        const sessionExist = await isSessionExist(sessionId);

        if (!sessionExist)
        {
            return Response.json({ error: "Session not found!" }, { status: 404 });
        }

        const socket = await createOrGetSession(sessionId);

        const phoneNumber = utils.jidToPhoneNumber(socket.authState.creds.me?.id as string)
        return Response.json({ message: `Send the ${logout_command} command to ${phoneNumber} to disconnect the session: ${sessionId}`, logoutUrl: `https://wa.me/${phoneNumber}?text=${logout_command}` });
    } catch (error)
    {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
};