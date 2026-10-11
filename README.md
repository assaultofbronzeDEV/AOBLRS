# Assault of Bronze - Lightweight Roleplay System

A web app for the Assault of Bronze tabletop system: hero and enemy sheets, GM tools, and live Party rooms.

- `frontend/` is the Expo (React Native Web) app.
- `frontend/worker/` is the Cloudflare Worker and per-room Durable Object that relays Party messages over WebSockets.
- Characters are stored in the browser (localStorage). Nothing is saved on a server.

## Develop

```bash
cd frontend
yarn install
npx expo export --platform web
npx wrangler dev --port 8787
```

Open http://127.0.0.1:8787. Type-check with `npx tsc --noEmit`.

Party server tests (with `wrangler dev` running):

```bash
PARTY_URL=http://127.0.0.1:8787 node --test worker/party.e2e.test.mjs
```

## Deploy

Cloudflare Workers builds from the `main` branch:

- Root directory: `frontend`
- Build command: `yarn install --frozen-lockfile && yarn build:web`
- Deploy command: `npx wrangler deploy`