import chalk from "chalk";
import { rainbow, pastel } from "gradient-string";
import figlet from "figlet";
import { generate, setErrorLevel } from "qrcode-terminal";
import si from "systeminformation"
import "dotenv/config"
import { matchRoute } from "./matchRoute";
import { loadRoutes } from "./routesLoader";
import path from "path"

/**
 * Clears the console screen and displays a banner.
 * 
 * This function uses the ANSI escape code `\x1Bc` to clear the console,
 * and then calls the `banner` function to display a banner.
 */
const clear = () =>
{
    console.log("\x1Bc");

    banner();
}

/**
 * Displays a stylized banner in the console with application details.
 *
 * The banner includes the application name, version, author, description,
 * environment, and Node.js version. It uses environment variables to populate
 * the details, with default values provided if the variables are not set.
 *
 * Environment Variables:
 * - `APP_NAME`: The name of the application (default: "WA API").
 * - `APP_VERSION`: The version of the application (default: "1.0.0").
 * - `APP_AUTHOR`: The author of the application (default: "Decryptable").
 * - `APP_DESCRIPTION`: A brief description of the application (default: "WhatsApp API").
 * - `NODE_ENV`: The current environment (default: "development").
 *
 * Dependencies:
 * - `figlet`: Used to generate ASCII art for the application name.
 * - `chalk`: Used to colorize the console output.
 * - `rainbow`: Used to apply a rainbow effect to the ASCII art.
 *
 * @returns {void} This function does not return a value.
 */
const banner = (): void =>
{
    const app_name = process.env.APP_NAME || "WA API";

    const app_version = process.env.APP_VERSION || "1.0.0";

    const app_author = process.env.APP_AUTHOR || "Decryptable";

    const app_description = process.env.APP_DESCRIPTION || "WhatsApp API";

    console.log(rainbow(figlet.textSync(app_name, { font: "3D-ASCII" })));
    console.log(chalk.green(`Version: ${app_version}`));
    console.log(chalk.blue(`Author: ${app_author}`));
    console.log(chalk.yellow(`Description: ${app_description}`));
    console.log(chalk.magenta(`Environment: ${process.env.NODE_ENV || "development"}`));
    console.log(chalk.cyan(`Node Version: ${process.version}`));
}

/**
 * Generates and prints a QR code to the console with a gradient effect.
 *
 * @param qr - The string data to encode into the QR code.
 *
 * The function sets the error correction level to 'H' (high) for the QR code,
 * generates the QR code with a small size, and displays it in the console
 * using a gradient effect.
 */
const printQR = (qr: string) =>
{
    setErrorLevel('H');
    generate(qr, {
        small: true,
    }, (qrcode) =>
    {
        // show qr in gradient
        console.log(pastel.multiline(qrcode));
    });
}

/**
 * Retrieves comprehensive system information asynchronously.
 *
 * @returns A promise that resolves to an object containing:
 * - `osInfo`: Information about the operating system.
 * - `serverTime`: The current server time.
 * - `inetLatency`: The internet latency in milliseconds.
 * - `memInfo`: Information about the system's memory.
 */
const allSystemInformation = async () =>
{
    const osInfo = await si.osInfo()
    const serverTime = si.time()
    const inetLatency = await si.inetLatency()
    const memInfo = await si.mem()

    return {
        osInfo, serverTime, inetLatency, memInfo
    }
}

/**
 * Extracts the phone number from a JID (Jabber ID) string.
 *
 * @param jid - The JID string in the format "phoneNumber@domain".
 * @returns The phone number portion of the JID.
 */
const jidToPhoneNumber = (jid: string) =>
{
    return jid.split("@")[0]
}

const utils = {
    clear,
    banner,
    printQR,
    allSystemInformation,
    jidToPhoneNumber
}

export default utils;