import { Symbol } from '../value-objects/symbol';

export interface CompanyProfile {
  symbol: string;
  sector: string;
  industry: string;
}

export interface CompanyProfileService {
  getCompanyProfile(symbol: Symbol): Promise<CompanyProfile>;
}
