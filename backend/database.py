import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import MetaData, text

DB_HOST = os.environ['DB_HOST']
DB_PORT = os.environ['DB_PORT']
DB_USER = os.environ['DB_USER']
DB_PASSWORD = os.environ['DB_PASSWORD']
DB_NAME = os.environ['PG_DATABASE']
DB_SCHEMA = os.environ['DB_SCHEMA']
APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
DB_SSLMODE = os.environ.get('DB_SSLMODE', 'verify-full' if APP_ENV in {"production", "prod"} else 'prefer').lower()
if APP_ENV in {"production", "prod"} and DB_SSLMODE != "verify-full":
    raise RuntimeError("DB_SSLMODE must be verify-full in production")

DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

connect_args = {"server_settings": {"search_path": f"public,{DB_SCHEMA}"}}
if DB_SSLMODE == "verify-full":
    ca_file = os.environ.get("DB_SSL_CA")
    connect_args["ssl"] = ssl.create_default_context(cafile=ca_file) if ca_file else ssl.create_default_context()
elif DB_SSLMODE in ("require", "verify-ca"):
    connect_args["ssl"] = True
elif DB_SSLMODE not in ("disable", "prefer"):
    raise RuntimeError("DB_SSLMODE must be disable, prefer, require, verify-ca, or verify-full")

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args=connect_args,
)
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)
# No default schema: shared/real tables (users, customers, company_profiles,
# lead_results, meetings, proposal_results) live in "public"; our own
# app-internal tables are explicitly schema=DB_SCHEMA in models.py.
metadata = MetaData()


async def get_db():
    async with async_session_maker() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"'))
        await conn.run_sync(metadata.create_all, checkfirst=True)
