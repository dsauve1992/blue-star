import { useState, type FormEvent } from "react";
import { Button, Input, Label } from "src/global/design-system";
import type {
  NewClusterProposal,
  ProposalEdit,
} from "../api/potent-scan.client";

interface ProposalEditFormProps {
  proposal: NewClusterProposal;
  hitSymbols: string[];
  isPending: boolean;
  onAccept: (edit: ProposalEdit) => void;
  onCancel: () => void;
}

const SELECT_CLASS =
  "h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-50 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

export function ProposalEditForm({
  proposal,
  hitSymbols,
  isPending,
  onAccept,
  onCancel,
}: ProposalEditFormProps) {
  const [name, setName] = useState(proposal.name);
  const [description, setDescription] = useState(proposal.description);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState<string[]>([]);
  const [tickerToAdd, setTickerToAdd] = useState("");

  const memberTickers = proposal.members.map((member) => member.ticker);
  const addableTickers = hitSymbols.filter(
    (symbol) => !memberTickers.includes(symbol) && !added.includes(symbol),
  );
  const memberCount = memberTickers.length - removed.size + added.length;

  const toggleRemoved = (ticker: string) =>
    setRemoved((previous) => {
      const next = new Set(previous);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });

  const addTicker = () => {
    if (!tickerToAdd) return;
    setAdded((previous) => [...previous, tickerToAdd]);
    setTickerToAdd("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onAccept({
      name: name.trim() === proposal.name ? undefined : name.trim(),
      description:
        description.trim() === proposal.description
          ? undefined
          : description.trim(),
      addTickers: added,
      removeTickers: [...removed],
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-1">
          <Label htmlFor={`proposal-name-${proposal.id}`}>Name</Label>
          <Input
            id={`proposal-name-${proposal.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`proposal-description-${proposal.id}`}>
            Description
          </Label>
          <Input
            id={`proposal-description-${proposal.id}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="space-y-1">
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Members ({memberCount})
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {memberTickers.map((ticker) => (
            <label
              key={ticker}
              className="flex items-center gap-1.5 font-mono text-sm text-slate-900 dark:text-slate-100"
            >
              <input
                type="checkbox"
                checked={!removed.has(ticker)}
                onChange={() => toggleRemoved(ticker)}
              />
              <span
                className={removed.has(ticker) ? "line-through opacity-60" : ""}
              >
                {ticker}
              </span>
            </label>
          ))}
          {added.map((ticker) => (
            <span
              key={ticker}
              className="flex items-center gap-1 font-mono text-sm text-success-700 dark:text-success-400"
            >
              +{ticker}
              <button
                type="button"
                aria-label={`Don't add ${ticker}`}
                onClick={() =>
                  setAdded((previous) => previous.filter((t) => t !== ticker))
                }
                className="border-0 bg-transparent px-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </fieldset>

      {addableTickers.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            aria-label="Hit to add"
            value={tickerToAdd}
            onChange={(e) => setTickerToAdd(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Add a hit…</option>
            {addableTickers.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!tickerToAdd}
            onClick={addTicker}
          >
            Add
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || name.trim() === "" || memberCount === 0}
        >
          {isPending ? "Accepting…" : "Accept edited"}
        </Button>
      </div>
    </form>
  );
}
