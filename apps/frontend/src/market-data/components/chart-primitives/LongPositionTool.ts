import type {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  ISeriesPrimitiveAxisView,
  Time,
  Logical,
  SeriesType,
  IChartApiBase,
  ISeriesApi,
  PrimitiveHoveredItem,
} from "lightweight-charts";

// ── Types ──────────────────────────────────────────────────────────────

export interface LongPositionState {
  entry: number;
  stop: number;
  target: number;
  logicalStart: number;
  logicalEnd: number;
  riskAmount: number;
}

export type DragHandle = "entry" | "stop" | "target" | null;

// ── Hit-test threshold in CSS pixels ───────────────────────────────────

const HANDLE_HIT_PX = 8;

// ── Renderer ───────────────────────────────────────────────────────────

class LongPositionRenderer implements IPrimitivePaneRenderer {
  private _state: LongPositionState;
  private _chart: IChartApiBase<Time>;
  private _series: ISeriesApi<SeriesType, Time>;
  private _hoveredHandle: DragHandle;

  constructor(
    state: LongPositionState,
    chart: IChartApiBase<Time>,
    series: ISeriesApi<SeriesType, Time>,
    hoveredHandle: DragHandle,
  ) {
    this._state = state;
    this._chart = chart;
    this._series = series;
    this._hoveredHandle = hoveredHandle;
  }

  draw(target: { useBitmapCoordinateSpace: (cb: (scope: { context: CanvasRenderingContext2D; horizontalPixelRatio: number; verticalPixelRatio: number }) => void) => void }): void {
    const { entry, stop, target: tgt, logicalStart, logicalEnd, riskAmount } = this._state;

    const yEntry = this._series.priceToCoordinate(entry);
    const yStop = this._series.priceToCoordinate(stop);
    const yTarget = this._series.priceToCoordinate(tgt);
    const xLeft = this._chart.timeScale().logicalToCoordinate(logicalStart as unknown as Logical);
    const xRight = this._chart.timeScale().logicalToCoordinate(logicalEnd as unknown as Logical);

    if (yEntry === null || yStop === null || yTarget === null || xLeft === null || xRight === null) return;

    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr }) => {
      const bxL = Math.min(xLeft, xRight) * hpr;
      const bxR = Math.max(xLeft, xRight) * hpr;
      const byEntry = yEntry * vpr;
      const byStop = yStop * vpr;
      const byTarget = yTarget * vpr;
      const boxW = bxR - bxL;

      // ── Profit zone (entry → target) ──
      const profitTop = Math.min(byEntry, byTarget);
      const profitBot = Math.max(byEntry, byTarget);
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(bxL, profitTop, boxW, profitBot - profitTop);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.35)";
      ctx.lineWidth = 1 * hpr;
      ctx.strokeRect(bxL, profitTop, boxW, profitBot - profitTop);

      // ── Loss zone (entry → stop) ──
      const lossTop = Math.min(byEntry, byStop);
      const lossBot = Math.max(byEntry, byStop);
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.fillRect(bxL, lossTop, boxW, lossBot - lossTop);
      ctx.strokeStyle = "rgba(239, 68, 68, 0.35)";
      ctx.lineWidth = 1 * hpr;
      ctx.strokeRect(bxL, lossTop, boxW, lossBot - lossTop);

      // ── Entry line ──
      const entryHovered = this._hoveredHandle === "entry";
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = (entryHovered ? 3 : 2) * hpr;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(bxL, byEntry);
      ctx.lineTo(bxR, byEntry);
      ctx.stroke();

      // ── Target line ──
      const targetHovered = this._hoveredHandle === "target";
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = (targetHovered ? 2.5 : 1.5) * hpr;
      ctx.setLineDash([4 * hpr, 3 * hpr]);
      ctx.beginPath();
      ctx.moveTo(bxL, byTarget);
      ctx.lineTo(bxR, byTarget);
      ctx.stroke();

      // ── Stop line ──
      const stopHovered = this._hoveredHandle === "stop";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = (stopHovered ? 2.5 : 1.5) * hpr;
      ctx.beginPath();
      ctx.moveTo(bxL, byStop);
      ctx.lineTo(bxR, byStop);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── Calculations ──
      const riskPerShare = Math.abs(entry - stop);
      const rewardPerShare = Math.abs(tgt - entry);
      const rr = riskPerShare > 0 ? rewardPerShare / riskPerShare : 0;
      const qty = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
      const targetPnl = qty * rewardPerShare;
      const stopPnl = qty * riskPerShare;
      const targetPct = entry > 0 ? ((tgt - entry) / entry) * 100 : 0;
      const stopPct = entry > 0 ? ((entry - stop) / entry) * 100 : 0;

      const fontSize = 10 * hpr;
      ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = "middle";

      // ── Target label ──
      const targetLabel = `Target: ${fmtMoney(rewardPerShare)} (${targetPct.toFixed(1)}%) ${fmtInt(qty)} sh, +${fmtMoney(targetPnl)}`;
      drawLabel(ctx, targetLabel, bxL + boxW / 2, byTarget - 12 * vpr, "#22c55e", hpr, vpr);

      // ── Stop label ──
      const stopLabel = `Stop: ${fmtMoney(riskPerShare)} (${stopPct.toFixed(1)}%) ${fmtInt(qty)} sh, -${fmtMoney(stopPnl)}`;
      drawLabel(ctx, stopLabel, bxL + boxW / 2, byStop + 12 * vpr, "#ef4444", hpr, vpr);

      // ── Center label (R:R and qty) ──
      const centerLabel = `Qty: ${fmtInt(qty)}  R:R ${rr.toFixed(1)}:1  Risk: $${fmtInt(riskAmount)}`;
      drawLabel(ctx, centerLabel, bxL + boxW / 2, byEntry + (byStop - byEntry) / 2, "#94a3b8", hpr, vpr);

      // ── Drag handles (horizontal bars at line edges) ──
      const handleW = 18 * hpr;
      const handleH = 6 * vpr;
      const handles: [number, string, boolean][] = [
        [byEntry, "#3b82f6", entryHovered],
        [byTarget, "#22c55e", targetHovered],
        [byStop, "#ef4444", stopHovered],
      ];
      for (const [hy, color, hovered] of handles) {
        // Left handle
        ctx.fillStyle = hovered ? color : hexWithAlpha(color, 0.7);
        roundRect(ctx, bxL, hy - handleH / 2, handleW, handleH, 2 * hpr);
        ctx.fill();
        // Right handle
        ctx.beginPath();
        roundRect(ctx, bxR - handleW, hy - handleH / 2, handleW, handleH, 2 * hpr);
        ctx.fill();
      }
    });
  }
}

