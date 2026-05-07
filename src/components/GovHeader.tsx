import { Link } from "@tanstack/react-router";
import { Bell, Search, ShieldCheck, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function GovHeader() {
  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      {/* Top utility strip */}
      <div className="bg-[var(--gov-blue-deep)] text-white text-xs">
        <div className="flex items-center justify-between px-4 h-7">
          <div className="flex items-center gap-3">
            <span className="opacity-90">ಕರ್ನಾಟಕ ಸರ್ಕಾರ</span>
            <span className="opacity-60">|</span>
            <span className="opacity-90">Government of Karnataka</span>
          </div>
          <div className="flex items-center gap-4 opacity-90">
            <span>Skip to Main Content</span>
            <span>A- A A+</span>
            <span>English | ಕನ್ನಡ</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="flex items-center gap-4 px-4 h-16">
        <SidebarTrigger className="md:hidden" />
        <Link to="/" className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-[var(--gov-blue)] text-white grid place-items-center font-serif text-xl shadow-sm ring-2 ring-[var(--sandal)]">
            ⚖
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Department of Personnel & Administrative Reforms
            </div>
            <div className="font-serif text-xl text-[var(--gov-blue-deep)] font-semibold">
              JusticeTrack <span className="text-[var(--gov-red)]">·</span>{" "}
              <span className="text-sm text-muted-foreground font-sans font-medium">
                Court Case Monitoring System
              </span>
            </div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-2 ml-8 flex-1 max-w-xl">
          <div className="flex items-center gap-2 w-full bg-muted/60 border border-border rounded px-3 h-9">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search by case number, party, department or directive…"
              className="bg-transparent outline-none text-sm flex-1"
            />
            <kbd className="text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
              CTRL+K
            </kbd>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck className="h-4 w-4" />
            <span>Secure · NIC Cloud · GIGW Compliant</span>
          </div>
          <button className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-muted">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--gov-red)]" />
          </button>
          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="h-9 w-9 rounded-full bg-[var(--gov-blue)] text-white grid place-items-center text-xs font-semibold">
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
