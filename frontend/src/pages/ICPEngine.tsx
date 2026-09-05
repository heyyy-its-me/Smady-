import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, FileText, Building2, Globe2, Target as TargetIcon, Radar, Gauge } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { FormSection } from "@/components/smady/FormSection";
import { FieldInput, FieldTextarea } from "@/components/smady/FieldInput";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";

const businessStages = ["Idea / Pre-launch", "MVP", "Early Traction", "Growth", "Scale"];
const priorities = ["Speed", "Quality", "Cost Efficiency", "Personalization"];

const chipGroups: { key: "industries" | "roles" | "painPoints" | "goals" | "countries" | "channels"; label: string }[] = [
  { key: "industries", label: "Industries" },
  { key: "roles", label: "Buyer Roles" },
  { key: "painPoints", label: "Buyer Pain Points" },
  { key: "goals", label: "Buyer Goals" },
  { key: "countries", label: "Target Countries" },
  { key: "channels", label: "Recommended Channels" },
];

export default function ICPEngine() {
  const { icp, generatingIcp, generateIcp, fetchIcpByRequestId } = useAppData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ productName: "", productDescription: "", companyName: "", targetGeography: "" });
  const [businessStage, setBusinessStage] = useState(businessStages[2]);
  const [priority, setPriority] = useState(priorities[0]);

  useEffect(() => {
    const requestId = searchParams.get("request_id");
    if (requestId) fetchIcpByRequestId(requestId);
  }, [searchParams, fetchIcpByRequestId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateIcp({ ...form, businessStage, priority });
  };

  const summarySentence = `${form.productName || "Your product"} helps ${form.companyName || "your company"} reach customers in ${
    form.targetGeography || "your target region"
  }.`;

  const totalFields = 6;
  const filledFields = [form.productName, form.productDescription, form.companyName, form.targetGeography, businessStage, priority].filter(Boolean).length;
  const completeness = Math.round((filledFields / totalFields) * 100);

  const chipData: Record<string, string[]> = icp
    ? {
        industries: icp.analysis.industries,
        roles: icp.buyer_persona.role,
        painPoints: icp.buyer_persona.pain_points,
        goals: icp.buyer_persona.goals,
        countries: icp.gtm_strategy.target_countries,
        channels: icp.gtm_strategy.recommended_channels,
      }
    : {};

  return (
    <div data-testid="icp-page">
      <PageHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
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
              <FieldInput
                icon={Globe2}
                value={form.targetGeography}
                onChange={(e) => setForm({ ...form, targetGeography: e.target.value })}
                placeholder="Target Geography (e.g. United States)"
                data-testid="icp-target-geography-input"
                required
              />
            </FormSection>
            <FormSection label="Business Context" step="03" icon={TargetIcon} tint>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Business Stage</label>
                <select
                  value={businessStage}
                  onChange={(e) => setBusinessStage(e.target.value)}
                  data-testid="icp-business-stage-select"
                  className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                >
                  {businessStages.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  data-testid="icp-priority-select"
                  className="h-11 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(23,20,18,0.04)] transition-all duration-200 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
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

        <div className="lg:sticky lg:top-24 lg:self-start">
          <AnimatePresence mode="wait">
            {!icp && !generatingIcp && (
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
                  {[businessStage, priority, form.targetGeography].filter(Boolean).map((c) => (
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
                  <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                    <Gauge className="h-3.5 w-3.5" strokeWidth={2} />
                    {Math.round(icp.confidence_score * 100)}% confidence
                  </span>
                </div>

                <div className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">Positioning</p>
                  <p className="mt-1.5 text-sm italic text-body">"{icp.analysis.positioning}"</p>
                  <p className="mt-2 text-xs text-muted">{icp.analysis.differentiator}</p>
                </div>

                <div className="mt-4 rounded-xl border border-primary-200/80 bg-white p-3.5 shadow-soft">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">Primary ICP</p>
                  <p className="mt-1.5 text-sm font-semibold text-ink">{icp.primary_icp.icp}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "Pain", value: icp.primary_icp.pain_severity },
                      { label: "Market", value: icp.primary_icp.market_size },
                      { label: "Ease", value: icp.primary_icp.ease_of_sales },
                      { label: "Score", value: icp.primary_icp.score },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-primary-50 py-2">
                        <p className="text-sm font-bold text-primary-600">{m.value}</p>
                        <p className="text-[10px] font-semibold uppercase text-muted">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {icp.secondary_icps.length > 0 && (
                  <div className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">Secondary ICPs</p>
                    <div className="mt-2 space-y-2">
                      {icp.secondary_icps.map((s) => (
                        <div key={s.icp} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="text-ink">{s.icp}</span>
                          <span className="font-bold text-primary-600">{s.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {chipGroups.map(({ key, label }, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.3 }}
                    className="mt-4 rounded-xl border border-primary-100/60 bg-primary-50/50 p-3.5"
                  >
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-primary-700">{label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(chipData[key] || []).map((it) => (
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
                  <ButtonOutline fullWidth onClick={(e) => onSubmit(e)} data-testid="icp-regenerate-button">
                    Regenerate
                  </ButtonOutline>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
