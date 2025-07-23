import { AppSidebar } from "@/components/AppSidebar";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Navbar />
          <div className="p-2">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
