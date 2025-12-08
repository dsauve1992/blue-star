import { ConsolidationResult } from '../value-objects/consolidation-result';

export interface ConsolidationScreenerService {
  analyzeConsolidations(options: { type: 'daily' | 'weekly' }): Promise<{
    daily: ConsolidationResult[];
    weekly: ConsolidationResult[];
  }>;
}
