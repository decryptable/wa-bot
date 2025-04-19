import utils from "@/lib/utils";
import kill from "kill-port"
import logger from "@/lib/logger";
import { initializeAllSessions } from "./lib/sessions";

const PORT: number = Number(process.env.PORT) || 3000;

utils.clear();

const preload = async () =>
{
    await kill(PORT)
        .then(() =>
        {
            logger.info(`Killed another proccess on port ${PORT}!`)
        })
        .catch(err =>
        {
            logger.error(err, `Failed to kill proccess on port ${PORT}!`)
        })

}

preload().finally(() =>
{
    initializeAllSessions();
})