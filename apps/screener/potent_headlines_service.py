#!/usr/bin/env python3
"""
Recent yfinance headlines for the hits of a potent scan.

Prints one JSON line: {"headlines": {SYMBOL: {"items": [...], "error": str | null}}}.
A ticker whose fetch fails carries its error instead of an empty list, so a
failure is never mistaken for "no news".
"""

import argparse
import json
import logging

import yfinance as yf

MAX_HEADLINES = 10


class _ErrorCapture(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.ERROR)
        self.messages: list[str] = []

    def emit(self, record):
        self.messages.append(record.getMessage())


def to_yahoo_symbol(symbol: str) -> str:
    return symbol.replace('.', '-')


def map_item(item: dict) -> dict | None:
    content = item.get('content') or item
    if not isinstance(content, dict):
        return None
    title = content.get('title')
    url = (content.get('canonicalUrl') or {}).get('url') or (content.get('clickThroughUrl') or {}).get('url')
    if not title or not url:
        return None
    return {
        'title': title,
        'publisher': (content.get('provider') or {}).get('displayName'),
        'url': url,
        'published_at': content.get('pubDate') or content.get('displayTime'),
    }


def fetch_headlines(symbol: str) -> dict:
    capture = _ErrorCapture()
    logger = logging.getLogger('yfinance')
    logger.addHandler(capture)
    try:
        raw_items = yf.Ticker(to_yahoo_symbol(symbol)).get_news(count=MAX_HEADLINES)
    except Exception as error:
        return {'items': [], 'error': str(error)}
    finally:
        logger.removeHandler(capture)

    if capture.messages:
        return {'items': [], 'error': capture.messages[0]}

    items = [mapped for mapped in (map_item(item) for item in raw_items if isinstance(item, dict)) if mapped]
    if raw_items and not items:
        return {'items': [], 'error': f'{len(raw_items)} news items returned but none had a title and URL'}
    return {'items': items[:MAX_HEADLINES], 'error': None}


def main():
    parser = argparse.ArgumentParser(description='Recent headlines for potent scan hits')
    parser.add_argument('--tickers', required=True, help='Comma-separated symbols')
    args = parser.parse_args()

    symbols = [symbol for symbol in args.tickers.split(',') if symbol]
    print(json.dumps({'headlines': {symbol: fetch_headlines(symbol) for symbol in symbols}}))


if __name__ == '__main__':
    main()
