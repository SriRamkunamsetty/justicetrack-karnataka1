import { Link } from "@tanstack/react-router";
import { Bell, Search, ShieldCheck, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function GovHeader() {
  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      {/* Top utility strip */}
      <div className="bg-[var(--gov-blue-deep)] text-white text-xs">
        <div className="flex items-center justify-between px-6 h-8">
          <div className="flex items-center gap-4">
            <span className="opacity-90">ಕರ್ನಾಟಕ ಸರ್ಕಾರ</span>
            <span className="opacity-50">|</span>
            <span className="opacity-90">Government of Karnataka</span>
          </div>
          <div className="flex items-center gap-5 opacity-90">
            <span className="hover:underline cursor-pointer">Skip to Main Content</span>
            <span className="border-l border-white/20 pl-5">A- A A+</span>
            <span className="border-l border-white/20 pl-5">English | ಕನ್ನಡ</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="flex items-center gap-6 px-8 h-[84px]">
        <SidebarTrigger className="md:hidden" />
        <Link to="/" className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[var(--gov-blue)] to-[var(--gov-blue-deep)] text-white grid place-items-center font-serif text-2xl shadow-md ring-2 ring-[var(--sandal)]">
            ⚖
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Department of Personnel & Administrative Reforms
            </div>
            <div className="font-serif text-[22px] text-[var(--gov-blue-deep)] font-semibold mt-0.5">
              JusticeTrack <span className="text-[var(--gov-red)] mx-0.5">·</span>{" "}
              <span className="text-sm text-muted-foreground font-sans font-medium">
                Court Case Monitoring System
              </span>
            </div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-2 ml-10 flex-1 max-w-2xl">
          <div className="flex items-center gap-2.5 w-full bg-muted/60 border border-border rounded-md px-4 h-10 focus-within:ring-2 focus-within:ring-[var(--gov-blue)]/30 transition">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search by case number, party, department or directive…"
              className="bg-transparent outline-none text-sm flex-1"
            />
            <kbd className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded bg-background">
              CTRL+K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-5">
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-success border border-success/30 bg-success/5 rounded-md px-2.5 h-8">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-semibold">Secure · NIC Cloud · GIGW 3.0</span>
          </div>
          <button className="relative h-10 w-10 grid place-items-center rounded-full hover:bg-muted transition" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--gov-red)] ring-2 ring-card" />
          </button>
          <div className="flex items-center gap-3 pl-5 border-l border-border">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--gov-blue)] to-[var(--gov-blue-deep)] text-white grid place-items-center text-xs font-semibold shadow-sm">
              MG
            </div>
            <div className="hidden md:block leading-tight text-right">
              <div className="text-sm font-semibold">Mahesh Gowda</div>
              <div className="text-[11px] text-muted-foreground">
                Legal Officer · Revenue Dept.
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="gov-stripe" />
    </header>
  );
}
