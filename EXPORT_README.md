# Assault of Bronze Export

This archive contains the Expo/React Native app and its optional Python development helper.

## Frontend

```bash
cd frontend
npm install
npx expo start
```

Use a native Android or iOS development build for the local Wi-Fi Party feature. The Party host runs on the GM device using local TCP/UDP sockets; no cloud server, Emergent service, or MongoDB connection is required.

## Optional backend helper

The app does not use this service for storage or Party communication. If needed for unrelated local development:

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8000
```

All character data is stored on each device using AsyncStorage. Generated dependencies, caches, git metadata, environment files, deployment metadata, and historical preview reports are intentionally excluded from the export.
