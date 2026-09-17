import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { Users, ShieldCheck, Send, Upload, Download, Linkedin, UploadCloud, Building2, Factory, UserRound, Globe2, MapPin, Sparkles, Coffee, RefreshCw, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/layouts/PageHeader";
import { FormSection } from "@/components/smady/FormSection";
import { MultiSelectDropdown } from "@/components/smady/MultiSelectDropdown";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { StatCard } from "@/components/smady/StatCard";
import { DataTable, type Column } from "@/components/smady/DataTable";
import { AvatarInitial } from "@/components/smady/AvatarStack";
import { StatusBadge } from "@/components/smady/Badge";
import { KebabMenu } from "@/components/smady/KebabMenu";
import { EmptyState } from "@/components/smady/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import { api } from "@/lib/api";
import type { Lead } from "@/types";
import { LeadDetailModal } from "@/components/smady/LeadDetailModal";
import { EditLeadModal } from "@/components/smady/EditLeadModal";
import { RunHistoryPicker } from "@/components/smady/RunHistoryPicker";
import { IcpPickerButton } from "@/components/smady/IcpPickerButton";

const industries = ["B2B SaaS", "Fintech", "Healthtech", "E-commerce", "Manufacturing"];
const roles = ["VP of Sales", "Head of Growth", "CRO", "Founder", "Director of Marketing"];
const countries = ["United States", "United Kingdom", "Canada", "Germany", "India"];
const cities = ["New York", "London", "Toronto", "Berlin", "Bengaluru"];
const companySizes = ["1-50", "50-200", "200-1000", "1000+"];
const PAGE_SIZE = 25;

const shimmerBar = "rounded-full bg-[linear-gradient(90deg,#FFE6D6_25%,#F9622C_50%,#FFE6D6_75%)] bg-[length:200%_100%] animate-shimmer";

export default function Leads() {
  const {
    leads,
    leadsTotal,
    leadsRunId,
    leadsVerifiedCount,
    leadsReadyCount,
    generatingLeads,
    leadsTimedOut,
    generateLeads,
    checkLeadsAgain,
    uploadLeads,
    sendToOutreach,
    sendRunToOutreach,
    updateLead,
    deleteLead,
    refreshLeads,
  } = useAppData();
  const [searchParams] = useSearchParams();
  const requestIdParam = searchParams.get("request_id");

  const formRef = useRef<HTMLDivElement>(null);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState(companySizes[1]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [runInfo, setRunInfo] = useState<{ status: string; run_id: string; created_at: string } | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [page, setPage] = useState(1);

  // Normalize the initial app-wide fetch to this page's PAGE_SIZE, unless viewing a specific run
  useEffect(() => {
    if (requestIdParam) return;
    refreshLeads(undefined, 0, PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to page 1 whenever the displayed run changes (new generate, or a different run picked)
  useEffect(() => {
    setPage(1);
  }, [leadsRunId]);

  const goToPage = (p: number) => {
    setPage(p);
    refreshLeads(leadsRunId || undefined, (p - 1) * PAGE_SIZE, PAGE_SIZE);
  };

  const onSelectRun = (runId: string) => {
    setPage(1);
    refreshLeads(runId, 0, PAGE_SIZE);
  };

  // When navigating here with ?request_id, verify ownership and filter leads
  useEffect(() => {
    if (!requestIdParam) return;
    api.get(`/leads/status/${requestIdParam}`)
      .then(({ data }) => {
        setRunInfo(data);
        // Load leads filtered to this specific run
        if (data.run_id) refreshLeads(data.run_id, 0, PAGE_SIZE);
      })
      .catch(() => {
        // 404 = no access or not found, just ignore
      });
  }, [requestIdParam, refreshLeads]);

  // Reuse a saved ICP's Industry/Roles/Countries as a starting point for lead filters —
  // done explicitly via the "Apply Saved ICP" picker now, not silently forced on every load.
  const applyIcp = (result: { industry: string[]; targetRoles: string[]; geography: string[] }) => {
    setSelectedIndustries(result.industry || []);
    setSelectedRoles(result.targetRoles || []);
    setSelectedCountries(result.geography || []);
    toast.success("ICP filters applied");
  };


  const toggleSelect = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allSelectedFilters = [...selectedIndustries, ...selectedRoles, ...selectedCountries, ...selectedCities];
  const estimatedMatches = allSelectedFilters.length === 0 ? 0 : Math.min(500, allSelectedFilters.length * 35 + 40);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateLeads({ industries: selectedIndustries, roles: selectedRoles, countries: selectedCountries, cities: selectedCities, companySize });
  };

  const columns: Column<Lead>[] = [
    {
      key: "checkbox",
      label: "",
      render: (l) => (
        <input
          type="checkbox"
          checked={selected.includes(l.id)}
          onChange={() => toggleSelect(l.id)}
          data-testid={`lead-checkbox-${l.id}`}
          className="h-4 w-4 rounded border-border text-primary-500"
        />
      ),
    },
    {
      key: "lead",
      label: "Lead",
      sortable: true,
      render: (l) => (
        <button
          type="button"
          onClick={() => setViewLead(l)}
          data-testid={`lead-name-${l.id}`}
          className="flex items-center gap-3 text-left"
        >
          <AvatarInitial name={l.name} />
          <div>
            <p className="text-sm font-semibold text-ink hover:text-primary-600">{l.name}</p>
            <p className="text-xs text-muted">{l.title}</p>
          </div>
        </button>
      ),
    },
    { key: "company", label: "Company", render: (l) => <span className="text-sm text-body">{l.company}</span> },
    { key: "email", label: "Email", render: (l) => <span className="text-sm text-body">{l.email}</span> },
    {
      key: "linkedin",
      label: "LinkedIn",
      render: (l) =>
        l.linkedin ? (
          <a
            href={l.linkedin.startsWith("http") ? l.linkedin : `https://${l.linkedin}`}
            target="_blank"
            rel="noreferrer"
            className="max-w-[180px] truncate text-sm text-primary-600 hover:underline"
            data-testid={`lead-linkedin-${l.id}`}
          >
            {l.linkedin.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <span className="text-sm text-muted">—</span>
        ),
    },
    { key: "status", label: "Status", render: (l) => <StatusBadge status={l.status} /> },
    { key: "source", label: "Source", render: (l) => <StatusBadge status={l.source} /> },
    {
      key: "kebab",
      label: "",
      render: (l) => (
        <KebabMenu
          testId={`lead-kebab-${l.id}`}
          items={[
            { label: "View lead", onClick: () => setViewLead(l) },
            { label: "Edit", onClick: () => setEditLead(l) },
            { label: "Send to outreach", onClick: () => sendToOutreach([l.id]) },
            {
              label: "Remove",
              danger: true,
              onClick: () => {
                if (window.confirm(`Remove ${l.name || "this lead"}? This cannot be undone.`)) deleteLead(l.id);
              },
            },
          ]}
        />
      ),
    },
  ];

  const totalFound = leadsTotal;
  const verified = leadsVerifiedCount;
  const readyForOutreach = leadsReadyCount;

  const onDownload = async () => {
    if (leadsTotal === 0) return;
    const { data } = await api.get(`/leads?run_id=${leadsRunId}&limit=${leadsTotal}&offset=0`);
    const rows = data.leads.map((l: Lead) => ({
      Name: l.name,
      Title: l.title,
      Company: l.company,
      Domain: l.domain,
      Email: l.email,
      Phone: l.phone || "",
      LinkedIn: l.linkedin,
      Status: l.status,
      Source: l.source,
      "Lead Score": l.leadScore ?? "",
      Priority: l.priority || "",
      "ICP Match": l.icpMatch || "",
      Seniority: l.seniority || "",
      Industry: l.industry || "",
      Employees: l.employees || "",
      Location: l.location || "",
      "Funding Stage": l.fundingStage || "",
      "Pain Points Matched": l.painPointsMatched || "",
      "Personalization Hook": l.personalizationHook || "",
      "Recommended Action": l.recommendedAction || "",
      "Sequence Progress": l.sequenceProgress,
      About: l.companyDescription || l.about,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = Object.keys(rows[0]).map(() => ({ wch: 22 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
    XLSX.writeFile(workbook, `smady-leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} leads to Excel`);
  };

  return (
    <div data-testid="leads-page">
      <PageHeader
        actions={
          <>
            <IcpPickerButton onApply={applyIcp} />
            <RunHistoryPicker selectedRunId={leadsRunId} onSelect={onSelectRun} />
          </>
        }
      />

      {/* Run context banner when navigated from history */}
      {runInfo && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary-200/70 bg-primary-50/50 px-4 py-3">
          <Clock className="h-4 w-4 text-primary-600" strokeWidth={1.5} />
          <span className="text-sm text-primary-700">
            Showing leads from run ·{" "}
            <strong>{new Date(runInfo.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}</strong>
            {" "}· Status: <StatusBadge status={runInfo.status} />
          </span>
          <button
            className="ml-auto text-xs text-primary-600 underline underline-offset-2"
            onClick={() => { setRunInfo(null); refreshLeads(undefined, 0, PAGE_SIZE); }}
          >
            Show all leads
          </button>
        </div>
      )}

      <div ref={formRef} className="relative rounded-2xl border border-primary-100/70 bg-surface p-6 shadow-card lg:p-8" data-testid="leads-filter-form-card">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 overflow-hidden rounded-full bg-gradient-to-br from-primary-200/40 to-accent/10 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600 shadow-sm">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            Lead Sourcing Agent
          </span>
          <h2 className="mt-3 font-display text-xl font-extrabold text-ink">Find Leads Matching Your ICP</h2>
          <p className="mt-1 text-sm text-body">Filter by audience and location to source your next batch of leads.</p>
        </div>
        <form onSubmit={onGenerate} className="relative mt-6 space-y-5" data-testid="leads-filter-form">
          <FormSection label="Industry & Roles" step="01" icon={Factory} tint>
            <MultiSelectDropdown icon={Factory} label="Industry" placeholder="Type or select an industry..." options={industries} value={selectedIndustries} onChange={setSelectedIndustries} testId="leads-industry-select" />
            <MultiSelectDropdown icon={UserRound} label="Target Roles" placeholder="Type or select a role..." options={roles} value={selectedRoles} onChange={setSelectedRoles} testId="leads-roles-select" />
          </FormSection>
          <FormSection label="Location" step="02" icon={Globe2}>
            <MultiSelectDropdown icon={Globe2} label="Countries" placeholder="Type or select a country..." options={countries} value={selectedCountries} onChange={setSelectedCountries} testId="leads-countries-select" />
            <MultiSelectDropdown icon={MapPin} label="Cities" placeholder="Type or select a city..." options={cities} value={selectedCities} onChange={setSelectedCities} testId="leads-cities-select" />
          </FormSection>
          <FormSection label="Company Size" step="03" icon={Building2} tint>
            <div className="group relative sm:col-span-2">
              <Building2 className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-150 group-focus-within:text-primary-500" strokeWidth={1.5} />
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger
                  data-testid="leads-company-size-select"
                  className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {companySizes.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormSection>

          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-200/70 bg-gradient-to-r from-primary-50/80 via-white to-orange-50/60 p-4 shadow-soft"
            data-testid="leads-search-summary"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wide text-primary-700">Search Summary:</span>
              {allSelectedFilters.length === 0 ? (
                <span className="text-sm text-muted">No filters selected yet</span>
              ) : (
                allSelectedFilters.map((c) => (
                  <span key={c} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-600 shadow-soft">
                    {c}
                  </span>
                ))
              )}
            </div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-extrabold text-white shadow-md shadow-primary-500/20 ${
                allSelectedFilters.length > 0 ? "bg-primary-500 animate-pulse" : "bg-muted"
              }`}
              data-testid="leads-estimated-matches"
            >
              ~{estimatedMatches} leads match
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-3">
              <ButtonOutline type="button" icon={<Upload className="h-4 w-4" strokeWidth={1.5} />} onClick={() => setUploadOpen(true)} data-testid="leads-upload-button">
                Upload Leads
              </ButtonOutline>
              <ButtonOutline
                type="button"
                disabled={leads.length === 0}
                icon={<Download className="h-4 w-4" strokeWidth={1.5} />}
                onClick={onDownload}
                data-testid="leads-download-button"
              >
                Download Leads
              </ButtonOutline>
              {leadsRunId && leadsTotal > 0 && (
                <ButtonOutline
                  type="button"
                  icon={<Send className="h-4 w-4" strokeWidth={1.5} />}
                  onClick={async () => {
                    await sendRunToOutreach(leadsRunId);
                    refreshLeads(leadsRunId, (page - 1) * PAGE_SIZE, PAGE_SIZE);
                  }}
                  data-testid="leads-send-run-to-outreach-button"
                >
                  Send All {leadsTotal} to Outreach
                </ButtonOutline>
              )}
            </div>
            <ButtonPrimary
              type="submit"
              loading={generatingLeads}
              icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
              className="shadow-[0_8px_24px_-4px_rgba(249,98,44,0.4)]"
              data-testid="leads-generate-button"
            >
              {generatingLeads ? "Sourcing leads…" : "Generate Leads"}
            </ButtonPrimary>
          </div>
        </form>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Total Leads Found" value={totalFound} icon={Users} />
        <StatCard label="Verified Emails" value={verified} icon={ShieldCheck} />
        <StatCard label="Ready for Outreach" value={readyForOutreach} icon={Send} />
      </div>

      <div className="mt-6">
        {/* Generating state — show coffee message + skeleton */}
        {generatingLeads && (
          <div className="space-y-4 rounded-2xl border border-primary-200/70 bg-surface p-6 shadow-card" data-testid="leads-loading-skeleton">
            <div className="flex items-center gap-3">
              <Coffee className="h-5 w-5 shrink-0 text-primary-500" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-ink">Request sent to the Agent</p>
                <p className="text-xs text-muted">We’re getting you the best leads — this usually takes 3–5 minutes. Perfect time for a coffee ☕</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div className={`h-4 w-1/4 ${shimmerBar}`} />
              <div className="mt-4 space-y-3">
                <div className={`h-3 w-full ${shimmerBar}`} />
                <div className={`h-3 w-full ${shimmerBar}`} />
                <div className={`h-3 w-2/3 ${shimmerBar}`} />
              </div>
            </div>
          </div>
        )}

        {/* Timed-out state */}
        {leadsTimedOut && !generatingLeads && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-soft" data-testid="leads-timeout-card">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">This is taking longer than expected</p>
                <p className="mt-1 text-sm text-muted">
                  The agent is still working on your request. n8n will call back as soon as it’s done.
                  You can check now or come back in a few minutes.
                </p>
                <div className="mt-4 flex gap-3">
                  <ButtonPrimary
                    onClick={checkLeadsAgain}
                    icon={<RefreshCw className="h-4 w-4" strokeWidth={1.5} />}
                    data-testid="leads-check-again-button"
                  >
                    Check Again
                  </ButtonPrimary>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!generatingLeads && !leadsTimedOut && leads.length === 0 && (
          <EmptyState
            icon={Users}
            title="No leads yet"
            subtitle="Fill in your ICP filters above and generate your first batch of leads."
            actionLabel="Go to Filters"
            onAction={() => formRef.current?.scrollIntoView({ behavior: "smooth" })}
          />
        )}

        {/* Leads table */}
        {!generatingLeads && leads.length > 0 && (
          <div className="rounded-2xl border border-primary-100/70 bg-surface p-6 shadow-card">
            <DataTable columns={columns} rows={leads} testId="leads-table" />
            {leadsTotal > PAGE_SIZE && (
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4" data-testid="leads-pagination">
                <p className="text-xs text-muted">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, leadsTotal)} of {leadsTotal} leads
                </p>
                <div className="flex items-center gap-2">
                  <ButtonOutline data-testid="leads-prev-page-button" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                    Previous
                  </ButtonOutline>
                  <ButtonOutline
                    data-testid="leads-next-page-button"
                    disabled={page * PAGE_SIZE >= leadsTotal}
                    onClick={() => goToPage(page + 1)}
                  >
                    Next
                  </ButtonOutline>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full border border-primary-500/40 bg-ink/95 px-6 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
            data-testid="leads-bulk-action-bar"
          >
            <span className="text-sm text-white">{selected.length} selected</span>
            <ButtonPrimary
              onClick={() => {
                sendToOutreach(selected);
                toast.success("Leads sent to outreach");
                setSelected([]);
              }}
              data-testid="leads-send-to-outreach-button"
            >
              Send to Outreach
            </ButtonPrimary>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent data-testid="leads-upload-modal">
          <DialogHeader>
            <DialogTitle>Upload Leads</DialogTitle>
          </DialogHeader>
          <div className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/30 py-10 text-center transition-colors hover:bg-primary-50/60">
            <UploadCloud className="h-8 w-8 text-primary-500 transition-transform duration-200 group-hover:-translate-y-1" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-body">Drag & drop a CSV file, or click to browse</p>
          </div>
          <ButtonPrimary
            fullWidth
            className="mt-2"
            onClick={() => {
              uploadLeads(5);
              setUploadOpen(false);
              toast.success("5 leads uploaded");
            }}
            data-testid="leads-upload-confirm-button"
          >
            Upload
          </ButtonPrimary>
        </DialogContent>
      </Dialog>

      <LeadDetailModal lead={viewLead} open={!!viewLead} onOpenChange={(v) => !v && setViewLead(null)} />
      <EditLeadModal lead={editLead} open={!!editLead} onOpenChange={(v) => !v && setEditLead(null)} onSave={updateLead} />
    </div>
  );
}
