"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, Share2, Clock, Calendar, Eye, User, Twitter } from "lucide-react"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { toast } from "sonner"

interface Article {
  _id: string
  title: string
  content: string
  excerpt: string
  thumbnail: string
  author: string
  publishedAt: string
  tags: string[]
  imageUrl?: string
  category: string
  readTime: number
  views: number
  likes: number
  saves: number
  tweets?: string[]
}

interface ArticleContentProps {
  article: Article
}

export function ArticleContent({ article }: ArticleContentProps) {
  const { data: session } = useSession()
  const { preferences, updatePreferences } = useUserPreferences()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likes, setLikes] = useState(article.likes || 0)
  const [saves, setSaves] = useState(article.saves || 0)
  const [views] = useState(article.views || 0)

  useEffect(() => {
    // Check if user has liked or saved this article
    setIsLiked(preferences.likedArticles.includes(article._id))
    setIsSaved(preferences.savedArticles.includes(article._id))

    // Add to recently viewed
    updatePreferences({
      recentlyViewed: [article._id, ...preferences.recentlyViewed.filter((id) => id !== article._id)].slice(0, 10),
    })
  }, [article._id, preferences, updatePreferences])

  const handleLike = async () => {
    if (!session) {
      toast.error("Please sign in to like articles")
      return
    }

    try {
      const newLikedState = !isLiked
      const response = await fetch(`/api/articles/like/${article._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: newLikedState }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(newLikedState)
        setLikes(data.likes)

        // Update user preferences
        const updatedLiked = newLikedState
          ? [...preferences.likedArticles, article._id]
          : preferences.likedArticles.filter((id) => id !== article._id)

        updatePreferences({ likedArticles: updatedLiked })
        toast.success(newLikedState ? "Article liked!" : "Article unliked!")
      }
    } catch (error) {
      console.error("Error liking article:", error)
      toast.error("Failed to like article")
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast.error("Please sign in to save articles")
      return
    }

    try {
      const newSavedState = !isSaved
      const response = await fetch(`/api/articles/save/${article._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: newSavedState }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsSaved(newSavedState)
        setSaves(data.saves)

        // Update user preferences
        const updatedSaved = newSavedState
          ? [...preferences.savedArticles, article._id]
          : preferences.savedArticles.filter((id) => id !== article._id)

        updatePreferences({ savedArticles: updatedSaved })
        toast.success(newSavedState ? "Article saved!" : "Article unsaved!")
      }
    } catch (error) {
      console.error("Error saving article:", error)
      toast.error("Failed to save article")
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: `Check out this article: ${article.title}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    }
  }

  const openTwitterSearch = () => {
    const searchQuery = encodeURIComponent(article.title)
    const twitterUrl = `https://twitter.com/search?q=${searchQuery}`
    window.open(twitterUrl, "_blank")
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
      {/* Article Header */}
      <header className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {article.category}
          </Badge>
          {article.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-gray-900">{article.title}</h1>

        <p className="text-xl text-gray-600 mb-6 leading-relaxed">{article.excerpt}</p>

        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 mb-6">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span>{article.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{article.readTime} min read</span>
          </div>
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            <span>{views.toLocaleString()} views</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="flex items-center space-x-2"
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            {likes.toLocaleString()}
          </Button>

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="flex items-center space-x-2"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            {saves.toLocaleString()}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center space-x-2 bg-transparent"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openTwitterSearch}
            className="flex items-center space-x-2 bg-transparent"
          >
            <Twitter className="h-4 w-4 mr-2" />
            View Real Tweets
          </Button>
        </div>

        <Separator />

        {/* Article Image */}
        {article.imageUrl && (
          <div className="mb-8">
            <img
              src={article.imageUrl || "/placeholder.svg"}
              alt={article.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
              onError={(e) => {
                console.log("Image failed to load:", article.imageUrl)
                e.currentTarget.src = "/placeholder.svg?height=400&width=800"
              }}
            />
          </div>
        )}
      </header>

      {/* Article Content */}
      <div
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: article.content }}
        style={{
          lineHeight: "1.8",
          fontSize: "18px",
        }}
      />

      {/* Article Footer */}
      <footer className="border-t pt-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="text-sm font-medium text-gray-700 mr-2">Tags:</span>
          {article.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src="/logo.png" alt="TrendWise AI" />
              <AvatarFallback>TW</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{article.author}</p>
              <p className="text-sm text-gray-500">AI-powered content generation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex items-center space-x-2"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              Like
            </Button>

            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              className="flex items-center space-x-2"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              Save
            </Button>
          </div>
        </div>
      </footer>

      {/* AI Generated Tweets */}
      {article.tweets && article.tweets.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Related Tweets</h3>
          <div className="space-y-3">
            {article.tweets.map((tweet, index) => (
              <div key={index} className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-sm">{tweet}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  )
}
