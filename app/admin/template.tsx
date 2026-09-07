"use client"

import React from "react"
import { motion, useReducedMotion } from "framer-motion"

export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.22,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex flex-col flex-1 w-full will-change-[transform,opacity]"
    >
      {children}
    </motion.div>
  )
}
