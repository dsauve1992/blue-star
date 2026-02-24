#!/usr/bin/env python3
"""
Theme Extractor - Stock Themes and Tickers Scraper
Scrapes stocktitan.net to extract themes and their associated tickers
"""
import json
import sys
import time
from typing import List, Dict
import requests
from bs4 import BeautifulSoup


THEMES_URL = "https://www.stocktitan.net/stocks/themes"
BASE_URL = "https://www.stocktitan.net"


def get_page_content(url: str, retries: int = 4, base_delay: float = 10.0) -> BeautifulSoup:
    """Fetch and parse HTML content from a URL with exponential backoff retry."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 429:
                wait = base_delay * (2 ** attempt)
                print(f"   ⏳ Rate limited, waiting {wait:.0f}s before retry {attempt + 1}/{retries}...", file=sys.stderr)
                time.sleep(wait)
                continue
            response.raise_for_status()
            return BeautifulSoup(response.content, 'html.parser')
        except requests.RequestException as e:
            if attempt == retries - 1:
                raise Exception(f"Failed to fetch {url}: {str(e)}")
            wait = base_delay * (2 ** attempt)
            print(f"   ⏳ Request error, waiting {wait:.0f}s before retry {attempt + 1}/{retries}...", file=sys.stderr)
            time.sleep(wait)
    raise Exception(f"Failed to fetch {url} after {retries} retries")


def extract_themes() -> List[Dict[str, str]]:
    """Extract list of themes from the themes page."""
    print("🔍 Fetching themes from stocktitan.net...", file=sys.stderr)
    soup = get_page_content(THEMES_URL)
    
    themes = []
    seen_urls = set()
    
    theme_cards = soup.find_all(['div', 'article', 'section'], class_=lambda x: x and ('theme' in x.lower() or 'card' in x.lower()))
    
    for card in theme_cards:
        links = card.find_all('a', href=True)
        for link in links:
            href = link.get('href', '')
            if '/stocks/themes/' in href and href != '/stocks/themes' and href not in seen_urls:
                theme_name = link.get_text(strip=True)
                if theme_name and len(theme_name) > 0:
                    full_url = f"{BASE_URL}{href}" if not href.startswith('http') else href
                    theme_slug = href.replace('/stocks/themes/', '').strip('/')
                    themes.append({
                        'name': theme_name,
                        'slug': theme_slug,
                        'url': full_url
                    })
                    seen_urls.add(href)
    
    if not themes:
        all_links = soup.find_all('a', href=True)
        for link in all_links:
            href = link.get('href', '')
            if '/stocks/themes/' in href and href != '/stocks/themes' and href not in seen_urls:
                theme_name = link.get_text(strip=True)
                if theme_name and len(theme_name) > 3:
                    full_url = f"{BASE_URL}{href}" if not href.startswith('http') else href
                    theme_slug = href.replace('/stocks/themes/', '').strip('/')
                    themes.append({
                        'name': theme_name,
                        'slug': theme_slug,
                        'url': full_url
                    })
                    seen_urls.add(href)
    
    print(f"✅ Found {len(themes)} themes", file=sys.stderr)
    return themes


def extract_tickers_from_theme(theme_url: str) -> List[str]:
    """Extract ticker symbols from a theme detail page."""
    soup = get_page_content(theme_url)
    tickers = []
    seen_tickers = set()
    
    stock_cards = soup.find_all('article', class_=lambda x: x and 'stock-theme-card' in ' '.join(x) if isinstance(x, list) else 'stock-theme-card' in str(x))
    
    for card in stock_cards:
        ticker = card.get('data-ticker', '').strip().upper()
        if ticker and len(ticker) <= 6 and ticker.isalpha() and ticker not in seen_tickers:
            tickers.append(ticker)
            seen_tickers.add(ticker)
    
    if not tickers:
        elements_with_ticker = soup.find_all(attrs={'data-ticker': True})
        for elem in elements_with_ticker:
            ticker = elem.get('data-ticker', '').strip().upper()
            if ticker and len(ticker) <= 6 and ticker.isalpha() and ticker not in seen_tickers:
                tickers.append(ticker)
                seen_tickers.add(ticker)
    
    if not tickers:
        ticker_elements = soup.find_all(class_=lambda x: x and ('ticker' in str(x).lower() or 'symbol' in str(x).lower()))
        for elem in ticker_elements:
            ticker_text = elem.get_text(strip=True).upper()
            if ticker_text and len(ticker_text) <= 6 and ticker_text.isalpha() and ticker_text not in seen_tickers:
                tickers.append(ticker_text)
                seen_tickers.add(ticker_text)
    
    return sorted(list(set(tickers)))


def main():
    """Main entry point for the theme extractor."""
    try:
        themes = extract_themes()
        
        if not themes:
            print("❌ No themes found", file=sys.stderr)
            sys.exit(1)
        
        result = []
        
        for i, theme in enumerate(themes, 1):
            print(f"📊 Processing theme {i}/{len(themes)}: {theme['name']}...", file=sys.stderr)
            
            try:
                tickers = extract_tickers_from_theme(theme['url'])
                result.append({
                    'theme': theme['name'],
                    'tickers': tickers
                })
                print(f"   ✅ Found {len(tickers)} tickers", file=sys.stderr)
            except Exception as e:
                print(f"   ❌ Error extracting tickers for {theme['name']}: {str(e)}", file=sys.stderr)
                result.append({
                    'theme': theme['name'],
                    'tickers': []
                })
            
            if i < len(themes):
                time.sleep(5)
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'themes': []
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

