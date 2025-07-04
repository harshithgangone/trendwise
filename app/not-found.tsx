"use client"

import { useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, ArrowLeft, FileText } from "lucide-react"

export default function NotFound() {
  useEffect(() => {
    console.log("🚫 [404] Not found page rendered")
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full"
      >
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 w-24 h-24 bg-red-100 rounded-full flex items-center justify-center"
            >
              <FileText className="w-12 h-12 text-red-600" />
            </motion.div>
            <CardTitle className="text-4xl font-bold text-gray-900 mb-2">Article Not Found</CardTitle>
            <p className="text-xl text-gray-600">The article you're looking for doesn't exist or has been moved.</p>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-700 mb-6">
                Don't worry! This might happen when an article is being processed by our AI system or if the URL is
                incorrect.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link href="/">
                  <Button className="w-full h-12 text-lg" size="lg">
                    <Home className="w-5 h-5 mr-2" />
                    Go to Homepage
                  </Button>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full h-12 text-lg bg-transparent"
                  size="lg"
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Go Back
                </Button>
              </motion.div>
            </div>

            <div className="text-center pt-4">
              <Link href="/trending" className="text-blue-600 hover:text-blue-800 font-medium">
                Browse Trending Articles →
              </Link>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <h3 className="font-semibold text-blue-800 mb-2">💡 Tip</h3>
              <p className="text-blue-700 text-sm">
                If you believe this article should exist, it might be currently being processed by our TrendBot AI
                system. Try refreshing the page in a few minutes or check our homepage for the latest articles.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
