"use client"

import React from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

interface TabTransitionProps {
  tabKey: string | number
  children: React.ReactNode
  className?: string
  mode?: "popLayout" | "sync" | "wait"
}

export function TabTransition({
  tabKey,
  children,
  className = "",
  mode = "popLayout",
}: TabTransitionProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode={mode} initial={false}>
      <motion.div
        key={tabKey}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{
          duration: shouldReduceMotion ? 0.1 : 0.2,
          ease: [0.22, 1, 0.36, 1],
        }}
        className={`w-full will-change-[transform,opacity] ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
