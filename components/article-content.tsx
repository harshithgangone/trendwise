"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, Share2, Clock, Calendar, Eye, User } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import { toast } from "@/hooks/use-toast"

interface Article {
  _id: string
  title: string
  content: string
  excerpt: string
  thumbnail: string
  tags: string[]
  category: string
  readTime: number
  views: number
  likes: number
  saves: number
  createdAt: string
  source: {
    name: string
    url: string
  }
}

interface ArticleContentProps {
  article: Article
}

export function ArticleContent({ article }: ArticleContentProps) {
  const { data: session } = useSession()
  const { saveArticle, likeArticle, addToRecentlyViewed, isArticleSaved, isArticleLiked } = useUserPreferences()
  const [localLikes, setLocalLikes] = useState(article.likes || 0)
  const [localSaves, setLocalSaves] = useState(article.saves || 0)
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Add to recently viewed when component mounts
    if (article._id) {
      addToRecentlyViewed(article._id)
    }
  }, [article._id, addToRecentlyViewed])

  const handleLike = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like articles.",
        variant: "destructive",
      })
      return
    }

    if (isLiking) return

    setIsLiking(true)
    try {
      const newLikedState = await likeArticle(article._id)
      setLocalLikes((prev) => (newLikedState ? prev + 1 : prev - 1))

      toast({
        title: newLikedState ? "Article liked!" : "Like removed",
        description: newLikedState ? "Added to your liked articles." : "Removed from your liked articles.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save articles.",
        variant: "destructive",
      })
      return
    }

    if (isSaving) return

    setIsSaving(true)
    try {
      const newSavedState = await saveArticle(article._id)
      setLocalSaves((prev) => (newSavedState ? prev + 1 : prev - 1))

      toast({
        title: newSavedState ? "Article saved!" : "Save removed",
        description: newSavedState ? "Added to your saved articles." : "Removed from your saved articles.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update save. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: window.location.href,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied!",
        description: "Article link has been copied to your clipboard.",
      })
    }
  }

  const isLiked = session ? isArticleLiked(article._id) : false
  const isSaved = session ? isArticleSaved(article._id) : false

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
            <span>{article.source?.name || "TrendWise AI"}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDateTime(article.createdAt)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>{article.readTime} min read</span>
          </div>
          <div className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            <span>{article.views?.toLocaleString() || 0} views</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {localLikes.toLocaleString()}
          </Button>

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={isSaved ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            {localSaves.toLocaleString()}
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>

        <Separator />
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
              <p className="font-medium text-gray-900">{article.source?.name || "TrendWise AI"}</p>
              <p className="text-sm text-gray-500">AI-powered content generation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              Like
            </Button>

            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={isSaved ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
              Save
            </Button>
          </div>
        </div>
      </footer>
    </motion.article>
  )
}
