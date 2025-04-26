import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import Header from './header'
import Sidebar from './sidebar'
import { useWindowSize } from '@/hooks/use-window-size'
import { Toaster } from '../ui/sonner'


interface usrData {
  email: string;
  expires: string;
  role: 'admin' | 'faculty' | 'student' | '';
}
interface LayoutProps {
  usrData: usrData;
  children: React.ReactNode;
  
}

export default function Layout({ usrData, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()
  const [sessionExpiry, setSessionExpiry] = useState(0)
  const { width } = useWindowSize()
  const isMobile = width < 768 // md breakpoint

  // Close sidebar by default on mobile
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false)
    }
  }, [isMobile])

  useEffect(() => {
    const getExpiryFromCookie = () => {
      const expiryCookie = usrData.expires
      
      if (!expiryCookie) return 0
      
      try {
        const expiryDate = new Date(decodeURIComponent(expiryCookie))
        const now = new Date()
        const diffSeconds = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / 1000))
        return diffSeconds
      } catch (e) {
        
        return 0
      }
    }

    // Initial check with a small delay to ensure cookie is set
    const initialCheck = setTimeout(() => {
      setSessionExpiry(getExpiryFromCookie())
    }, 100)

    // Periodic check every second
    const timer = setInterval(() => {
      const currentExpiry = getExpiryFromCookie()
      setSessionExpiry(currentExpiry > 0 ? currentExpiry : 0)
    }, 1000)

    return () => {
      clearTimeout(initialCheck)
      clearInterval(timer)
    }
  }, [usrData.expires])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const isLoginPage = location.pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {usrData && usrData.role === 'admin' &&<AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Mobile overlay background */}
            {isMobile && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-30"
                onClick={toggleSidebar}
              />
            )}
            {/* Sidebar */}
            <motion.aside
              initial={isMobile ? { x: -280 } : { width: 0 }}
              animate={isMobile ? { x: 0 } : { width: 280 }}
              exit={isMobile ? { x: -280 } : { width: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={`${isMobile ? 'fixed left-0 top-0 bottom-0 w-[280px] z-40' : ''} bg-background border-r overflow-hidden`}
            >
              <Sidebar onClose={isMobile ? toggleSidebar : undefined} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          email={usrData.email}
          sessionExpiry={sessionExpiry}
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={isSidebarOpen}
          role={usrData.role}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          {location.pathname !== '/admin' && location.pathname !== '/faculty' && location.pathname !== '/student' && location.pathname !== '/cacs' && location.pathname !== '/techknow' && location.pathname !== '/sports' && (
            <Button
              variant="outline"
              className="mb-4 rounded-xl"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" closeButton richColors />
      
    </div>
  )
}

