"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Folder, FileText, TrendingUp, Search } from "lucide-react"

interface Category {
  name: string
  count: number
  slug: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      console.log("📂 [CATEGORIES PAGE] Fetching categories...")

      const response = await fetch("/api/articles/categories", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`📂 [CATEGORIES PAGE] Response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [CATEGORIES PAGE] Fetched ${data.categories?.length || 0} categories`)
        setCategories(data.categories || [])
      } else {
        console.error(`❌ [CATEGORIES PAGE] Failed to fetch: ${response.status}`)
        setError("Failed to load categories")
      }
    } catch (error) {
      console.error("❌ [CATEGORIES PAGE] Error:", error)
      setError("Failed to load categories")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-8 mb-4" />
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Categories</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchCategories}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalArticles = categories.reduce((sum, category) => sum + category.count, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Folder className="w-8 h-8 text-blue-500" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
            Categories
          </h1>
          <Search className="w-8 h-8 text-purple-500" />
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Explore articles organized by topics and discover content that interests you most
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
      >
        <Card>
          <CardContent className="p-4 text-center">
            <Folder className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-gray-600">Categories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{totalArticles.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Articles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {categories.length > 0 ? Math.round(totalArticles / categories.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Avg per Category</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Categories Grid */}
      {categories.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {categories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
            >
              <Link href={`/category/${category.slug}`}>
                <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg group-hover:from-blue-100 group-hover:to-purple-100 transition-colors">
                        <Folder className="w-6 h-6 text-blue-500" />
                      </div>
                      <Badge variant="secondary" className="text-sm">
                        {category.count} articles
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Discover {category.count} articles in {category.name.toLowerCase()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Categories Found</h2>
            <p className="text-gray-600">Categories will appear here once articles are published!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
