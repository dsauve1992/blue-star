import type { ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, CircleDashed, Minus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LoadingSpinner } from "src/global/design-system";
import type {
  AiDimensionScoreApiDto,
  AiFinancialRatingApiDto,
  CanslimCriterionApiDto,
  CanslimGrade,
  CanslimRatingApiDto,
} from "src/fundamental/api/fundamental.client";
import {
  isNoFinancialDataError,
  useAiFinancialRating,
} from "src/fundamental/hooks/use-ai-financial-rating";

const GRADES: CanslimGrade[] = ["A", "B", "C", "D", "F"];

const GRADE_TEXT_COLOR: Record<CanslimGrade, string> = {
  A: "text-green-400",
  B: "text-lime-400",
  C: "text-amber-400",
  D: "text-orange-400",
  F: "text-red-400",
};

const GRADE_BAR_COLOR: Record<CanslimGrade, string> = {
  A: "bg-green-400",
  B: "bg-lime-400",
  C: "bg-amber-400",
  D: "bg-orange-400",
  F: "bg-red-400",
};

const STATUS_STYLE: Record<
  CanslimCriterionApiDto["status"],
  { Icon: LucideIcon; className: string }
> = {
  pass: { Icon: Check, className: "text-green-400" },
  partial: { Icon: CircleDashed, className: "text-amber-400" },
  fail: { Icon: X, className: "text-red-400" },
  unscored: { Icon: Minus, className: "text-slate-400" },
};

export function CanslimRatingBadge({
  symbol,
  rating,
}: {
  symbol: string;
  rating: CanslimRatingApiDto | null;
}) {
  const jev = useAiFinancialRating(symbol);
  const jevRating = jev.data?.rating ?? null;
  const jevHasNoData = isNoFinancialDataError(jev.error);

  return (
    <Popover.Root>
      <Popover.Trigger className="group inline-flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-800/60 px-2.5 py-0.5 text-xs tabular-nums hover:border-slate-500 hover:bg-slate-700/50 data-[state=open]:border-slate-500 data-[state=open]:bg-slate-700/50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          CANSLIM
        </span>
        <TriggerItem label="Rules">
          <GradeLetter grade={rating?.grade ?? null} />
        </TriggerItem>
        <TriggerItem label="Jev">
          {jev.isLoading ? (
            <LoadingSpinner
              size="sm"
              variant="muted"
              className="h-3 w-3 self-center"
            />
          ) : jevRating ? (
            <>
              <GradeLetter grade={jevRating.grade} />
              <span className="text-slate-400">
                {Math.round(jevRating.gradeConfidence * 100)}%
              </span>
            </>
          ) : jevHasNoData ? (
            <GradeLetter grade={null} />
          ) : (
            <span className="text-slate-400" title="Jev rating unavailable">
              –
            </span>
          )}
        </TriggerItem>
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-300 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[26rem] max-w-[calc(100vw-24px)] rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-[0_8px_24px_rgba(2,6,23,0.55)] focus-visible:outline-none"
        >
          <RulesDetail rating={rating} />
          <div className="my-3 border-t border-slate-700/70" />
          {jev.isLoading ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner />
              <Muted>Asking Jev…</Muted>
            </div>
          ) : jevRating ? (
            <JevDetail rating={jevRating} />
          ) : jevHasNoData ? (
            <Muted>Jev · no financial data to rate</Muted>
          ) : (
            <Muted>Jev rating unavailable — try again later</Muted>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TriggerItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-slate-300">{label}</span>
      {children}
    </span>
  );
}

function RulesDetail({ rating }: { rating: CanslimRatingApiDto | null }) {
  if (!rating) return <Muted>No rules rating</Muted>;
  return (
    <section>
      <DetailHeading
        title="Rules"
        grade={rating.grade}
        note={
          rating.scorePercent === null
            ? "not enough data"
            : `${rating.scorePercent}% of scored rules`
        }
      />
      <ul className="space-y-1 text-[11px]">
        {rating.criteria.map((criterion) => {
          const { Icon, className } = STATUS_STYLE[criterion.status];
          return (
            <li key={criterion.key} className="flex items-start gap-1.5">
              <Icon className={`mt-px w-3 h-3 shrink-0 ${className}`} />
              <span className="shrink-0 text-slate-300">{criterion.label}</span>
              <span className="text-slate-400">{criterion.detail}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function JevDetail({ rating }: { rating: AiFinancialRatingApiDto }) {
  return (
    <section>
      <DetailHeading
        title="Jev"
        grade={rating.grade}
        note={`${Math.round(rating.gradeConfidence * 100)}% confidence · ${rating.model}`}
      />
      <GradeDistribution probabilities={rating.gradeProbabilities} />
      <ul className="mt-2 space-y-1 text-[11px]">
        <DimensionRow label="C" score={rating.currentEarnings} />
        <DimensionRow label="A" score={rating.annualEarnings} />
      </ul>
    </section>
  );
}

function DetailHeading({
  title,
  grade,
  note,
}: {
  title: string;
  grade: CanslimGrade | null;
  note: string;
}) {
  return (
    <h3 className="mb-2 flex items-baseline gap-2">
      <span className="text-xs font-semibold text-slate-300">{title}</span>
      <span
        className={`text-lg font-bold leading-none ${grade ? GRADE_TEXT_COLOR[grade] : "text-slate-400"}`}
      >
        {grade ?? "N/A"}
      </span>
      <span className="text-[10px] text-slate-400">{note}</span>
    </h3>
  );
}

function GradeDistribution({
  probabilities,
}: {
  probabilities: Record<CanslimGrade, number>;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-slate-700">
        {GRADES.map((grade) => (
          <div
            key={grade}
            className={GRADE_BAR_COLOR[grade]}
            style={{ width: `${(probabilities[grade] ?? 0) * 100}%` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums">
        {GRADES.filter((grade) => (probabilities[grade] ?? 0) >= 0.05)
          .map(
            (grade) =>
              `${grade} ${Math.round((probabilities[grade] ?? 0) * 100)}%`,
          )
          .join(" · ")}
      </span>
    </div>
  );
}

function DimensionRow({
  label,
  score,
}: {
  label: string;
  score: AiDimensionScoreApiDto;
}) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="w-3 shrink-0 font-semibold text-slate-300">{label}</span>
      <span className="shrink-0 text-slate-300 tabular-nums">
        {score.scorePercent}%
      </span>
      <span className="text-slate-400">{score.label}</span>
    </li>
  );
}

function GradeLetter({ grade }: { grade: CanslimGrade | null }) {
  return (
    <span
      className={`font-bold ${grade ? GRADE_TEXT_COLOR[grade] : "text-slate-400"}`}
    >
      {grade ?? "N/A"}
    </span>
  );
}

function Muted({ children }: { children: string }) {
  return <span className="text-xs text-slate-400">{children}</span>;
}
