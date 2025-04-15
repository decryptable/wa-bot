import { Router } from "express";
import utils from "@/lib/utils";
import logger from "@/lib/logger";

const router = Router();

router.get("/status", async (req, res) =>
{
    logger.info(`[${req.method}] ${req.path}`)

    try
    {
        res.json({
            success: true,
            message: "Server is running",
            data: await utils.allSystemInformation()
        });
    } catch (error)
    {
        logger.error(error, "Error in route GET /api/status")
        res.json({
            success: false,
            message: "Unknown error occureed!"
        })
    }
});

export default router;