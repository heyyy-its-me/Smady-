import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Package, FileText, Building2, Info, Globe2, Factory } from "lucide-react";
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

  return (
    <div data-testid="icp-page">
      <PageHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl bg-surface p-6 shadow-card lg:p-8" data-testid="icp-form-card">
          <h2 className="text-[15px] font-semibold text-ink">Build Your Ideal Customer Profile</h2>
          <p className="mt-1 text-sm text-body">Tell us about your product and audience — our engine will do the rest.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-5" data-testid="icp-form">
            <FormSection label="Product" tint>
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
            <FormSection label="Company">
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
            <FormSection label="Targeting" tint>
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
            <div className="flex justify-end pt-1">
              <ButtonPrimary type="submit" loading={generatingIcp} icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />} data-testid="icp-generate-button">
                {generatingIcp ? "Analyzing your inputs…" : "Generate ICP"}
              </ButtonPrimary>
            </div>
          </form>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {!icp && !generatingIcp && (
            <div className="rounded-2xl bg-gradient-to-b from-primary-50 to-white p-6 shadow-card" data-testid="icp-live-preview">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">Live Preview</p>
              <h3 className="mt-2 text-xl font-bold text-ink">{form.productName || "Your ICP Preview"}</h3>
              <p className="mt-3 text-sm leading-relaxed text-body">{summarySentence}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[...selectedIndustries, ...selectedCountries].map((c) => (
                  <span key={c} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-600 shadow-soft">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {generatingIcp && (
            <div className="space-y-3 rounded-2xl bg-surface p-6 shadow-card" data-testid="icp-loading-skeleton">
              <div className="h-4 w-1/3 rounded-full bg-[linear-gradient(90deg,#F1E9E3_25%,#FFE6D6_50%,#F1E9E3_75%)] bg-[length:200%_100%] animate-shimmer" />
              <div className="mt-4 space-y-3">
                <div className="h-3 w-full rounded-full bg-[linear-gradient(90deg,#F1E9E3_25%,#FFE6D6_50%,#F1E9E3_75%)] bg-[length:200%_100%] animate-shimmer" />
                <div className="h-3 w-5/6 rounded-full bg-[linear-gradient(90deg,#F1E9E3_25%,#FFE6D6_50%,#F1E9E3_75%)] bg-[length:200%_100%] animate-shimmer" />
                <div className="h-3 w-2/3 rounded-full bg-[linear-gradient(90deg,#F1E9E3_25%,#FFE6D6_50%,#F1E9E3_75%)] bg-[length:200%_100%] animate-shimmer" />
              </div>
            </div>
          )}

          {icp && !generatingIcp && (
            <div className="rounded-2xl bg-surface p-6 shadow-card" data-testid="icp-results-card">
              <div className="flex items-center gap-2 text-primary-500">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-ink">Your Ideal Customer Profile</h2>
              </div>
              {resultGroups.map(({ key, label }) => (
                <div key={key} className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {icp[key].map((it) => (
                      <span key={it} className="rounded-full bg-primary-50 px-3 py-1.5 text-sm text-primary-600">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
