export const INDUSTRY_TAXONOMY: Record<string, string[]> = {
  "Technology & Software": [
    "B2B SaaS", "Enterprise Software", "Developer Tools", "AI & Machine Learning", "Cybersecurity",
    "Cloud Platforms & Infrastructure", "Data & Analytics", "IT Services & Consulting", "Hardware & Semiconductors",
  ],
  "B2B SaaS": [
    "Horizontal SaaS", "Vertical SaaS", "CRM & Sales Software", "Marketing Automation SaaS",
    "ERP & Operations SaaS", "HR & People Operations SaaS", "Finance & Accounting SaaS",
    "Customer Support & Success SaaS", "Productivity & Collaboration SaaS", "Security SaaS",
    "Data & Analytics SaaS", "Developer Platform SaaS", "Workflow Automation SaaS",
  ],
  "Financial Services": [
    "Banking & Credit Unions", "Lending & Mortgage", "Fintech", "Payments", "Insurance & Insurtech",
    "Investment & Wealth Management", "Capital Markets", "Accounting & Tax Services",
  ],
  "Healthcare & Life Sciences": [
    "Hospitals & Clinics", "Digital Health & Healthtech", "Medical Devices", "Pharmaceuticals", "Biotechnology",
    "Diagnostics & Laboratories", "Health Insurance", "Clinical Research",
  ],
  Manufacturing: [
    "Automobile Manufacturing", "Medical Equipment Manufacturing", "Wheelchair Manufacturing",
    "Electronics Manufacturing", "Industrial Machinery Manufacturing", "Aerospace & Defense Manufacturing",
    "Electrical Equipment Manufacturing", "Chemical Manufacturing", "Plastics & Materials Manufacturing",
    "Food & Beverage Manufacturing", "Textile & Apparel Manufacturing", "Furniture Manufacturing",
    "Metal Fabrication", "Industrial Automation & Robotics", "Contract Manufacturing", "Industrial Manufacturing",
    "Automotive & Mobility", "Aerospace & Defense", "Electronics & Electrical Equipment", "Chemicals & Materials",
    "Machinery & Equipment",
  ],
  "Retail & Commerce": [
    "E-commerce & Marketplaces", "Retail Stores", "Wholesale & Distribution", "Consumer Electronics",
    "Apparel & Fashion", "Beauty & Personal Care", "Home & Furniture",
  ],
  "Consumer & Lifestyle": [
    "Food & Beverage", "Consumer Packaged Goods", "Restaurants & Food Service", "Hospitality & Hotels",
    "Travel & Tourism", "Fitness & Wellness", "Personal Services",
  ],
  "Professional & Business Services": [
    "Consulting & Advisory", "Marketing & Advertising", "Legal Services", "Accounting & Bookkeeping",
    "Staffing & Recruiting", "Human Resources Services", "Facilities & Workplace Services",
  ],
  "Education & Training": [
    "K-12 Education", "Higher Education", "Education Technology", "Corporate Learning", "Vocational & Skills Training",
  ],
  "Media & Entertainment": [
    "Publishing", "Streaming & Digital Media", "Film & Television", "Gaming & Esports", "Music & Live Events", "Sports & Recreation",
  ],
  "Transportation & Logistics": [
    "Freight & Logistics", "Supply Chain & Warehousing", "Shipping & Maritime", "Airlines & Aviation",
    "Public Transit", "Ground Transportation & Fleet",
  ],
  "Energy & Utilities": [
    "Renewable Energy", "Oil & Gas", "Utilities", "Energy Storage & Grid", "Environmental Services",
  ],
  "Real Estate & Construction": [
    "Residential Real Estate", "Commercial Real Estate", "Property Management", "Construction & Engineering",
    "Architecture & Design", "Building Products",
  ],
  "Agriculture & Food Production": [
    "Farming & Agribusiness", "Food Processing", "Animal Health & Livestock", "Agricultural Technology", "Forestry & Fisheries",
  ],
  Telecommunications: [
    "Telecom Carriers", "Internet Service Providers", "Network Infrastructure", "Communications Technology",
  ],
  "Government & Public Sector": [
    "Federal & National Government", "State & Local Government", "Public Administration", "Defense & Security", "Public Services & Civic Technology",
  ],
  "Nonprofit & Associations": [
    "Charities & Foundations", "Trade Associations", "Membership Organizations", "Social Services", "Religious Organizations",
  ],
  "Other & Emerging Markets": ["Other / Emerging Business", "Environmental & Climate Services"],
};

// Historical values are normalized at read time so previously saved ICPs and runs remain usable.
const legacyTargetAliases: Record<string, string> = {
  "manufacturing & industrial": "Manufacturing",
};

const legacySubIndustryAliases: Record<string, string> = {
  "b2b saas": "B2B SaaS",
  fintech: "Fintech",
  healthtech: "Digital Health & Healthtech",
  "digital health": "Digital Health & Healthtech",
  "e-commerce": "E-commerce & Marketplaces",
  ecommerce: "E-commerce & Marketplaces",
  manufacturing: "Industrial Manufacturing",
  saas: "B2B SaaS",
};

export const TARGET_INDUSTRIES = Object.keys(INDUSTRY_TAXONOMY);

export function industriesForTargets(targetIndustries: string[]): string[] {
  return [...new Set(targetIndustries.flatMap((industry) => {
    const canonical = legacyTargetAliases[industry.trim().toLowerCase()] || industry;
    return INDUSTRY_TAXONOMY[canonical] || [];
  }))];
}

export function normalizeSavedIndustries(result: {
  targetIndustries?: string[];
  subIndustries?: string[];
  targetIndustry?: string[];
  subIndustry?: string[];
  industry?: string[];
}): { targetIndustries: string[]; subIndustries: string[] } {
  const rawTargets = [...(result.targetIndustries || result.targetIndustry || [])];
  const hasExplicitTargets = rawTargets.length > 0;
  const targets = [...new Set(rawTargets.map((value) => legacyTargetAliases[value.trim().toLowerCase()] || value))];
  const subIndustries: string[] = [];
  const hasNewFields = Boolean(result.targetIndustries?.length || result.subIndustries?.length || result.targetIndustry?.length || result.subIndustry?.length);
  const legacy = hasNewFields ? [] : result.industry || [];
  const candidates = [...(result.subIndustries || result.subIndustry || []), ...legacy];
  for (const value of candidates) {
    const normalizedTarget = legacyTargetAliases[value.trim().toLowerCase()] || value;
    if (INDUSTRY_TAXONOMY[normalizedTarget]) {
      if (!targets.includes(normalizedTarget)) targets.push(normalizedTarget);
      continue;
    }
    const normalized = legacySubIndustryAliases[value.trim().toLowerCase()] || value;
    const parent = Object.entries(INDUSTRY_TAXONOMY).find(([, children]) => children.includes(normalized))?.[0];
    if (!parent) continue;
    const canonicalParent = legacyTargetAliases[parent.trim().toLowerCase()] || parent;
    // For old records with no target field, infer the parent. For records with explicit
    // targets, retain only segments that belong to one of those selected targets.
    if (!hasExplicitTargets && !targets.includes(canonicalParent)) targets.push(canonicalParent);
    if (targets.includes(canonicalParent) && !subIndustries.includes(normalized)) subIndustries.push(normalized);
  }
  return { targetIndustries: [...new Set(targets)], subIndustries };
}
