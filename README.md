# WA Bot

![WA Bot](./public/banner.jpg)

Simple WhatsApp Bot using Baileys implementation

> [!IMPORTANT]
> This project is currently under development

## Project Structure

```log
wa-bot
├── .env.example
├── .env.local
├── .gitignore
├── bun.lockb
├── bunfig.toml
├── package.json
├── preload.ts
├── README.md
├── server.ts
├── tsconfig.json
├── commands/
│   ├── logout.ts
│   └── ping.ts
├── lib/
│   ├── logger.ts
│   ├── matchRoute.ts
│   ├── routesLoader.ts
│   ├── sessions.ts
│   ├── socket.ts
│   └── utils.ts
├── public/
│   └── banner.jpg
└── routes/
    ├── index.ts
    └── api/
        ├── sessions.ts
        ├── status.ts
        └── [sessionId]/
            ├── getContacts.ts
            ├── init.ts
            ├── logout.ts
            ├── qr.ts
            └── status.ts
```
