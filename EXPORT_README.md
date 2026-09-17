# Assault of Bronze Export

This export contains the current Expo/React Native app, native Party networking implementation, assets, lockfiles, Expo/EAS configuration, and optional Python development helper. It does not contain generated dependencies, caches, git metadata, credentials, environment files, or signing keys.

## Frontend

```bash
cd frontend
npm install
npx expo start
```

Use a native Android or iOS development build for the local Wi-Fi Party feature. The Party host runs on the GM device using local TCP/UDP sockets; no cloud server or MongoDB connection is required.

To make an installable Android APK through EAS:

```bash
cd frontend
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

The authenticated Expo account must have access to the project configured in `frontend/app.json`. The `preview` profile produces a directly installable APK and does not require Google Play publishing. Do not include or commit Android keystores, passwords, tokens, or `.env` files.

## Optional backend helper

The app does not use this service for storage or Party communication. If needed for unrelated local development:

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
```

All character data is stored on each device using AsyncStorage. Generated dependencies, caches, git metadata, environment files, signing credentials, deployment metadata, and historical preview reports are intentionally excluded from the export.

## Restore from this export

```bash
unzip aob-app-backup-current.zip
cd frontend
npm install
npx tsc --noEmit
```

The source archive is self-contained; install dependencies after extraction rather than copying `node_modules` from another machine.
