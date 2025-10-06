# Financial Modeling Prep Screener Service

## Overview
This service integrates with the Financial Modeling Prep API to provide stock screening functionality for the Blue Star trading platform.

## Environment Setup
Add the following to your `.env` file:
```
FINANCIAL_MODELING_PREP_API_KEY=your_api_key_here
```

## API Endpoint
The screener is available at: `GET /market-data/screener`

### Query Parameters
- `marketCapMin` (number): Minimum market capitalization
- `marketCapMax` (number): Maximum market capitalization  
- `priceMin` (number): Minimum stock price
- `priceMax` (number): Maximum stock price
- `volumeMin` (number): Minimum trading volume
- `volumeMax` (number): Maximum trading volume
- `betaMin` (number): Minimum beta value
- `betaMax` (number): Maximum beta value
- `sector` (string): Sector filter (e.g., "Technology", "Healthcare")
- `country` (string): Country filter (e.g., "USA", "Canada")
- `exchange` (string): Exchange filter (e.g., "NASDAQ", "NYSE")
- `limit` (number): Maximum number of results to return

### Example Usage
```bash
# Find technology stocks with market cap > $1B and price > $10
GET /market-data/screener?sector=Technology&marketCapMin=1000000000&priceMin=10&limit=50

# Find small-cap stocks with high volume
GET /market-data/screener?marketCapMax=2000000000&volumeMin=1000000&limit=20
```

### Response Format
```json
{
  "results": [
    {
      "symbol": "AAPL",
      "companyName": "Apple Inc.",
      "marketCap": 3435062313000,
      "sector": "Technology",
      "industry": "Consumer Electronics",
      "beta": 1.24,
      "price": 225.93,
      "lastAnnualDividend": 1,
      "volume": 43010091,
      "exchange": "NASDAQ Global Select",
      "exchangeShortName": "NASDAQ",
      "country": "US",
      "isEtf": false,
      "isFund": false,
      "isActivelyTrading": true
    }
  ],
  "totalCount": 1,
  "filters": {
    "sector": "Technology",
    "marketCapMin": 1000000000,
    "priceMin": 10,
    "limit": 50
  }
}
```

## Architecture
- **Domain Layer**: `ScreenerFilters` and `ScreenerResult` value objects
- **Service Interface**: `ScreenerService` interface in domain layer
- **Infrastructure**: `FinancialModelingPrepScreenerService` implementation
- **Use Case**: `ScreenStocksUseCase` for business logic orchestration
- **API**: REST endpoint in `MarketDataController`

## Error Handling
- Missing API key throws error on service initialization
- HTTP errors from Financial Modeling Prep API are properly handled
- Invalid query parameters are validated and return appropriate error messages
