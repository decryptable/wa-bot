import { loadRoutes } from "@/lib/routesLoader";
import logger from "@/lib/logger";
import path from "path"
import { matchRoute } from "./lib/matchRoute";
// import qrLoader from "@/static/qr.html"

const PORT: number = Number(process.env.PORT) || 3000;

// Load routes dynamically
const routes = await loadRoutes(path.resolve(__dirname, "routes"));

const main = async (): Promise<void> =>
{
    const server = Bun.serve({
        port: PORT,
        fetch (req)
        {
            const url = new URL(req.url);
            const pathname = url.pathname;

            // Match route
            for (const [route, handler] of Object.entries(routes))
            {
                const match = matchRoute(route, pathname);
                if (match)
                {
                    return handler(req, match.params);
                }
            }

            return Response.json({
                message: "Not Found"
            }, { status: 404 });
        },
        error (error)
        {
            console.error(error);
            return Response.json({
                message: `Internal Error: ${error.message}`
            }, {
                status: 500,
            });
        },
    });
};

main();

process.on("SIGTERM", async () =>
{
    logger.info("SIGTERM signal received. Exiting gracefully...");
    process.exit(0);
});

