import uuid
from sqlalchemy import Table, Column, String, Integer, Text, DateTime, Date, ForeignKey, Boolean, Numeric, BigInteger
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import metadata, DB_SCHEMA

# ── Real / shared tables — live in "public", already exist on the real RDS.
# Defined here for reads/writes; create_all() skips them since they exist (checkfirst).

customers = Table(
    "customers", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("name", String),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema="public",
)

users = Table(
    "users", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("email", String, nullable=False, unique=True),
    Column("password_hash", String, nullable=False),
    Column("full_name", Text),
    Column("customer_id", UUID(as_uuid=True), ForeignKey("public.customers.id"), nullable=True),
    Column("is_active", Boolean, server_default="true"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema="public",
)

company_profiles = Table(
    "company_profiles", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("customer_id", UUID(as_uuid=True), ForeignKey("public.customers.id")),
    Column("company_name", String),
    Column("product_name", String),
    Column("positioning", Text),
    Column("differentiator", Text),
    Column("core_problem", Text),
    Column("buyer_pain", Text),
    Column("target_segment", String),
    Column("confidence_score", Numeric),
    Column("icp_data", JSONB),
    Column("gtm_strategy", JSONB),
    Column("buyer_persona", JSONB),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema="public",
)

lead_results = Table(
    "lead_results", metadata,
    Column("request_id", Text),
    Column("customer_id", Text),
    Column("user_id", Text),
    Column("leads", JSONB),
    Column("total_count", Integer),
    Column("status", Text),
    Column("error", Text),
    Column("created_at", BigInteger),
    Column("completed_at", BigInteger),
    Column("updated_at", DateTime(timezone=False)),
    schema="public",
)

run_status = Table(
    "run_status", metadata,
    Column("request_id", UUID(as_uuid=True)),
    Column("stage", Text),
    Column("status", Text),
    Column("updated_at", DateTime(timezone=False)),
    schema="public",
)

# ── New tables (public) added for Meetings & Proposals, per spec.

meetings = Table(
    "meetings", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=True),
    Column("lead_name", Text),
    Column("lead_email", Text),
    Column("meeting_date", DateTime(timezone=True), nullable=False),
    Column("meeting_link", Text),
    Column("status", Text, nullable=False, server_default="Pending Reply"),
    Column("source", Text, nullable=False, server_default="manual"),
    Column("notes", Text),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema="public",
)

proposal_results = Table(
    "proposal_results", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=True),
    Column("lead_name", Text),
    Column("lead_email", Text),
    Column("proposal_json", JSONB),
    Column("guardrail_errors", JSONB),
    Column("reviewer_approved", Boolean, nullable=False, server_default="false"),
    Column("final_status", Text, nullable=False, server_default="Needs Review"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema="public",
)

# ── App-internal tables (own schema, e.g. "smady") — brand new / created by us.
# Kept isolated from the real "public" schema table names (leads, meetings, proposals, etc.)
# to avoid any collision with the live n8n-managed data.

login_attempts = Table(
    "login_attempts", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("identifier", String, nullable=False, unique=True),
    Column("attempts", Integer, server_default="0"),
    Column("locked_until", DateTime(timezone=True), nullable=True),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema=DB_SCHEMA,
)

password_reset_tokens = Table(
    "password_reset_tokens", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("token", String, nullable=False, unique=True),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("used", Boolean, server_default="false"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    schema=DB_SCHEMA,
)

icp_profiles = Table(
    "icp_profiles", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("status", String, nullable=False, server_default="pending"),
    Column("input", JSONB),
    Column("result", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema=DB_SCHEMA,
)

lead_runs = Table(
    "lead_runs", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("filters", JSONB),
    Column("status", String, nullable=False, server_default="pending"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema=DB_SCHEMA,
)

leads = Table(
    "leads", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("lead_run_id", UUID(as_uuid=True), ForeignKey(f"{DB_SCHEMA}.lead_runs.id"), nullable=True),
    Column("name", String),
    Column("title", String),
    Column("company", String),
    Column("domain", String),
    Column("email", String),
    Column("linkedin", String),
    Column("status", String, server_default="New"),
    Column("source", String, server_default="Agent"),
    Column("about", Text),
    Column("assigned", JSONB, server_default="[]"),
    Column("sequence_progress", Integer, server_default="0"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema=DB_SCHEMA,
)

outreach_campaigns = Table(
    "outreach_campaigns", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey("public.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("name", String),
    Column("leads_count", Integer, server_default="0"),
    Column("status", String, server_default="Queued"),
    Column("subject", Text),
    Column("body", Text),
    Column("sent_date", Date, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
    schema=DB_SCHEMA,
)

outreach_emails = Table(
    "outreach_emails", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("campaign_id", UUID(as_uuid=True), ForeignKey(f"{DB_SCHEMA}.outreach_campaigns.id"), nullable=False),
    Column("lead_id", UUID(as_uuid=True), ForeignKey(f"{DB_SCHEMA}.leads.id"), nullable=True),
    Column("email", String),
    Column("status", String, server_default="queued"),
    Column("sent_at", DateTime(timezone=True), nullable=True),
    Column("opened_at", DateTime(timezone=True), nullable=True),
    Column("replied_at", DateTime(timezone=True), nullable=True),
    Column("bounced_at", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    schema=DB_SCHEMA,
)
