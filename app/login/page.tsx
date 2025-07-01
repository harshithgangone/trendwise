"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome } from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  const handleSignIn = () => {
    signIn("google", { callbackUrl })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Card className="w-full max-w-md mx-auto shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold gradient-text">Welcome to TrendWise</CardTitle>
            <CardDescription className="text-gray-600">
              Sign in to unlock full features and engage with articles.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Button
              onClick={handleSignIn}
              className="w-full py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Chrome className="h-6 w-6" />
              <span>Sign in with Google</span>
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              By signing in, you agree to our{" "}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
