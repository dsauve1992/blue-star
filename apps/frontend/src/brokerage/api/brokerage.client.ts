import { apiClient } from "../../global/api/api-instance";

export type CampaignDirection = "LONG" | "SHORT";
export type CampaignStatus = "OPEN" | "CLOSED";
export type StopSource = "STOP_FILL" | "WORKING_STOP";

export interface TradingCampaign {
  ticker: string;
  instrumentId: string;
  direction: CampaignDirection;
  status: CampaignStatus;
  openedAt: string | null;
  closedAt: string | null;
  quantity: number;
  averageEntryPrice: number;
  averageExitPrice: number | null;
  pnl: number;
  stopPrice: number | null;
  stopSource: StopSource | null;
  initialRisk: number | null;
  rMultiple: number | null;
}

export interface JournalStats {
  closedCampaigns: number;
  campaignsWithR: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averageWinR: number | null;
  averageLossR: number | null;
  averageRewardToRisk: number | null;
  expectancyR: number | null;
  totalR: number | null;
  largestWinR: number | null;
  largestLossR: number | null;
  profitFactor: number | null;
  realizedPnl: number;
}

export interface TradingJournal {
  campaigns: TradingCampaign[];
  stats: JournalStats;
}

export interface ListBrokerAccountsResponse {
  accounts: string[];
}

export class BrokerageClient {
  async listAccounts(): Promise<ListBrokerAccountsResponse> {
    const response = await apiClient.get<ListBrokerAccountsResponse>(
      "/brokerage/accounts",
    );
    return response.data;
  }

  async getTradingJournal(accountId: string): Promise<TradingJournal> {
    const response = await apiClient.get<TradingJournal>(
      `/brokerage/accounts/${accountId}/journal`,
    );
    return response.data;
  }
}
