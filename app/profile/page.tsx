"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, Eye, User, Calendar, Mail } from "lucide-react"
import { useUserPreferences } from "@/hooks/use-user-preferences"

interface UserArticle {
  articleId: {
    _id: string
    title: string
    slug: string
    excerpt: string
    thumbnail: string
    createdAt: string
    category: string
    views: number
    likes: number
    saves: number
  }
  likedAt?: string
  savedAt?: string
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const { preferences, loading, error, refreshPreferences } = useUserPreferences()
  const [activeTab, setActiveTab] = useState("liked")

  useEffect(() => {
    if (session?.user?.id && !loading) {
      refreshPreferences()
    }
  }, [session?.user?.id])

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to view your profile and saved articles.</p>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error Loading Profile</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={refreshPreferences}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const likedArticles = preferences?.likedArticles || []
  const savedArticles = preferences?.savedArticles || []
  const recentlyViewed = preferences?.recentlyViewed || []

  const renderArticleCard = (item: UserArticle, type: "liked" | "saved" | "recent") => {
    const article = item.articleId
    if (!article) return null

    return (
      <motion.div
        key={article._id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="aspect-video relative overflow-hidden">
            <img
              src={article.thumbnail || "/placeholder.svg?height=200&width=300"}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {article.category}
              </Badge>
              {type === "liked" && <Heart className="w-4 h-4 text-red-500 fill-current" />}
              {type === "saved" && <Bookmark className="w-4 h-4 text-blue-500 fill-current" />}
              {type === "recent" && <Eye className="w-4 h-4 text-green-500" />}
            </div>
            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{article.title}</h3>
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(article.createdAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {article.views || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {article.likes || 0}
                </span>
              </div>
            </div>
            <Link href={`/article/${article.slug}`}>
              <Button size="sm" className="w-full">
                Read Article
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback className="text-2xl">
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{session?.user?.name || "User Profile"}</h1>
                  <div className="flex items-center gap-4 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {session?.user?.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Member since {new Date().getFullYear()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <Heart className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{likedArticles.length}</div>
              <div className="text-sm text-gray-600">Liked Articles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bookmark className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{savedArticles.length}</div>
              <div className="text-sm text-gray-600">Saved Articles</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{recentlyViewed.length}</div>
              <div className="text-sm text-gray-600">Recently Viewed</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="liked" className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Liked ({likedArticles.length})
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" />
                Saved ({savedArticles.length})
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Recent ({recentlyViewed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="liked" className="mt-6">
              {likedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {likedArticles.map((item) => renderArticleCard(item, "liked"))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Liked Articles</h3>
                    <p className="text-gray-600 mb-4">Start liking articles to see them here!</p>
                    <Link href="/">
                      <Button>Explore Articles</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
              {savedArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedArticles.map((item) => renderArticleCard(item, "saved"))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Saved Articles</h3>
                    <p className="text-gray-600 mb-4">Start saving articles to read them later!</p>
                    <Link href="/">
                      <Button>Explore Articles</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recent" className="mt-6">
              {recentlyViewed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentlyViewed.map((item) => renderArticleCard(item, "recent"))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Recently Viewed Articles</h3>
                    <p className="text-gray-600 mb-4">Articles you read will appear here!</p>
                    <Link href="/">
                      <Button>Explore Articles</Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
