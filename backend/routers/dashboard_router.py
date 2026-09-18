from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timezone, timedelta

from database import get_db
from models import outreach_campaigns, outreach_emails, icp_profiles, lead_runs, lead_results, meetings, proposal_results, public_proposal_review_log
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

    # Proposals sent (approved or auto-sent via n8n)
    proposals_sent_r = await db.execute(
        select(func.count()).select_from(public_proposal_review_log)
        .where(
            public_proposal_review_log.c.user_id == user["id"],
            public_proposal_review_log.c.final_status.in_(["sent", "Sent", "Approved", "sent_after_revision"])
        )
    )
    proposals_sent = proposals_sent_r.scalar() or 0

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

    # ICPs generated per day (last 7 days)
    icp_daily = [0] * 7
    icp_week_start = today - timedelta(days=6)
    icp_data_r = await db.execute(
        select(func.date(icp_profiles.c.created_at).label("d"), func.count().label("c"))
        .where(icp_profiles.c.user_id == user["id"], func.date(icp_profiles.c.created_at) >= icp_week_start)
        .group_by("d")
    )
    for row in icp_data_r.fetchall():
        idx = (row.d - icp_week_start).days
        if 0 <= idx < 7:
            icp_daily[idx] = row.c
    
    days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    icps_generated_daily = [
        {"label": days_of_week[(icp_week_start + timedelta(days=i)).weekday()], "value": icp_daily[i]}
        for i in range(7)
    ]

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
        week_end = week_start + timedelta(days=6)
        
        # Join with campaigns to filter by user_id
        r = await db.execute(
            select(func.date(outreach_emails.c.created_at).label("d"), func.count().label("c"))
            .join(outreach_campaigns, outreach_emails.c.campaign_id == outreach_campaigns.c.id)
            .where(
                outreach_campaigns.c.user_id == user["id"],
                outreach_emails.c.status == status,
                func.date(outreach_emails.c.created_at) >= week_start, 
                func.date(outreach_emails.c.created_at) <= week_end,
            )
            .group_by("d")
        )
        for row in r.fetchall():
            idx = (row.d - week_start).days
            if 0 <= idx < 7:
                daily[idx] = row.c
        return daily

    async def week_proposals(week_start: date):
        daily = [0] * 7
        week_end = week_start + timedelta(days=6)
        r = await db.execute(
            select(func.date(public_proposal_review_log.c.created_at).label("d"), func.count().label("c"))
            .where(
                public_proposal_review_log.c.user_id == user["id"],
                public_proposal_review_log.c.final_status.in_(["sent", "Sent", "Approved", "sent_after_revision"]),
                func.date(public_proposal_review_log.c.created_at) >= week_start, 
                func.date(public_proposal_review_log.c.created_at) <= week_end,
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
    proposals_this = await week_proposals(this_week_start)
    proposals_last = await week_proposals(last_week_start)

    def pct_change(cur, prev):
        if prev == 0:
            return 100 if cur > 0 else 0
        return round((cur - prev) / prev * 100)

    return {
        "leadsToday": {"value": leads_today, "sparkline": [0, 0, 0, 0, 0, 0, leads_today]},
        "totalLeads": {"value": total_leads, "sparkline": [0, 0, 0, 0, 0, 0, total_leads]},
        "emailsSent": {"value": emails_sent, "sparkline": [0, 0, 0, 0, 0, 0, emails_sent]},
        "meetingsBooked": {"value": meetings_booked, "sparkline": [0, 0, 0, 0, 0, 0, meetings_booked]},
        "proposalsSent": {"value": proposals_sent, "sparkline": [0, 0, 0, 0, 0, 0, proposals_sent]},
        "leadsGrowth": leads_growth,
        "pipelineFunnel": pipeline_funnel,
        "icpsGeneratedDaily": icps_generated_daily,
        "activityFeed": activity[:6],
        "dailyActivity": daily_activity,
        "emailsSentComparison": {
            "percent": pct_change(sum(sent_this), sum(sent_last)),
            "trend": "up" if sum(sent_this) >= sum(sent_last) else "down",
            "thisWeek": sent_this, "lastWeek": sent_last, "totalPerWeek": sum(sent_this),
        },
        "proposalsSentComparison": {
            "percent": pct_change(sum(proposals_this), sum(proposals_last)),
            "trend": "up" if sum(proposals_this) >= sum(proposals_last) else "down",
            "thisWeek": proposals_this, "lastWeek": proposals_last, "totalPerWeek": sum(proposals_this),
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



@router.get("/analytics")
async def reports_analytics(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Real analytics for the Reports/Analytics page, replacing mock data.
    Queries: public.lead_results, public.meetings, public.proposal_review_log,
    smady.outreach_campaigns, smady.outreach_emails.
    """
    uid = str(user["id"])
    today = date.today()

    # --- Flatten all leads for this user ---
    all_leads, leads_by_day = await _flatten_user_leads(db, uid)

    # --- Pipeline funnel from real data ---
    total_leads = len(all_leads)
    contacted = sum(1 for l in all_leads if l["status"] in ("Contacted", "Meeting Booked", "Interested"))
    meetings_count_r = await db.execute(select(func.count()).select_from(meetings).where(meetings.c.user_id == user["id"]))
    meetings_total = meetings_count_r.scalar() or 0

    # Proposals from public.proposal_review_log (n8n) + proposal_results (app)
    n8n_props_r = await db.execute(
        select(func.count()).select_from(public_proposal_review_log)
        .where(public_proposal_review_log.c.user_id == user["id"])
    )
    n8n_props_total = n8n_props_r.scalar() or 0
    n8n_approved_r = await db.execute(
        select(func.count()).select_from(public_proposal_review_log).where(
            public_proposal_review_log.c.user_id == user["id"],
            public_proposal_review_log.c.final_status.in_(["sent", "sent_after_revision", "Approved", "Sent"])
        )
    )
    n8n_approved = n8n_approved_r.scalar() or 0

    app_props_r = await db.execute(
        select(func.count()).select_from(proposal_results).where(proposal_results.c.user_id == user["id"])
    )
    proposals_sent = (app_props_r.scalar() or 0) + n8n_props_total
    proposals_approved = n8n_approved

    funnel = [
        {"stage": "Leads Generated", "value": total_leads},
        {"stage": "Contacted", "value": contacted},
        {"stage": "Meetings Scheduled", "value": meetings_total},
        {"stage": "Proposals Sent", "value": proposals_sent},
        {"stage": "Approved", "value": proposals_approved},
    ]

    # --- Outreach over time (last 6 months) ---
    outreach_over_time = []
    for i in range(5, -1, -1):
        m_date = today.replace(day=1) - timedelta(days=i * 28)
        m_label = m_date.strftime("%b")
        
        month_start = m_date.replace(day=1)
        if m_date.month == 12:
            month_end = m_date.replace(year=m_date.year + 1, month=1, day=1)
        else:
            month_end = m_date.replace(month=m_date.month + 1, day=1)

        # Query emails by joining campaigns (filters by user_id)
        async def _count_email_status_by_user(status: str, ms, me) -> int:
            r = await db.execute(
                select(func.count()).select_from(outreach_emails)
                .join(outreach_campaigns, outreach_emails.c.campaign_id == outreach_campaigns.c.id)
                .where(
                    outreach_campaigns.c.user_id == user["id"],
                    outreach_emails.c.status == status,
                    func.date(outreach_emails.c.created_at) >= ms,
                    func.date(outreach_emails.c.created_at) < me,
                )
            )
            return r.scalar() or 0

        sent_r = await _count_email_status_by_user("sent", month_start, month_end)
        opened_r = await _count_email_status_by_user("opened", month_start, month_end)
        replied_r = await _count_email_status_by_user("replied", month_start, month_end)
        outreach_over_time.append({"label": m_label, "sent": sent_r, "opened": opened_r, "replied": replied_r})

    # --- Leads by Country & Industry ---
    country_counts: dict = {}
    industry_counts: dict = {}
    for lead in all_leads:
        c = lead.get("country") or "Unknown"
        if c and c != "Unknown":
            country_counts[c] = country_counts.get(c, 0) + 1
        ind = lead.get("industry") or "Unknown"
        if ind and ind != "Unknown":
            industry_counts[ind] = industry_counts.get(ind, 0) + 1

    # Get top 6 and group remaining as "Other"
    def get_top_n_with_other(counts_dict, n=6):
        sorted_items = sorted(counts_dict.items(), key=lambda x: -x[1])
        top_n = sorted_items[:n]
        other_count = sum(v for _, v in sorted_items[n:])
        
        # Calculate total for percentage
        total = sum(v for _, v in sorted_items)
        if total == 0:
            return []
        
        # Convert to percentages
        result = [{"name": k, "value": round(v / total * 100)} for k, v in top_n]
        if other_count > 0:
            result.append({"name": "Other", "value": round(other_count / total * 100)})
        return result

    leads_by_country = get_top_n_with_other(country_counts, 6)
    leads_by_industry = get_top_n_with_other(industry_counts, 6)

    # Ensure at least some placeholder data if empty
    if not leads_by_country:
        leads_by_country = [{"name": "No data", "value": 1}]
    if not leads_by_industry:
        leads_by_industry = [{"name": "No data", "value": 1}]

    # --- Meeting conversion comparison (this week vs last) ---
    this_week_start = today - timedelta(days=6)
    last_week_start = today - timedelta(days=13)

    async def _meetings_per_day(start: date) -> list:
        daily = [0] * 7
        r = await db.execute(
            select(func.date(meetings.c.meeting_date).label("d"), func.count().label("c"))
            .where(meetings.c.user_id == user["id"],
                   func.date(meetings.c.meeting_date) >= start,
                   func.date(meetings.c.meeting_date) <= start + timedelta(days=6))
            .group_by("d")
        )
        for row in r.fetchall():
            idx = (row.d - start).days
            if 0 <= idx < 7:
                daily[idx] = row.c
        return daily

    this_week_meetings = await _meetings_per_day(this_week_start)
    last_week_meetings = await _meetings_per_day(last_week_start)

    def _pct_change(cur, prev):
        if prev == 0:
            return 100 if cur > 0 else 0
        return round((cur - prev) / prev * 100)

    tw_total = sum(this_week_meetings)
    lw_total = sum(last_week_meetings)
    pct = _pct_change(tw_total, lw_total)
    
    # Meeting Conversion Rate = total meetings / total leads
    total_leads_for_conv = max(total_leads, 1)
    meeting_conversion_rate = round(meetings_total / total_leads_for_conv * 100)

    meeting_conversion = {
        "percent": meeting_conversion_rate,
        "trend": "up" if tw_total >= lw_total else "down",
        "thisWeek": this_week_meetings,
        "lastWeek": last_week_meetings,
        "totalPerWeek": tw_total,
    }

    # --- Campaign performance (real data) ---
    camp_r = await db.execute(
        select(outreach_campaigns).where(outreach_campaigns.c.user_id == user["id"])
        .order_by(outreach_campaigns.c.created_at.desc()).limit(10)
    )
    campaign_perf = []
    for c in camp_r.fetchall():
        # Count emails by status for this campaign
        async def _c_status(cid, status):
            r = await db.execute(
                select(func.count()).select_from(outreach_emails).where(
                    outreach_emails.c.campaign_id == cid, outreach_emails.c.status == status
                )
            )
            return r.scalar() or 0
        s = await _c_status(c.id, "sent")
        o = await _c_status(c.id, "opened")
        rep = await _c_status(c.id, "replied")
        den = s or 1
        campaign_perf.append({
            "name": c.name or "Unnamed",
            "emails": s,
        })

    # --- Proposal quality (from public.proposal_review_log) ---
    needs_review_r = await db.execute(
        select(func.count()).select_from(public_proposal_review_log).where(
            public_proposal_review_log.c.final_status.in_(["needs_review", "Needs Review"])
        )
    )
    after_revision_r = await db.execute(
        select(func.count()).select_from(public_proposal_review_log).where(
            public_proposal_review_log.c.final_status == "sent_after_revision"
        )
    )
    proposal_quality = {
        "needs_review_count": needs_review_r.scalar() or 0,
        "sent_count": n8n_approved,
        "after_revision_count": after_revision_r.scalar() or 0,
        "approval_rate_first_pass": round(n8n_approved / max(n8n_props_total, 1) * 100),
    }

    # --- Proposals this month (generated / sent / accepted / pending) ---
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1)
    else:
        month_end = today.replace(month=today.month + 1, day=1)

    async def _count_proposals(statuses: list | None) -> int:
        conditions = [
            public_proposal_review_log.c.user_id == user["id"],
            func.date(public_proposal_review_log.c.created_at) >= month_start,
            func.date(public_proposal_review_log.c.created_at) < month_end,
        ]
        if statuses:
            conditions.append(public_proposal_review_log.c.final_status.in_(statuses))
        r = await db.execute(select(func.count()).select_from(public_proposal_review_log).where(*conditions))
        return r.scalar() or 0

    # Proposals Lifecycle: by week for time-series line chart
    proposals_by_week = []
    for week_offset in range(4):  # Last 4 weeks
        week_start = today - timedelta(days=(3 - week_offset) * 7)
        week_end = week_start + timedelta(days=7)
        week_label = f"Week {4 - week_offset}"
        
        async def _count_proposals_week(statuses: list | None, start, end) -> int:
            conditions = [
                public_proposal_review_log.c.user_id == user["id"],
                func.date(public_proposal_review_log.c.created_at) >= start,
                func.date(public_proposal_review_log.c.created_at) < end,
            ]
            if statuses:
                conditions.append(public_proposal_review_log.c.final_status.in_(statuses))
            r = await db.execute(select(func.count()).select_from(public_proposal_review_log).where(*conditions))
            return r.scalar() or 0
        
        generated = await _count_proposals_week(None, week_start, week_end)
        sent = await _count_proposals_week(["sent", "Sent", "sent_after_revision"], week_start, week_end)
        accepted = await _count_proposals_week(["Approved"], week_start, week_end)
        pending = await _count_proposals_week(["needs_review", "Needs Review"], week_start, week_end)
        
        proposals_by_week.append({
            "label": week_label,
            "generated": generated,
            "sent": sent,
            "accepted": accepted,
            "pending": pending,
        })

    return {
        "funnel": funnel,
        "outreach_over_time": outreach_over_time,
        "leads_by_country": leads_by_country,
        "leads_by_industry": leads_by_industry,
        "meeting_conversion": meeting_conversion,
        "campaign_performance": campaign_perf,
        "proposal_quality": proposal_quality,
        "proposals_this_month": proposals_by_week,
    }
