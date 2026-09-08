from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timezone, timedelta

from database import get_db
from models import outreach_campaigns, outreach_emails, icp_profiles, lead_runs, lead_results, meetings
from auth import get_current_user
from routers.leads_router import _normalize_lead

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _ms_to_date(ms) -> date:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).date()


async def _flatten_user_leads(db: AsyncSession, uid: str):
    """All of this user's leads across every execution, flattened from public.lead_results JSONB,
    each tagged with the day its run landed - this is the real source of truth for dashboard stats."""
    runs_r = await db.execute(select(lead_results).where(lead_results.c.user_id == uid))
    all_leads, leads_by_day = [], {}
    for run in runs_r.fetchall():
        run_day = _ms_to_date(run.created_at) if run.created_at else None
        items = run.leads or []
        for i, item in enumerate(items):
            lead = _normalize_lead(item, run.request_id, i)
            lead["_day"] = run_day
            all_leads.append(lead)
        if run_day and items:
            leads_by_day[run_day] = leads_by_day.get(run_day, 0) + len(items)
    return all_leads, leads_by_day


@router.get("/stats")
async def dashboard_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = str(user["id"])
    today = date.today()

    all_leads, leads_by_day = await _flatten_user_leads(db, uid)
    total_leads = len(all_leads)
    leads_today = leads_by_day.get(today, 0)

    campaign_ids_r = await db.execute(select(outreach_campaigns.c.id).where(outreach_campaigns.c.user_id == user["id"]))
    campaign_ids = [r.id for r in campaign_ids_r.fetchall()]
    emails_sent = 0
    if campaign_ids:
        emails_sent_r = await db.execute(
            select(func.count()).select_from(outreach_emails).where(outreach_emails.c.campaign_id.in_(campaign_ids), outreach_emails.c.status == "sent")
        )
        emails_sent = emails_sent_r.scalar() or 0

    meetings_count_r = await db.execute(select(func.count()).select_from(meetings).where(meetings.c.user_id == user["id"]))
    meetings_booked = meetings_count_r.scalar() or 0

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    growth_map = {}
    for day, count in leads_by_day.items():
        m = day.strftime("%b")
        growth_map[m] = growth_map.get(m, 0) + count
    leads_growth = [{"label": m, "value": growth_map.get(m, 0)} for m in months]

    funnel_stages = [("New", "New Leads"), ("Contacted", "Contacted"), ("Interested", "Interested"), ("Meeting Booked", "Meeting Booked")]
    pipeline_funnel = [{"stage": label, "value": sum(1 for l in all_leads if l["status"] == sv)} for sv, label in funnel_stages]

    source_counts: dict = {}
    for l in all_leads:
        source_counts[l["source"]] = source_counts.get(l["source"], 0) + 1
    source_total = sum(source_counts.values()) or 1
    lead_source_breakdown = [{"name": k, "value": round(v / source_total * 100)} for k, v in source_counts.items()]

    activity = []
    icp_r = await db.execute(select(icp_profiles).where(icp_profiles.c.user_id == user["id"]).order_by(icp_profiles.c.created_at.desc()).limit(3))
    for r in icp_r.fetchall():
        activity.append({"id": f"icp-{r.id}", "type": "lead", "title": "ICP profile generated", "subtitle": r.status, "time": r.created_at.isoformat()})
    lead_run_r = await db.execute(select(lead_runs).where(lead_runs.c.user_id == user["id"]).order_by(lead_runs.c.created_at.desc()).limit(3))
    for r in lead_run_r.fetchall():
        activity.append({"id": f"run-{r.id}", "type": "lead", "title": "Lead sourcing run created", "subtitle": r.status, "time": r.created_at.isoformat()})
    camp_r = await db.execute(select(outreach_campaigns).where(outreach_campaigns.c.user_id == user["id"]).order_by(outreach_campaigns.c.created_at.desc()).limit(3))
    for r in camp_r.fetchall():
        activity.append({"id": f"camp-{r.id}", "type": "email", "title": f"Campaign '{r.name}' {r.status.lower()}", "subtitle": f"{r.leads_count} leads", "time": r.created_at.isoformat()})
    meeting_r = await db.execute(select(meetings).where(meetings.c.user_id == user["id"]).order_by(meetings.c.created_at.desc()).limit(3))
    for r in meeting_r.fetchall():
        activity.append({"id": f"meeting-{r.id}", "type": "meeting", "title": f"Meeting booked with {r.lead_name}", "subtitle": r.status, "time": r.created_at.isoformat()})
    activity.sort(key=lambda a: a["time"], reverse=True)

    # Daily activity for heatmap (last 84 days = 12 weeks)
    daily_start = today - timedelta(days=83)
    daily_activity = {}
    for i in range(84):
        day = daily_start + timedelta(days=i)
        daily_activity[day.isoformat()] = leads_by_day.get(day, 0)

    async def week_daily(status: str, week_start: date):
        daily = [0] * 7
        if campaign_ids:
            week_end = week_start + timedelta(days=6)
            r = await db.execute(
                select(func.date(outreach_emails.c.created_at).label("d"), func.count().label("c"))
                .where(
                    outreach_emails.c.campaign_id.in_(campaign_ids), outreach_emails.c.status == status,
                    func.date(outreach_emails.c.created_at) >= week_start, func.date(outreach_emails.c.created_at) <= week_end,
                )
                .group_by("d")
            )
            for row in r.fetchall():
                idx = (row.d - week_start).days
                if 0 <= idx < 7:
                    daily[idx] = row.c
        return daily

    this_week_start = today - timedelta(days=6)
    last_week_start = today - timedelta(days=13)
    sent_this = await week_daily("sent", this_week_start)
    sent_last = await week_daily("sent", last_week_start)
    replied_this = await week_daily("replied", this_week_start)
    replied_last = await week_daily("replied", last_week_start)

    def pct_change(cur, prev):
        if prev == 0:
            return 100 if cur > 0 else 0
        return round((cur - prev) / prev * 100)

    return {
        "leadsToday": {"value": leads_today, "sparkline": [0, 0, 0, 0, 0, 0, leads_today]},
        "totalLeads": {"value": total_leads, "sparkline": [0, 0, 0, 0, 0, 0, total_leads]},
        "emailsSent": {"value": emails_sent, "sparkline": [0, 0, 0, 0, 0, 0, emails_sent]},
        "meetingsBooked": {"value": meetings_booked, "sparkline": [0, 0, 0, 0, 0, 0, meetings_booked]},
        "leadsGrowth": leads_growth,
        "pipelineFunnel": pipeline_funnel,
        "leadSourceBreakdown": lead_source_breakdown,
        "activityFeed": activity[:6],
        "dailyActivity": daily_activity,
        "emailsSentComparison": {
            "percent": pct_change(sum(sent_this), sum(sent_last)),
            "trend": "up" if sum(sent_this) >= sum(sent_last) else "down",
            "thisWeek": sent_this, "lastWeek": sent_last, "totalPerWeek": sum(sent_this),
        },
        "replyRateComparison": {
            "percent": pct_change(sum(replied_this), sum(replied_last)),
            "trend": "up" if sum(replied_this) >= sum(replied_last) else "down",
            "thisWeek": replied_this, "lastWeek": replied_last, "totalPerWeek": sum(replied_this),
        },
    }


