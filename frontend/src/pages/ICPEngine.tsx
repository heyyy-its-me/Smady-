import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, FileText, Building2, Info, Globe2, Factory, Target, Radar, Rocket, Gauge, Clock } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { FormSection } from "@/components/smady/FormSection";
import { FieldInput, FieldTextarea } from "@/components/smady/FieldInput";
import { MultiSelectDropdown } from "@/components/smady/MultiSelectDropdown";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";
import { IcpDetailModal } from "@/components/smady/IcpDetailModal";
import { IcpHistoryPicker } from "@/components/smady/IcpHistoryPicker";

const countries = ["United States", "United Kingdom", "Canada", "Germany", "India"];
const industries = ["B2B SaaS", "Fintech", "Healthtech", "E-commerce", "Manufacturing"];
const businessStages = ["Pre-Seed / Idea", "Early Stage (MVP)", "Growth", "Scale-up", "Enterprise / Mature"];
const priorities = ["Speed", "Quality", "Cost", "Balanced"];

const resultGroups: { key: "industry" | "targetRoles" | "companySize" | "geography" | "painPoints"; label: string }[] = [
  { key: "industry", label: "Industry" },
  { key: "targetRoles", label: "Target Roles" },
  { key: "companySize", label: "Company Size" },
  { key: "geography", label: "Geography" },
  { key: "painPoints", label: "Key Pain Points" },
];

