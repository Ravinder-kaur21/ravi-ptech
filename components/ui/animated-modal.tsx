"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const ModalContext = React.createContext<ModalContextType | undefined>(undefined)

export const ModalProvider = ({
  children,
  open: controlledOpen,
  setOpen: setControlledOpen,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen

  return (
    <ModalContext.Provider value={{ open, setOpen }}>
      {children}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = React.useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}

export const Modal = ({
  children,
  open,
  setOpen,
}: {
  children: React.ReactNode
  open?: boolean
  setOpen?: (open: boolean) => void
}) => {
  return (
    <ModalProvider open={open} setOpen={setOpen}>
      {children}
    </ModalProvider>
  )
}

export const ModalTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { setOpen } = useModal()
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn("inline-flex cursor-pointer", className)}
      onClick={() => setOpen(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setOpen(true)
        }
      }}
    >
      {children}
    </div>
  )
}

export const ModalBody = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  const { open, setOpen } = useModal()

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [open])

  const modalRef = React.useRef<HTMLDivElement>(null)

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 h-full w-full bg-black/60 z-40"
          />

          {/* Modal spring pop-up container */}
          <motion.div
            ref={modalRef}
            initial={{
              opacity: 0,
              scale: 0.85,
              rotateX: 15,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              rotateX: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.85,
              rotateX: 15,
              y: 20,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
            }}
            className={cn(
              "relative z-50 w-full bg-[#fdfbf7] dark:bg-zinc-950 border border-[#d1ccc5] dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]",
              className || "max-w-xl"
            )}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-5 right-5 z-20 size-8 rounded-full bg-[#eee9df] dark:bg-zinc-800 text-[#16181d] dark:text-zinc-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xs cursor-pointer"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const ModalContent = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={cn("flex flex-col flex-1 p-6 md:p-8 overflow-y-auto", className)}>
      {children}
    </div>
  )
}

export const ModalFooter = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-5 md:px-8 border-t border-[#e4ddd3] dark:border-zinc-800 bg-[#f7f3ec] dark:bg-zinc-900/60 mt-auto",
        className
      )}
    >
      {children}
    </div>
  )
}
