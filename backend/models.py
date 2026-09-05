import uuid
from sqlalchemy import Table, Column, String, Integer, Numeric, Text, DateTime, Date, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import metadata

SCHEMA = metadata.schema

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
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("token", String, nullable=False, unique=True),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("used", Boolean, server_default="false"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

company_profiles = Table(
    "company_profiles", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
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
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
    Column("request_id", UUID(as_uuid=True), nullable=False, unique=True),
    Column("filters", JSONB),
    Column("status", String, nullable=False, server_default="pending"),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

lead_results = Table(
    "lead_results", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
    Column("lead_run_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.lead_runs.id"), nullable=True),
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
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
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
    Column("campaign_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.outreach_campaigns.id"), nullable=False),
    Column("lead_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.lead_results.id"), nullable=True),
    Column("email", String),
    Column("status", String, server_default="queued"),
    Column("sent_at", DateTime(timezone=True), nullable=True),
    Column("opened_at", DateTime(timezone=True), nullable=True),
    Column("replied_at", DateTime(timezone=True), nullable=True),
    Column("bounced_at", DateTime(timezone=True), nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

meetings = Table(
    "meetings", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
    Column("client_id", UUID(as_uuid=True), nullable=True),
    Column("lead_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.lead_results.id"), nullable=True),
    Column("request_id", UUID(as_uuid=True), nullable=True, unique=True),
    Column("lead_name", String, nullable=True),
    Column("company", String, nullable=True),
    Column("meeting_date", DateTime(timezone=True), nullable=True),
    Column("duration", Integer, nullable=True),
    Column("meeting_link", Text, nullable=True),
    Column("meet_link", Text, nullable=True, unique=True),
    Column("outcome", String, server_default="Pending Reply"),
    Column("notes", Text, nullable=True),
    Column("recording_url", Text, nullable=True),
    Column("transcript", Text, nullable=True),
    Column("ai_summary", Text, nullable=True),
    Column("metadata", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

propmeetings = Table(
    "propmeetings", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("meet_link", Text, nullable=False, unique=True),
    Column("customer_id", UUID(as_uuid=True), nullable=True),
    Column("user_id", UUID(as_uuid=True), nullable=True),
    Column("lead_email", String, nullable=True),
    Column("event_id", String, nullable=True),
    Column("start_time", DateTime(timezone=True), nullable=True),
    Column("status", String, nullable=True),
    Column("fireflies_meeting_id", String, nullable=True),
    Column("proposal_status", String, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)

proposals = Table(
    "proposals", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("client_id", UUID(as_uuid=True), nullable=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
    Column("lead_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.lead_results.id"), nullable=True),
    Column("lead_name", String, nullable=True),
    Column("company", String, nullable=True),
    Column("proposal_value", Numeric, nullable=True),
    Column("currency", String, server_default="USD"),
    Column("proposal_status", String, nullable=True),
    Column("proposal_url", Text, nullable=True),
    Column("version", Integer, server_default="1"),
    Column("ai_generated", Boolean, server_default="true"),
    Column("sent_date", Date, nullable=True),
    Column("accepted_date", Date, nullable=True),
    Column("metadata", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)

proposal_review_log = Table(
    "proposal_review_log", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column("request_id", UUID(as_uuid=True), nullable=True, unique=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.users.id"), nullable=False),
    Column("customer_id", UUID(as_uuid=True), nullable=False),
    Column("meeting_id", UUID(as_uuid=True), ForeignKey(f"{SCHEMA}.meetings.id"), nullable=True),
    Column("lead_email", String, nullable=True),
    Column("lead_name", String, nullable=True),
    Column("company", String, nullable=True),
    Column("content", Text, nullable=True),
    Column("proposal_json", JSONB, nullable=True),
    Column("guardrail_errors", JSONB, server_default="[]"),
    Column("reviewer_approved", Boolean, server_default="false"),
    Column("reviewer_issues", JSONB, server_default="[]"),
    Column("final_status", String, server_default="Needs Review"),
    Column("context_json", JSONB, nullable=True),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()),
)