export default function ICPEngine() {
  const { icp, generatingIcp, generateIcp } = useAppData();
  const navigate = useNavigate();
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [selectedIcpData, setSelectedIcpData] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ productName: "", productDescription: "", companyName: "", companyDetails: "" });
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States"]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["B2B SaaS"]);
  const [businessStage, setBusinessStage] = useState(businessStages[2]);
  const [priority, setPriority] = useState(priorities[3]);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateIcp({ ...form, countries: selectedCountries, industries: selectedIndustries, businessStage, priority });
  };

  const handleSelectIcp = (icpId: string, icpData: { result?: Record<string, unknown> }) => {
    setSelectedIcpId(icpId);
    setSelectedIcpData(icpData.result || null);
  };

  const handleBackToNew = () => {
    setSelectedIcpId(null);
    setSelectedIcpData(null);
  };

  const summarySentence = `${form.productName || "Your product"} helps ${form.companyName || "your company"} reach ${
    selectedIndustries.length ? selectedIndustries.join(", ") : "target industries"
  } companies across ${selectedCountries.length ? selectedCountries.join(", ") : "selected regions"}.`;

  const totalFields = 6;
  const filledFields =
    [form.productName, form.productDescription, form.companyName, form.companyDetails].filter(Boolean).length +
    (selectedIndustries.length > 0 ? 1 : 0) +
    (selectedCountries.length > 0 ? 1 : 0);
  const completeness = Math.round((filledFields / totalFields) * 100);

  return (
    <div data-testid="icp-page">
      <PageHeader />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── Left Column: Form or Results ── */}
        <div>
          {selectedIcpData && !generatingIcp ? (
            /* Show past ICP results */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary-200/70 bg-surface p-6 shadow-card">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2 text-primary-500">
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  <h2 className="font-display text-[15px] font-bold text-ink">Saved Ideal Customer Profile</h2>
                </div>
              </div>
              {resultGroups.map(({ key, label }, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.3 }}
                  className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5"
                >
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedIcpData[key] as string[])?.map((it) => (
                      <span key={it} className="rounded-lg border border-primary-200/80 bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600">
                        {it}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
              <div className="mt-6 flex flex-col gap-3">
                <ButtonPrimary
                  fullWidth
                  onClick={() => {
                    toast.success("ICP saved");
                    navigate("/leads");
                  }}
                  data-testid="icp-save-and-use-button"
                >
                  Use in Lead Management
                </ButtonPrimary>
                <ButtonOutline fullWidth onClick={handleBackToNew} data-testid="icp-back-to-new-button">
                  Back to New ICP
                </ButtonOutline>
              </div>
            </motion.div>
          ) : (
            /* Show form for creating new ICP */
            <div className="relative overflow-hidden rounded-2xl border border-primary-100/70 bg-surface p-6 shadow-card lg:p-8" data-testid="icp-form-card">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-gradient-to-br from-primary-200/40 to-accent/10 blur-3xl" aria-hidden />
              <div className="relative mb-6 flex items-center justify-between border-b border-border/80 pb-6">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary-200/60 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-600 shadow-sm">
                    <Sparkles className="h-3 w-3" strokeWidth={2} />
                    AI ICP Engine
                  </span>
                  <h2 className="mt-3 font-display text-xl font-extrabold text-ink">Build Your Ideal Customer Profile</h2>
                  <p className="mt-1 text-sm text-body">Tell us about your product and audience — our engine will do the rest.</p>
                </div>
              </div>
              <form onSubmit={onSubmit} className="relative space-y-5" data-testid="icp-form">
            <FormSection label="Product Identity" step="01" icon={Package} tint>
              <FieldInput
                icon={Package}
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                placeholder="Product Name"
                data-testid="icp-product-name-input"
                required
              />
              <FieldTextarea
                icon={FileText}
                value={form.productDescription}
                onChange={(e) => setForm({ ...form, productDescription: e.target.value })}
                placeholder="Product Description"
                data-testid="icp-product-description-input"
                required
              />
            </FormSection>
            <FormSection label="Company Context" step="02" icon={Building2}>
              <FieldInput
                icon={Building2}
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Company Name"
                data-testid="icp-company-name-input"
                required
              />
              <FieldTextarea
                icon={Info}
                value={form.companyDetails}
                onChange={(e) => setForm({ ...form, companyDetails: e.target.value })}
                placeholder="Company Details"
                data-testid="icp-company-details-input"
                required
              />
            </FormSection>
            <FormSection label="Business Context" step="03" icon={Rocket} tint>
              <div className="group relative">
                <Rocket className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-150 group-focus-within:text-primary-500" strokeWidth={1.5} />
                <Select value={businessStage} onValueChange={setBusinessStage}>
                  <SelectTrigger
                    data-testid="icp-business-stage-select"
                    className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                  >
                    <SelectValue placeholder="Business Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessStages.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="group relative">
                <Gauge className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted transition-colors duration-150 group-focus-within:text-primary-500" strokeWidth={1.5} />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger
                    data-testid="icp-priority-select"
                    className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                  >
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>
            <FormSection label="Audience & Market Targeting" step="04" icon={Target} tint>
              <MultiSelectDropdown
                icon={Globe2}
                label="Target Country"
                placeholder="Type or select a country..."
                options={countries}
                value={selectedCountries}
                onChange={setSelectedCountries}
                testId="icp-target-country-select"
              />
              <MultiSelectDropdown
                icon={Factory}
                label="Target Industry"
                placeholder="Type or select an industry..."
                options={industries}
                value={selectedIndustries}
                onChange={setSelectedIndustries}
                testId="icp-target-industry-select"
              />
            </FormSection>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
              <p className="text-xs text-muted">
                <span className="font-semibold text-primary-600">{completeness}%</span> profile completeness
              </p>
              <ButtonPrimary
                type="submit"
                loading={generatingIcp}
                icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
                className="shadow-[0_8px_24px_-4px_rgba(249,98,44,0.4)]"
                data-testid="icp-generate-button"
              >
                {generatingIcp ? "Analyzing your inputs…" : "Generate ICP"}
              </ButtonPrimary>
              </div>
            </form>
            </div>
          )}
        </div>

        {/* ── Right Column: History Picker & Preview or Results ── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {/* History Picker Card */}
          <div className="rounded-2xl border border-primary-100/70 bg-gradient-to-br from-primary-50/50 to-accent-50/30 p-6 mb-4">
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-200/60 bg-primary-50">
                <Clock className="h-5 w-5 text-primary-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">Recent ICPs</h3>
                <p className="mt-0.5 text-xs text-body">Select from past generations</p>
              </div>
              <IcpHistoryPicker selectedIcpId={selectedIcpId} onSelect={handleSelectIcp} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!selectedIcpData && !icp && !generatingIcp && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-2xl border border-primary-400/30 bg-gradient-to-b from-primary-500 via-primary-600 to-ink p-6 text-white shadow-[0_12px_36px_-8px_rgba(249,98,44,0.35)]"
                data-testid="icp-live-preview"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl motion-safe:animate-drift" aria-hidden />
                <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl motion-safe:animate-drift" aria-hidden />
                <span className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
                  <Radar className="h-3.5 w-3.5" strokeWidth={2} />
                  Live Preview
                </span>
                <h3 className="relative mt-3 text-xl font-bold">{form.productName || "Your ICP Preview"}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-white/85">{summarySentence}</p>
                <div className="relative mt-5">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    <span>Profile Match</span>
                    <span>{completeness}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${completeness}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                <div className="relative mt-5 flex flex-wrap gap-2">
                  {[...selectedIndustries, ...selectedCountries].map((c) => (
                    <span key={c} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20">
                      {c}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {generatingIcp && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4 rounded-2xl border border-primary-200/70 bg-surface p-6 shadow-card"
                data-testid="icp-loading-skeleton"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-primary-600">
                  <Sparkles className="h-4 w-4 animate-pulse" strokeWidth={2} />
                  <span className="animate-pulse">Analyzing your inputs…</span>
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-1/3 rounded-full bg-[linear-gradient(90deg,#FFE6D6_25%,#F9622C_50%,#FFE6D6_75%)] bg-[length:200%_100%] animate-shimmer" />
                  <div className="h-3 w-full rounded-full bg-[linear-gradient(90deg,#FFE6D6_25%,#F9622C_50%,#FFE6D6_75%)] bg-[length:200%_100%] animate-shimmer" />
                  <div className="h-3 w-5/6 rounded-full bg-[linear-gradient(90deg,#FFE6D6_25%,#F9622C_50%,#FFE6D6_75%)] bg-[length:200%_100%] animate-shimmer" />
                  <div className="h-3 w-2/3 rounded-full bg-[linear-gradient(90deg,#FFE6D6_25%,#F9622C_50%,#FFE6D6_75%)] bg-[length:200%_100%] animate-shimmer" />
                </div>
              </motion.div>
            )}

            {icp && !generatingIcp && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-primary-200/70 bg-surface p-6 shadow-card"
                data-testid="icp-results-card"
              >
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2 text-primary-500">
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    <h2 className="font-display text-[15px] font-bold text-ink">Your Ideal Customer Profile</h2>
                  </div>
                </div>
                {resultGroups.map(({ key, label }, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.3 }}
                    className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5"
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">{label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {icp[key].map((it) => (
                        <span key={it} className="rounded-lg border border-primary-200/80 bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600">
                          {it}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                <div className="mt-6 flex flex-col gap-3">
                  <ButtonPrimary
                    fullWidth
                    onClick={() => {
                      toast.success("ICP saved");
                      navigate("/leads");
                    }}
                    data-testid="icp-save-and-use-button"
                  >
                    Save &amp; Use in Lead Management
                  </ButtonPrimary>
                  <ButtonOutline fullWidth onClick={() => setShowFullAnalysis(true)} data-testid="icp-view-full-analysis-button">
                    View Full Analysis
                  </ButtonOutline>
                  <ButtonOutline fullWidth onClick={() => generateIcp(form)} data-testid="icp-regenerate-button">
                    Regenerate
                  </ButtonOutline>
                </div>
              </motion.div>
            )}

            {selectedIcpData && !generatingIcp && (
              <motion.div
                key="selected-results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-primary-200/70 bg-surface p-6 shadow-card"
              >
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2 text-primary-500">
                    <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                    <h2 className="font-display text-[15px] font-bold text-ink">Saved ICP</h2>
                  </div>
                </div>
                {resultGroups.map(({ key, label }, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.3 }}
                    className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5"
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">{label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(selectedIcpData[key] as string[])?.map((it) => (
                        <span key={it} className="rounded-lg border border-primary-200/80 bg-white px-3 py-1.5 text-sm font-medium text-ink shadow-soft transition-colors hover:bg-primary-50 hover:text-primary-600">
                          {it}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
                <div className="mt-6 flex flex-col gap-3">
                  <ButtonPrimary
                    fullWidth
                    onClick={() => {
                      toast.success("ICP saved");
                      navigate("/leads");
                    }}
                  >
                    Save &amp; Use in Lead Management
                  </ButtonPrimary>
                  <ButtonOutline fullWidth onClick={handleBackToNew}>
                    Back to New
                  </ButtonOutline>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <IcpDetailModal icp={icp} open={showFullAnalysis} onOpenChange={setShowFullAnalysis} />
    </div>
  );
}
