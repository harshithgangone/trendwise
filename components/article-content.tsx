"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Heart, Bookmark, Share2, Eye, Clock, Calendar, Twitter, Facebook, Linkedin, Copy, Check } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"

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
  const [copied, setCopied] = useState(false)

  // Track view on component mount
  useEffect(() => {
    const trackView = async () => {
      try {
        const response = await fetch(`/api/articles/view/${article._id}`, {
          method: "POST",
        })
        if (response.ok) {
          const data = await response.json()
          setViewCount(data.views)
        }
      } catch (error) {
        console.error("Error tracking view:", error)
      }
    }

    trackView()
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
        const data = await response.json()
        setIsLiked(data.liked)
        setLikeCount(data.likes)
        toast({
          title: data.liked ? "Article Liked!" : "Like Removed",
          description: data.liked ? "Added to your liked articles." : "Removed from liked articles.",
        })
      }
    } catch (error) {
      console.error("Error liking article:", error)
      toast({
        title: "Error",
        description: "Failed to like article. Please try again.",
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
        const data = await response.json()
        setIsSaved(data.saved)
        setSaveCount(data.saves)
        toast({
          title: data.saved ? "Article Saved!" : "Save Removed",
          description: data.saved ? "Added to your saved articles." : "Removed from saved articles.",
        })
      }
    } catch (error) {
      console.error("Error saving article:", error)
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async (platform?: string) => {
    const url = `${window.location.origin}/article/${article.slug}`
    const text = `Check out this article: ${article.title}`

    try {
      if (platform === "twitter") {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
      } else if (platform === "facebook") {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
      } else if (platform === "linkedin") {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`)
      } else if (platform === "copy") {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: "Link Copied!",
          description: "Article link copied to clipboard.",
        })
      } else if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt,
          url: url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        toast({
          title: "Link Copied!",
          description: "Article link copied to clipboard.",
        })
      }
    } catch (error) {
      console.error("Error sharing:", error)
    }
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
        {/* Category and Badges */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-sm">
            {article.category}
          </Badge>
          {article.featured && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">Featured</Badge>
          )}
          {article.trending && <Badge className="bg-gradient-to-r from-red-400 to-pink-500 text-white">Trending</Badge>}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">{article.title}</h1>

        {/* Excerpt */}
        <p className="text-xl text-gray-600 mb-8 leading-relaxed">{article.excerpt}</p>

        {/* Author and Meta Info */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg" alt={article.author} />
              <AvatarFallback className="text-lg font-semibold">{article.author.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{article.author}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDateTime(article.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {article.readTime} min read
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {viewCount.toLocaleString()} views
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={`flex items-center gap-2 ${isLiked ? "bg-red-50 text-red-600 border-red-200" : ""}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              <span>{likeCount}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              className={`flex items-center gap-2 ${isSaved ? "bg-blue-50 text-blue-600 border-blue-200" : ""}`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              <span>{saveCount}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleShare()} className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </div>

        {/* Featured Image */}
        <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8">
          <Image
            src={article.thumbnail || "/placeholder.svg?height=400&width=800"}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </header>

      {/* Article Content */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:text-gray-900"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator className="mb-8" />

      {/* Social Sharing */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Share this article</h3>
          <p className="text-gray-600">Help others discover this content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare("twitter")}
            className="flex items-center gap-2"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare("facebook")}
            className="flex items-center gap-2"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare("linkedin")}
            className="flex items-center gap-2"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare("copy")} className="flex items-center gap-2">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>
    </motion.article>
  )
}
