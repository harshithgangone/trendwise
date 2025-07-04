import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search, ArrowLeft, FileText } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Page Not Found</CardTitle>
          <p className="text-gray-600 mt-2">
            Sorry, we couldn't find the article you're looking for. It might have been moved or doesn't exist.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link href="/" className="flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1 bg-transparent">
              <Link href="/trending" className="flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                Browse Articles
              </Link>
            </Button>
          </div>
          <Button variant="ghost" asChild className="w-full">
            <Link href="javascript:history.back()" className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
