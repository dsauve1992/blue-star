#!/usr/bin/env python3
"""
Breakout Analysis - Main Entry Point
A Python application for analyzing breakout patterns using TradingView and Yahoo Finance data
"""
import json
import sys
import argparse
import time
from typing import Any

import pandas as pd
import numpy as np
from screener_service import ScreenerService
from yahoo_finance_service import YahooFinanceService
from technical_analysis import calculate_sma, calculate_ema, calculate_adr_percentage


def main():
    parser = argparse.ArgumentParser(description='Breakout Analysis - Analyze breakout patterns')
    parser.add_argument('--format', choices=['json', 'text'], default='text', help='Output format (default: text)')
    parser.add_argument('--type', choices=['daily', 'weekly'], required=True, help='Analysis type (required: daily or weekly)')
    parser.add_argument('--quiet', action='store_true', help='Suppress non-essential output')
    
    args = parser.parse_args()
    
    if not args.quiet:
        print("🚀 Breakout Analysis started!", file=sys.stderr)
        print("📊 Ready to analyze breakout patterns using TradingView and Yahoo Finance data...", file=sys.stderr)
    
    screener_service = ScreenerService()
    yahoo_finance_service = YahooFinanceService()
    
    try:
        if not args.quiet:
            print("\n🔍 Fetching breakout candidates from TradingView...", file=sys.stderr)

        daily_candidates = []
        weekly_candidates = []
        
        if args.type == 'daily':
            daily_candidates = analyse_daily_setup(screener_service, yahoo_finance_service, args.quiet)
        
        if args.type == 'weekly':
            weekly_candidates = analyse_weekly_setup(screener_service, yahoo_finance_service, args.quiet)

        if args.format == 'json':
            result = {
                'daily': daily_candidates,
                'weekly': weekly_candidates,
                'dailyCount': len(daily_candidates),
                'weeklyCount': len(weekly_candidates)
            }
            print(json.dumps(result))
        else:
            print("\n✅ Analysis complete!")
            print(f"Found {len(daily_candidates)} daily candidates")
            for candidate in daily_candidates:
                new_indicator = " (NEW)" if candidate['is_new'] else ""
                print(f"{candidate['symbol']}{new_indicator}")
            print("=========================")
            print(f"Found {len(weekly_candidates)} weekly candidates")
            for candidate in weekly_candidates:
                new_indicator = " (NEW)" if candidate['is_new'] else ""
                print(f"{candidate['symbol']}{new_indicator}")
        
    except Exception as error:
        if args.format == 'json':
            error_result = {
                'error': str(error),
                'daily': [],
                'weekly': [],
                'dailyCount': 0,
                'weeklyCount': 0
            }
            print(json.dumps(error_result))
            sys.exit(1)
        else:
            print(f"❌ Error during analysis: {error}", file=sys.stderr)
            sys.exit(1)


