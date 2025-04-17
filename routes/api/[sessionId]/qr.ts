import { createOrGetSession, isSessionExist } from "@/lib/sessions";
import path from "path";
import fs from "fs-extra";
import QRCode from "qrcode";
import logger from "@/lib/logger";

export default async (req: Request, params: { sessionId: string }) =>
{
    if (req.method !== "GET") return Response.json({ message: "Method not allowed!" }, { status: 405 })

    const { sessionId } = params;

    const url = new URL(req.url)

    logger.info({ req, params }, `${req.method} ${url.pathname}`)

    try
    {
        if (!await isSessionExist(sessionId))
        {
            return Response.json({ error: "Session not found!" }, {
                status: 201
            });
        }



        const qrFilePath = path.join('.sessions', sessionId, "qr.txt");

        if (fs.pathExistsSync(qrFilePath))
        {
            const qrCode = fs.readFileSync(qrFilePath, "utf-8");
            const qrImageBase64 = await QRCode.toBuffer(qrCode);

            return new Response(qrImageBase64, {
                headers: {
                    "Content-Type": "image/png",
                },
            });
        }

        if (await isSessionExist(sessionId))
        {
            const session = await createOrGetSession(sessionId);


            const phoneData = session.authState.creds.me?.id;

            if (!phoneData)
            {
                return Response.json({ error: "QR code not found!" }, {
                    status: 201
                });
            }

            return Response.json({ error: `The QR code is not available because the WhatsApp JID ${phoneData} is already connected to this session.` }, {
                status: 201
            });
        }


        return Response.json({ error: "QR code not found!" }, {
            status: 201
        });
    } catch (error)
    {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return Response.json({ error: errorMessage }, { status: 500 });
    }
};