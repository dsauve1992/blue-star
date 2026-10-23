import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { LogOut } from "lucide-react";
import { Button, Card, PageContainer } from "../design-system";

export default function Profile() {
  const { user, logout } = useKindeAuth();
  const name = [user?.givenName, user?.familyName].filter(Boolean).join(" ");

  return (
    <PageContainer fullWidth>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
        Profile
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Manage your account settings and preferences
      </p>
      <Card className="mt-6 max-w-xl p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <dl className="mt-4 grid grid-cols-[6rem_1fr] gap-y-3 text-sm">
          <dt className="text-slate-500 dark:text-slate-400">Name</dt>
          <dd>{name || "Not set"}</dd>
          <dt className="text-slate-500 dark:text-slate-400">Email</dt>
          <dd className="break-all">{user?.email ?? "Not set"}</dd>
        </dl>
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </Button>
      </Card>
    </PageContainer>
  );
}
