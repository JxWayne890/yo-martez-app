import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <div className="app-frame">
        <Sidebar />
        <main className="app-main custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
