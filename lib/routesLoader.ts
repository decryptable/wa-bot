import fs from "fs-extra";
import path from "path";

type RouteHandler = (req: Request, params: Record<string, string>) => Response;

/**
 * Recursively loads routes from the `routes` directory and maps them to handlers.
 */
export const loadRoutes = async (routesDir: string): Promise<Record<string, RouteHandler>> => {
    const routes: Record<string, RouteHandler> = {};

    const walk = async (dir: string, basePath: string = "/") => {
        const files = await fs.readdir(dir);

        await Promise.all(
            files.map(async (file) => {
                const fullPath = path.join(dir, file);
                const routePath = path.join(basePath, file.replace(/\.ts$/, ""));

                if ((await fs.stat(fullPath)).isDirectory()) {
                    await walk(fullPath, routePath);
                } else {
                    const routeKey = routePath
                        .replace(/\\/g, "/")
                        .replace(/\/index$/, "/")
                        .replace(/\[(\w+)\]/g, ":$1"); // Convert [param] to :param

                    const handler = (await import(fullPath)).default as RouteHandler;
                    if (typeof handler === "function") {
                        routes[routeKey] = handler;
                    }
                }
            })
        );
    };

    await walk(routesDir);
    return routes;
};