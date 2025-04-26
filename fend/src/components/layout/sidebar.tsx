import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronDown, SidebarClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import categories from '@/lib/paths'

const sidebarData = categories;

interface SidebarItemProps {
  item: {
    title: string;
    items: {
      title: string;
      href: string;
      buttonText: string;
    }[];
  };
  isOpen: boolean;
  toggleOpen: () => void;
}

const SidebarItem = ({ item, isOpen, toggleOpen }: SidebarItemProps) => {
  const location = useLocation();

  return (
    <div className="mb-2">
      <Button
  variant="ghost"
  className="w-full justify-between rounded-2xl"
  onClick={toggleOpen}
>
  <span className="truncate">
    {item.title}
  </span>
  <ChevronDown
    className={cn("h-4 w-4 shrink-0 transition-transform duration-200", {
      "transform rotate-180": isOpen,
    })}
  />
</Button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0 }}
        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
        className="overflow-hidden"
      >
        {item.items.map((subItem, index) => (
          <Link to={subItem.href} key={index}>
            <Button
              variant="ghost"
              className={cn("w-full justify-start rounded-2xl ml-4 mt-1", {
                "bg-accent": location.pathname === subItem.href,
              })}
            >
              {subItem.buttonText}
            </Button>
          </Link>
        ))}
      </motion.div>
    </div>
  );
};

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [openSections, setOpenSections] = useState<number[]>([]);

  const toggleSection = (index: number) => {
    setOpenSections((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      {onClose && (
        <Button
          variant="outline"
          onClick={onClose}
          className=" mb-4"
          size="icon"
        >
          <SidebarClose />
        </Button>
      )}
      {sidebarData.map((section, index) => (
        <SidebarItem
          key={index}
          item={section}
          isOpen={openSections.includes(index)}
          toggleOpen={() => toggleSection(index)}
        />
      ))}
    </div>
  );
}
