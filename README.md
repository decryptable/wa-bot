# WA Bot

![WA Bot](./public/banner.jpg)

Simple WhatsApp Bot using Baileys implementation

> [!IMPORTANT]
> This project is currently under development

## Project Structure

<details>
<summary>wa-bot</summary>

- `.env.example`
- `.gitignore`
- `bun.lockb`
- `bunfig.toml`
- `package.json`
- `preload.ts`
- `README.md`
- `server.ts`
- `tsconfig.json`
- `.sessions/`
<details>
<summary>commands/</summary>

- `logout.ts`
- `ping.ts`

</details>
<details>
<summary>lib/</summary>

- `logger.ts`
- `matchRoute.ts`
- `routesLoader.ts`
- `sessions.ts`
- `socket.ts`
- `utils.ts`

</details>
<details>
<summary>public/</summary>

- `banner.jpg`

</details>
<details>
<summary>routes/</summary>

- `index.ts`
<details>
<summary>api/</summary>

- `sessions.ts`
- `status.ts`
<details>
<summary>[sessionId]/</summary>

- `getContacts.ts`
- `init.ts`
- `logout.ts`
- `qr.ts`
- `status.ts`

</details>
</details>
</details>
</details>