def analyse_daily_setup(screener_service: ScreenerService, yahoo_finance_service: YahooFinanceService, quiet: bool = False) -> list[Any]:
    green_candidates = []
    custom_filters = [
        {"left": "close", "operation": "egreater", "right": 2},  # Price > $5
        {"left": "market_cap_basic", "operation": "egreater", "right": 300000000},  # Market cap > $500M
        {"left": "average_volume_30d_calc", "operation": "greater", "right": 1000000},  # Volume > 2M
        {"left": "EMA10", "operation": "egreater", "right": "EMA20"},
        {"left": "EMA20", "operation": "egreater", "right": "SMA50"},
        {"left": "close", "operation": "egreater", "right": "EMA20"},
        {"left": "is_primary", "operation": "equal", "right": True}
    ]

    # Create parameters using the helper method
    parameters = ScreenerService.create_basic_parameters(
        columns=["name", "close", "EMA10", "EMA20", "SMA50", "exchange"],
        filters=custom_filters,
        markets=["america"],  # Focus on US stocks
        sort_by="Perf.6M",  # Sort by 6-month performance
        sort_order="desc",
        range_limit=[0, 5000]  # Limit to first 50 results
    )

    # Define a simple mapper lambda for breakout analysis
    # Maps the raw data to a dictionary with the expected fields
    breakout_mapper = lambda raw: {
        'name': raw.data_fields[0] if len(raw.data_fields) > 0 else "Unknown",
        'close': raw.data_fields[1] if len(raw.data_fields) > 1 else 0,
        'ema10': raw.data_fields[2] if len(raw.data_fields) > 2 else 0,
        'ema20': raw.data_fields[3] if len(raw.data_fields) > 3 else 0,
        'sma50': raw.data_fields[4] if len(raw.data_fields) > 4 else 0,
        'ticker_full_name': raw.symbol_full
    }

    candidates = screener_service.scan(parameters, breakout_mapper)
    if not quiet:
        print(f"Found {len(candidates)} candidates with custom filters", file=sys.stderr)

    # Analyze first few candidates for testing
    for i, candidate in enumerate(candidates):
        try:
            if i > 0:
                time.sleep(0.5)
            
            historical_data = yahoo_finance_service.get_recent_data(candidate['name'], 300, interval="1d")

            historical_data['sma_50'] = calculate_sma(historical_data['close'], 50)
            historical_data['ema_10'] = calculate_ema(historical_data['close'], 10)
            historical_data['ema_20'] = calculate_ema(historical_data['close'], 20)

            # ADR Percentage
            historical_data['adr_perc_20'] = calculate_adr_percentage(historical_data, 20)
            historical_data['adr_perc_5'] = calculate_adr_percentage(historical_data, 5)


            # Volume indicators
            # FIXME utiliser dollar volume à la place
            # Tu sélectionnes des phases de “dry-up”, c’est bien… mais sur le marché US, certains titres à 1M de volume moyen peuvent quand même avoir :
            #
            # spreads larges
            #
            # carnets fins
            #
            # slippage à l’exécution (surtout si tu tailles “portfolio-level”)
            #
            # ➡️ Ajoute un filtre dollar volume (bien plus robuste que volume brut) :
            #
            # ex : AvgDollarVolume20 = close * volume_sma_20 > seuil (ex. 20–50M$ selon ton confort)
            historical_data['volume_sma_20'] = calculate_sma(historical_data['volume'], 20)
            historical_data['low_volume'] = historical_data['volume'] < historical_data['volume_sma_20']

            # Price vs EMA percentages
            historical_data['price_vs_ema10_perc'] = abs(historical_data['close'] - historical_data['ema_10']) / historical_data['ema_10'] * 100
            historical_data['price_vs_ema20_perc'] = abs(historical_data['close'] - historical_data['ema_20']) / historical_data['ema_20'] * 100

            # EMA trends (rising/falling)
            historical_data['ema10_rising'] = historical_data['ema_10'] > historical_data['ema_10'].shift(1)
            historical_data['ema20_rising'] = historical_data['ema_20'] > historical_data['ema_20'].shift(1)

            historical_data['basic_signal'] = (
                    (historical_data['adr_perc_20'] * 1.5 > historical_data['price_vs_ema10_perc']) &
                    (historical_data['ema_10'] > historical_data['ema_20'])
            )

            # Signal shifts (previous days)
            historical_data['signal_shift'] = historical_data['basic_signal'].shift(1)
            historical_data['signal_shift_2'] = historical_data['basic_signal'].shift(2)

            # Consecutive signal for three days
            historical_data['consecutive_signal_3_days'] = (
                    historical_data['basic_signal'] &
                    historical_data['signal_shift'] &
                    historical_data['signal_shift_2']
            )

            # Find bearish condition (ema10 < ema20) - this is the "golden cross" reversal
            bearish_condition = historical_data['ema_10'] < historical_data['ema_20']

            # Create column with close price during bearish condition (EMA golden cross)
            historical_data['price_during_ema_golden_cross'] = np.where(
                bearish_condition,
                historical_data['close'],
                np.nan
            )

            # Forward fill to get the last bearish close price for each row
            historical_data['price_during_last_ema_golden_cross'] = historical_data['price_during_ema_golden_cross'].ffill()

            # Handle edge case: if no bearish condition (ema10 < ema20) in the entire dataframe,
            # use the first close price as the reference point for performance calculation
            if historical_data['price_during_last_ema_golden_cross'].isna().all():
                historical_data['price_during_last_ema_golden_cross'] = historical_data['close'].iloc[0]

            # Performance percentage from last bearish to signal
            historical_data['perf_pct_from_bearish'] = np.where(
                historical_data['basic_signal'] & historical_data['price_during_last_ema_golden_cross'].notna(),
                (historical_data['close'] / historical_data['price_during_last_ema_golden_cross'] - 1.0) * 100.0,
                np.nan
            )

            # Consecutive signal with minimum 30% performance
            historical_data['consecutive_signal_with_30_perc'] = (
                    historical_data['consecutive_signal_3_days'] &
                    (historical_data['perf_pct_from_bearish'] > 30)
            )

            # Green signal (final signal)
            historical_data['green_signal'] = (
                    historical_data['consecutive_signal_with_30_perc'] &
                    (historical_data['adr_perc_20'] > historical_data['adr_perc_5']) &
                    historical_data['low_volume'] &
                    historical_data['ema10_rising'] &
                    historical_data['ema20_rising']
            )

            latest = historical_data.iloc[-1]
            previous = historical_data.iloc[-2] if len(historical_data) > 1 else None

            if latest['green_signal']:
                # Check if this is a new signal (true now but not in previous row)
                is_new = previous is None or not previous['green_signal']
                
                green_candidates.append({
                    'symbol': candidate['name'],
                    'ticker_full_name': candidate['ticker_full_name'],
                    'is_new': is_new
                })

        except Exception as error:
            if not quiet:
                print(f"   ❌ Failed to analyze {candidate['name']}: {error}", file=sys.stderr)

    return green_candidates

