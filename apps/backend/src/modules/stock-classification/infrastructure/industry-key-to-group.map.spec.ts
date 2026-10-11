import {
  INDUSTRY_KEY_TO_GROUP,
  mapIndustryKeyToGroup,
} from './industry-key-to-group.map';

const GICS_INDUSTRY_GROUPS = [
  'Energy',
  'Materials',
  'Capital Goods',
  'Commercial & Professional Services',
  'Transportation',
  'Automobiles & Components',
  'Consumer Durables & Apparel',
  'Consumer Services',
  'Consumer Discretionary Distribution & Retail',
  'Consumer Staples Distribution & Retail',
  'Food, Beverage & Tobacco',
  'Household & Personal Products',
  'Health Care Equipment & Services',
  'Pharmaceuticals, Biotechnology & Life Sciences',
  'Banks',
  'Financial Services',
  'Insurance',
  'Software & Services',
  'Technology Hardware & Equipment',
  'Semiconductors & Semiconductor Equipment',
  'Telecommunication Services',
  'Media & Entertainment',
  'Utilities',
  'Equity Real Estate Investment Trusts (REITs)',
  'Real Estate Management & Development',
];

describe('mapIndustryKeyToGroup', () => {
  it('maps coking-coal to Materials', () => {
    expect(mapIndustryKeyToGroup('coking-coal')).toBe('Materials');
  });

  it('maps business-equipment-supplies to Commercial & Professional Services', () => {
    expect(mapIndustryKeyToGroup('business-equipment-supplies')).toBe(
      'Commercial & Professional Services',
    );
  });

  it.each([['unknown-industry'], [''], ['   ']])(
    'returns null for %j',
    (key) => {
      expect(mapIndustryKeyToGroup(key)).toBeNull();
    },
  );

  it('maps every key to one of the 25 GICS industry groups', () => {
    expect(GICS_INDUSTRY_GROUPS).toHaveLength(25);
    expect(
      Object.entries(INDUSTRY_KEY_TO_GROUP).filter(
        ([, group]) => !GICS_INDUSTRY_GROUPS.includes(group),
      ),
    ).toEqual([]);
  });
});
