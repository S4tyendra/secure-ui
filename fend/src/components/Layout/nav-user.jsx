"use client"

import {
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  UserCircleIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import * as React from "react"; // Import React
import Link from "next/link"; // Import Link from next/link
import useApi from "@/hooks/useApi"; // Import useApi hook
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

export function NavUser() { // Remove user prop
  const { isMobile } = useSidebar()
  const { request, loading, error } = useApi(); // Use the hook
  const [userData, setUserData] = React.useState(null); // State for user data

  // Fetch user data on mount
  React.useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await request('/auth/users/me');
        setUserData(data);
      } catch (err) {
        // Error is already handled by useApi hook and potentially shown elsewhere
        console.error("Failed to fetch user data for nav:", err);
        setUserData(null); // Set to null on error
      }
    };
    fetchUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]); // request function is stable

  // Display loading state
  if (loading) { // Only check loading state here
     return (
       <SidebarMenu>
         <SidebarMenuItem>
           <SidebarMenuButton size="lg" className="cursor-wait">
             <Skeleton className="h-8 w-8 rounded-lg" />
             <div className="grid flex-1 text-left text-sm leading-tight ml-2">
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-3 w-24 mt-1" />
             </div>
           </SidebarMenuButton>
         </SidebarMenuItem>
       </SidebarMenu>
     );
  }

   // Handle error state
   if (error) {
     console.error("Error rendering NavUser:", error); // Log the actual error
     return (
        <SidebarMenu>
         <SidebarMenuItem>
           <SidebarMenuButton size="lg" disabled>
             <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarFallback className="rounded-lg">!</AvatarFallback>
             </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                <span className="truncate font-medium">Error</span>
                 <span className="truncate text-xs text-muted-foreground">
                   Could not load user
                 </span>
              </div>
           </SidebarMenuButton>
         </SidebarMenuItem>
       </SidebarMenu>
     )
   }

  // Handle case where loading is finished, no error, but still no data
  if (!userData) {
      // Could be initial state before loading starts or actual null data after fetch
      // Let's show a minimal loading state or null
       return (
         <SidebarMenu>
           <SidebarMenuItem>
             <SidebarMenuButton size="lg" className="cursor-wait">
               <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                 <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
             </SidebarMenuButton>
           </SidebarMenuItem>
         </SidebarMenu>
       );
   }

  // Display user data once loaded
  const name = userData.username || "User"; // Use username
  const email = userData.email || "No email";
  const fallbackInitial = name ? name.charAt(0).toUpperCase() : "?";
  // Using a static image for now as avatar isn't in the API response
  const avatarUrl = "https://cdn.iiitkota.ac.in/site/iiitkota.png";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* Corrected Avatar structure */}
              <Avatar className="h-8 w-8 rounded-lg">
                 <AvatarImage src={avatarUrl} alt={name} />
                 <AvatarFallback className="rounded-lg">{fallbackInitial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight ml-2"> {/* Added ml-2 for spacing */}
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {email}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                   <AvatarImage src={avatarUrl} alt={name} />
                   <AvatarFallback className="rounded-lg">{fallbackInitial}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* Wrap Account menu item with Link */}
              
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/account" className="cursor-pointer">
                      <UserCircleIcon className="mr-2 h-4 w-4" /> 
                      Account
                    </Link>
                  </DropdownMenuItem>
              <DropdownMenuItem disabled> {/* Disabled placeholder */}
                <CreditCardIcon className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem disabled> {/* Disabled placeholder */}
                <BellIcon className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOutIcon className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
