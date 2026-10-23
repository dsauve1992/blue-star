import { Moon, Sun } from "lucide-react";
import { Button, Card, PageContainer, useTheme } from "../design-system";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <PageContainer fullWidth>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
        Settings
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Configure your application preferences
      </p>
      <Card className="mt-6 max-w-xl p-6">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="text-sm">
            <p>Theme</p>
            <p className="text-slate-500 dark:text-slate-400">
              Currently {isLight ? "light" : "dark"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {isLight ? (
              <Moon className="w-4 h-4 mr-2" />
            ) : (
              <Sun className="w-4 h-4 mr-2" />
            )}
            Switch to {isLight ? "dark" : "light"}
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
