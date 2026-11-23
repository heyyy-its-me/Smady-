# Smady lead-generation capability map

Research snapshot: 23 November 2026. Provider claims are attributed to their Apify Store documentation below. This is an internal evidence map; it does not assert that every reviewed actor is connected to Smady production.

## Actor mapping

| Actor | Lead Category | Supported Industries | B2B/B2C/B2B2C | Data Retrieved | Geographic Coverage | Limitations |
|---|---|---|---|---|---|---|
| Pipeline Labs `leads-finder-with-emails-apollo-lusha-zoominfo` | Professional contacts and company records | Company/industry targeting exists; specific vertical yield is not independently validated. Treat any selected industry as a search hypothesis. | B2B | Store advertises verified email, LinkedIn URL, phone where available and company data. Exact output fields should be confirmed against a dataset/run; full schema was not exhaustively verified here. | Actor page describes B2B database; exhaustive supported countries not verified. | Store advertises $1.50/1,000 returned leads and up to 50,000/run. Community-maintained. Database size, email coverage and cross-verification statements are provider claims. |
| Code Pioneer `leads-finder` | Professionals/decision-makers and company records | Company industry/keyword include-exclude filters, plus title, function and firmographic filters. Examples include SaaS, software, marketing/advertising; broad industry suitability is not independently validated. | B2B | First/last/full name, title, seniority/function, email and status, personal email, paid-plan mobile, LinkedIn, city/state/country, company name/domain/website/LinkedIn/size/industry/description/revenue/funding/founded year/phone/address, keywords and technologies. | Region/country/state and city include/exclude fields. Examples include US, UK and Amsterdam. No exhaustive allowlist found. | Advertises $1.50/1,000 fetched. Free Apify plan: up to 100 leads/run; mobile numbers limited to paid Apify plan users. Community-maintained; mixed review rating. Email quality may vary; use validated status and inspect sample data. |
| Apify Compass `crawler-google-places` | Local organizations/businesses and place listings | Search terms/categories can find map-listed places across sectors. Validated for a particular industry depends on search quality and Google Maps coverage; no blanket vertical guarantee. | B2B for business prospecting; B2B2C when a listed business serves consumers. Not individual consumer acquisition or consumer intent. | Place/business name, category, address, website, phone and other place fields; reviews/ratings and details via options. Optional lead enrichment can return named contacts, titles, emails, phones, LinkedIn and firmographics; enrichment defaults to zero. | Free-text location, country, state, county, city, postal code or custom polygon/circle area. Coverage follows Google Maps availability. | Starts at $1.50/1,000 places. Add-ons including place detail, reviews, lead enrichment and email verification can incur charges. No-location direct search may cap at 120 results/search term. Optional enrichment returns personal data; legal basis is user's responsibility. |

## Industry-wise mapping

| Industry | Potential Customer Type | B2B/B2C/B2B2C | Available Actor | Current Support Status |
|---|---|---|---|---|
| Technology & software | Software companies, IT service firms, technology leaders | B2B | Both Leads Finder actors | Industry and role filters exist; prospect relevance/yield needs validation for each query. Smady actor routing not verified. |
| Professional services | Consultancies, agencies, legal/accounting/engineering firms and decision-makers | B2B | Both Leads Finder actors; Google Maps for locally listed firms | Potential fit based on company/role targeting or Maps place discovery. Specific vertical output not validated. |
| Manufacturing & industrial | Manufacturers, distributors, operations/procurement leaders | B2B | Both Leads Finder actors; Google Maps for local businesses | Potential fit from industry/keyword/title filters and listed places; no vertical-specific validation. |
| Retail, hospitality & local services | Stores, restaurants, hotels, contractors and other local businesses | B2B / B2B2C | Google Maps Scraper | Local business records are prospects, not individual consumers. Use B2B2C only where the prospect company serves consumers. |
| Healthcare, education & real estate | Organizations, clinics, schools, property/service businesses and professional buyers | B2B / B2B2C | Leads Finder actors; Google Maps for listed locations | Potential fit only. No actor documentation reviewed establishes vertical validation or consumer-person targeting. |

## Smady implementation check

- `frontend/src/pages/Leads.tsx` exposes source choices `linkedin` and `google_maps`.
- `backend/routers/leads_router.py` accepts these source values and forwards the selected source to the configured leads webhook.
- No Apify actor ID, token or actor-specific routing for the three named actors was found in the inspected application code. Do not state that all three are confirmed live integrations.
- Google OAuth is presented by the app for Gmail and Calendar actions. No CRM integration was verified.

## Primary sources

- Pipeline Labs store and input schema: https://apify.com/pipelinelabs/leads-finder-with-emails-apollo-lusha-zoominfo and https://apify.com/pipelinelabs/leads-finder-with-emails-apollo-lusha-zoominfo/input-schema
- Code Pioneer store and input schema: https://apify.com/code_crafter/leads-finder and https://apify.com/code_crafter/leads-finder/input-schema
- Compass Google Maps Scraper store, input schema and API/OpenAPI: https://apify.com/compass/crawler-google-places, https://apify.com/compass/crawler-google-places/input-schema, https://apify.com/compass/crawler-google-places/api/openapi
