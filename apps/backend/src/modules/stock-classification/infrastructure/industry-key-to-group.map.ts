/**
 * Maps yfinance industryKey values (kebab-case strings exposed by yfinance's
 * Ticker.info["industryKey"]) to the 25 GICS industry-group names used by
 * GICS_INDUSTRY_GROUP_UNIVERSE.
 *
 * Source: enumerated from yfinance's industry taxonomy. Unmapped keys yield
 * `null` and the caller stores NULL — the favorable-quadrant filter then
 * excludes the stock until the map is extended.
 */
const INDUSTRY_KEY_TO_GROUP: Record<string, string> = {
  // ===== Energy (1010) =====
  'oil-gas-integrated': 'Energy',
  'oil-gas-e-p': 'Energy',
  'oil-gas-midstream': 'Energy',
  'oil-gas-refining-marketing': 'Energy',
  'oil-gas-equipment-services': 'Energy',
  'oil-gas-drilling': 'Energy',
  'thermal-coal': 'Energy',
  uranium: 'Energy',

  // ===== Materials (1510) =====
  'specialty-chemicals': 'Materials',
  chemicals: 'Materials',
  'agricultural-inputs': 'Materials',
  'building-materials': 'Materials',
  'paper-paper-products': 'Materials',
  aluminum: 'Materials',
  copper: 'Materials',
  steel: 'Materials',
  'other-industrial-metals-mining': 'Materials',
  'other-precious-metals-mining': 'Materials',
  gold: 'Materials',
  silver: 'Materials',
  coking: 'Materials',
  'lumber-wood-production': 'Materials',
  'packaging-containers': 'Materials',

  // ===== Capital Goods (2010) =====
  'aerospace-defense': 'Capital Goods',
  'farm-heavy-construction-machinery': 'Capital Goods',
  'industrial-distribution': 'Capital Goods',
  'specialty-industrial-machinery': 'Capital Goods',
  'electrical-equipment-parts': 'Capital Goods',
  'engineering-construction': 'Capital Goods',
  'infrastructure-operations': 'Capital Goods',
  conglomerates: 'Capital Goods',
  'metal-fabrication': 'Capital Goods',
  'pollution-treatment-controls': 'Capital Goods',
  'tools-accessories': 'Capital Goods',
  'building-products-equipment': 'Capital Goods',

  // ===== Commercial & Professional Services (2020) =====
  'consulting-services': 'Commercial & Professional Services',
  'staffing-employment-services': 'Commercial & Professional Services',
  'specialty-business-services': 'Commercial & Professional Services',
  'security-protection-services': 'Commercial & Professional Services',
  'waste-management': 'Commercial & Professional Services',
  'rental-leasing-services': 'Commercial & Professional Services',

  // ===== Transportation (2030) =====
  airlines: 'Transportation',
  'integrated-freight-logistics': 'Transportation',
  trucking: 'Transportation',
  railroads: 'Transportation',
  'marine-shipping': 'Transportation',
  'airports-air-services': 'Transportation',

  // ===== Automobiles & Components (2510) =====
  'auto-manufacturers': 'Automobiles & Components',
  'auto-parts': 'Automobiles & Components',
  'recreational-vehicles': 'Automobiles & Components',

  // ===== Consumer Durables & Apparel (2520) =====
  'furnishings-fixtures-appliances': 'Consumer Durables & Apparel',
  'residential-construction': 'Consumer Durables & Apparel',
  'textile-manufacturing': 'Consumer Durables & Apparel',
  'apparel-manufacturing': 'Consumer Durables & Apparel',
  'footwear-accessories': 'Consumer Durables & Apparel',
  leisure: 'Consumer Durables & Apparel',
  'packaging-containers-consumer': 'Consumer Durables & Apparel',

  // ===== Consumer Services (2530) =====
  gambling: 'Consumer Services',
  resorts: 'Consumer Services',
  'resorts-casinos': 'Consumer Services',
  restaurants: 'Consumer Services',
  'travel-services': 'Consumer Services',
  lodging: 'Consumer Services',
  'education-training-services': 'Consumer Services',
  'personal-services': 'Consumer Services',

  // ===== Consumer Discretionary Distribution & Retail (2550) =====
  'apparel-retail': 'Consumer Discretionary Distribution & Retail',
  'auto-truck-dealerships': 'Consumer Discretionary Distribution & Retail',
  'home-improvement-retail': 'Consumer Discretionary Distribution & Retail',
  'internet-retail': 'Consumer Discretionary Distribution & Retail',
  'luxury-goods': 'Consumer Discretionary Distribution & Retail',
  'specialty-retail': 'Consumer Discretionary Distribution & Retail',
  'department-stores': 'Consumer Discretionary Distribution & Retail',

  // ===== Consumer Staples Distribution & Retail (3010) =====
  'discount-stores': 'Consumer Staples Distribution & Retail',
  'food-distribution': 'Consumer Staples Distribution & Retail',
  'grocery-stores': 'Consumer Staples Distribution & Retail',

  // ===== Food, Beverage & Tobacco (3020) =====
  'beverages-brewers': 'Food, Beverage & Tobacco',
  'beverages-non-alcoholic': 'Food, Beverage & Tobacco',
  'beverages-wineries-distilleries': 'Food, Beverage & Tobacco',
  confectioners: 'Food, Beverage & Tobacco',
  'farm-products': 'Food, Beverage & Tobacco',
  'packaged-foods': 'Food, Beverage & Tobacco',
  tobacco: 'Food, Beverage & Tobacco',

  // ===== Household & Personal Products (3030) =====
  'household-personal-products': 'Household & Personal Products',

  // ===== Health Care Equipment & Services (3510) =====
  'medical-care-facilities': 'Health Care Equipment & Services',
  'medical-devices': 'Health Care Equipment & Services',
  'medical-instruments-supplies': 'Health Care Equipment & Services',
  'medical-distribution': 'Health Care Equipment & Services',
  'health-information-services': 'Health Care Equipment & Services',
  'healthcare-plans': 'Health Care Equipment & Services',
  'diagnostics-research': 'Health Care Equipment & Services',

  // ===== Pharmaceuticals, Biotechnology & Life Sciences (3520) =====
  biotechnology: 'Pharmaceuticals, Biotechnology & Life Sciences',
  'drug-manufacturers-general':
    'Pharmaceuticals, Biotechnology & Life Sciences',
  'drug-manufacturers-specialty-generic':
    'Pharmaceuticals, Biotechnology & Life Sciences',
  'pharmaceutical-retailers': 'Pharmaceuticals, Biotechnology & Life Sciences',

  // ===== Banks (4010) =====
  'banks-diversified': 'Banks',
  'banks-regional': 'Banks',
  'mortgage-finance': 'Banks',

  // ===== Financial Services (4020) =====
  'asset-management': 'Financial Services',
  'capital-markets': 'Financial Services',
  'credit-services': 'Financial Services',
  'financial-conglomerates': 'Financial Services',
  'financial-data-stock-exchanges': 'Financial Services',
  'shell-companies': 'Financial Services',

  // ===== Insurance (4030) =====
  'insurance-brokers': 'Insurance',
  'insurance-diversified': 'Insurance',
  'insurance-life': 'Insurance',
  'insurance-property-casualty': 'Insurance',
  'insurance-reinsurance': 'Insurance',
  'insurance-specialty': 'Insurance',

  // ===== Software & Services (4510) =====
  'software-application': 'Software & Services',
  'software-infrastructure': 'Software & Services',
  'information-technology-services': 'Software & Services',
  'internet-content-information': 'Software & Services',

  // ===== Technology Hardware & Equipment (4520) =====
  'communication-equipment': 'Technology Hardware & Equipment',
  'computer-hardware': 'Technology Hardware & Equipment',
  'consumer-electronics': 'Technology Hardware & Equipment',
  'electronic-components': 'Technology Hardware & Equipment',
  'electronics-computer-distribution': 'Technology Hardware & Equipment',
  'scientific-technical-instruments': 'Technology Hardware & Equipment',

  // ===== Semiconductors & Semiconductor Equipment (4530) =====
  semiconductors: 'Semiconductors & Semiconductor Equipment',
  'semiconductor-equipment-materials':
    'Semiconductors & Semiconductor Equipment',
  solar: 'Semiconductors & Semiconductor Equipment',

  // ===== Telecommunication Services (5010) =====
  'telecom-services': 'Telecommunication Services',

  // ===== Media & Entertainment (5020) =====
  'advertising-agencies': 'Media & Entertainment',
  broadcasting: 'Media & Entertainment',
  entertainment: 'Media & Entertainment',
  'electronic-gaming-multimedia': 'Media & Entertainment',
  publishing: 'Media & Entertainment',

  // ===== Utilities (5510) =====
  'utilities-diversified': 'Utilities',
  'utilities-independent-power-producers': 'Utilities',
  'utilities-regulated-electric': 'Utilities',
  'utilities-regulated-gas': 'Utilities',
  'utilities-regulated-water': 'Utilities',
  'utilities-renewable': 'Utilities',

  // ===== Equity Real Estate Investment Trusts (REITs) (6010) =====
  'reit-diversified': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-healthcare-facilities': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-hotel-motel': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-industrial': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-mortgage': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-office': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-residential': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-retail': 'Equity Real Estate Investment Trusts (REITs)',
  'reit-specialty': 'Equity Real Estate Investment Trusts (REITs)',

  // ===== Real Estate Management & Development (6020) =====
  'real-estate-development': 'Real Estate Management & Development',
  'real-estate-diversified': 'Real Estate Management & Development',
  'real-estate-services': 'Real Estate Management & Development',
};

export function mapIndustryKeyToGroup(industryKey: string): string | null {
  if (!industryKey || industryKey.trim().length === 0) {
    return null;
  }
  return INDUSTRY_KEY_TO_GROUP[industryKey.trim()] ?? null;
}
