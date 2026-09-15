#!/usr/bin/env python3
"""
Reset proposal status to needs_review for testing
"""
import asyncio
import sys
sys.path.insert(0, '/app/backend')

from sqlalchemy import update
from database import get_db_engine
from models import public_proposal_review_log

async def reset_proposal(proposal_id: int):
    """Reset proposal status to needs_review"""
    engine = get_db_engine()
    
    async with engine.begin() as conn:
        result = await conn.execute(
            update(public_proposal_review_log)
            .where(public_proposal_review_log.c.id == proposal_id)
            .values(final_status='needs_review')
        )
        print(f"✅ Reset proposal {proposal_id} to needs_review")
        print(f"   Rows affected: {result.rowcount}")

if __name__ == "__main__":
    asyncio.run(reset_proposal(10))
