export const OTHER_INDUSTRY = "Other";

export const INDUSTRY_TAXONOMY: Record<string, string[]> = {
  "Agriculture & Forestry": ["Farming", "Livestock", "Fishing", "Logging", OTHER_INDUSTRY],
  "Construction and Engineering Services": ["Residential Construction", "Commercial Construction", "Civil Infrastructure", "Engineering Services", OTHER_INDUSTRY],
  "Education & Training": ["Schools", "Universities", "Daycares", "Coaching Centers", "Vocational Institutes", "Higher Education Consulting", OTHER_INDUSTRY],
  "Energy & Utilities": ["Power Generation", "Oil & Gas", "New & Renewable Energy", "Utilities", OTHER_INDUSTRY],
  "Entertainment & Media": ["Film", "Music", "Gaming", "Publishing", "Sports", "Audio-Visual Services", "Mass Communication", "Television", "Newspapers", "Online Media", "Social Media", OTHER_INDUSTRY],
  "Financial Services": ["Banking", "Insurance", "Investment Funds", "Accounting", "Tax Accounting", "Financial Planning", "Financial Advisory", OTHER_INDUSTRY],
  "Healthcare & Medical Services": ["Hospitals", "Pharmacies / Chemists", "Pharmaceuticals", "Contract Development and Manufacturing Organizations (CDMOs)", "Clinics", "Diagnostic Centers", "Small Laboratories", "Medical Devices", "Biotechnology", OTHER_INDUSTRY],
  "Hospitality & Tourism": ["Hotels", "Guest Houses", "Restaurants", "Travel Agencies", "Tourism", "Food Services", OTHER_INDUSTRY],
  Manufacturing: ["Aerospace & Defence", "Automotive & Auto Components", "Pharmaceuticals & Medical Devices", "Biotechnology", "Capital Goods", "Textile & Apparel", "Chemicals & Petrochemicals", "Electronics System Design & Manufacturing (ESDM)", "Telecom Equipment", "Cable & Wires", "Machinery & Industrial Equipment", "Construction & Mining Equipment", "Leather & Footwear", "Food Processing", "Gems & Jewellery", "Rail Equipment", "Railway Safety & Signalling", "Railway Engines & Components", "Medical Equipment", OTHER_INDUSTRY],
  "Mining & Extraction": ["Metal Extraction", "Coal Extraction", "Oil & Gas Extraction", OTHER_INDUSTRY],
  "Professional & Technical Services": ["Legal Services", "Engineering Services", "Consulting Services", "Architecture", "Environmental Consulting", "Carbon Credit Auditing & Consulting", OTHER_INDUSTRY],
  "Real Estate": ["Property Management", "Leasing", "Property Development", OTHER_INDUSTRY],
  "Trading, Retail & Wholesale": ["Consumer Goods", "Supermarkets", "E-commerce", "Automotive Dealerships", "Medical Equipment Dealerships", "Mechanical Equipment Dealerships", "Electrical Equipment Dealerships", "Tools & Tooling Dealerships", "Wholesale", "Retail", OTHER_INDUSTRY],
  "Technology & Software": ["IT Services", "Software Products", "Software Development Firms", "Data Processing", "Telecommunications", "Internet of Things (IoT)", "Enterprise Automation", "Enterprise AI", "Hardware Design", "Offshore Development Centers (ODCs)", "Global Capability Centers (GCCs)", "IT-Enabled Services (ITeS)", "Business Process Outsourcing (BPO)", "IT Solutions Providers", "Global Consulting", OTHER_INDUSTRY],
  "Transportation & Logistics": ["Air Transportation", "Rail Transportation", "Shipping", "Trucking", "Supply Chain Management", OTHER_INDUSTRY],
  Consultancy: ["Business Consulting", "Financial Consulting", "Tax & Accounting Advisory", "Insurance Advisory", "Financial Planning", "Legal Advisory", "Immigration Services", "Higher Education Consulting", "Environmental Consulting", "Carbon Credit Auditing & Consulting", OTHER_INDUSTRY],
  "Repair and Maintenance": ["Appliance Repair", "Automotive Garages", "Equipment Repair", "Industrial Maintenance", OTHER_INDUSTRY],
  "Environmental Products & Services": ["Environmental Products", "Environmental Services", "Environmental Auditing", "Carbon Credit Services", "Sustainability Solutions", OTHER_INDUSTRY],
  Other: [OTHER_INDUSTRY],
};

export const TARGET_INDUSTRIES = Object.keys(INDUSTRY_TAXONOMY);

export function industriesForTargets(targetIndustries: string[]): string[] {
  return [...new Set(targetIndustries.flatMap((industry) => INDUSTRY_TAXONOMY[industry] || []))];
}

/**
 * Normalize old ICP shapes without discarding values that are no longer in the
 * current master list. Unknown saved values are treated as custom industries.
 */
export function normalizeSavedIndustries(result: {
  targetIndustries?: string[];
  subIndustries?: string[];
  targetIndustry?: string[];
  subIndustry?: string[];
  industry?: string[];
}): { targetIndustries: string[]; subIndustries: string[] } {
  const rawTargets = [...(result.targetIndustries || result.targetIndustry || [])];
  const hasExplicitTargets = rawTargets.length > 0;
  const targets = [...new Set(rawTargets)];
  const subIndustries: string[] = [];
  const hasNewFields = Boolean(result.targetIndustries?.length || result.subIndustries?.length || result.targetIndustry?.length || result.subIndustry?.length);
  const candidates = [...(result.subIndustries || result.subIndustry || []), ...(hasNewFields ? [] : result.industry || [])];

  for (const value of candidates) {
    const parent = targets.find((target) => INDUSTRY_TAXONOMY[target]?.includes(value));
    if (parent) {
      if (!subIndustries.includes(value)) subIndustries.push(value);
    } else if (INDUSTRY_TAXONOMY[value] && !hasExplicitTargets) {
      // Legacy `industry` entries sometimes stored top-level categories here.
      if (!targets.includes(value)) targets.push(value);
    } else if (!subIndustries.includes(value)) {
      // Keep custom and historical sub-industries available to saved-profile reuse.
      subIndustries.push(value);
    }
  }
  return { targetIndustries: [...new Set(targets)], subIndustries };
}

/** Restore custom values into the Other option and its text field. */
export function restoreOtherSelection(values: string[], options: string[]): { selected: string[]; customValue: string } {
  const known = values.filter((value) => options.includes(value));
  const custom = values.filter((value) => !options.includes(value) && value !== OTHER_INDUSTRY);
  return {
    selected: [...new Set([...known, ...(custom.length ? [OTHER_INDUSTRY] : [])])],
    customValue: custom.join(", "),
  };
}

/** Replace the Other sentinel with the user's text before sending or saving. */
export function resolveOtherSelection(values: string[], customValue: string): string[] {
  return [...new Set(values.flatMap((value) => value === OTHER_INDUSTRY
    ? (customValue.trim() ? [customValue.trim()] : [])
    : [value]))];
}
