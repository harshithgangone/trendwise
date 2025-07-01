"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataSourceStatus {
  isRealData: boolean
  source: string
  lastUpdate: string
  articlesCount: number
}

export function DataSourceNotification() {
  const [status, setStatus] = useState<DataSourceStatus | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const checkDataSource = async () => {
      try {
        const response = await fetch("/api/admin/data-source-status")
        if (response.ok) {
          const data = await response.json()
          setStatus(data)

          // Show notification if using real data and not dismissed
          if (data.isRealData && !isDismissed) {
            setIsVisible(true)
            // Auto-hide after 8 seconds
            setTimeout(() => {
              setIsVisible(false)
            }, 8000)
          }
        }
      } catch (error) {
        console.error("Failed to check data source status:", error)
      }
    }

    checkDataSource()

    // Check every 5 minutes
    const interval = setInterval(checkDataSource, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isDismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
  }

  if (!status) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <div
            className={`rounded-lg shadow-lg border p-4 ${
              status.isRealData
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-yellow-50 border-yellow-200 text-yellow-800"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                {status.isRealData ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <div>
                  <h4 className="font-semibold text-sm">
                    {status.isRealData ? "Live Data Active" : "Using Fallback Data"}
                  </h4>
                  <p className="text-xs mt-1">
                    {status.isRealData
                      ? `Real news from ${status.source} • ${status.articlesCount} articles`
                      : `${status.source} data • Last updated ${new Date(status.lastUpdate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0 hover:bg-transparent">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
