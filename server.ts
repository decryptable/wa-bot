import express from "express";
import logger from "@/lib/logger";
import apiRoutes from "@/routes/api"
import whatsapp from "@/lib/whatsapp"

const PORT: number = Number(process.env.PORT) || 3000;

const HOST: string = "0.0.0.0";



await new Promise(resolve => setTimeout(resolve, 500));



/**
 * The main function initializes and starts the Express application server.
 * It sets up middleware, routes, and event listeners for the server.
 * 
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when the server is successfully started.
 * 
 * @remarks
 * - The server listens on the specified `PORT` and `HOST`.
 * - Logs errors and server status using the `logger` utility.
 * - Constructs and logs the server URL upon successful startup.
 * 
 * @throws {Error} If there is an issue starting the server, it will be logged via the `error` event listener.
 */
const main = async (): Promise<void> =>
{
    const app = express();
    app.use(express.json());

    app.use("/api", apiRoutes);


    const server = app.listen(PORT, HOST)

    server.on("error", (err) =>
    {
        logger.error(err, "Error while running express server!")
    })

    server.on("listening", () =>
    {
        const addressInfo = server.address();
        let url = "";

        if (typeof addressInfo === "string")
        {
            url = addressInfo;
        } else if (addressInfo && typeof addressInfo === "object")
        {
            const host = addressInfo.address === "0.0.0.0" ? "localhost" : addressInfo.address;
            url = `http://${host}:${addressInfo.port}`;
        }

        logger.info(`API server is running on: ${url}`);
    });
}

main().catch((err) =>
{
    logger.error(err, "Error while starting server!");

    process.exit(1);
});


process.on("SIGTERM", async () =>
{
    logger.info("SIGTERM signal received. Exiting gracefully...");

    if (whatsapp)
    {
        await whatsapp.ws.close();
    }


    process.exit(0);
});