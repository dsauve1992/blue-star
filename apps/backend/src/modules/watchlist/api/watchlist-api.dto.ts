export interface WatchlistApiDto {
  id: string;
  name: string;
  tickers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatchlistApiResponseDto {
  watchlistId: string;
}

export interface AddTickerToWatchlistApiResponseDto {
  watchlist: WatchlistApiDto;
}

export interface RemoveTickerFromWatchlistApiResponseDto {
  watchlist: WatchlistApiDto;
}

export interface RenameWatchlistApiResponseDto {
  watchlist: WatchlistApiDto;
}

export interface DeleteWatchlistApiResponseDto {
  success: boolean;
}

export interface ListWatchlistsApiResponseDto {
  watchlists: WatchlistApiDto[];
}

export interface SymbolSearchResultApiDto {
  symbol: string;
  description: string;
  exchange: string;
  fullSymbol: string;
}

export interface SymbolSearchApiResponseDto {
  results: SymbolSearchResultApiDto[];
}