// ── Label drawing helper ───────────────────────────────────────────────

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number, cy: number,
  color: string,
  hpr: number, vpr: number,
): void {
  const fontSize = 10 * hpr;
  ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
  const metrics = ctx.measureText(text);
  const padH = 6 * hpr;
  const padV = 3 * vpr;
  const w = metrics.width + padH * 2;
  const h = fontSize + padV * 2;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 4 * hpr);
  ctx.fill();

  ctx.strokeStyle = hexWithAlpha(color, 0.5);
  ctx.lineWidth = 1 * hpr;
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 4 * hpr);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
}

// ── Pane View ──────────────────────────────────────────────────────────

class LongPositionPaneView implements IPrimitivePaneView {
  private _renderer: LongPositionRenderer;

  constructor(state: LongPositionState, chart: IChartApiBase<Time>, series: ISeriesApi<SeriesType, Time>, hoveredHandle: DragHandle) {
    this._renderer = new LongPositionRenderer(state, chart, series, hoveredHandle);
  }

  zOrder(): "top" {
    return "top";
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }
}

// ── Price Axis Views ───────────────────────────────────────────────────

class PositionPriceAxisView implements ISeriesPrimitiveAxisView {
  private _price: number;
  private _label: string;
  private _bgColor: string;

  constructor(price: number, label: string, bgColor: string) {
    this._price = price;
    this._label = label;
    this._bgColor = bgColor;
  }

  coordinate(): number {
    return this._price;
  }

  text(): string {
    return `${this._label} ${this._price.toFixed(2)}`;
  }

  textColor(): string {
    return "#ffffff";
  }

  backColor(): string {
    return this._bgColor;
  }

  visible(): boolean {
    return true;
  }

  tickVisible(): boolean {
    return true;
  }
}

// ── Series Primitive ───────────────────────────────────────────────────

export class LongPositionTool implements ISeriesPrimitive<Time> {
  private _chart: IChartApiBase<Time> | null = null;
  private _series: ISeriesApi<SeriesType, Time> | null = null;
  private _requestUpdate: (() => void) | null = null;

