import { PageContainer } from "../design-system/page-container";

export default function Profile() {
  return (
    <PageContainer fullWidth>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
        Profile
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mt-1">
        Manage your account settings and preferences
      </p>
    </PageContainer>
  );
}
