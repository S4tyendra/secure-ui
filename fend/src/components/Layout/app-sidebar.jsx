"use client"

import * as React from "react"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  CodeIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import { NavDocuments } from "@/components/Layout/nav-documents"
import { NavMain } from "@/components/Layout/nav-main"
import { NavSecondary } from "@/components/Layout/nav-secondary"
import { NavUser } from "@/components/Layout/nav-user"
import { ThemeToggle } from "@/components/ThemeToggle" // Import ThemeToggle
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Analytics",
      url: "#",
      icon: BarChartIcon,
    },
  ],
  nginx: [
    {
      name: "Sites",
      icon: CodeIcon,
      url: "/dashboard/nginx/sites",
    },
    {
      name: "Config",
      icon: FileTextIcon,
      url: "/dashboard/nginx/config",
    },
    {
      name: "Logs",
      icon: FolderIcon,
      url: "/dashboard/nginx/logs",
    },
    {
      name: "Actions",
      icon: ArrowUpCircleIcon,
      url: "/dashboard/nginx/actions",
    }
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: DatabaseIcon,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardListIcon,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: FileIcon,
    },
  ],
}

export function AppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.nginx} title={"Nginx"} />
        {/* <NavDocuments items={data.documents} title={"Documents"} /> */}
        <SidebarMenuItem className="mt-auto">
        </SidebarMenuItem>
        <NavSecondary items={data.navSecondary} />
      </SidebarContent>
      <ThemeToggle />
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
