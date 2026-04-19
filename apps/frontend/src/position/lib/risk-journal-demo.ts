export type JournalTradeSetup =
  | "breakout"
  | "pullback"
  | "base-break"
  | "earnings-continuation";

export type JournalEntry = {
  timestamp: string;
  price: number;
  quantity: number;
  type: "initial" | "add";
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
  reason: "trim" | "target" | "trend-break" | "stop" | "gap-down";
  note?: string;
};

export type JournalTrade = {
  id: string;
  symbol: string;
  setup: JournalTradeSetup;
  thesis: string;
  tags: string[];
  initialStopPrice: number;
  entries: JournalEntry[];
  stopAdjustments: JournalStopAdjustment[];
  exits: JournalExit[];
};

export const DEMO_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: "aapl-2025-01",
    symbol: "AAPL",
    setup: "breakout",
    thesis: "Weekly flag breakout after earnings gap held above the 21-day line.",
    tags: ["stage-2", "earnings-leader"],
    initialStopPrice: 181,
    entries: [
      { timestamp: "2025-01-08T15:30:00.000Z", price: 188, quantity: 50, type: "initial" },
      { timestamp: "2025-01-13T15:30:00.000Z", price: 191, quantity: 25, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-01-16T15:30:00.000Z", stopPrice: 186, note: "Move below first tight pivot." },
      { timestamp: "2025-01-22T15:30:00.000Z", stopPrice: 193, note: "Lock in after second range expansion." },
    ],
    exits: [
      { timestamp: "2025-01-24T15:30:00.000Z", price: 201, quantity: 25, reason: "trim" },
      { timestamp: "2025-01-29T15:30:00.000Z", price: 208, quantity: 50, reason: "trend-break" },
    ],
  },
  {
    id: "nvda-2025-01",
    symbol: "NVDA",
    setup: "breakout",
    thesis: "Tried to follow a late-stage breakout and got trapped on failed continuation.",
    tags: ["late-stage", "failed-breakout"],
    initialStopPrice: 812,
    entries: [
      { timestamp: "2025-01-14T15:30:00.000Z", price: 847, quantity: 20, type: "initial" },
      { timestamp: "2025-01-16T15:30:00.000Z", price: 861, quantity: 10, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-01-21T15:30:00.000Z", stopPrice: 828, note: "Tighten after weak close." },
    ],
    exits: [
      { timestamp: "2025-01-23T15:30:00.000Z", price: 817, quantity: 30, reason: "gap-down" },
    ],
  },
  {
    id: "msft-2025-02",
    symbol: "MSFT",
    setup: "pullback",
    thesis: "Low-volume pullback into the 21-day with tight risk and clean relative strength.",
    tags: ["21ema", "institutional-support"],
    initialStopPrice: 399,
    entries: [
      { timestamp: "2025-02-04T15:30:00.000Z", price: 412, quantity: 40, type: "initial" },
    ],
    stopAdjustments: [
      { timestamp: "2025-02-10T15:30:00.000Z", stopPrice: 406, note: "Raise under higher low." },
    ],
    exits: [
      { timestamp: "2025-02-18T15:30:00.000Z", price: 430, quantity: 20, reason: "trim" },
      { timestamp: "2025-02-21T15:30:00.000Z", price: 438, quantity: 20, reason: "trend-break" },
    ],
  },
  {
    id: "amd-2025-02",
    symbol: "AMD",
    setup: "base-break",
    thesis: "Short base breakout worked, but the move was sold quickly into first resistance.",
    tags: ["short-base", "quick-gain"],
    initialStopPrice: 154,
    entries: [
      { timestamp: "2025-02-06T15:30:00.000Z", price: 161, quantity: 80, type: "initial" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-02-11T15:30:00.000Z", price: 168, quantity: 80, reason: "trend-break" },
    ],
  },
  {
    id: "uber-2025-02",
    symbol: "UBER",
    setup: "breakout",
    thesis: "Breakout from a short shelf failed immediately and never showed real sponsorship.",
    tags: ["failed-breakout", "weak-close"],
    initialStopPrice: 70,
    entries: [
      { timestamp: "2025-02-19T15:30:00.000Z", price: 74, quantity: 120, type: "initial" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-02-24T15:30:00.000Z", price: 69.5, quantity: 120, reason: "stop" },
    ],
  },
  {
    id: "avgo-2025-03",
    symbol: "AVGO",
    setup: "pullback",
    thesis: "High-tight pullback into the 10-week line that resumed strongly after volume contraction.",
    tags: ["10week", "leader"],
    initialStopPrice: 1288,
    entries: [
      { timestamp: "2025-03-03T15:30:00.000Z", price: 1325, quantity: 18, type: "initial" },
      { timestamp: "2025-03-07T15:30:00.000Z", price: 1348, quantity: 8, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-11T15:30:00.000Z", stopPrice: 1316, note: "Raise below prior day low." },
      { timestamp: "2025-03-18T15:30:00.000Z", stopPrice: 1362, note: "Protect into climactic extension." },
    ],
    exits: [
      { timestamp: "2025-03-20T15:30:00.000Z", price: 1398, quantity: 10, reason: "trim" },
      { timestamp: "2025-03-27T15:30:00.000Z", price: 1442, quantity: 16, reason: "trend-break" },
    ],
  },
  {
    id: "tsla-2025-03",
    symbol: "TSLA",
    setup: "breakout",
    thesis: "Aggressive entry into a volatile name led to a gap-down exit below the planned stop.",
    tags: ["gap-risk", "execution-damage"],
    initialStopPrice: 236,
    entries: [
      { timestamp: "2025-03-05T15:30:00.000Z", price: 248, quantity: 35, type: "initial" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-03-12T15:30:00.000Z", price: 231, quantity: 35, reason: "gap-down" },
    ],
  },
  {
    id: "lly-2025-03",
    symbol: "LLY",
    setup: "pullback",
    thesis: "Orderly pullback to the 21-day reclaimed with strong healthcare leadership.",
    tags: ["pullback", "steady-trend"],
    initialStopPrice: 720,
    entries: [
      { timestamp: "2025-03-10T15:30:00.000Z", price: 742, quantity: 25, type: "initial" },
      { timestamp: "2025-03-17T15:30:00.000Z", price: 754, quantity: 10, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-24T15:30:00.000Z", stopPrice: 738, note: "Raise under higher low." },
      { timestamp: "2025-04-02T15:30:00.000Z", stopPrice: 752, note: "Protect after second leg up." },
    ],
    exits: [
      { timestamp: "2025-04-04T15:30:00.000Z", price: 780, quantity: 10, reason: "trim" },
      { timestamp: "2025-04-15T15:30:00.000Z", price: 812, quantity: 25, reason: "trend-break" },
    ],
  },
  {
    id: "pltr-2025-03",
    symbol: "PLTR",
    setup: "breakout",
    thesis: "Momentum breakout from a four-week shelf with strong volume follow-through.",
    tags: ["momentum", "partials"],
    initialStopPrice: 36.8,
    entries: [
      { timestamp: "2025-03-21T15:30:00.000Z", price: 39.2, quantity: 100, type: "initial" },
      { timestamp: "2025-03-25T15:30:00.000Z", price: 40.6, quantity: 50, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-03-28T15:30:00.000Z", stopPrice: 38.9, note: "Raise under tight flag." },
      { timestamp: "2025-04-03T15:30:00.000Z", stopPrice: 42.7, note: "Trail under strong breakout day." },
    ],
    exits: [
      { timestamp: "2025-04-04T15:30:00.000Z", price: 43.5, quantity: 50, reason: "trim" },
      { timestamp: "2025-04-09T15:30:00.000Z", price: 46.8, quantity: 50, reason: "trim" },
      { timestamp: "2025-04-16T15:30:00.000Z", price: 48.1, quantity: 50, reason: "trend-break" },
    ],
  },
  {
    id: "meta-2025-04",
    symbol: "META",
    setup: "earnings-continuation",
    thesis: "Post-earnings continuation worked, but the position was reduced before the move matured.",
    tags: ["earnings", "cut-short"],
    initialStopPrice: 482,
    entries: [
      { timestamp: "2025-04-02T15:30:00.000Z", price: 496, quantity: 30, type: "initial" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-08T15:30:00.000Z", price: 507, quantity: 30, reason: "trend-break" },
    ],
  },
  {
    id: "snow-2025-04",
    symbol: "SNOW",
    setup: "base-break",
    thesis: "Base breakout lacked volume follow-through and rolled over before the setup proved itself.",
    tags: ["weak-breakout", "capital-preservation"],
    initialStopPrice: 165,
    entries: [
      { timestamp: "2025-04-09T15:30:00.000Z", price: 172, quantity: 60, type: "initial" },
      { timestamp: "2025-04-11T15:30:00.000Z", price: 176, quantity: 20, type: "add" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-16T15:30:00.000Z", price: 166, quantity: 80, reason: "stop" },
    ],
  },
  {
    id: "qcom-2025-04",
    symbol: "QCOM",
    setup: "pullback",
    thesis: "Constructive pullback entry into support with patient exit into extension.",
    tags: ["support", "patient-hold"],
    initialStopPrice: 158,
    entries: [
      { timestamp: "2025-04-14T15:30:00.000Z", price: 166, quantity: 70, type: "initial" },
    ],
    stopAdjustments: [
      { timestamp: "2025-04-21T15:30:00.000Z", stopPrice: 162, note: "Raise after follow-through day." },
      { timestamp: "2025-04-28T15:30:00.000Z", stopPrice: 167, note: "Trail under higher low." },
    ],
    exits: [
      { timestamp: "2025-04-29T15:30:00.000Z", price: 178, quantity: 30, reason: "trim" },
      { timestamp: "2025-05-06T15:30:00.000Z", price: 184, quantity: 40, reason: "trend-break" },
    ],
  },
  {
    id: "net-2025-04",
    symbol: "NET",
    setup: "breakout",
    thesis: "The setup worked, but the position was sold too quickly after the first push.",
    tags: ["quick-profit", "winner-too-small"],
    initialStopPrice: 82,
    entries: [
      { timestamp: "2025-04-22T15:30:00.000Z", price: 86, quantity: 90, type: "initial" },
    ],
    stopAdjustments: [],
    exits: [
      { timestamp: "2025-04-28T15:30:00.000Z", price: 88.4, quantity: 90, reason: "trend-break" },
    ],
  },
  {
    id: "anet-2025-05",
    symbol: "ANET",
    setup: "breakout",
    thesis: "Clean high-tight flag continuation with disciplined stop raises as the move expanded.",
    tags: ["leader", "proper-pyramiding"],
    initialStopPrice: 293,
    entries: [
      { timestamp: "2025-05-05T15:30:00.000Z", price: 307, quantity: 22, type: "initial" },
      { timestamp: "2025-05-08T15:30:00.000Z", price: 312, quantity: 8, type: "add" },
    ],
    stopAdjustments: [
      { timestamp: "2025-05-12T15:30:00.000Z", stopPrice: 304, note: "Raise under higher tight low." },
      { timestamp: "2025-05-20T15:30:00.000Z", stopPrice: 313, note: "Protect after climactic run." },
    ],
    exits: [
      { timestamp: "2025-05-21T15:30:00.000Z", price: 326, quantity: 10, reason: "trim" },
      { timestamp: "2025-05-29T15:30:00.000Z", price: 338, quantity: 20, reason: "trend-break" },
    ],
  },
];
