from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from database import get_db
from models import lead_results, outreach_campaigns, outreach_emails, company_profiles, lead_runs, meetings, proposal_review_log
from auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user["id"]
    today = date.today()

    total_leads_r = await db.execute(select(func.count()).select_from(lead_results).where(lead_results.c.user_id == uid))
    total_leads = total_leads_r.scalar() or 0

    leads_today_r = await db.execute(
        select(func.count()).select_from(lead_results).where(lead_results.c.user_id == uid, func.date(lead_results.c.created_at) == today)
    )
    leads_today = leads_today_r.scalar() or 0

    campaign_ids_r = await db.execute(select(outreach_campaigns.c.id).where(outreach_campaigns.c.user_id == uid))
    campaign_ids = [r.id for r in campaign_ids_r.fetchall()]
    emails_sent = 0
    if campaign_ids:
        emails_sent_r = await db.execute(
            select(func.count()).select_from(outreach_emails).where(outreach_emails.c.campaign_id.in_(campaign_ids), outreach_emails.c.status == "sent")
        )
        emails_sent = emails_sent_r.scalar() or 0

    meetings_booked_r = await db.execute(
        select(func.count()).select_from(meetings).where(meetings.c.user_id == uid, meetings.c.outcome.in_(["Confirmed", "Auto-Booked"]))
    )
    meetings_booked = meetings_booked_r.scalar() or 0

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    growth_r = await db.execute(
        select(func.date_trunc("month", lead_results.c.created_at).label("m"), func.count().label("c"))
        .where(lead_results.c.user_id == uid).group_by("m").order_by("m")
    )
    growth_map = {r.m.strftime("%b"): r.c for r in growth_r.fetchall()}
    leads_growth = [{"label": m, "value": growth_map.get(m, 0)} for m in months]

    funnel_stages = [("New", "New Leads"), ("Contacted", "Contacted"), ("Interested", "Interested"), ("Meeting Booked", "Meeting Booked")]
    pipeline_funnel = []
    for status_value, label in funnel_stages:
        r = await db.execute(select(func.count()).select_from(lead_results).where(lead_results.c.user_id == uid, lead_results.c.status == status_value))
        pipeline_funnel.append({"stage": label, "value": r.scalar() or 0})

    source_r = await db.execute(
        select(lead_results.c.source, func.count().label("c")).where(lead_results.c.user_id == uid).group_by(lead_results.c.source)
    )
    source_rows = source_r.fetchall()
    source_total = sum(r.c for r in source_rows) or 1
    lead_source_breakdown = [{"name": r.source or "Unknown", "value": round(r.c / source_total * 100)} for r in source_rows]

    activity = []
    icp_r = await db.execute(select(company_profiles).where(company_profiles.c.user_id == uid).order_by(company_profiles.c.created_at.desc()).limit(3))
    for r in icp_r.fetchall():
        activity.append({"id": f"icp-{r.id}", "type": "lead", "title": "ICP profile generated", "subtitle": r.status, "time": r.created_at.isoformat()})
    lead_run_r = await db.execute(select(lead_runs).where(lead_runs.c.user_id == uid).order_by(lead_runs.c.created_at.desc()).limit(3))
    for r in lead_run_r.fetchall():
        activity.append({"id": f"run-{r.id}", "type": "lead", "title": "Lead sourcing run created", "subtitle": r.status, "time": r.created_at.isoformat()})
    camp_r = await db.execute(select(outreach_campaigns).where(outreach_campaigns.c.user_id == uid).order_by(outreach_campaigns.c.created_at.desc()).limit(3))
    for r in camp_r.fetchall():
        activity.append({"id": f"camp-{r.id}", "type": "email", "title": f"Campaign '{r.name}' {r.status.lower()}", "subtitle": f"{r.leads_count} leads", "time": r.created_at.isoformat()})
    meet_r = await db.execute(select(meetings).where(meetings.c.user_id == uid).order_by(meetings.c.created_at.desc()).limit(3))
    for r in meet_r.fetchall():
        activity.append({"id": f"meet-{r.id}", "type": "meeting", "title": f"Meeting {r.outcome.lower()} with {r.lead_name or 'a lead'}", "subtitle": r.company or "", "time": r.created_at.isoformat()})
    prop_r = await db.execute(select(proposal_review_log).where(proposal_review_log.c.user_id == uid).order_by(proposal_review_log.c.created_at.desc()).limit(3))
    for r in prop_r.fetchall():
        activity.append({"id": f"prop-{r.id}", "type": "proposal", "title": f"Proposal for {r.lead_name or 'a lead'} — {r.final_status}", "subtitle": r.company or "", "time": r.created_at.isoformat()})
    activity.sort(key=lambda a: a["time"], reverse=True)

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
