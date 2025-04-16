/**
 * Matches a given route pattern against a pathname and extracts route parameters.
 *
 * @param route - The route pattern to match, where dynamic segments are prefixed with `:` (e.g., `/user/:id`).
 * @param pathname - The actual pathname to match against the route pattern (e.g., `/user/123`).
 * @returns An object containing the extracted parameters as key-value pairs if the route matches,
 *          or `null` if the route does not match the pathname.
 *
 * @example
 * ```typescript
 * const result = matchRoute('/user/:id', '/user/123');
 * // result: { params: { id: '123' } }
 *
 * const noMatch = matchRoute('/user/:id', '/product/123');
 * // noMatch: null
 * ```
 */
export function matchRoute (route: string, pathname: string)
{
    // Normalize route and pathname by removing extra slashes
    const normalize = (str: string) => str.replace(/\/+/g, "/").replace(/\/$/, "").replace(/^\//, "");

    const routeParts = normalize(route).split("/"); // Normalize and split route
    const pathParts = normalize(pathname).split("/"); // Normalize and split pathname

    if (routeParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++)
    {
        if (routeParts[i].startsWith(":"))
        {
            const paramName = routeParts[i].slice(1);
            params[paramName] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i])
        {
            return null;
        }
    }

    return { params };
}