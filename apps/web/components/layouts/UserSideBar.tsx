"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ROUTES } from "@/lib/route"
import { Database, Workflow } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navigation = [
  {
    title: "Workflows",
    description: "Pipeline orchestration",
    url: ROUTES.WORKFLOW.LIST,
    icon: Workflow,
  },
  {
    title: "Datasets",
    description: "Training data assets",
    url: ROUTES.DATASET.LIST,
    icon: Database,
  },
] as const

export function UserSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
      {...props}
    >
      <SidebarHeader className="h-16 justify-center border-b border-sidebar-border px-3">
        <Link
          href={ROUTES.HOME}
          className="group flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[linear-gradient(145deg,#1d2735,#11161d)] shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_8px_24px_rgba(0,0,0,.28)]">
            <Workflow className="size-4 text-primary" />
            <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border-2 border-sidebar bg-success" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-sidebar-accent-foreground">
              ML Studio
            </span>
            <span className="block truncate font-mono text-[10px] text-sidebar-foreground/55">
              Training Platform
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1.5 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="h-7 px-2.5 font-mono text-[10px]">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.url || pathname.startsWith(`${item.url}/`)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      iconSize="md"
                      size="lg"
                      tooltip={item.title}
                      className="relative h-11 gap-3 rounded-lg px-2.5 text-sidebar-foreground transition-colors duration-150 before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary before:opacity-0 data-active:bg-sidebar-accent/80 data-active:text-sidebar-accent-foreground data-active:before:opacity-100 hover:bg-sidebar-accent/55"
                    >
                      <Link href={item.url}>
                        <Icon className="shrink-0" />
                        <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                          <span className="block truncate text-[13px] font-medium">
                            {item.title}
                          </span>
                          <span className="block truncate text-[10px] font-normal text-sidebar-foreground/50">
                            {item.description}
                          </span>
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/6 bg-white/2 px-2.5 py-2 group-data-[collapsible=icon]:hidden">
          <span className="font-mono text-[10px] text-sidebar-foreground/45">
            Toggle panel
          </span>
          <kbd className="rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[9px] text-sidebar-foreground/65">
            Ctrl B
          </kbd>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
