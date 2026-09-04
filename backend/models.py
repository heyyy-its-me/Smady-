import uuid
from sqlalchemy import Table, Column, String, Integer, Text, DateTime, Date, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import metadata

users = Table(
    "users", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("email", String, nullable=False, unique=True),
    Column("password_hash", String, nullable=False),
    Column("full_name", String, nullable=False),
    Column("company_name", String),
    Column("plan", String, server_default="Pro Plan"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

login_attempts = Table(
    "login_attempts", metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("identifier", String, nullable=False, unique=True),
    Column("attempts", Integer, server_default="0"),
    Column("locked_until", DateTime(timezone=True), nullable=True),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

password_reset_tokens = Table(
    "password_reset_tokens", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.users.id"), nullable=False),
    Column("token", String, nullable=False, unique=True),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("used", Boolean, server_default="false"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

icp_profiles = Table(
    "icp_profiles", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("status", String, nullable=False, server_default="pending"),
    Column("input", JSONB),
    Column("result", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

lead_runs = Table(
    "lead_runs", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("filters", JSONB),
    Column("status", String, nullable=False, server_default="pending"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

leads = Table(
    "leads", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.users.id"), nullable=False),
    Column("lead_run_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.lead_runs.id"), nullable=True),
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
)

outreach_campaigns = Table(
    "outreach_campaigns", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.users.id"), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("name", String),
    Column("leads_count", Integer, server_default="0"),
    Column("status", String, server_default="Queued"),
    Column("subject", Text),
    Column("body", Text),
    Column("sent_date", Date, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

outreach_emails = Table(
    "outreach_emails", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("campaign_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.outreach_campaigns.id"), nullable=False),
    Column("lead_id", UUID(as_uuid=True), ForeignKey(f"{metadata.schema}.leads.id"), nullable=True),
    Column("email", String),
    Column("status", String, server_default="queued"),
    Column("sent_at", DateTime(timezone=True), nullable=True),
    Column("opened_at", DateTime(timezone=True), nullable=True),
    Column("replied_at", DateTime(timezone=True), nullable=True),
    Column("bounced_at", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)
