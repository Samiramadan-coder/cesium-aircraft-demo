import PageSwitcher from "@/components/adminstration/page-switcher";
import AccessDenied from "@/components/auth/access-denied";
import { hasPermission } from "@/lib/auth/current-user";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Staff and alert recipients are for user managers only; the sidebar
  // hides the link, this covers typed URLs and bookmarks
  if (!(await hasPermission("manageUsers"))) return <AccessDenied />;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageSwitcher />
      {children}
    </div>
  );
}
