import asyncpg
import asyncio
import json

async def explore_db():
    conn = await asyncpg.connect(
        host='smady-db.cb6c8wk4cue1.eu-north-1.rds.amazonaws.com',
        user='postgres',
        password='Onaamika#1506',
        database='postgres',
        port=5432
    )
    
    print("=" * 80)
    print("DATABASE SCHEMA EXPLORATION")
    print("=" * 80)
    
    # Get version
    version = await conn.fetchval('SELECT version();')
    print(f"\nPostgreSQL Version: {version.split(',')[0]}\n")
    
    # List schemas
    schemas = await conn.fetch('''
        SELECT schema_name FROM information_schema.schemata 
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
        ORDER BY schema_name;
    ''')
    print("SCHEMAS:")
    for row in schemas:
        print(f"  - {row['schema_name']}")
    
    # List tables in public schema
    print("\n" + "=" * 80)
    print("TABLES IN PUBLIC SCHEMA:")
    print("=" * 80)
    tables = await conn.fetch('''
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    ''')
    for row in tables:
        print(f"  - {row['table_name']}")
    
    # Analyze proposal_review_log table
    print("\n" + "=" * 80)
    print("PROPOSAL_REVIEW_LOG STRUCTURE:")
    print("=" * 80)
    
    columns = await conn.fetch('''
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'proposal_review_log'
        ORDER BY ordinal_position;
    ''')
    
    for col in columns:
        nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
        print(f"  {col['column_name']:20} {col['data_type']:20} {nullable}")
    
    # Get sample proposal_review_log data
    print("\n" + "=" * 80)
    print("SAMPLE DATA FROM PROPOSAL_REVIEW_LOG (Last 3 rows):")
    print("=" * 80)
    
    sample = await conn.fetch('''
        SELECT id, meeting_id, lead_email, final_status, created_at 
        FROM proposal_review_log 
        ORDER BY created_at DESC 
        LIMIT 3;
    ''')
    
    if sample:
        for row in sample:
            print(f"\nID: {row['id']}")
            print(f"  meeting_id: {row['meeting_id']}")
            print(f"  lead_email: {row['lead_email']}")
            print(f"  final_status: {row['final_status']}")
            print(f"  created_at: {row['created_at']}")
    else:
        print("  (No data)")
    
    # Analyze meetings table
    print("\n" + "=" * 80)
    print("MEETINGS TABLE STRUCTURE:")
    print("=" * 80)
    
    columns = await conn.fetch('''
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'meetings'
        ORDER BY ordinal_position;
    ''')
    
    for col in columns:
        nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
        print(f"  {col['column_name']:20} {col['data_type']:20} {nullable}")
    
    # Analyze lead_results table
    print("\n" + "=" * 80)
    print("LEAD_RESULTS TABLE STRUCTURE:")
    print("=" * 80)
    
    columns = await conn.fetch('''
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lead_results'
        ORDER BY ordinal_position;
    ''')
    
    for col in columns:
        nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
        print(f"  {col['column_name']:20} {col['data_type']:20} {nullable}")
    
    # Check for smady schema
    print("\n" + "=" * 80)
    print("CHECKING SMADY SCHEMA:")
    print("=" * 80)
    
    smady_tables = await conn.fetch('''
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'smady'
        ORDER BY table_name;
    ''')
    
    if smady_tables:
        print("Tables in 'smady' schema:")
        for row in smady_tables:
            print(f"  - {row['table_name']}")
    else:
        print("  (No smady schema)")
    
    # Check relationships: lead_results -> meetings -> proposal_review_log
    print("\n" + "=" * 80)
    print("RELATIONSHIP ANALYSIS:")
    print("=" * 80)
    
    print("\n1. LEAD_RESULTS TABLE (Generated leads):")
    lr_count = await conn.fetchval('SELECT COUNT(*) FROM lead_results;')
    print(f"   Total records: {lr_count}")
    
    lr_sample = await conn.fetch('''
        SELECT request_id, user_id, total_count, status, completed_at
        FROM lead_results
        ORDER BY completed_at DESC
        LIMIT 2;
    ''')
    
    if lr_sample:
        for row in lr_sample:
            print(f"\n   request_id: {row['request_id']}")
            print(f"   user_id: {row['user_id']}")
            print(f"   total_count: {row['total_count']}")
            print(f"   status: {row['status']}")
            print(f"   completed_at: {row['completed_at']}")
    
    print("\n2. MEETINGS TABLE (Scheduled meetings):")
    m_count = await conn.fetchval('SELECT COUNT(*) FROM meetings;')
    print(f"   Total records: {m_count}")
    
    m_sample = await conn.fetch('''
        SELECT id, user_id, lead_email, meeting_datetime, status, created_at
        FROM meetings
        ORDER BY created_at DESC
        LIMIT 2;
    ''')
    
    if m_sample:
        for row in m_sample:
            print(f"\n   id: {row['id']}")
            print(f"   user_id: {row['user_id']}")
            print(f"   lead_email: {row['lead_email']}")
            print(f"   meeting_datetime: {row['meeting_datetime']}")
            print(f"   status: {row['status']}")
            print(f"   created_at: {row['created_at']}")
    
    print("\n3. PROPOSAL_REVIEW_LOG TABLE (N8N proposals):")
    prl_count = await conn.fetchval('SELECT COUNT(*) FROM proposal_review_log;')
    print(f"   Total records: {prl_count}")
    
    prl_sample = await conn.fetch('''
        SELECT id, meeting_id, lead_email, final_status, proposal_json, guardrail_errors, created_at
        FROM proposal_review_log
        ORDER BY created_at DESC
        LIMIT 1;
    ''')
    
    if prl_sample:
        for row in prl_sample:
            print(f"\n   id: {row['id']}")
            print(f"   meeting_id: {row['meeting_id']}")
            print(f"   lead_email: {row['lead_email']}")
            print(f"   final_status: {row['final_status']}")
            print(f"   guardrail_errors: {row['guardrail_errors']}")
            print(f"   created_at: {row['created_at']}")
            if row['proposal_json']:
                print(f"   proposal_json keys: {list(row['proposal_json'].keys()) if isinstance(row['proposal_json'], dict) else 'N/A'}")
    
    # Check if there's a user_id column to link proposals to users
    print("\n" + "=" * 80)
    print("CRITICAL: USER TRACKING ANALYSIS:")
    print("=" * 80)
    
    # Can we join proposal_review_log to meetings to get user_id?
    print("\nQuery: Can we link proposal → meeting → user_id?")
    join_test = await conn.fetch('''
        SELECT 
            prl.id as proposal_id,
            prl.meeting_id,
            prl.lead_email,
            m.user_id,
            m.created_at
        FROM proposal_review_log prl
        LEFT JOIN meetings m ON m.id = prl.meeting_id
        LIMIT 2;
    ''')
    
    if join_test:
        print("✓ YES - Can link proposal_review_log.meeting_id → meetings.id → meetings.user_id")
        for row in join_test:
            print(f"  proposal_id={row['proposal_id']}, meeting_id={row['meeting_id']}, user_id={row['user_id']}")
    
    await conn.close()

asyncio.run(explore_db())
