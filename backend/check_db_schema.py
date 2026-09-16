import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from database import engine
from sqlalchemy import inspect

async def check_db():
    async with engine.begin() as conn:
        def inspect_tables(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema='public')
            
            print("TABLES IN PUBLIC SCHEMA:")
            relevant = [t for t in sorted(tables) if 'proposal' in t or 'meeting' in t or 'pricing' in t]
            for t in relevant:
                print(f"  ✓ {t}")
            
            if 'proposal_review_log' in tables:
                print("\nproposal_review_log COLUMNS:")
                cols = inspector.get_columns('proposal_review_log', schema='public')
                for c in cols:
                    print(f"  • {c['name']}: {c['type']}")
            
            if 'meetings' in tables:
                print("\nmeetings COLUMNS:")
                cols = inspector.get_columns('meetings', schema='public')
                for c in cols:
                    print(f"  • {c['name']}: {c['type']}")
            
            if 'pricing_packages' in tables:
                print("\npricing_packages COLUMNS:")
                cols = inspector.get_columns('pricing_packages', schema='public')
                for c in cols:
                    print(f"  • {c['name']}: {c['type']}")
        
        await conn.run_sync(inspect_tables)

asyncio.run(check_db())
