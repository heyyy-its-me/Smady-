import asyncio
import asyncpg
import json

async def check_proposal():
    conn = await asyncpg.connect(
        user='ad_user',
        password='Snowflake2024',
        database='smady',
        host='db.bit.io',
        port=5432
    )
    
    row = await conn.fetchrow(
        "SELECT id, proposal_json, lead_name FROM proposal_review_log WHERE id = 27;"
    )
    
    print("Proposal 27:")
    print(f"  ID: {row['id']}")
    print(f"  lead_name column: {row['lead_name']}")
    print(f"  proposal_json: {json.dumps(row['proposal_json'], indent=2)}")
    
    await conn.close()

asyncio.run(check_proposal())
