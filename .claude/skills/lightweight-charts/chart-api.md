# Chart API — createChart & IChartApi

## createChart

```typescript
import { createChart, ColorType } from 'lightweight-charts';

const chart = createChart(container: string | HTMLElement, options?: DeepPartial<TimeChartOptions>);
```

**Key chart options:**

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| `width` / `height` | number | 0 | Fixed size; ignored when `autoSize: true` |
| `autoSize` | boolean | false | Responsive sizing from container |
| `layout` | LayoutOptions | — | Background, text, font, panes config |
| `crosshair` | CrosshairOptions | — | Mode, vert/horiz line styles |
| `grid` | GridOptions | — | Vert/horiz line color, style, visibility |
| `timeScale` | HorzScaleOptions | — | Bar spacing, right offset, visibility |
| `rightPriceScale` / `leftPriceScale` | PriceScaleOptions | — | Scale margins, mode, visibility |
| `handleScroll` / `handleScale` | boolean \| Options | true | Enable/disable scroll/zoom |
| `localization` | LocalizationOptions | — | Locale, date/price formatters |

**LayoutOptions:**
```typescript
layout: {
  background: { type: ColorType.Solid, color: 'transparent' },
  textColor: '#cbd5e1',
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  attributionLogo: false, // requires license
  panes: { enableResize: true, separatorColor: '#2B2B43' },
}
```

## IChartApi Methods

| Method | Description |
|--------|-------------|
| `addSeries(definition, options?, paneIndex?)` | Create series (see series-types.md) |
| `addCustomSeries(paneView, options?, paneIndex?)` | Create custom series |
| `removeSeries(series)` | Remove a series (irreversible) |
| `remove()` | Destroy chart and DOM elements |
| `resize(w, h, forceRepaint?)` | Set fixed dimensions |
| `timeScale()` | Get ITimeScaleApi |
| `priceScale(id, paneIndex?)` | Get IPriceScaleApi |
| `subscribeCrosshairMove(handler)` | Crosshair move events |
| `unsubscribeCrosshairMove(handler)` | Remove crosshair handler |
| `subscribeClick(handler)` / `subscribeDblClick(handler)` | Click events |
| `setCrosshairPosition(price, time, series)` | Programmatic crosshair |
| `clearCrosshairPosition()` | Clear crosshair |
| `takeScreenshot(addTopLayer?, includeCrosshair?)` | Returns HTMLCanvasElement |
| `addPane(preserveEmpty?)` | Add a new pane |
| `panes()` | Get all IPaneApi[] |
| `removePane(index)` | Remove pane |
| `swapPanes(first, second)` | Swap panes |
| `applyOptions(options)` | Update chart options |
| `options()` | Get current options |
| `chartElement()` | Get container HTMLDivElement |
