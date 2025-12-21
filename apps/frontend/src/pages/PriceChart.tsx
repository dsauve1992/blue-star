import { useHistoricalData } from "../position/hooks/use-market-data";
import { CandlestickChart } from "../global/components/CandlestickChart";
import { PageContainer } from "../global/design-system/page-container";
import { LoadingSpinner } from "../global/design-system/loading-spinner";

const SYMBOL = "CIEN";
const DAYS_BACK = 90;

function PriceChart() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_BACK);

  const { data, isLoading, error } = useHistoricalData(
    SYMBOL,
    startDate.toISOString().split("T")[0],
    endDate.toISOString().split("T")[0],
  );

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <p className="text-red-500">
            Error loading chart data: {error.message}
          </p>
        </div>
      </PageContainer>
    );
  }

  if (!data?.historicalData?.pricePoints) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96">
          <p>No data available</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Price Chart</h1>
          <p className="text-muted-foreground">
            {SYMBOL} - Last {DAYS_BACK} days
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <CandlestickChart
            data={data.historicalData.pricePoints}
            symbol={data.historicalData.symbol}
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default PriceChart;
