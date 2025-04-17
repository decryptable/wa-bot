# WA Bot

![WA Bot](./public/banner.jpg)

Simple WhatsApp Bot using Baileys implementation

> [!IMPORTANT]
> This project is currently under development. Production use isn't recommended unless you know what you're doing!

## Todo Features Development

- [x] RESTFull API implementation
  - [x] send video message
  - [x] send audio message
  - [x] send text message
  - [x] manage session from HTTP API, except logout
  - [ ] Other API features are in development
- [x] WhatsApp socket side command handler implementation. For command handlers, check the code structure in the [`./commands`](./commands/) folder
- [ ] RESTFull API documentation using OpenAPI
- [ ] API code reference documentation

## Requirements

- [x] [Bun](https://bun.sh/)

## Quick Setup

1. Clone this repository

    ```sh
    git clone https://github.com/decryptable/wa-bot

    cd wa-bot
    ```

2. Install required dependencies

    ```sh
    bun i # or bun install
    ```

3. Setup environment variables

    ```sh
    cp .env.example .env
    ```

    > _Leave the default if you are lazy to read the code structure._

4. Start server

    ```sh
    bun start
    ```

    ```sh
    # example outputs
    Version: 1.0.0
    Author: Decryptable
    Description: Simple whatsapp bot
    Environment: development
    Node Version: v22.3.0
    4/17/2025, 6:47:22 AM INFO: Killed another proccess on port 3000!
    4/17/2025, 6:47:22 AM INFO: Initializing session: decryptable
    4/17/2025, 6:47:22 AM INFO: All sessions initialized successfully. Total: 1

    # ...
    ```

    > _This command will run the RESTFull API and command handler. Supports multi-sessions._

## Project Structures

<details>

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
│   ├── ... command handlers
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
            ├── sendAudioMessage.ts
            ├── sendVideoMessage.ts
            ├── sendTextMessage.ts
            └── status.ts
```

</details>
