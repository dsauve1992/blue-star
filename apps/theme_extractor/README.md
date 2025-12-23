# Theme Extractor

A Python web scraper that extracts stock themes and their associated ticker symbols from stocktitan.net.

## Setup

1. Run the setup script to create a virtual environment and install dependencies:
```bash
./setup.sh
```

2. Activate the virtual environment:
```bash
source venv/bin/activate
```

## Usage

Run the script to extract all themes and their tickers:

```bash
python main.py
```

The script outputs JSON to stdout with the following format:

```json
[
  {
    "theme": "Cryptocurrency & Blockchain",
    "tickers": ["MARA", "HIVE", "IREN", ...]
  },
  {
    "theme": "Cybersecurity",
    "tickers": ["PANW", "CRWD", "FTNT", ...]
  }
]
```

Progress messages are printed to stderr, so you can redirect JSON output to a file:

```bash
python main.py > themes.json
```

## Dependencies

- requests: HTTP library for fetching web pages
- beautifulsoup4: HTML parsing library
- lxml: Fast XML/HTML parser