def analyse_weekly_setup(screener_service: ScreenerService, yahoo_finance_service: YahooFinanceService, quiet: bool = False) -> list[Any]:
    green_candidates = []
    custom_filters = [
        {"left": "close", "operation": "egreater", "right": 2},  # Price > $5
        {"left": "market_cap_basic", "operation": "egreater", "right": 300000000},  # Market cap > $500M
        {"left": "average_volume_30d_calc", "operation": "greater", "right": 1000000},  # Volume > 2M
        {"left": "EMA10|1W", "operation": "egreater", "right": "EMA20|1W"},
        {"left": "EMA20|1W", "operation": "egreater", "right": "SMA30|1W"},
        {"left": "close", "operation": "egreater", "right": "EMA20|1W"},
        {"left": "is_primary", "operation": "equal", "right": True}
    ]

    # Create parameters using the helper method
    parameters = ScreenerService.create_basic_parameters(
        columns=["name", "close", "EMA10|1W", "EMA20|1W", "SMA30|1W", "exchange"],
        filters=custom_filters,
        markets=["america"],  # Focus on US stocks
        sort_by="Perf.6M",  # Sort by 6-month performance
        sort_order="desc",
        range_limit=[0, 5000]  # Limit to first 50 results
    )

    # Define a simple mapper lambda for breakout analysis
    # Maps the raw data to a dictionary with the expected fields
    breakout_mapper = lambda raw: {
        'name': raw.data_fields[0] if len(raw.data_fields) > 0 else "Unknown",
        'close': raw.data_fields[1] if len(raw.data_fields) > 1 else 0,
        'ema10': raw.data_fields[2] if len(raw.data_fields) > 2 else 0,
        'ema20': raw.data_fields[3] if len(raw.data_fields) > 3 else 0,
        'sma30': raw.data_fields[4] if len(raw.data_fields) > 4 else 0,
        'ticker_full_name': raw.symbol_full
    }

    candidates = screener_service.scan(parameters, breakout_mapper)
    if not quiet:
        print(f"Found {len(candidates)} candidates with custom filters", file=sys.stderr)

    # Analyze first few candidates for testing
    for i, candidate in enumerate(candidates):
        try:
            if i > 0:
                time.sleep(0.5)
            
            historical_data = yahoo_finance_service.get_recent_data(candidate['name'], 365, interval="1wk")

            historical_data['sma_30'] = calculate_sma(historical_data['close'], 30)
            historical_data['ema_10'] = calculate_ema(historical_data['close'], 10)
            historical_data['ema_20'] = calculate_ema(historical_data['close'], 20)

            # ADR Percentage
            historical_data['adr_perc_20'] = calculate_adr_percentage(historical_data, 20)
            historical_data['adr_perc_5'] = calculate_adr_percentage(historical_data, 5)


            # Volume indicators
            historical_data['volume_sma_20'] = calculate_sma(historical_data['volume'], 20)
            historical_data['low_volume'] = historical_data['volume'] < historical_data['volume_sma_20']

            # Price vs EMA percentages
            historical_data['price_vs_ema10_perc'] = abs(historical_data['close'] - historical_data['ema_10']) / historical_data['ema_10'] * 100
            historical_data['price_vs_ema20_perc'] = abs(historical_data['close'] - historical_data['ema_20']) / historical_data['ema_20'] * 100

            # EMA trends (rising/falling)
            historical_data['ema10_rising'] = historical_data['ema_10'] > historical_data['ema_10'].shift(1)
            historical_data['ema20_rising'] = historical_data['ema_20'] > historical_data['ema_20'].shift(1)

            historical_data['basic_signal'] = (
                    (historical_data['adr_perc_20'] > historical_data['price_vs_ema10_perc']) &
                    (historical_data['adr_perc_20'] * 1.5 > historical_data['price_vs_ema10_perc']) &
                    (historical_data['ema_10'] > historical_data['ema_20'])
            )

            # Signal shifts (previous days)
            historical_data['signal_shift'] = historical_data['basic_signal'].shift(1)
            historical_data['signal_shift_2'] = historical_data['basic_signal'].shift(2)

            # Consecutive signal for three days
            historical_data['consecutive_signal_3_days'] = (
                    historical_data['basic_signal'] &
                    historical_data['signal_shift'] &
                    historical_data['signal_shift_2']
            )

            # Find bearish condition (ema10 < ema20) - this is the "golden cross" reversal
            bearish_condition = historical_data['ema_10'] < historical_data['ema_20']

            # Create column with close price during bearish condition (EMA golden cross)
            historical_data['price_during_ema_golden_cross'] = np.where(
                bearish_condition,
                historical_data['close'],
                np.nan
            )

            # Forward fill to get the last bearish close price for each row
            historical_data['price_during_last_ema_golden_cross'] = historical_data['price_during_ema_golden_cross'].ffill()

            # Handle edge case: if no bearish condition (ema10 < ema20) in the entire dataframe,
            # use the first close price as the reference point for performance calculation
            if historical_data['price_during_last_ema_golden_cross'].isna().all():
                historical_data['price_during_last_ema_golden_cross'] = historical_data['close'].iloc[0]

            # Performance percentage from last bearish to signal
            historical_data['perf_pct_from_bearish'] = np.where(
                historical_data['basic_signal'] & historical_data['price_during_last_ema_golden_cross'].notna(),
                (historical_data['close'] / historical_data['price_during_last_ema_golden_cross'] - 1.0) * 100.0,
                np.nan
            )

            # Consecutive signal with minimum 30% performance
            historical_data['consecutive_signal_with_30_perc'] = (
                    historical_data['consecutive_signal_3_days'] &
                    (historical_data['perf_pct_from_bearish'] > 30)
            )

            # Green signal (final signal)
            historical_data['green_signal'] = (
                    (historical_data['adr_perc_20'] > historical_data['adr_perc_5']) &
                    historical_data['consecutive_signal_with_30_perc'] &
                    historical_data['low_volume'] &
                    historical_data['ema10_rising'] &
                    historical_data['ema20_rising']
            )

            latest = historical_data.iloc[-1]
            previous = historical_data.iloc[-2] if len(historical_data) > 1 else None

            if latest['green_signal']:
                # Check if this is a new signal (true now but not in previous row)
                is_new = previous is None or not previous['green_signal']
                
                green_candidates.append({
                    'symbol': candidate['name'],
                    'ticker_full_name': candidate['ticker_full_name'],
                    'is_new': is_new
                })

        except Exception as error:
            if not quiet:
                print(f"   ❌ Failed to analyze {candidate['name']}: {error}", file=sys.stderr)

    return green_candidates


if __name__ == "__main__":
    main()
