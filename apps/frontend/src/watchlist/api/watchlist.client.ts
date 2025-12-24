import { apiClient } from '../../global/api/api-instance';

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistRequest {
  name: string;
}

export interface CreateWatchlistResponse {
  watchlistId: string;
}

export interface AddTickerToWatchlistRequest {
  ticker: string;
}

export interface AddTickerToWatchlistResponse {
  watchlist: Watchlist;
}

export interface RemoveTickerFromWatchlistResponse {
  watchlist: Watchlist;
}

export interface DeleteWatchlistResponse {
  success: boolean;
}

export interface ListWatchlistsResponse {
  watchlists: Watchlist[];
}

export interface GetWatchlistByIdResponse {
  watchlist: Watchlist;
}

export class WatchlistClient {
  async listWatchlists(): Promise<ListWatchlistsResponse> {
    const response = await apiClient.get<ListWatchlistsResponse>('/watchlists');
    return response.data;
  }

  async getWatchlistById(watchlistId: string): Promise<Watchlist> {
    const response = await apiClient.get<Watchlist>(`/watchlists/${watchlistId}`);
    return response.data;
  }

  async createWatchlist(
    request: CreateWatchlistRequest,
  ): Promise<CreateWatchlistResponse> {
    const response = await apiClient.post<
      CreateWatchlistResponse,
      CreateWatchlistRequest
    >('/watchlists', request);
    return response.data;
  }

  async addTickerToWatchlist(
    watchlistId: string,
    request: AddTickerToWatchlistRequest,
  ): Promise<AddTickerToWatchlistResponse> {
    const response = await apiClient.post<
      AddTickerToWatchlistResponse,
      AddTickerToWatchlistRequest
    >(`/watchlists/${watchlistId}/tickers`, request);
    return response.data;
  }

  async removeTickerFromWatchlist(
    watchlistId: string,
    ticker: string,
  ): Promise<RemoveTickerFromWatchlistResponse> {
    const response = await apiClient.delete<RemoveTickerFromWatchlistResponse>(
      `/watchlists/${watchlistId}/tickers/${encodeURIComponent(ticker)}`,
    );
    return response.data || response;
  }

  async deleteWatchlist(
    watchlistId: string,
  ): Promise<DeleteWatchlistResponse> {
    const response = await apiClient.delete<DeleteWatchlistResponse>(
      `/watchlists/${watchlistId}`,
    );
    return response.data || response;
  }
}

