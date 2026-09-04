import {
  customSeriesDefaultOptions,
  type CustomData,
  type CustomSeriesOptions,
  type CustomSeriesPricePlotValues,
  type CustomSeriesWhitespaceData,
  type ICustomSeriesPaneRenderer,
  type ICustomSeriesPaneView,
  type PaneRendererCustomData,
  type PriceToCoordinateConverter,
  type Time,
} from "lightweight-charts";
import type { CanvasRenderingTarget2D } from "fancy-canvas";

export interface EmaBandData extends CustomData<Time> {
  fast: number;
  slow: number;
}

export interface EmaBandOptions extends CustomSeriesOptions {
  fastAboveColor: string;
  fastBelowColor: string;
}

interface BandPoint {
  x: number;
  fastY: number;
  slowY: number;
}

class EmaBandRenderer implements ICustomSeriesPaneRenderer {
  private data: PaneRendererCustomData<Time, EmaBandData> | null = null;
  private options: EmaBandOptions | null = null;

  update(
    data: PaneRendererCustomData<Time, EmaBandData>,
    options: EmaBandOptions,
  ): void {
    this.data = data;
    this.options = options;
  }

  draw(
    target: CanvasRenderingTarget2D,
    priceToCoordinate: PriceToCoordinateConverter,
  ): void {
    const data = this.data;
    const options = this.options;
    if (!data || !options || data.visibleRange === null) return;

    target.useBitmapCoordinateSpace(
      ({ context, horizontalPixelRatio, verticalPixelRatio }) => {
        const points: BandPoint[] = [];
        for (let i = data.visibleRange!.from; i < data.visibleRange!.to; i++) {
          const bar = data.bars[i];
          const fastY = priceToCoordinate(bar.originalData.fast);
          const slowY = priceToCoordinate(bar.originalData.slow);
          if (fastY === null || slowY === null) continue;
          points.push({
            x: bar.x * horizontalPixelRatio,
            fastY: fastY * verticalPixelRatio,
            slowY: slowY * verticalPixelRatio,
          });
        }

        for (let i = 0; i < points.length - 1; i++) {
          const from = points[i];
          const to = points[i + 1];
          const fromGap = from.slowY - from.fastY;
          const toGap = to.slowY - to.fastY;
          if (fromGap * toGap < 0) {
            const t = fromGap / (fromGap - toGap);
            const cross: BandPoint = {
              x: from.x + (to.x - from.x) * t,
              fastY: from.fastY + (to.fastY - from.fastY) * t,
              slowY: from.slowY + (to.slowY - from.slowY) * t,
            };
            fillSegment(context, from, cross, fromGap >= 0, options);
            fillSegment(context, cross, to, toGap >= 0, options);
          } else {
            fillSegment(context, from, to, fromGap + toGap >= 0, options);
          }
        }
      },
    );
  }
}

function fillSegment(
  context: CanvasRenderingContext2D,
  from: BandPoint,
  to: BandPoint,
  fastAbove: boolean,
  options: EmaBandOptions,
): void {
  context.beginPath();
  context.moveTo(from.x, from.fastY);
  context.lineTo(to.x, to.fastY);
  context.lineTo(to.x, to.slowY);
  context.lineTo(from.x, from.slowY);
  context.closePath();
  context.fillStyle = fastAbove
    ? options.fastAboveColor
    : options.fastBelowColor;
  context.fill();
}

export class EmaBandSeries
  implements ICustomSeriesPaneView<Time, EmaBandData, EmaBandOptions>
{
  private readonly bandRenderer = new EmaBandRenderer();

  renderer(): ICustomSeriesPaneRenderer {
    return this.bandRenderer;
  }

  update(
    data: PaneRendererCustomData<Time, EmaBandData>,
    options: EmaBandOptions,
  ): void {
    this.bandRenderer.update(data, options);
  }

  priceValueBuilder(plotRow: EmaBandData): CustomSeriesPricePlotValues {
    return [
      Math.min(plotRow.fast, plotRow.slow),
      Math.max(plotRow.fast, plotRow.slow),
      plotRow.fast,
    ];
  }

  isWhitespace(
    data: EmaBandData | CustomSeriesWhitespaceData<Time>,
  ): data is CustomSeriesWhitespaceData<Time> {
    return (data as Partial<EmaBandData>).fast === undefined;
  }

  defaultOptions(): EmaBandOptions {
    return {
      ...customSeriesDefaultOptions,
      fastAboveColor: "rgba(59,130,246,0.25)",
      fastBelowColor: "rgba(239,68,68,0.25)",
    };
  }
}
