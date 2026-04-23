import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0a] p-2 sm:p-6 lg:p-8 items-center justify-center font-sans">
      <div className="flex w-full max-w-[1800px] h-[95vh] bg-[#111115]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {/* Ambient background glows inside the app */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        </div>
        
        <Sidebar />
        
        <main className="flex-1 p-8 sm:p-10 overflow-auto z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
