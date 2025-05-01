"use client"

import { MailIcon, PlusCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useRouter } from "next/router";
import Link from "next/link";


export function NavMain({
  items,
}) {
  const router = useRouter();
  const { pathname } = router;
  console.log("Pathname:", pathname);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-4">
        {/* Logo and brand section */}
        <SidebarMenu>
          <SidebarMenuItem className="mb-2">
            <div 
              className="flex items-center gap-3 text-sm font-semibold p-3 rounded-md hover:bg-accent/50 bg-primary/30 transition-colors"
              onClick={() => router.push("/dashboard")}
              style={{ color: "var(--sidebar-text-color)" }}
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
                <PlusCircleIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-base">Secure UI</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Navigation items */}
        <SidebarMenu className="px-2">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Navigation</div>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title} 
                isActive={pathname.split('/').pop() === (item.title).toLowerCase().replaceAll(" ","-").replaceAll("_","-")} 
                asChild
              >
                <Link href={item.url} className="flex items-center gap-3">
                  {item.icon ? <item.icon className="h-5 w-5" /> : <MailIcon className="h-5 w-5" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
