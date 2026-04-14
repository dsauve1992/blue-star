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
} from "lightweight-charts";

// ── Types ──────────────────────────────────────────────────────────────

interface MeasurePoint {
  price: number;
  logical: number; // logical index on time scale
  time: Time;
}

interface MeasureState {
  start: MeasurePoint;
  end: MeasurePoint;
}

// ── Renderer ───────────────────────────────────────────────────────────

class MeasureRenderer implements IPrimitivePaneRenderer {
  private _state: MeasureState;
  private _chart: IChartApiBase<Time>;
  private _series: ISeriesApi<SeriesType, Time>;

  constructor(
    state: MeasureState,
    chart: IChartApiBase<Time>,
    series: ISeriesApi<SeriesType, Time>,
  ) {
    this._state = state;
    this._chart = chart;
    this._series = series;
  }

  draw(target: { useBitmapCoordinateSpace: (cb: (scope: { context: CanvasRenderingContext2D; horizontalPixelRatio: number; verticalPixelRatio: number }) => void) => void }): void {
    const { start, end } = this._state;

    const y1 = this._series.priceToCoordinate(start.price);
    const y2 = this._series.priceToCoordinate(end.price);
    const x1 = this._chart.timeScale().logicalToCoordinate(start.logical as unknown as Logical);
    const x2 = this._chart.timeScale().logicalToCoordinate(end.logical as unknown as Logical);

    if (y1 === null || y2 === null || x1 === null || x2 === null) return;

    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio: hpr, verticalPixelRatio: vpr }) => {
      const bx1 = Math.min(x1, x2) * hpr;
      const bx2 = Math.max(x1, x2) * hpr;
      const by1 = Math.min(y1, y2) * vpr;
      const by2 = Math.max(y1, y2) * vpr;

      // Rectangle fill
      const isUp = end.price >= start.price;
      ctx.fillStyle = isUp
        ? "rgba(34, 197, 94, 0.12)"
        : "rgba(239, 68, 68, 0.12)";
      ctx.fillRect(bx1, by1, bx2 - bx1, by2 - by1);

      // Rectangle border
      ctx.strokeStyle = isUp
        ? "rgba(34, 197, 94, 0.5)"
        : "rgba(239, 68, 68, 0.5)";
      ctx.lineWidth = 1 * hpr;
      ctx.setLineDash([4 * hpr, 3 * hpr]);
      ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
      ctx.setLineDash([]);

      // Compute measurements
      const priceDiff = end.price - start.price;
      const pctChange = start.price !== 0 ? (priceDiff / start.price) * 100 : 0;
      const barCount = Math.abs(Math.round(end.logical - start.logical));

      const sign = priceDiff >= 0 ? "+" : "";
      const label = `${sign}${priceDiff.toFixed(2)} (${sign}${pctChange.toFixed(2)}%)  ${barCount} bars`;

      // Label positioning — bottom-right of rectangle
      const fontSize = 11 * hpr;
      ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`;
      const metrics = ctx.measureText(label);
      const padH = 6 * hpr;
      const padV = 4 * vpr;
      const labelW = metrics.width + padH * 2;
      const labelH = fontSize + padV * 2;

      // Position label at bottom of rectangle, centered horizontally
      const lx = (bx1 + bx2) / 2 - labelW / 2;
      const ly = by2 + 4 * vpr;

      // Label background
      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.beginPath();
      const r = 4 * hpr;
      roundRect(ctx, lx, ly, labelW, labelH, r);
      ctx.fill();

      // Label border
      ctx.strokeStyle = isUp
        ? "rgba(34, 197, 94, 0.4)"
        : "rgba(239, 68, 68, 0.4)";
      ctx.lineWidth = 1 * hpr;
      ctx.beginPath();
      roundRect(ctx, lx, ly, labelW, labelH, r);
      ctx.stroke();

      // Label text
      ctx.fillStyle = isUp ? "#22c55e" : "#ef4444";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(label, lx + labelW / 2, ly + labelH / 2);
    });
  }
}

// ── Pane View ──────────────────────────────────────────────────────────

class MeasurePaneView implements IPrimitivePaneView {
  private _renderer: MeasureRenderer;

  constructor(state: MeasureState, chart: IChartApiBase<Time>, series: ISeriesApi<SeriesType, Time>) {
    this._renderer = new MeasureRenderer(state, chart, series);
  }

  zOrder(): "top" {
    return "top";
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }
}

// ── Price Axis View ────────────────────────────────────────────────────

class MeasurePriceAxisView implements ISeriesPrimitiveAxisView {
  private _price: number;
  private _isStart: boolean;
  private _isUp: boolean;

  constructor(price: number, isStart: boolean, isUp: boolean) {
    this._price = price;
    this._isStart = isStart;
    this._isUp = isUp;
  }

  coordinate(): number {
    return this._price; // will be ignored — lightweight-charts uses the value
  }

  text(): string {
    return this._price.toFixed(2);
  }

  textColor(): string {
    return "#ffffff";
  }

  backColor(): string {
    if (this._isStart) return "#64748b";
    return this._isUp ? "#22c55e" : "#ef4444";
  }

  visible(): boolean {
    return true;
  }

  tickVisible(): boolean {
    return true;
  }
}

// ── Series Primitive (the tool itself) ─────────────────────────────────

export type MeasureToolMode = "idle" | "drawing";

export class MeasureTool implements ISeriesPrimitive<Time> {
  private _chart: IChartApiBase<Time> | null = null;
  private _series: ISeriesApi<SeriesType, Time> | null = null;
  private _requestUpdate: (() => void) | null = null;

  private _state: MeasureState | null = null;
  private _mode: MeasureToolMode = "idle";
  private _paneViews: IPrimitivePaneView[] = [];
  private _priceAxisViews: ISeriesPrimitiveAxisView[] = [];

  // Public API
  get mode(): MeasureToolMode {
    return this._mode;
  }

  startDrawing(price: number, logical: number, time: Time): void {
    this._mode = "drawing";
    this._state = {
      start: { price, logical, time },
      end: { price, logical, time },
    };
    this._updateViews();
  }

  updateDrawing(price: number, logical: number, time: Time): void {
    if (!this._state || this._mode !== "drawing") return;
    this._state.end = { price, logical, time };
    this._updateViews();
  }

  finishDrawing(): MeasureState | null {
    if (!this._state) return null;
    this._mode = "idle";
    this._updateViews();
    return this._state;
  }

  clear(): void {
    this._state = null;
    this._mode = "idle";
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
    this._updateViews();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this._paneViews;
  }

  priceAxisViews(): readonly ISeriesPrimitiveAxisView[] {
    return this._priceAxisViews;
  }

  private _updateViews(): void {
    if (!this._state || !this._chart || !this._series) {
      this._paneViews = [];
      this._priceAxisViews = [];
      this._requestUpdate?.();
      return;
    }

    this._paneViews = [new MeasurePaneView(this._state, this._chart, this._series)];

    const isUp = this._state.end.price >= this._state.start.price;
    this._priceAxisViews = [
      new MeasurePriceAxisView(this._state.start.price, true, isUp),
      new MeasurePriceAxisView(this._state.end.price, false, isUp),
    ];

    this._requestUpdate?.();
  }
}

// ── Canvas helpers ─────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
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
