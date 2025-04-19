import chalk from "chalk";
import { rainbow, pastel } from "gradient-string";
import figlet from "figlet";
import { SlantFont } from "@/fonts/Slant"
import si from "systeminformation"
import fs from "fs-extra"
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'
import type {
    Root,
    RootContent,
    Paragraph,
    List,
    Text,
    Strong,
    Emphasis,
    Delete,
    InlineCode,
    Code,
    Link,
    Image,
    ListItem
} from 'mdast'

import "dotenv/config"
import logger from "./logger";

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

    const fontText = Buffer.from(SlantFont).toString("utf-8");

    figlet.parseFont("Standard", fontText)

    console.log(rainbow(figlet.textSync(app_name, { font: "Standard" })));
    console.log(chalk.green(`Version: ${app_version}`));
    console.log(chalk.blue(`Author: ${app_author}`));
    console.log(chalk.yellow(`Description: ${app_description}`));
    console.log(chalk.magenta(`Environment: ${process.env.NODE_ENV || "development"}`));
    console.log(chalk.cyan(`Node Version: ${process.version}`));
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

const validateParams = (body: Record<string, any>, required: string[]) =>
{
    const missing = required.filter(key => !body[key]);
    if (missing.length)
    {
        return `params \`${missing.join(", ")}\` ${missing.length > 1 ? "are" : "is"} required!`;
    }
    return null;
}

async function fetchAsBuffer (url: string, options?: RequestInit)
{
    const response = await fetch(url, options);
    if (!response.ok)
    {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

async function fileToUint8Array (filePath: string)
{
    if (!fs.existsSync(filePath))
    {
        logger.error(filePath, `File ${filePath} doesn't exist!`)

        return;
    }
    const buffer = await fs.readFile(filePath);
    return new Uint8Array(buffer);
}

function getCommandPrefix ()
{
    return String(process.env.COMMAND_PREFIX || "!")
}

function getAppName ()
{
    return String(process.env.APP_NAME || "WA Bot API")
}

function getAppVersion ()
{
    return String(process.env.APP_VERSION || "1.0.0")
}

function getAppAuthor ()
{
    return String(process.env.APP_AUTHOR || "Decryptable")
}

function getAppDescription ()
{
    return String(process.env.APP_DESCRIPTION || "Decryptable Bot")
}

function getNodeEnv ()
{
    return String(process.env.NODE_ENV || "development")
}

function remarkWhatsApp (): any
{
    this.Compiler = function (tree: Root): string
    {
        let output = ''
        visit(tree, (node: RootContent) =>
        {
            switch (node.type)
            {
                case 'heading':
                    if ('children' in node)
                    {
                        output += '*' + node.children.map(render).join('') + '*\n'
                    }
                    break
                case 'paragraph':
                    if ('children' in node)
                    {
                        output += node.children.map(render).join('') + '\n\n'
                    }
                    break
                case 'blockquote':
                    if ('children' in node)
                    {
                        output += node.children.map(n =>
                        {
                            if ('children' in n)
                            {
                                const text = n.children.map(render).join('')
                                return `> ${text}\n`
                            }
                            return ''
                        }).join('') + '\n'
                    }
                    break
                case 'list':
                    (node as List).children.forEach((item, i) =>
                    {
                        const marker = node.ordered ? `${(i + 1)}. ` : '- '
                        const listItem = item as ListItem
                        const content = listItem.children
                            .map(child => ('children' in child ? child.children.map(render).join('') : ''))
                            .join('')
                        output += `${marker}${content}\n`
                    })
                    output += '\n'
                    break
                case 'thematicBreak':
                    output += '────────\n\n'
                    break
            }
        })
        return output
    }
}

function render (node: RootContent): string
{
    switch (node.type)
    {
        case 'text': return (node as Text).value
        case 'strong': return `*${(node as Strong).children.map(render).join('')}*`
        case 'emphasis': return `_${(node as Emphasis).children.map(render).join('')}_`
        case 'delete': return `~${(node as Delete).children.map(render).join('')}~`
        case 'inlineCode': return `\`\`\`${(node as InlineCode).value}\`\`\``
        case 'link': return `${(node as Link).children.map(render).join('')} (${node.url})`
        case 'image': return `${(node as Image).url}`
        default: return ''
    }
}

async function formatMarkdown (md: string): Promise<string>
{
    const file = await unified()
        .use(remarkParse)
        .use(remarkWhatsApp)
        .process(md)
    return String(file)
}

const utils = {
    clear,
    banner,
    allSystemInformation,
    jidToPhoneNumber,
    validateParams,
    fetchAsBuffer,
    fileToUint8Array,
    getCommandPrefix,
    getAppName,
    getAppVersion,
    getAppAuthor,
    getAppDescription,
    getNodeEnv,
    formatMarkdown
}

export default utils;