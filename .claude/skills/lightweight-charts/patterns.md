# Common Patterns

## Volume on Secondary Scale
```typescript
const volume = chart.addSeries(HistogramSeries, {
  priceFormat: { type: 'volume' },
  priceScaleId: 'volume',
});
chart.priceScale('volume').applyOptions({
  scaleMargins: { top: 0.8, bottom: 0 },
});
```

## Synced Crosshairs (Multi-Chart)
```typescript
chart1.subscribeCrosshairMove((param) => {
  if (param.time) {
    const data = param.seriesData.get(series1);
    if (data) chart2.setCrosshairPosition(data.value, param.time, series2);
  } else {
    chart2.clearCrosshairPosition();
  }
});
```

## Load More on Scroll Left
```typescript
chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
  if (range && range.from < 10) {
    loadMoreData();
  }
});
```

## Multi-Pane Layout (e.g., Price + RS Indicator)
```typescript
const chart = createChart(container, { autoSize: true });
// Main pane (index 0) — candles
const candles = chart.addSeries(CandlestickSeries, {}, 0);
// Sub-pane (index 1) — indicator
const rsLine = chart.addSeries(LineSeries, { color: '#22c55e' }, 1);
// Set relative heights
chart.panes()[0].setStretchFactor(3);
chart.panes()[1].setStretchFactor(1);
```

## PNG Export
```typescript
const canvas = chart.takeScreenshot();
const link = document.createElement('a');
link.href = canvas.toDataURL('image/png');
link.download = `chart-${ticker}.png`;
link.click();
```

## Cleanup in React
```typescript
useEffect(() => {
  const chart = createChart(containerRef.current!, options);
  // ... setup series, subscriptions
  return () => chart.remove(); // cleanup on unmount
}, []);
```
