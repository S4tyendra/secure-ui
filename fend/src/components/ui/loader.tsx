import * as React from "react"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"

const Loader = React.forwardRef<HTMLElement, React.ComponentProps<"div">>(
  ({ className }) => {
    return (
        <div className={
            cn("container mx-auto px-4 py-8", className)
            
        }><motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
      </motion.div></div>
    )
  }
)

export { Loader }
