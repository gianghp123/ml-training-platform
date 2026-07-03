import { UserSideBar } from "@/components/layouts/UserSideBar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children, breadcrumb }: { children: React.ReactNode; breadcrumb: React.ReactNode }) {
  return (
    <SidebarProvider>
      <UserSideBar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="my-auto mr-2 h-4" />
          {breadcrumb}
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider >
  )
}
