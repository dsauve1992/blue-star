"""
Yahoo Finance Service
Handles fetching OHLC price history and other financial data
"""

import yfinance as yf
import pandas as pd
from typing import Optional, Dict, Any
from datetime import datetime, timedelta


class YahooFinanceService:
    def __init__(self):
        pass

    def get_historical_data(self, symbol: str, period1: datetime, period2: datetime = None, interval: str = '1d') -> pd.DataFrame:
        """
        Get historical OHLC data for a symbol
        """
        if period2 is None:
            period2 = datetime.now()
        
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(start=period1, end=period2, interval=interval)
            
            if data.empty:
                raise ValueError(f"No data found for symbol {symbol}")
            
            # Reset index to make Date a column
            data = data.reset_index()
            
            # Rename columns to match our expected format
            data.columns = data.columns.str.lower()
            if 'date' in data.columns:
                data = data.rename(columns={'date': 'Date'})
            
            return data
            
        except Exception as e:
            import sys
            print(f"Error fetching historical data for {symbol}: {e}", file=sys.stderr)
            raise Exception(f"Failed to fetch historical data for {symbol}: {e}")

    def get_recent_data(self, symbol: str, days: int, interval: str) -> pd.DataFrame:
        """
        Get recent historical data for a symbol
        """
        period1 = datetime.now() - timedelta(days=days)
        return self.get_historical_data(symbol, period1, interval=interval)
