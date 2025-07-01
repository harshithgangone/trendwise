"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArticleCard } from "@/components/article-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { User, Mail, CalendarDays, Bookmark, Heart, Eye } from "lucide-react"
import { motion } from "framer-motion"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { LoadingSpinner } from "@/components/loading-spinner"

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

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { preferences } = useUserPreferences()
  const [savedArticles, setSavedArticles] = useState<Article[]>([])
  const [likedArticles, setLikedArticles] = useState<Article[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user && preferences) {
      fetchUserArticles()
    }
  }, [session, preferences])

  const fetchUserArticles = async () => {
    setLoading(true)
    try {
      // Fetch saved articles
      if (preferences.savedArticles.length > 0) {
        const savedPromises = preferences.savedArticles.map(async (id) => {
          try {
            const response = await fetch(`/api/articles/by-id/${id}`)
            if (response.ok) {
              return await response.json()
            }
          } catch (error) {
            console.error(`Error fetching saved article ${id}:`, error)
          }
          return null
        })
        const savedResults = await Promise.all(savedPromises)
        setSavedArticles(savedResults.filter(Boolean))
      }

      // Fetch liked articles
      if (preferences.likedArticles.length > 0) {
        const likedPromises = preferences.likedArticles.map(async (id) => {
          try {
            const response = await fetch(`/api/articles/by-id/${id}`)
            if (response.ok) {
              return await response.json()
            }
          } catch (error) {
            console.error(`Error fetching liked article ${id}:`, error)
          }
          return null
        })
        const likedResults = await Promise.all(likedPromises)
        setLikedArticles(likedResults.filter(Boolean))
      }

      // Fetch recently viewed articles
      if (preferences.recentlyViewed.length > 0) {
        const viewedPromises = preferences.recentlyViewed.slice(0, 5).map(async (id) => {
          try {
            const response = await fetch(`/api/articles/by-id/${id}`)
            if (response.ok) {
              return await response.json()
            }
          } catch (error) {
            console.error(`Error fetching viewed article ${id}:`, error)
          }
          return null
        })
        const viewedResults = await Promise.all(viewedPromises)
        setRecentlyViewed(viewedResults.filter(Boolean))
      }
    } catch (error) {
      console.error("Error fetching user articles:", error)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-6xl mx-auto"
        >
          {/* Profile Header */}
          <Card className="shadow-xl mb-8">
            <CardHeader className="text-center pb-6">
              <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-blue-500 shadow-md">
                <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User Avatar"} />
                <AvatarFallback className="text-4xl font-bold bg-blue-100 text-blue-600">
                  {session.user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-3xl font-bold gradient-text">{session.user?.name}</CardTitle>
              <p className="text-gray-600 text-lg">{session.user?.role || "User"}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center space-x-4 text-gray-700">
                  <Mail className="h-6 w-6 text-blue-500" />
                  <span className="text-lg">{session.user?.email}</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-700">
                  <CalendarDays className="h-6 w-6 text-blue-500" />
                  <span className="text-lg">Joined: {new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-700">
                  <User className="h-6 w-6 text-blue-500" />
                  <span className="text-lg">ID: {session.user.id?.slice(-8) || "N/A"}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{preferences.savedArticles.length}</div>
                  <div className="text-sm text-gray-600">Saved Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{preferences.likedArticles.length}</div>
                  <div className="text-sm text-gray-600">Liked Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{preferences.recentlyViewed.length}</div>
                  <div className="text-sm text-gray-600">Recently Viewed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Content Tabs */}
          <Tabs defaultValue="saved" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="saved" className="flex items-center space-x-2">
                <Bookmark className="h-4 w-4" />
                <span>Saved Articles</span>
                <Badge variant="secondary">{preferences.savedArticles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="liked" className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Liked Articles</span>
                <Badge variant="secondary">{preferences.likedArticles.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Recently Viewed</span>
                <Badge variant="secondary">{preferences.recentlyViewed.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved" className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Saved Articles</h2>
                <p className="text-gray-600">Articles you've saved for later reading.</p>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : savedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedArticles.map((article, index) => (
                    <ArticleCard key={article._id} article={article} index={index} />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Bookmark className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">No Saved Articles</h3>
                    <p className="text-gray-600">Start saving articles you want to read later!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="liked" className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Liked Articles</h2>
                <p className="text-gray-600">Articles you've liked and enjoyed.</p>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : likedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {likedArticles.map((article, index) => (
                    <ArticleCard key={article._id} article={article} index={index} />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Heart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">No Liked Articles</h3>
                    <p className="text-gray-600">Like articles to show your appreciation!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Recently Viewed</h2>
                <p className="text-gray-600">Articles you've recently read or visited.</p>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : recentlyViewed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentlyViewed.map((article, index) => (
                    <ArticleCard key={article._id} article={article} index={index} />
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Eye className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
                    <p className="text-gray-600">Start reading articles to see your history here!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}
