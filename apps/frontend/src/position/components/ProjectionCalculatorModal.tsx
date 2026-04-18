import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { ProjectionCalculatorPanel } from "src/position/components/ProjectionCalculatorPanel";
import type { ProjectionInputsSnapshot } from "src/position/lib/projection-calculator-initial";

export type ProjectionCalculatorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSnapshot: ProjectionInputsSnapshot;
  /** Bump when opening so the panel remounts with fresh state from `initialSnapshot`. */
  instanceKey: number;
};

export function ProjectionCalculatorModal({
  open,
  onOpenChange,
  initialSnapshot,
  instanceKey,
}: ProjectionCalculatorModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(92vh,960px)] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-6 lg:max-w-6xl">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Projection calculator
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Win rate, R:R, and trades/year start from your current book stats;
                adjust sliders to stress-test a scenario.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>
          <div className="pt-4">
            <ProjectionCalculatorPanel
              key={instanceKey}
              initialSnapshot={initialSnapshot}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
