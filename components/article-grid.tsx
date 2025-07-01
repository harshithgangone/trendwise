"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArticleCard } from "@/components/article-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { Star } from "lucide-react"
import { DataSourceNotification } from "@/components/data-source-notification"
import { useToast } from "@/hooks/use-toast"

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
}

export function ArticleGrid() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [showDataNotification, setShowDataNotification] = useState(false)
  const [dataSourceInfo, setDataSourceInfo] = useState({ isRealData: false, source: "Loading..." })
  const { toast } = useToast()

  useEffect(() => {
    fetchArticles(1)
    checkDataSource()
  }, [])

  const checkDataSource = async () => {
    try {
      const response = await fetch("/api/admin/data-source-status")
      const data = await response.json()
      setDataSourceInfo({
        isRealData: data.isUsingRealData || false,
        source: data.source || "Mock Data",
      })

      // Show notification if using real data
      if (data.isUsingRealData) {
        setShowDataNotification(true)
        toast({
          variant: "success",
          title: "Live Data Active",
          description: `Content powered by real ${data.source} data`,
        })
      }
    } catch (error) {
      console.error("Error checking data source:", error)
      setDataSourceInfo({ isRealData: false, source: "Mock Data" })
    }
  }

  const fetchArticles = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
        console.log("📖 [FRONTEND] Fetching initial articles...")
      } else {
        setLoadingMore(true)
        console.log(`📖 [FRONTEND] Loading more articles (page ${pageNum})...`)
      }

      setError(null)
      const response = await fetch(`/api/articles?page=${pageNum}&limit=9`)
      const data = await response.json()

      if (data.success) {
        if (pageNum === 1) {
          setArticles(data.articles || [])
        } else {
          setArticles((prev) => [...prev, ...(data.articles || [])])
        }
        setHasMore(data.pagination?.hasNext || false)
        setPage(pageNum)
        console.log(`✅ [FRONTEND] Loaded ${data.articles?.length || 0} articles (page ${pageNum})`)
      } else {
        // Fallback to articles from response even if success is false
        if (pageNum === 1) {
          setArticles(data.articles || [])
        }
        setHasMore(false)
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error fetching articles:", error)
      setError("Failed to load articles. Please try again.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleLoadMore = () => {
    fetchArticles(page + 1)
  }

  const handleRefresh = () => {
    fetchArticles(1)
    checkDataSource()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <div className="text-red-500 mb-4 text-lg font-medium">{error}</div>
          <Button onClick={handleRefresh} className="btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">No Articles Yet</h3>
          <p className="text-gray-600 mb-6">Our AI is working hard to generate fresh content. Check back soon!</p>
          <Button onClick={handleRefresh} className="btn-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  // Separate featured and regular articles
  const featuredArticles = articles.filter((article) => article.featured)
  const regularArticles = articles.filter((article) => !article.featured)

  return (
    <div id="articles" className="section-padding">
      {/* Data Source Notification */}
      {showDataNotification && (
        <DataSourceNotification
          isRealData={dataSourceInfo.isRealData}
          source={dataSourceInfo.source}
          onClose={() => setShowDataNotification(false)}
        />
      )}

      <div className="container mx-auto container-padding">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-6 gradient-text">Latest Articles</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover the most recent trends and insights, powered by AI and real-time data analysis.
          </p>
        </motion.div>

        {/* Featured articles */}
        {featuredArticles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-16"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center">
              <Star className="w-6 h-6 mr-2 text-yellow-500" />
              Featured Articles
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {featuredArticles.slice(0, 2).map((article, index) => (
                <ArticleCard key={article._id} article={article} index={index} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Regular articles */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regularArticles.map((article, index) => (
              <ArticleCard key={article._id} article={article} index={index} />
            ))}
          </div>
        </motion.div>

        {/* Load more button */}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center mt-16"
          >
            <Button onClick={handleLoadMore} disabled={loadingMore} className="btn-secondary px-8 py-3">
              {loadingMore ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More Articles"
              )}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
