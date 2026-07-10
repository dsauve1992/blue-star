import type {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  SeriesType,
  IChartApiBase,
} from "lightweight-charts";
import type { QuadrantType } from "src/sector-rotation/api/sector-rotation.client";

export interface QuadrantSegment {
  startTime: Time;
  endTime: Time;
  quadrant: QuadrantType;
}

const QUADRANT_FILL: Record<QuadrantType, string> = {
  Leading: "rgba(16, 185, 129, 0.09)",
  Improving: "rgba(59, 130, 246, 0.09)",
  Weakening: "rgba(245, 158, 11, 0.09)",
  Lagging: "rgba(239, 68, 68, 0.09)",
};

class QuadrantBackgroundRenderer implements IPrimitivePaneRenderer {
  private _segments: QuadrantSegment[];
  private _chart: IChartApiBase<Time>;

  constructor(segments: QuadrantSegment[], chart: IChartApiBase<Time>) {
    this._segments = segments;
    this._chart = chart;
  }

  draw(target: {
    useBitmapCoordinateSpace: (
      cb: (scope: {
        context: CanvasRenderingContext2D;
        bitmapSize: { width: number; height: number };
        horizontalPixelRatio: number;
      }) => void,
    ) => void;
  }): void {
    if (this._segments.length === 0) return;

    const timeScale = this._chart.timeScale();

    target.useBitmapCoordinateSpace(
      ({ context: ctx, bitmapSize, horizontalPixelRatio: hpr }) => {
        for (const segment of this._segments) {
          const xStart = timeScale.timeToCoordinate(segment.startTime);
          const xEnd = timeScale.timeToCoordinate(segment.endTime);
          if (xStart === null || xEnd === null) continue;

          const bxL = Math.min(xStart, xEnd) * hpr;
          const bxR = Math.max(xStart, xEnd) * hpr;
          const left = Math.max(0, bxL);
          const right = Math.min(bitmapSize.width, bxR);
          if (right <= left) continue;

          ctx.fillStyle = QUADRANT_FILL[segment.quadrant];
          ctx.fillRect(left, 0, right - left, bitmapSize.height);
        }
      },
    );
  }
}

class QuadrantBackgroundPaneView implements IPrimitivePaneView {
  private _renderer: QuadrantBackgroundRenderer;

  constructor(segments: QuadrantSegment[], chart: IChartApiBase<Time>) {
    this._renderer = new QuadrantBackgroundRenderer(segments, chart);
  }

  zOrder(): "bottom" {
    return "bottom";
  }

  renderer(): IPrimitivePaneRenderer {
    return this._renderer;
  }
}

export class QuadrantBackground implements ISeriesPrimitive<Time> {
  private _chart: IChartApiBase<Time> | null = null;
  private _requestUpdate: (() => void) | null = null;
  private _segments: QuadrantSegment[] = [];
  private _paneViews: IPrimitivePaneView[] = [];

  setSegments(segments: QuadrantSegment[]): void {
    this._segments = segments;
    this._updateViews();
  }

  attached(param: SeriesAttachedParameter<Time, SeriesType>): void {
    this._chart = param.chart;
    this._requestUpdate = param.requestUpdate;
    this._updateViews();
  }

  detached(): void {
    this._chart = null;
    this._requestUpdate = null;
    this._paneViews = [];
  }

  updateAllViews(): void {
    this._updateViews();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return this._paneViews;
  }

  private _updateViews(): void {
    this._paneViews =
      this._chart && this._segments.length > 0
        ? [new QuadrantBackgroundPaneView(this._segments, this._chart)]
        : [];
    this._requestUpdate?.();
  }
}
