import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { GovHeader } from "@/components/GovHeader";

export function GovLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <GovHeader />
          <main className="flex-1 ashoka-watermark">{children}</main>
          <footer className="bg-[var(--gov-blue-deep)] text-white/80 text-xs">
            <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                © {new Date().getFullYear()} Government of Karnataka · Department of
                Personnel & Administrative Reforms (e-Gov)
              </div>
              <div className="flex items-center gap-4">
                <span>Hosted on NIC Cloud</span>
                <span>·</span>
                <span>WCAG 2.1 AA</span>
                <span>·</span>
                <span>GIGW 3.0 Certified</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
