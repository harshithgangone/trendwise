"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl font-bold text-gray-400">404</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Sorry, we couldn't find the page you're looking for. The article might have been moved or doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="flex items-center gap-2">
              <Link href="/">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>

            <Button variant="outline" asChild className="flex items-center gap-2 bg-transparent">
              <Link href="/trending">
                <Search className="w-4 h-4" />
                Browse Articles
              </Link>
            </Button>

            <Button variant="ghost" onClick={() => window.history.back()} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
