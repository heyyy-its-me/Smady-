import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Package, FileText, Building2, Info, Globe2, Factory, Target, Radar } from "lucide-react";
import { PageHeader } from "@/layouts/PageHeader";
import { FormSection } from "@/components/smady/FormSection";
import { FieldInput, FieldTextarea } from "@/components/smady/FieldInput";
import { MultiSelectDropdown } from "@/components/smady/MultiSelectDropdown";
import { ButtonPrimary, ButtonOutline } from "@/components/smady/Button";
import { useAppData } from "@/context/AppDataContext";
import { toast } from "@/components/ui/sonner";

const countries = ["United States", "United Kingdom", "Canada", "Germany", "India"];
const industries = ["B2B SaaS", "Fintech", "Healthtech", "E-commerce", "Manufacturing"];

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
  const [form, setForm] = useState({ productName: "", productDescription: "", companyName: "", companyDetails: "" });
  const [selectedCountries, setSelectedCountries] = useState<string[]>(["United States"]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>(["B2B SaaS"]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateIcp({ ...form, countries: selectedCountries, industries: selectedIndustries });
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
            <FormSection label="Audience & Market Targeting" step="03" icon={Target} tint>
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
                  <ButtonOutline fullWidth onClick={() => generateIcp(form)} data-testid="icp-regenerate-button">
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
