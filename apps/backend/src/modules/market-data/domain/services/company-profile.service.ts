import { Symbol } from '../value-objects/symbol';

export interface CompanyProfile {
  symbol: string;
  sector: string;
  industry: string;
  industryGroup: string | null;
}

export interface CompanyProfileService {
  getCompanyProfile(symbol: Symbol): Promise<CompanyProfile>;
}
