"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArticleGrid } from "@/components/article-grid"
import { TrendingUp, FlameIcon as Fire, Eye, Heart, Bookmark } from "lucide-react"

interface TrendingArticle {
  _id: string
  title: string
  slug: string
  excerpt: string
  thumbnail: string
  author: string
  createdAt: string
  readTime: number
  views: number
  likes: number
  saves: number
  category: string
  tags: string[]
  featured?: boolean
  trending?: boolean
}

export default function TrendingPage() {
  const [articles, setArticles] = useState<TrendingArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrendingArticles()
  }, [])

  const fetchTrendingArticles = async () => {
    try {
      console.log("🔥 [TRENDING PAGE] Fetching trending articles...")

      const response = await fetch("/api/articles/trending", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log(`🔥 [TRENDING PAGE] Response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [TRENDING PAGE] Fetched ${data.articles?.length || 0} trending articles`)
        setArticles(data.articles || [])
      } else {
        console.error(`❌ [TRENDING PAGE] Failed to fetch: ${response.status}`)
        setError("Failed to load trending articles")
      }
    } catch (error) {
      console.error("❌ [TRENDING PAGE] Error:", error)
      setError("Failed to load trending articles")
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex gap-2 mb-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
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
            <Fire className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load Trending Articles</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchTrendingArticles}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
          <Fire className="w-8 h-8 text-red-500" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Trending Now
          </h1>
          <TrendingUp className="w-8 h-8 text-orange-500" />
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover the most popular articles that everyone is talking about right now
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
      >
        <Card>
          <CardContent className="p-4 text-center">
            <Fire className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{articles.length}</div>
            <div className="text-sm text-gray-600">Trending Articles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {articles.reduce((sum, article) => sum + (article.views || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Heart className="w-6 h-6 text-pink-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {articles.reduce((sum, article) => sum + (article.likes || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Likes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bookmark className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {articles.reduce((sum, article) => sum + (article.saves || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Saves</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <ArticleGrid articles={articles} />
        </motion.div>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Trending Articles</h2>
            <p className="text-gray-600">Check back later for trending content!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
