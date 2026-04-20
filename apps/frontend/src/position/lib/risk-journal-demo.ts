export type JournalEntry = {
  timestamp: string;
  price: number;
  quantity: number;
  note?: string;
};

export type JournalStopAdjustment = {
  timestamp: string;
  stopPrice: number;
  note?: string;
};

export type JournalExit = {
  timestamp: string;
  price: number;
  quantity: number;
  note?: string;
};

export type JournalTrade = {
  id: string;
  symbol: string;
  initialStopPrice: number;
  entries: JournalEntry[];
  stopAdjustments: JournalStopAdjustment[];
  exits: JournalExit[];
};

export const DEMO_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: "aapl-2025-01",
    symbol: "AAPL",
    initialStopPrice: 181,
    entries: [
      { timestamp: "2025-01-08T15:30:00.000Z", price: 188, quantity: 50 },
      { timestamp: "2025-01-13T15:30:00.000Z", price: 191, quantity: 25 },
    ],
    stopAdjustments: [
      { timestamp: "2025-01-16T15:30:00.000Z", stopPrice: 186 },
      { timestamp: "2025-01-22T15:30:00.000Z", stopPrice: 193 },
    ],
    exits: [
      { timestamp: "2025-01-24T15:30:00.000Z", price: 201, quantity: 25 },
      { timestamp: "2025-01-29T15:30:00.000Z", price: 208, quantity: 50 },
    ],
  },
  {
    id: "nvda-2025-01",
    symbol: "NVDA",
    initialStopPrice: 812,
    entries: [
      { timestamp: "2025-01-14T15:30:00.000Z", price: 847, quantity: 20 },
      { timestamp: "2025-01-16T15:30:00.000Z", price: 861, quantity: 10 },
    ],
    stopAdjustments: [
      { timestamp: "2025-01-21T15:30:00.000Z", stopPrice: 828 },
    ],
    exits: [
      { timestamp: "2025-01-23T15:30:00.000Z", price: 817, quantity: 30 },
    ],
  },
  {
    id: "msft-2025-02",
    symbol: "MSFT",
    initialStopPrice: 399,
    entries: [
      { timestamp: "2025-02-04T15:30:00.000Z", price: 412, quantity: 40 },
    ],
    stopAdjustments: [
      { timestamp: "2025-02-10T15:30:00.000Z", stopPrice: 406 },
    ],
    exits: [
      { timestamp: "2025-02-18T15:30:00.000Z", price: 430, quantity: 20 },
      { timestamp: "2025-02-21T15:30:00.000Z", price: 438, quantity: 20 },
    ],
  },
  {
    id: "amd-2025-02",
    symbol: "AMD",
    initialStopPrice: 154,
    entries: [
      { timestamp: "2025-02-06T15:30:00.000Z", price: 161, quantity: 80 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-02-11T15:30:00.000Z", price: 168, quantity: 80 },
    ],
  },
  {
    id: "uber-2025-02",
    symbol: "UBER",
    initialStopPrice: 70,
    entries: [
      { timestamp: "2025-02-19T15:30:00.000Z", price: 74, quantity: 120 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-02-24T15:30:00.000Z", price: 69.5, quantity: 120 },
    ],
  },
  {
    id: "avgo-2025-03",
    symbol: "AVGO",
    initialStopPrice: 1288,
    entries: [
      { timestamp: "2025-03-03T15:30:00.000Z", price: 1325, quantity: 18 },
      { timestamp: "2025-03-07T15:30:00.000Z", price: 1348, quantity: 8 },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-11T15:30:00.000Z", stopPrice: 1316 },
      { timestamp: "2025-03-18T15:30:00.000Z", stopPrice: 1362 },
    ],
    exits: [
      { timestamp: "2025-03-20T15:30:00.000Z", price: 1398, quantity: 10 },
      { timestamp: "2025-03-27T15:30:00.000Z", price: 1442, quantity: 16 },
    ],
  },
  {
    id: "tsla-2025-03",
    symbol: "TSLA",
    initialStopPrice: 236,
    entries: [
      { timestamp: "2025-03-05T15:30:00.000Z", price: 248, quantity: 35 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-03-12T15:30:00.000Z", price: 231, quantity: 35 },
    ],
  },
  {
    id: "lly-2025-03",
    symbol: "LLY",
    initialStopPrice: 720,
    entries: [
      { timestamp: "2025-03-10T15:30:00.000Z", price: 742, quantity: 25 },
      { timestamp: "2025-03-17T15:30:00.000Z", price: 754, quantity: 10 },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-24T15:30:00.000Z", stopPrice: 738 },
      { timestamp: "2025-04-02T15:30:00.000Z", stopPrice: 752 },
    ],
    exits: [
      { timestamp: "2025-04-04T15:30:00.000Z", price: 780, quantity: 10 },
      { timestamp: "2025-04-15T15:30:00.000Z", price: 812, quantity: 25 },
    ],
  },
  {
    id: "pltr-2025-03",
    symbol: "PLTR",
    initialStopPrice: 36.8,
    entries: [
      { timestamp: "2025-03-21T15:30:00.000Z", price: 39.2, quantity: 100 },
      { timestamp: "2025-03-25T15:30:00.000Z", price: 40.6, quantity: 50 },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-28T15:30:00.000Z", stopPrice: 38.9 },
      { timestamp: "2025-04-03T15:30:00.000Z", stopPrice: 42.7 },
    ],
    exits: [
      { timestamp: "2025-04-04T15:30:00.000Z", price: 43.5, quantity: 50 },
      { timestamp: "2025-04-09T15:30:00.000Z", price: 46.8, quantity: 50 },
      { timestamp: "2025-04-16T15:30:00.000Z", price: 48.1, quantity: 50 },
    ],
  },
  {
    id: "meta-2025-04",
    symbol: "META",
    initialStopPrice: 482,
    entries: [
      { timestamp: "2025-04-02T15:30:00.000Z", price: 496, quantity: 30 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-08T15:30:00.000Z", price: 507, quantity: 30 },
    ],
  },
  {
    id: "snow-2025-04",
    symbol: "SNOW",
    initialStopPrice: 165,
    entries: [
      { timestamp: "2025-04-09T15:30:00.000Z", price: 172, quantity: 60 },
      { timestamp: "2025-04-11T15:30:00.000Z", price: 176, quantity: 20 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-16T15:30:00.000Z", price: 166, quantity: 80 },
    ],
  },
  {
    id: "qcom-2025-04",
    symbol: "QCOM",
    initialStopPrice: 158,
    entries: [
      { timestamp: "2025-04-14T15:30:00.000Z", price: 166, quantity: 70 },
    ],
    stopAdjustments: [
      { timestamp: "2025-04-21T15:30:00.000Z", stopPrice: 162 },
      { timestamp: "2025-04-28T15:30:00.000Z", stopPrice: 167 },
    ],
    exits: [
      { timestamp: "2025-04-29T15:30:00.000Z", price: 178, quantity: 30 },
      { timestamp: "2025-05-06T15:30:00.000Z", price: 184, quantity: 40 },
    ],
  },
  {
    id: "net-2025-04",
    symbol: "NET",
    initialStopPrice: 82,
    entries: [
      { timestamp: "2025-04-22T15:30:00.000Z", price: 86, quantity: 90 },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-28T15:30:00.000Z", price: 88.4, quantity: 90 },
    ],
  },
  {
    id: "anet-2025-05",
    symbol: "ANET",
    initialStopPrice: 293,
    entries: [
      { timestamp: "2025-05-05T15:30:00.000Z", price: 307, quantity: 22 },
      { timestamp: "2025-05-08T15:30:00.000Z", price: 312, quantity: 8 },
    ],
    stopAdjustments: [
      { timestamp: "2025-05-12T15:30:00.000Z", stopPrice: 304 },
      { timestamp: "2025-05-20T15:30:00.000Z", stopPrice: 313 },
    ],
    exits: [
      { timestamp: "2025-05-21T15:30:00.000Z", price: 326, quantity: 10 },
      { timestamp: "2025-05-29T15:30:00.000Z", price: 338, quantity: 20 },
    ],
  },
];
