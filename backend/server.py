from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import init_db, engine
from routers import auth_router, google_router, icp_router, leads_router, outreach_router, dashboard_router, meetings_router, proposals_router, history_router
from auth import validate_security_configuration


def allowed_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    origins = [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]
    if "*" in origins:
        raise RuntimeError("CORS_ORIGINS must be an explicit origin allowlist")
    for origin in origins:
        parsed = urlparse(origin)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
            raise RuntimeError("CORS_ORIGINS entries must be complete HTTP(S) origins")
    return origins


TRUSTED_ORIGINS = set(allowed_origins())
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
HSTS_ENABLED = os.environ.get("HSTS_ENABLED", "false").lower() == "true"


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_security_configuration()
    if APP_ENV in {"production", "prod"} and not TRUSTED_ORIGINS:
        raise RuntimeError("CORS_ORIGINS must include the frontend origin in production")
    await init_db()
    yield
    await engine.dispose()


app = FastAPI(lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Smady API"}


app.include_router(api_router)
app.include_router(auth_router.router)
app.include_router(google_router.auth_router)
app.include_router(google_router.integration_router)
app.include_router(icp_router.router)
app.include_router(leads_router.router)
app.include_router(outreach_router.router)
app.include_router(dashboard_router.router)
app.include_router(meetings_router.router)
app.include_router(proposals_router.router)
app.include_router(history_router.router)


@app.middleware("http")
async def security_headers_and_csrf(request: Request, call_next):
    unsafe_method = request.method.upper() not in {"GET", "HEAD", "OPTIONS"}
    origin = request.headers.get("origin")
    if unsafe_method:
        normalized_origin = origin.rstrip("/") if origin else None
        if normalized_origin and normalized_origin not in TRUSTED_ORIGINS:
            response = JSONResponse(status_code=403, content={"detail": "Untrusted request origin"})
            return _add_security_headers(request, response)

    response = await call_next(request)
    return _add_security_headers(request, response)


def _add_security_headers(request: Request, response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    if HSTS_ENABLED and APP_ENV in {"production", "prod"}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=sorted(TRUSTED_ORIGINS),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
