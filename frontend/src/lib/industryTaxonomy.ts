export const INDUSTRY_TAXONOMY: Record<string, string[]> = {
  "Technology & Software": [
    "B2B SaaS", "Enterprise Software", "Developer Tools", "AI & Machine Learning", "Cybersecurity",
    "Cloud Platforms & Infrastructure", "Data & Analytics", "IT Services & Consulting", "Hardware & Semiconductors",
  ],
  "Financial Services": [
    "Banking & Credit Unions", "Lending & Mortgage", "Fintech", "Payments", "Insurance & Insurtech",
    "Investment & Wealth Management", "Capital Markets", "Accounting & Tax Services",
  ],
  "Healthcare & Life Sciences": [
    "Hospitals & Clinics", "Digital Health & Healthtech", "Medical Devices", "Pharmaceuticals", "Biotechnology",
    "Diagnostics & Laboratories", "Health Insurance", "Clinical Research",
  ],
  "Manufacturing & Industrial": [
    "Industrial Manufacturing", "Automotive & Mobility", "Aerospace & Defense", "Electronics & Electrical Equipment",
    "Chemicals & Materials", "Machinery & Equipment", "Industrial Automation & Robotics",
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

export const TARGET_INDUSTRIES = Object.keys(INDUSTRY_TAXONOMY);

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

export function industriesForTargets(targetIndustries: string[]): string[] {
  return [...new Set(targetIndustries.flatMap((industry) => INDUSTRY_TAXONOMY[industry] || []))];
}

export function normalizeSavedIndustries(result: {
  targetIndustries?: string[];
  subIndustries?: string[];
  targetIndustry?: string[];
  subIndustry?: string[];
  industry?: string[];
}): { targetIndustries: string[]; subIndustries: string[] } {
  const targets = [...(result.targetIndustries || result.targetIndustry || [])];
  const subIndustries = [...(result.subIndustries || result.subIndustry || [])];
  const hasNewFields = Boolean(result.targetIndustries?.length || result.subIndustries?.length || result.targetIndustry?.length || result.subIndustry?.length);
  const legacy = hasNewFields ? [] : result.industry || [];
  for (const value of [...subIndustries, ...legacy]) {
    if (INDUSTRY_TAXONOMY[value]) {
      if (!targets.includes(value)) targets.push(value);
      continue;
    }
    const normalized = legacySubIndustryAliases[value.trim().toLowerCase()] || value;
    const parent = Object.entries(INDUSTRY_TAXONOMY).find(([, children]) => children.includes(normalized))?.[0];
    const resolvedParent = parent || "Other & Emerging Markets";
    if (!targets.includes(resolvedParent)) targets.push(resolvedParent);
    if (!subIndustries.includes(normalized)) subIndustries.push(normalized);
  }
  return { targetIndustries: [...new Set(targets)], subIndustries: [...new Set(subIndustries)] };
}
