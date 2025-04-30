"use client"

import * as React from "react"
import { AppSidebar } from "@/components/Layout/app-sidebar";
import { SiteHeader } from "@/components/Layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";



export default function Layout({ children }) {
    return (
        <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    )
}