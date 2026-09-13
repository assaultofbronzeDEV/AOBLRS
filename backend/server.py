"""
Assault of Bronze backend
-------------------------
The Party feature moved to a fully local peer-to-peer implementation on the
mobile devices themselves (see /app/frontend/src/party/PartyManager.ts).
This service intentionally keeps only a couple of lightweight endpoints so
Expo's dev pipeline has something to talk to during development. It has NO
dependency on MongoDB or any Party state.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
from datetime import datetime

app = FastAPI(title="Assault of Bronze — dev helper")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Assault of Bronze dev helper", "party": "peer-to-peer on device"}


@api_router.get("/health")
async def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
