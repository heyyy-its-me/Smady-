"""
One-off migration: add public.pricing_packages.user_id (nullable UUID FK -> public.users.id).

NULL user_id = global/fallback plan visible to every user.
Set user_id   = plan scoped to that one user's own catalog.

Safe to run multiple times (IF NOT EXISTS guards).

Usage:
    cd backend
    python migrate_pricing_packages_user_id.py
"""
import asyncio
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from database import engine
from sqlalchemy import text


async def main():
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE public.pricing_packages "
            "ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_pricing_packages_user_id "
            "ON public.pricing_packages (user_id)"
        ))
    print("✅ pricing_packages.user_id column ready (existing rows left as global/NULL plans).")


if __name__ == "__main__":
    asyncio.run(main())
