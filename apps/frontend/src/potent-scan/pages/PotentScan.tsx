import { useState } from "react";
import { PageContainer, cn } from "src/global/design-system";
import { ScanTab } from "../components/ScanTab";

const TABS = [
  { id: "scan", label: "Scan" },
  { id: "clusters", label: "Clusters" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PotentScan() {
  const [activeTab, setActiveTab] = useState<TabId>("scan");

  return (
    <PageContainer fullWidth className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">
        Potent
      </h1>
      <div
        role="tablist"
        className="flex gap-1 border-b border-slate-200 dark:border-slate-700"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "-mb-px rounded-none border-0 border-b-2 bg-transparent px-4 py-2 text-sm font-medium transition-colors duration-150",
              activeTab === tab.id
                ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {activeTab === "scan" ? (
          <ScanTab />
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Cluster tracking is coming next.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
