"""
Technical Analysis Module
Contains functions for calculating technical indicators
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional


def calculate_sma(prices: pd.Series, period: int) -> pd.Series:
    """Calculate Simple Moving Average"""
    return prices.rolling(window=period).mean()


def calculate_ema(prices: pd.Series, period: int) -> pd.Series:
    """Calculate Exponential Moving Average"""
    return prices.ewm(span=period).mean()


def calculate_adr_percentage(df: pd.DataFrame, period: int = 20) -> pd.Series:
    """
    Calculate Average Daily Range percentage
    ADR% = ((High - Low) / Close) * 100, averaged over period
    """
    daily_range = (df['high'] - df['low']) / df['close']
    return daily_range.rolling(window=period).mean() * 100


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:

    
    # Create a copy to avoid modifying the original
    df_with_indicators = df.copy()
    
    # Moving Averages
    df_with_indicators['sma_50'] = calculate_sma(df_with_indicators['close'], 50)
    df_with_indicators['ema_10'] = calculate_ema(df_with_indicators['close'], 10)
    df_with_indicators['ema_20'] = calculate_ema(df_with_indicators['close'], 20)
    
    # ADR Percentage
    df_with_indicators['adr_perc_20'] = calculate_adr_percentage(df_with_indicators, 20)
    

    # Volume indicators
    df_with_indicators['volume_sma_20'] = calculate_sma(df_with_indicators['volume'], 20)
    df_with_indicators['low_volume'] = df_with_indicators['volume'] < df_with_indicators['volume_sma_20']
    
    # Price vs EMA percentages
    df_with_indicators['price_vs_ema10_perc'] = abs(df_with_indicators['close'] - df_with_indicators['ema_10']) / df_with_indicators['ema_10'] * 100
    df_with_indicators['price_vs_ema20_perc'] = abs(df_with_indicators['close'] - df_with_indicators['ema_20']) / df_with_indicators['ema_20'] * 100
    
    # EMA trends (rising/falling)
    df_with_indicators['ema10_rising'] = df_with_indicators['ema_10'] > df_with_indicators['ema_10'].shift(1)
    df_with_indicators['ema20_rising'] = df_with_indicators['ema_20'] > df_with_indicators['ema_20'].shift(1)
    
    return df_with_indicators


def calculate_signal_conditions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate all signal conditions based on the PineScript algorithm
    """
    df_with_signals = df.copy()
    
    # Basic signal conditions
    df_with_signals['basic_signal'] = (
        (df_with_signals['adr_perc_20'] > df_with_signals['price_vs_ema10_perc']) &
        (df_with_signals['adr_perc_20'] * 1.5 > df_with_signals['price_vs_ema10_perc']) &
        (df_with_signals['ema_10'] > df_with_signals['ema_20'])
    )
    
    # Signal shifts (previous days)
    df_with_signals['signal_shift'] = df_with_signals['basic_signal'].shift(1)
    df_with_signals['signal_shift_2'] = df_with_signals['basic_signal'].shift(2)
    
    # Consecutive signal for three days
    df_with_signals['consecutive_signal_3_days'] = (
        df_with_signals['basic_signal'] &
        df_with_signals['signal_shift'] &
        df_with_signals['signal_shift_2']
    )
    
    # Find bearish condition (ema10 < ema20) - this is the "golden cross" reversal
    bearish_condition = df_with_signals['ema_10'] < df_with_signals['ema_20']
    
    # Create column with close price during bearish condition (EMA golden cross)
    df_with_signals['price_during_ema_golden_cross'] = np.where(
        bearish_condition, 
        df_with_signals['close'], 
        np.nan
    )
    
    # Forward fill to get the last bearish close price for each row
    df_with_signals['price_during_last_ema_golden_cross'] = df_with_signals['price_during_ema_golden_cross'].ffill()
    
    # Handle edge case: if no bearish condition (ema10 < ema20) in the entire dataframe,
    # use the first close price as the reference point for performance calculation
    if df_with_signals['price_during_last_ema_golden_cross'].isna().all():
        df_with_signals['price_during_last_ema_golden_cross'] = df_with_signals['close'].iloc[0]
    
    # Performance percentage from last bearish to signal
    df_with_signals['perf_pct_from_bearish'] = np.where(
        df_with_signals['basic_signal'] & df_with_signals['price_during_last_ema_golden_cross'].notna(),
        (df_with_signals['close'] / df_with_signals['price_during_last_ema_golden_cross'] - 1.0) * 100.0,
        np.nan
    )
    
    # Consecutive signal with minimum 30% performance
    df_with_signals['consecutive_signal_with_30_perc'] = (
        df_with_signals['consecutive_signal_3_days'] &
        (df_with_signals['perf_pct_from_bearish'] > 30)
    )
    
    # Green signal (final signal)
    df_with_signals['green_signal'] = (
        df_with_signals['consecutive_signal_with_30_perc'] &
        df_with_signals['low_volume'] &
        df_with_signals['ema10_rising'] &
        df_with_signals['ema20_rising']
    )
    
    return df_with_signals
