import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar"
import { FileText, Workflow } from "lucide-react"
import Link from "next/link"

import { ROUTES } from "@/lib/route"

const data = {
  versions: ["1.0.1", "1.1.0-alpha", "2.0.0-beta1"],
  navMain: [
    {
      title: "Workflows",
      url: ROUTES.WORKFLOW.LIST,
      icon: Workflow
    },
    {
      title: "Datasets",
      url: ROUTES.DATASET.LIST,
      icon: FileText
    },
  ],
}

export function UserSideBar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {data.navMain.map((item) => {
            const Icon = item.icon
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={false} iconSize="md">
                  <div className="flex gap-4">
                    {<Icon />}
                    <Link href={item.url} className="text-[16px]">{item.title}</Link>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar >
  )
}
