"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, Share2, Eye, Clock, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

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
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(article.likes || 0)
  const [saveCount, setSaveCount] = useState(article.saves || 0)
  const [viewCount, setViewCount] = useState(article.views || 0)

  // Increment view count on mount
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
      toast({
        title: "Login Required",
        description: "Please log in to like articles.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/articles/like/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        setIsLiked(!isLiked)
        setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1))
        toast({
          title: isLiked ? "Unliked" : "Liked",
          description: isLiked ? "Article removed from likes" : "Article added to likes",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update like status",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast({
        title: "Login Required",
        description: "Please log in to save articles.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/articles/save/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        setIsSaved(!isSaved)
        setSaveCount((prev) => (isSaved ? prev - 1 : prev + 1))
        toast({
          title: isSaved ? "Unsaved" : "Saved",
          description: isSaved ? "Article removed from saved items" : "Article saved for later",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not update save status",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/article/${article.slug}`
    const shareData = {
      title: article.title,
      text: article.excerpt,
      url: url,
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
        toast({
          title: "Shared",
          description: "Article shared successfully",
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast({
          title: "Link Copied",
          description: "Article link copied to clipboard",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not share article",
        variant: "destructive",
      })
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

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">{article.title}</h1>

        <p className="text-xl text-gray-600 mb-6 leading-relaxed">{article.excerpt}</p>

        {/* Author and Meta Info */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg" alt={article.author} />
              <AvatarFallback>{article.author.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{article.author}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(article.createdAt)}
                </span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {article.readTime} min read
                </span>
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {viewCount} views
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex items-center space-x-1"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span>Like ({likeCount})</span>
            </Button>

            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              className="flex items-center space-x-1"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              <span>Save ({saveCount})</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-1 bg-transparent"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Featured Image */}
        {article.thumbnail && (
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={article.thumbnail || "/placeholder.svg"}
              alt={article.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            />
          </div>
        )}
      </header>

      {/* Article Content */}
      <div className="prose prose-lg max-w-none mb-8">
        <div
          dangerouslySetInnerHTML={{ __html: article.content }}
          className="article-content text-gray-800 leading-relaxed"
        />
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag, index) => (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{viewCount} views</span>
            <span>{likeCount} likes</span>
            <span>{saveCount} saves</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={isLiked ? "default" : "outline"}
              size="sm"
              onClick={handleLike}
              className="flex items-center space-x-1"
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span>Like</span>
            </Button>

            <Button
              variant={isSaved ? "default" : "outline"}
              size="sm"
              onClick={handleSave}
              className="flex items-center space-x-1"
            >
              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              <span>Save</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-1 bg-transparent"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
