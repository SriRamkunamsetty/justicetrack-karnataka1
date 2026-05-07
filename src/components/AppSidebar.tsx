import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  ShieldCheck,
  ListChecks,
  FolderOpen,
  ScrollText,
  Users,
  Settings,
  HelpCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const main = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Judgment", icon: Upload },
  { to: "/verification", label: "Verification Workspace", icon: ShieldCheck, badge: "4" },
  { to: "/action-plans", label: "Action Plans", icon: ListChecks, badge: "12" },
  { to: "/cases", label: "Case Repository", icon: FolderOpen },
  { to: "/audit", label: "Audit Logs", icon: ScrollText },
];

const admin = [
  { to: "/users", label: "Users & Roles", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help & Manual", icon: HelpCircle },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="px-3 pt-4 pb-3 border-b border-sidebar-border">
          <div className="text-[10px] tracking-[0.16em] uppercase text-sidebar-foreground/60">
            Government of Karnataka
          </div>
          <div className="font-serif text-base text-sidebar-foreground font-semibold mt-0.5">
            JusticeTrack CCMS
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={active(item.to)}
                    className="data-[active=true]:bg-[var(--gov-red)] data-[active=true]:text-white hover:bg-sidebar-accent"
                  >
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-semibold bg-[var(--gov-red)] text-white rounded-full px-1.5 py-0.5">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {admin.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={active(item.to)} className="hover:bg-sidebar-accent">
                    <Link to={item.to} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar text-sidebar-foreground/70 text-[10px] px-3 py-3 border-t border-sidebar-border">
        <div>v 2.4.1 · Build 20250428</div>
        <div>© NIC Karnataka · Last sync 09:42</div>
      </SidebarFooter>
    </Sidebar>
  );
}
