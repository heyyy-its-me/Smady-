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
    
    print("\n" + "=" * 80)
    print("CRITICAL FINDINGS FOR PROPOSAL WEBHOOK DESIGN")
    print("=" * 80)
    
    # Check proposal_review_log structure with user_id
    print("\n✓ PROPOSAL_REVIEW_LOG has user_id column!")
    prl_count = await conn.fetchval('SELECT COUNT(*) FROM proposal_review_log;')
    print(f"  Total proposal records: {prl_count}")
    
    prl = await conn.fetch('''
        SELECT id, meeting_id, lead_email, user_id, customer_id, final_status, created_at
        FROM proposal_review_log
        ORDER BY created_at DESC
        LIMIT 3;
    ''')
    
    if prl:
        print("\n  Recent proposals:")
        for row in prl:
            print(f"    ID: {row['id']}")
            print(f"      meeting_id: {row['meeting_id']}")
            print(f"      lead_email: {row['lead_email']}")
            print(f"      user_id: {row['user_id']} ← USER ASSOCIATION EXISTS!")
            print(f"      customer_id: {row['customer_id']}")
            print(f"      final_status: {row['final_status']}")
            print(f"      created_at: {row['created_at']}")
    else:
        print("  (No proposal data yet)")
    
    # Check meetings structure
    print("\n✓ MEETINGS TABLE STRUCTURE:")
    m_count = await conn.fetchval('SELECT COUNT(*) FROM meetings;')
    print(f"  Total meeting records: {m_count}")
    
    m = await conn.fetch('''
        SELECT id, user_id, lead_email, meeting_date, status, created_at
        FROM meetings
        ORDER BY created_at DESC
        LIMIT 3;
    ''')
    
    if m:
        print("\n  Recent meetings:")
        for row in m:
            print(f"    ID: {row['id']}")
            print(f"      user_id: {row['user_id']}")
            print(f"      lead_email: {row['lead_email']}")
            print(f"      meeting_date: {row['meeting_date']}")
            print(f"      status: {row['status']}")
            print(f"      created_at: {row['created_at']}")
    else:
        print("  (No meeting data yet)")
    
    # Critical: Check if we can link proposals back to user via meeting_id
    print("\n" + "=" * 80)
    print("CRITICAL: PROPOSAL → USER LINKING:")
    print("=" * 80)
    
    join_test = await conn.fetch('''
        SELECT 
            prl.id,
            prl.meeting_id,
            prl.user_id as proposal_user_id,
            m.id as meeting_pk,
            m.user_id as meeting_user_id
        FROM proposal_review_log prl
        LEFT JOIN meetings m ON m.id::text = prl.meeting_id
        LIMIT 3;
    ''')
    
    print("\nJoin test (proposal_review_log LEFT JOIN meetings):")
    if join_test:
        for row in join_test:
            print(f"  Proposal ID {row['id']}: user_id={row['proposal_user_id']}, meeting_id={row['meeting_id']}")
            print(f"    → Meeting lookup: {'FOUND' if row['meeting_pk'] else 'NOT FOUND'}")
            if row['meeting_user_id']:
                print(f"    → Meeting user_id: {row['meeting_user_id']}")
    
    # Check smady schema proposal_review_log
    print("\n" + "=" * 80)
    print("SMADY SCHEMA ANALYSIS:")
    print("=" * 80)
    
    print("\nChecking smady.proposal_review_log:")
    smady_prl_cols = await conn.fetch('''
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'smady' AND table_name = 'proposal_review_log'
        ORDER BY ordinal_position;
    ''')
    
    if smady_prl_cols:
        print("  Columns:")
        for col in smady_prl_cols:
            print(f"    {col['column_name']:20} {col['data_type']}")
    
    # Check proposal_results table (app-generated)
    print("\nChecking proposal_results table:")
    pr_cols = await conn.fetch('''
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'proposal_results'
        ORDER BY ordinal_position;
    ''')
    
    if pr_cols:
        print("  Columns:")
        for col in pr_cols:
            print(f"    {col['column_name']:20} {col['data_type']}")
    
    pr_count = await conn.fetchval('SELECT COUNT(*) FROM proposal_results;')
    print(f"  Total records: {pr_count}")
    
    # Summary
    print("\n" + "=" * 80)
    print("WEBHOOK DESIGN REQUIREMENTS:")
    print("=" * 80)
    
    print("""
✓ N8N must send webhook payload with:
  1. user_id (UUID) - Required for UI scoping
  2. meeting_id (text) - Link to meetings table
  3. proposal_json (JSONB) - The generated proposal content
  4. final_status (text) - "Needs Review", "Sent", "Approved", "Rejected", etc.
  5. lead_email (text) - For verification
  6. guardrail_errors (ARRAY) - Any validation errors
  7. feedback (text, optional) - User feedback on rejection

✓ PROPOSAL REVIEW FLOW:
  User (in UI) → Sees proposal for their own lead
             → Clicks "Accept" (sends email) or "Reject" (with feedback)
             → Backend calls N8N webhook to process approval/rejection
             → N8N updates proposal_review_log final_status
             → Frontend polls for status change

✓ USER TRACKING:
  - proposal_review_log.user_id directly stores user_id
  - Meetings link via meeting_id for full audit trail
  - Lead email provides additional verification

✓ WEBHOOK NAMING STRATEGY:
  Since we have:
    - /webhook/lead-management-V2 (leads)
    - /webhook/2e460161-9738-4b81-8d65-44780979541a (outreach)
    - /webhook/book-slot (meetings)
    - /webhook/proposal-callback (PROPOSALS) ← NEW
    """)
    
    await conn.close()

asyncio.run(explore_db())
