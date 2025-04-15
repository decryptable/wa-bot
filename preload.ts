import utils from "@/lib/utils";
import kill from "kill-port"
import logger from "@/lib/logger";

const PORT: number = Number(process.env.PORT) || 3000;

utils.clear();

await kill(PORT)
    .then(() =>
    {
        logger.info(`Killed another proccess on port ${PORT}!`)
    })
    .catch(err =>
    {
        logger.error(err, `Failed to kill proccess on port ${PORT}!`)
    })