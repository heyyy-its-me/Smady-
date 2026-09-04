# Pursora (formerly Smady) - Frontend-only CRM/Marketing App

## Original Problem Statement
Build a frontend-only marketing/CRM app "Pursora" using React + Vite + TS, Tailwind,
Framer Motion, Recharts, react-big-calendar, lucide-react. Mock JSON data only, no backend.
Pages: Landing, Auth (mock), Dashboard, ICP Engine, Leads, Outreach, Meetings, Proposals, Reports.
Strict premium "Warm Orange" design system - no generic/flat UI.

## Architecture
- /app/frontend: Vite + React + TS app (port 3000)
- No backend used - all data from /app/frontend/src/mock/*.ts + AppDataContext
- Components in src/components/smady/ (premium custom library), src/components/ui/ (shadcn, rarely used)

## Completed (as of 2026-09-04)
- Vite migration, Tailwind Warm Orange theme, mock data layer, smady component library
- Dashboard, ICP Engine, Leads, Outreach, Meetings, Proposals, Reports pages built
- Fixed: "Good morning" greeting removed from PageHeader.tsx
- Fixed: ICP Engine icon-in-input bug (FieldInput/FieldTextarea wrapper needed `self-start`
  to prevent CSS grid stretch from pushing icon below short inputs when sibling textarea is taller)
- Fixed: Calendar (react-big-calendar) modernized - custom premium toolbar (CustomToolbar in
  CalendarBlock.tsx) replacing default RBC toolbar, restricted to Month/Week views, heavy
  rbc-* CSS overrides in index.css matching Warm Orange theme (soft borders, today highlight,
  premium event pills)
- Dashboard made "grander": bigger/richer StatCards (p-7, larger icons/values), added
  Pipeline Funnel chart, Lead Source Donut chart, and a timeline-style Live Activity feed
  (new ActivityFeed.tsx component) below the existing charts row

## Known/Deliberate Notes
- App still shows "Smady" branding in header/login page copy (user said don't touch
  Outreach/Proposals/Reports pages this round; branding rename not requested this session)
- Auth is fully mocked (any email/password logs in)
- User declined testing_agent for this round; verified via self screenshot-testing only

## Backlog / Next (P1, only if user asks)
- Rename remaining "Smady" branding references to "Pursora" if user requests
- Any further page-specific polish on Outreach/Proposals/Reports (currently marked "good, don't touch")