@router.get("/history")
async def get_history(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]

    runs_r = await db.execute(
        select(lead_runs).where(lead_runs.c.user_id == uid).order_by(lead_runs.c.created_at.desc()).limit(20)
    )
    lead_run_history = []
    for r in runs_r.fetchall():
        count_r = await db.execute(select(lead_results.c.total_count).where(lead_results.c.request_id == str(r.request_id)))
        count_row = count_r.first()
        lead_run_history.append({
            "id": str(r.id),
            "request_id": str(r.request_id),
            "type": "leads",
            "status": r.status,
            "filters": r.filters or {},
            "lead_count": (count_row.total_count if count_row else 0) or 0,
            "created_at": r.created_at.isoformat(),
        })

    icp_r = await db.execute(
        select(icp_profiles).where(icp_profiles.c.user_id == uid).order_by(icp_profiles.c.created_at.desc()).limit(10)
    )
    icp_history = []
    for r in icp_r.fetchall():
        icp_history.append({
            "id": str(r.id),
            "request_id": str(r.request_id),
            "type": "icp",
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        })

    camp_r = await db.execute(
        select(outreach_campaigns).where(outreach_campaigns.c.user_id == uid).order_by(outreach_campaigns.c.created_at.desc()).limit(10)
    )
    campaign_history = []
    for r in camp_r.fetchall():
        campaign_history.append({
            "id": str(r.id),
            "request_id": str(r.request_id),
            "type": "outreach",
            "name": r.name,
            "status": r.status,
            "leads_count": r.leads_count,
            "created_at": r.created_at.isoformat(),
        })

    return {
        "lead_runs": lead_run_history,
        "icp_profiles": icp_history,
        "campaigns": campaign_history,
    }
