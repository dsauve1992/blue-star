import { Badge, cn } from "../../global/design-system";
import type { TradingCampaign } from "../api/brokerage.client";
import {
  formatDate,
  formatMoney,
  formatPrice,
  formatR,
  signColor,
} from "./format";

interface CampaignTableProps {
  campaigns: TradingCampaign[];
}

const STOP_SOURCE_LABEL = {
  STOP_FILL: "stop fill",
  WORKING_STOP: "current stop",
} as const;

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Ticker</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Opened</th>
            <th className="px-3 py-2">Closed</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Entry</th>
            <th className="px-3 py-2 text-right">Exit</th>
            <th className="px-3 py-2 text-right">Stop</th>
            <th className="px-3 py-2 text-right">Risk (1R)</th>
            <th className="px-3 py-2 text-right">P&amp;L</th>
            <th className="px-3 py-2 text-right">R</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {campaigns.map((campaign) => (
            <tr
              key={`${campaign.instrumentId}-${campaign.status}-${campaign.openedAt ?? ""}`}
              className="text-slate-900 dark:text-slate-100"
            >
              <td className="px-3 py-2 font-semibold">
                {campaign.ticker}
                {campaign.direction === "SHORT" && (
                  <span className="ml-1 text-xs text-slate-500">short</span>
                )}
              </td>
              <td className="px-3 py-2">
                <Badge
                  variant={campaign.status === "OPEN" ? "default" : "secondary"}
                >
                  {campaign.status === "OPEN" ? "Open" : "Closed"}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {campaign.openedAt
                  ? formatDate(campaign.openedAt)
                  : "before window"}
              </td>
              <td className="px-3 py-2">{formatDate(campaign.closedAt)}</td>
              <td className="px-3 py-2 text-right font-mono">
                {campaign.quantity}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {formatPrice(campaign.averageEntryPrice)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {formatPrice(campaign.averageExitPrice)}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {formatPrice(campaign.stopPrice)}
                {campaign.stopSource && (
                  <span className="block text-[10px] font-sans text-slate-500 dark:text-slate-400">
                    {STOP_SOURCE_LABEL[campaign.stopSource]}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono">
                {formatMoney(campaign.initialRisk)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-mono",
                  signColor(campaign.pnl),
                )}
              >
                {formatMoney(campaign.pnl)}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-mono font-semibold",
                  signColor(campaign.rMultiple),
                )}
              >
                {formatR(campaign.rMultiple)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
