"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleCard } from "@/components/article-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, FlameIcon as Fire, Eye, Heart, RefreshCw } from "lucide-react"

interface Article {
  _id: string
  title: string
  slug: string
  excerpt: string
  thumbnail: string
  createdAt: string
  tags: string[]
  readTime: number
  views: number
  likes: number
  saves: number
  featured?: boolean
  author: string
  category: string
}

export default function TrendingPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTrendingArticles()
  }, [])

  const fetchTrendingArticles = async () => {
    try {
      setLoading(true)
      setError(null)
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

  const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0)
  const totalLikes = articles.reduce((sum, article) => sum + (article.likes || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg">
              <TrendingUp className="h-12 w-12 text-white" />
            </div>
            <Fire className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            Trending Now
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the most popular articles that everyone is reading and talking about right now
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="shadow-lg border-orange-200">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-orange-600">{articles.length}</div>
              <div className="text-sm text-gray-600">Trending Articles</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-blue-200">
            <CardContent className="p-6 text-center">
              <Eye className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-600">{totalViews.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Views</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg border-red-200">
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-600">{totalLikes.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total Likes</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-12"
          >
            <Card className="max-w-md mx-auto shadow-lg border-red-200">
              <CardContent className="pt-6">
                <Fire className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <div className="text-red-500 mb-4 text-lg font-medium">{error}</div>
                <Button onClick={fetchTrendingArticles} className="bg-orange-500 hover:bg-orange-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Articles Grid */}
        {!loading && !error && articles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">🔥 Hot Articles</h2>
              <Badge variant="outline" className="text-lg px-4 py-2 border-orange-300 text-orange-600">
                {articles.length} articles
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article, index) => (
                <motion.div
                  key={article._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <ArticleCard article={article} index={index} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && articles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto shadow-lg">
              <CardContent className="pt-6">
                <Fire className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Trending Articles</h3>
                <p className="text-gray-600 mb-4">Check back later for trending content!</p>
                <Button onClick={fetchTrendingArticles} className="bg-orange-500 hover:bg-orange-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  )
}
