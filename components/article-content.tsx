"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Bookmark, Share2, Eye, Clock, User } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

interface Article {
  _id: string
  title: string
  slug: string
  content: string
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

interface ArticleContentProps {
  article: Article
}

export function ArticleContent({ article }: ArticleContentProps) {
  const { data: session } = useSession()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(article.likes || 0)
  const [saveCount, setSaveCount] = useState(article.saves || 0)
  const [viewCount, setViewCount] = useState(article.views || 0)

  // Increment view count when article loads
  useEffect(() => {
    const incrementView = async () => {
      try {
        const response = await fetch(`/api/articles/view/${article._id}`, {
          method: "POST",
        })
        if (response.ok) {
          setViewCount((prev) => prev + 1)
        }
      } catch (error) {
        console.log("Could not increment view count")
      }
    }

    incrementView()
  }, [article._id])

  const handleLike = async () => {
    if (!session) {
      toast.error("Please sign in to like articles")
      return
    }

    try {
      const response = await fetch(`/api/articles/like/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.liked)
        setLikeCount(data.likes)
        toast.success(data.liked ? "Article liked!" : "Article unliked!")
      }
    } catch (error) {
      toast.error("Failed to like article")
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast.error("Please sign in to save articles")
      return
    }

    try {
      const response = await fetch(`/api/articles/save/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.saved)
        setSaveCount(data.saves)
        toast.success(data.saved ? "Article saved!" : "Article unsaved!")
      }
    } catch (error) {
      toast.error("Failed to save article")
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
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast.success("Link copied to clipboard!")
      } catch (error) {
        toast.error("Failed to copy link")
      }
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "Unknown date"
    }
  }

  return (
    <article className="max-w-4xl mx-auto">
      {/* Article Header */}
      <header className="mb-8">
        <div className="mb-4">
          <Badge variant="secondary" className="mb-2">
            {article.category}
          </Badge>
          {article.featured && (
            <Badge variant="default" className="ml-2">
              Featured
            </Badge>
          )}
          {article.trending && (
            <Badge variant="destructive" className="ml-2">
              Trending
            </Badge>
          )}
        </div>

        <h1 className="text-4xl font-bold mb-4 leading-tight">{article.title || "Untitled Article"}</h1>

        <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{article.author || "TrendWise AI"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{formatDate(article.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{article.readTime || 5} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{viewCount} views</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="flex items-center gap-2"
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            Like ({likeCount})
          </Button>

          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
            Save ({saveCount})
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2 bg-transparent">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Article Image */}
        {article.thumbnail && (
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={article.thumbnail || "/placeholder.svg"}
              alt={article.title || "Article image"}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
      </header>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none mb-8">
        {article.content ? (
          <div dangerouslySetInnerHTML={{ __html: article.content }} className="article-content" />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-4">Content not available.</p>
            <p>This article is currently being processed. Please check back later.</p>
          </div>
        )}
      </div>

      {/* Article Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {article.tags.map((tag, index) => (
            <Badge key={index} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </article>
  )
}
