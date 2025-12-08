"""
TradingView Screener Service
Handles API calls to the unofficial TradingView screener endpoint
"""

import requests
from dataclasses import dataclass
from typing import List, Dict, Any, Callable, TypeVar, Generic

T = TypeVar('T')

@dataclass
class RawScreenerEntry:
    data_fields: List[Any]
    symbol_full: str


class ScreenerService:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.timeout = 10

    def scan(self, parameters: Dict[str, Any], mapper: Callable[[RawScreenerEntry], T]) -> List[T]:
        try:
            response = self.session.post(
                'https://scanner.tradingview.com/global/scan',
                json=parameters,
                timeout=self.timeout
            )
            response.raise_for_status()


            entries = []
            data = response.json()['data']

            for entry in data:
                data_fields = entry['d']
                symbol_full = entry['s']
                
                raw_entry = RawScreenerEntry(
                    data_fields=data_fields,
                    symbol_full=symbol_full,
                )
                
                mapped_entry = mapper(raw_entry)
                entries.append(mapped_entry)

            return entries

        except requests.exceptions.RequestException as e:
            import sys
            print(f'Error fetching screener data: {e}', file=sys.stderr)
            raise Exception(f'Failed to fetch screener data: {e}')
        except Exception as e:
            import sys
            print(f'Unexpected error: {e}', file=sys.stderr)
            raise Exception(f'Failed to fetch screener data: {e}')

    @staticmethod
    def create_basic_parameters(columns: List[str],
                              filters: List[Dict[str, Any]],
                              markets: List[str],
                              sort_by: str,
                              sort_order: str,
                              range_limit: List[int]) -> Dict[str, Any]:
        return {
            "columns": columns,
            "filter": filters,
            "ignore_unknown_fields": False,
            "options": {"lang": "en"},
            "range": range_limit,
            "sort": {"sortBy": sort_by, "sortOrder": sort_order},
            "symbols": {},
            "markets": markets,
            # "filter2": {
            #     "operator": "and",
            #     "operands": [{
            #         "operation": {
            #             "operator": "or",
            #             "operands": [{
            #                 "operation": {
            #                     "operator": "and",
            #                     "operands": [{
            #                         "expression": {
            #                             "left": "type",
            #                             "operation": "equal",
            #                             "right": "stock"
            #                         }
            #                     }, {"expression": {"left": "typespecs", "operation": "has", "right": ["common"]}}]
            #                 }
            #             }, {
            #                 "operation": {
            #                     "operator": "and",
            #                     "operands": [{
            #                         "expression": {
            #                             "left": "type",
            #                             "operation": "equal",
            #                             "right": "stock"
            #                         }
            #                     }, {"expression": {"left": "typespecs", "operation": "has", "right": ["preferred"]}}]
            #                 }
            #             }, {
            #                 "operation": {
            #                     "operator": "and",
            #                     "operands": [{"expression": {"left": "type", "operation": "equal", "right": "dr"}}]
            #                 }
            #             }, {
            #                 "operation": {
            #                     "operator": "and",
            #                     "operands": [{
            #                         "expression": {
            #                             "left": "type",
            #                             "operation": "equal",
            #                             "right": "fund"
            #                         }
            #                     }, {"expression": {"left": "typespecs", "operation": "has_none_of", "right": ["etf"]}}]
            #                 }
            #             }]
            #         }
            #     }]
            # }
        }

