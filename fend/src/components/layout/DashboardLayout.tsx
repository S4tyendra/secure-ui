import React, { useContext } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle"; // Assuming this exists for theme switching
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { LogOut, Settings, FileText, HardDrive, Files } from 'lucide-react'; // Icons for nav
import { cn } from "@/lib/utils"; // For conditional classes

const SidebarNavLink = ({ to, icon: Icon, children }: { to: string, icon: React.ElementType, children: React.ReactNode }) => {
    const location = useLocation();
    const isActive = location.pathname.startsWith(to);

    return (
        <Link to={to}>
            <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                    "w-full justify-start",
                    isActive && "font-semibold"
                )}
            >
                <Icon className="mr-2 h-4 w-4" />
                {children}
            </Button>
        </Link>
    );
};


const DashboardLayout = () => {
    const auth = useContext(AuthContext) as AuthContextType;

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
             {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
                <div className="flex h-[60px] items-center border-b px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                         {/* Placeholder for Logo/Title */}
                         <HardDrive className="h-6 w-6 text-primary" />
                        <span className="">Secure UI</span>
                    </Link>
                </div>
                <nav className="flex flex-col justify-between flex-1 gap-4 p-4 overflow-auto">
                     {/* Main Navigation */}
                     <div className='space-y-1'>
                         <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">NGINX</p>
                         <SidebarNavLink to="/nginx/sites" icon={Files}>Sites</SidebarNavLink>
                         <SidebarNavLink to="/nginx/logs" icon={FileText}>Logs</SidebarNavLink>
                         <SidebarNavLink to="/nginx/conf" icon={Settings}>Configuration</SidebarNavLink>
                     </div>

                     {/* Footer Links/User Info */}
                    <div className="mt-auto space-y-2">
                         {/* Add other links like settings if needed */}
                         <Button variant="ghost" className="w-full justify-start" onClick={auth.logout}>
                              <LogOut className="mr-2 h-4 w-4" />
                              Logout ({auth.user?.username})
                         </Button>
                         <ModeToggle />
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64"> {/* Adjust padding-left */}
                <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                     {/* Mobile Menu Button (optional) */}
                     {/* Breadcrumbs or Title */}
                    <h1 className="text-xl font-semibold flex-1">Nginx Management</h1>
                     {/* User menu / Actions (optional) */}
                </header>
                <main className="flex-1 p-4 sm:px-6 sm:py-0">
                    {/* Outlet renders the matched child route component */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;