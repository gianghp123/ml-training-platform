import { UserSideBar } from "@/components/layouts/UserSideBar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children, breadcrumb }: { children: React.ReactNode; breadcrumb: React.ReactNode }) {
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "14.5rem",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <UserSideBar />
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-white/7 bg-background/86 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground" />
          <Separator orientation="vertical" className="my-auto mr-2 h-4 bg-white/8" />
          {breadcrumb}
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-md border border-white/7 bg-white/2 px-2 py-1 font-mono text-[9px] tracking-[0.08em] text-muted-foreground uppercase sm:block">
              ML Operations
            </span>
          </div>
        </header>
        <main className="min-h-[calc(100svh-3.25rem)]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