  private _state: LongPositionState | null = null;
  private _paneViews: IPrimitivePaneView[] = [];
  private _priceAxisViews: ISeriesPrimitiveAxisView[] = [];
  private _riskAmount = 1000;

  // Drag state
  private _hoveredHandle: DragHandle = null;
  private _draggingHandle: DragHandle = null;

  get hasPosition(): boolean {
    return this._state !== null;
  }

  get state(): LongPositionState | null {
    return this._state;
  }

  get isDragging(): boolean {
    return this._draggingHandle !== null;
  }

  get hoveredHandle(): DragHandle {
    return this._hoveredHandle;
  }

  setRiskAmount(amount: number): void {
    this._riskAmount = amount;
    if (this._state) {
      this._state.riskAmount = amount;
      this._rebuildViews();
    }
  }

  /** Single click: place the full position with default offsets */
  place(price: number, logical: number): void {
    this._state = {
      entry: price,
      stop: price * 0.93,
      target: price * 1.15,
      logicalStart: logical,
      logicalEnd: logical + 40,
      riskAmount: this._riskAmount,
    };
    this._rebuildViews();
  }

  /** Update which handle the cursor is near (call from crosshair move) */
  updateHover(cssY: number): void {
    if (!this._state || !this._series) {
      if (this._hoveredHandle !== null) {
        this._hoveredHandle = null;
        this._rebuildViews();
      }
      return;
    }

    const prev = this._hoveredHandle;
    this._hoveredHandle = this._hitTestHandle(cssY);
    if (prev !== this._hoveredHandle) {
      this._rebuildViews();
    }
  }

  /** Begin dragging whichever handle is hovered */
  startDrag(): boolean {
    if (!this._hoveredHandle) return false;
    this._draggingHandle = this._hoveredHandle;
    return true;
  }

  /** Move the currently-dragged handle to a new price */
  drag(price: number): void {
    if (!this._state || !this._draggingHandle) return;
    this._state[this._draggingHandle] = price;
    this._rebuildViews();
  }

  /** Finish drag */
  endDrag(): void {
    this._draggingHandle = null;
  }

  clear(): void {
    this._state = null;
    this._hoveredHandle = null;
    this._draggingHandle = null;
    this._paneViews = [];
    this._priceAxisViews = [];
    this._requestUpdate?.();
  }

  // ISeriesPrimitive lifecycle
  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._chart = param.chart;
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  updateAllViews(): void {
    this._rebuildViews();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this._paneViews;
  }

  priceAxisViews(): readonly ISeriesPrimitiveAxisView[] {
    return this._priceAxisViews;
  }

  hitTest(_x: number, y: number): PrimitiveHoveredItem | null {
    if (!this._state || !this._series) return null;
    const handle = this._hitTestHandle(y);
    if (!handle) return null;
    return {
      cursorStyle: "ns-resize",
      externalId: `long-position-${handle}`,
      zOrder: "top",
    };
  }

  // ── Private ──────────────────────────────────────────────────────

  private _hitTestHandle(cssY: number): DragHandle {
    if (!this._state || !this._series) return null;

    const yEntry = this._series.priceToCoordinate(this._state.entry);
    const yStop = this._series.priceToCoordinate(this._state.stop);
    const yTarget = this._series.priceToCoordinate(this._state.target);

    if (yEntry !== null && Math.abs(cssY - yEntry) <= HANDLE_HIT_PX) return "entry";
    if (yStop !== null && Math.abs(cssY - yStop) <= HANDLE_HIT_PX) return "stop";
    if (yTarget !== null && Math.abs(cssY - yTarget) <= HANDLE_HIT_PX) return "target";
    return null;
  }

  private _rebuildViews(): void {
    if (!this._state || !this._chart || !this._series) {
      this._paneViews = [];
      this._priceAxisViews = [];
      this._requestUpdate?.();
      return;
    }

    this._paneViews = [new LongPositionPaneView(this._state, this._chart, this._series, this._hoveredHandle)];

    this._priceAxisViews = [
      new PositionPriceAxisView(this._state.entry, "Entry", "#3b82f6"),
      new PositionPriceAxisView(this._state.target, "TP", "#22c55e"),
      new PositionPriceAxisView(this._state.stop, "SL", "#ef4444"),
    ];

    this._requestUpdate?.();
  }
}

// ── Utility ────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function hexWithAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}
