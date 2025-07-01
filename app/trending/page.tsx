"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleCard } from "@/components/article-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, FlameIcon as Fire, BarChart3, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

interface Article {
  _id: string
  title: string
  slug: string
  excerpt: string
  thumbnail: string
  createdAt: string
  tags: string[]
  readTime: number
  views?: number
  featured?: boolean
  trendData?: {
    trendScore: number
    searchVolume: string
    source: string
  }
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

      console.log("🔥 [FRONTEND] Fetching trending articles...")
      const response = await fetch("/api/articles/trending")
      const data = await response.json()

      if (data.success) {
        setArticles(data.articles || [])
        console.log(`✅ [FRONTEND] Loaded ${data.articles?.length || 0} trending articles`)
      } else {
        throw new Error(data.error || "Failed to fetch trending articles")
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error fetching trending articles:", error)
      setError("Failed to load trending articles. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    )
  }

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
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-large">
              <Fire className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 gradient-text">Trending Now</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover the hottest topics and most engaging content based on real-time data and AI analysis.
          </p>
          <Button onClick={fetchTrendingArticles} className="btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Trends
          </Button>
        </motion.div>

        {/* Trending Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
        >
          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trending Articles</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{articles.length}</div>
              <p className="text-xs text-muted-foreground">Currently trending</p>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {articles.reduce((sum, article) => sum + (article.views || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all trending content</p>
            </CardContent>
          </Card>

          <Card className="card-professional">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Trend Score</CardTitle>
              <Fire className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {articles.length > 0
                  ? Math.round(
                      articles.reduce((sum, article) => sum + (article.trendData?.trendScore || 0), 0) /
                        articles.length,
                    )
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Out of 100</p>
            </CardContent>
          </Card>
        </motion.div>

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
                <div className="text-red-500 mb-4 text-lg font-medium">{error}</div>
                <Button onClick={fetchTrendingArticles} className="btn-primary">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Articles Grid */}
        {!error && articles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Hot Topics</h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  Live Updates
                </Badge>
                <Badge variant="outline">{articles.length} Articles</Badge>
              </div>
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
        {!error && articles.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-20"
          >
            <Card className="max-w-md mx-auto shadow-lg">
              <CardContent className="pt-6">
                <Fire className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-2xl font-bold text-gray-800 mb-4">No Trending Content Yet</h3>
                <p className="text-gray-600 mb-6">
                  Our AI is analyzing the latest trends. Check back soon for hot topics!
                </p>
                <Button onClick={fetchTrendingArticles} className="btn-primary">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for Updates
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
