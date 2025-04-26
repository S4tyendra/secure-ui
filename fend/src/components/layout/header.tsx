import { Button } from "@/components/ui/button";
import { HelpCircle, LogOut, SidebarClose, SidebarOpen } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { ModeToggle } from "@/components/mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchCommand } from "@/components/search-command";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface HeaderProps {
  email: string;
  sessionExpiry: number;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  role: "admin" | "faculty" | "student" | "";
}

export default function Header({
  email,
  sessionExpiry,
  onToggleSidebar,
  isSidebarOpen,
  role,
}: HeaderProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "faculty") {
      navigate("/faculty");
    }
  };

  const handleLogout = async () => {
    try {
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (!confirmed) return;
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_URL}/auth/logout`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (response.ok) {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    } finally {
      navigate("/login");
      toast.success("Logged out!");
    }
  };

  useEffect(() => {
    if (sessionExpiry === 0) {
      const timer = setTimeout(() => {
        handleLogout();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionExpiry]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusColor = (seconds: number) => {
    const percentage = (seconds / 3600) * 100; // 60 minutes = 100%
    if (percentage > 58) return "bg-green-500"; // > 35 mins (58.3%)
    if (percentage > 25) return "bg-yellow-500"; // > 15 mins (25%)
    if (percentage > 8.3) return "bg-orange-500"; // > 5 mins (8.3%)
    return "bg-red-500"; // <= 5 mins
  };

  const getColor = (seconds: number) => {
    const percentage = (seconds / 3600) * 100;
    if (percentage > 58) return "green-500";
    if (percentage > 25) return "yellow-500";
    if (percentage > 8.3) return "orange-500";
    return "red-500";
  };

  const getGlowColor = (seconds: number) => {
    const percentage = (seconds / 3600) * 100;
    if (percentage > 58) return "shadow-green-500/50";
    if (percentage > 25) return "shadow-yellow-500/50";
    if (percentage > 8.3) return "shadow-orange-500/50";
    return "shadow-red-500/50";
  };

  const getRingColor = (seconds: number) => {
    const percentage = (seconds / 3600) * 100;
    if (percentage > 58) return "ring-green-300";
    if (percentage > 25) return "ring-yellow-300";
    if (percentage > 8.3) return "ring-orange-300";
    return "ring-red-300";
  };

  return (
    <header className="bg-background border-b p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {role === "admin" && (
          <Button variant="outline" onClick={onToggleSidebar}>
            {isSidebarOpen ? (
              <SidebarClose className="h-6 w-6" />
            ) : (
              <SidebarOpen className="h-6 w-6" />
            )}
          </Button>
        )}
        {imageLoading ? <Skeleton className="h-8 w-8" /> : null}
        <img
          src="/iiitkota.svg"
          alt="IIIT Kota"
          className={`h-8 w-8 cursor-pointer ${
            imageLoading ? "hidden" : "block"
          }`}
          onLoad={() => setImageLoading(false)}
          onClick={handleLogoClick}
        />
      </div>
      <div className="flex items-center space-x-4">
        {role === "admin" && <SearchCommand />}
        

        <div
          className="flex items-center gap-2"
          title={`Session expires in ${formatTime(sessionExpiry)}`}
          onClick={() => {
            toast.info("Session expires in " + formatTime(sessionExpiry), {
              duration: 3000,
              className: `${getStatusColor(sessionExpiry)} ${getRingColor(
                sessionExpiry
              )} ${getGlowColor(sessionExpiry)}`,
              classNames: {
                icon: `size-6 text-${getColor(sessionExpiry)}`,
                content: `text-${getColor(sessionExpiry)}`,
                title: `text-${getColor(sessionExpiry)}`,
                info: `text-${getColor(sessionExpiry)}`,
                default: `bg-${getColor(sessionExpiry)}`,
                toast: `bg-${getColor(sessionExpiry)}`,
                closeButton: `text-${getColor(
                  sessionExpiry
                )} hover:bg-${getColor(sessionExpiry)}`,
              },
            });
          }}
        >
          <AlertDialog>
          <AlertDialogTrigger>
            <Button
            variant="ghost"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Facing Issues or unsure about something?</AlertDialogTitle>
              <AlertDialogDescription>
                If you are facing any issues or have any questions, please drop an email to <a href="mailto:webmaster@iiitkota.ac.in" className="text-blue-500 hover:underline">webmaster@iiitkota.ac.in</a>. We are here to help you!
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild><Button asChild><a className="cursor-pointer" onClick={() => window.open("mailto:webmaster@iiitkota.ac.in")}>Send Mail</a></Button></AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          <div className="relative">
            <div
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getStatusColor(
                sessionExpiry
              )}
              ring-1 ${getRingColor(sessionExpiry)}
              shadow-[0_0_8px] ${getGlowColor(sessionExpiry)} animate-pulse`}
            />
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {email && email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
            {email && email.split("@")[0]}
          </span>
        </div>
        <ModeToggle />
        <Button
          variant="destructive"
          size="icon"
          className="rounded-2xl"
          onClick={handleLogout}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
