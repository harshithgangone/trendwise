"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleCard } from "@/components/article-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { LayoutGrid, Search, Filter, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

interface Category {
  name: string
  count: number
  slug: string
}

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchAllArticles()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchArticlesByCategory(selectedCategory, 1)
    }
  }, [selectedCategory])

  const fetchCategories = async () => {
    try {
      console.log("📂 [FRONTEND] Fetching categories...")
      const response = await fetch("/api/articles/categories")
      const data = await response.json()

      if (data.success) {
        setCategories(data.categories || [])
        console.log(`✅ [FRONTEND] Loaded ${data.categories?.length || 0} categories`)
      } else {
        throw new Error(data.error || "Failed to fetch categories")
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error fetching categories:", error)
      setError("Failed to load categories")
    }
  }

  const fetchAllArticles = async () => {
    try {
      setLoading(true)
      console.log("📖 [FRONTEND] Fetching all articles from /api/articles?limit=200...")
      const response = await fetch("/api/articles?limit=200")
      const data = await response.json()
      console.log("✅ [FRONTEND] Articles API response data:", data)

      if (data.success) {
        setArticles(data.articles || [])
        setHasMore(data.pagination?.hasNext || false)
        console.log(`✅ [FRONTEND] Loaded ${data.articles?.length || 0} articles. Has more: ${data.pagination?.hasNext || false}`)
      } else {
        const errorMessage = data.error || "Failed to fetch articles";
        console.error("❌ [FRONTEND] Articles API returned error:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error fetching articles:", error)
      setError("Failed to load articles (Network or parsing error)")
    } finally {
      setLoading(false)
    }
  }

  const fetchArticlesByCategory = async (category: string, pageNum = 1) => {
    try {
      setArticlesLoading(true)
      console.log(`📂 [FRONTEND] Fetching articles for category: ${category}, page: ${pageNum}`)

      const response = await fetch(`/api/articles/category/${encodeURIComponent(category)}?page=${pageNum}&limit=12`)
      const data = await response.json()
      console.log("✅ [FRONTEND] Category Articles API response data:", data)

      if (data.success) {
        if (pageNum === 1) {
          setArticles(data.articles || [])
        } else {
          setArticles((prev) => [...prev, ...(data.articles || [])])
        }
        setHasMore(data.pagination?.hasNext || false)
        setPage(pageNum)
        console.log(`✅ [FRONTEND] Loaded ${data.articles?.length || 0} articles for category "${category}". Has more: ${data.pagination?.hasNext || false}`)
      } else {
        const errorMessage = data.error || "Failed to fetch articles";
        console.error("❌ [FRONTEND] Category Articles API returned error:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error fetching articles by category:", error)
      setError("Failed to load articles for this category (Network or parsing error)")
    } finally {
      setArticlesLoading(false)
    }
  }

  const handleCategorySelect = (category: string) => {
    console.log(`🔄 [FRONTEND] Selected category: ${category}`)
    setSelectedCategory(category)
    setPage(1)
    setError(null)
  }

  const handleLoadMore = () => {
    if (selectedCategory) {
      fetchArticlesByCategory(selectedCategory, page + 1)
    } else {
      // Load more from all articles
      fetchMoreArticles()
    }
  }

  const fetchMoreArticles = async () => {
    try {
      setArticlesLoading(true)
      console.log(`📖 [FRONTEND] Loading more articles (page ${page + 1}) from /api/articles...`)

      const response = await fetch(`/api/articles?page=${page + 1}&limit=12`)
      const data = await response.json()
      console.log("✅ [FRONTEND] More Articles API response data:", data);

      if (data.success) {
        setArticles((prev) => [...prev, ...(data.articles || [])])
        setHasMore(data.pagination?.hasNext || false)
        setPage(page + 1)
        console.log(`✅ [FRONTEND] Loaded ${data.articles?.length || 0} more articles. Has more: ${data.pagination?.hasNext || false}`)
      } else {
        const errorMessage = data.error || "Failed to load more articles";
        console.error("❌ [FRONTEND] More Articles API returned error:", errorMessage);
        setError(errorMessage);
      }
    } catch (error) {
      console.error("❌ [FRONTEND] Error loading more articles:", error)
      setError("Failed to load more articles (Network or parsing error)")
    } finally {
      setArticlesLoading(false)
    }
  }

  const handleClearCategory = () => {
    setSelectedCategory(null)
    setPage(1)
    setError(null)
    fetchAllArticles()
  }

  const filteredCategories = Array.isArray(categories)
    ? categories.filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

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
            <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-large">
              <LayoutGrid className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 gradient-text">Explore Categories</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover articles organized by topics and interests. Find exactly what you're looking for.
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <Card className="card-professional">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {selectedCategory && (
                    <Button variant="outline" onClick={handleClearCategory}>
                      <Filter className="w-4 h-4 mr-2" />
                      Clear Filter
                    </Button>
                  )}
                  <Button onClick={() => window.location.reload()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Categories Grid */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-8">Browse by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredCategories.map((category, index) => (
                <motion.div
                  key={category.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer transition-all duration-300 hover:shadow-large hover:scale-105 ${
                      selectedCategory === category.name ? "ring-2 ring-blue-500 bg-blue-50" : "card-professional"
                    }`}
                    onClick={() => handleCategorySelect(category.name)}
                  >
                    <CardContent className="p-4 text-center">
                      <h3 className="font-semibold text-gray-800 mb-2 text-sm">{category.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {category.count} articles
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Selected Category Header */}
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-800">{selectedCategory} Articles</h2>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {articles.length} articles
              </Badge>
            </div>
          </motion.div>
        )}

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
                <div className="text-red-500 mb-4 text-lg font-medium">{error}</div>
                <Button onClick={() => window.location.reload()} className="btn-primary">
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
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {articles.map((article, index) => (
                <ArticleCard key={article._id} article={article} index={index} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center">
                <Button onClick={handleLoadMore} disabled={articlesLoading} className="btn-secondary px-8 py-3">
                  {articlesLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>Load More Articles</>
                  )}
                </Button>
              </div>
            )}
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
                <div className="text-gray-600 mb-4 text-lg font-medium">
                  No articles found. Try adjusting your filters or search query.
                </div>
                <Button onClick={() => window.location.reload()} className="btn-primary">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <Footer />
      </main>
    </div>
  )
}
