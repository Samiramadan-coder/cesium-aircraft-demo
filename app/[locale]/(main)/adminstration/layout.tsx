import PageSwitcher from "@/components/adminstration/page-switcher";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageSwitcher />
      {children}
    </div>
  );
}
