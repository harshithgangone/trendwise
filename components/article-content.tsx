"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Heart, Bookmark, Share2, Eye, Clock, Calendar, User, Tag, ArrowLeft, Check } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

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

  useEffect(() => {
    // Track view when component mounts
    trackView()
  }, [article._id])

  const trackView = async () => {
    try {
      const response = await fetch(`/api/articles/view/${article._id}`, {
        method: "POST",
      })
      if (response.ok) {
        const data = await response.json()
        setViewCount(data.views || viewCount + 1)
      }
    } catch (error) {
      console.error("Error tracking view:", error)
      // Optimistically increment view count
      setViewCount((prev) => prev + 1)
    }
  }

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
          title: "Shared Successfully!",
          description: "Article shared via native sharing.",
        })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: "Link Copied!",
          description: "Article link copied to clipboard.",
        })
      }
    } catch (error) {
      console.error("Error sharing:", error)
      toast({
        title: "Share Failed",
        description: "Unable to share article. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <article className="max-w-4xl mx-auto">
      {/* Back Navigation */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Articles
        </Link>
      </motion.div>

      {/* Article Header */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        {/* Category and Featured Badge */}
        <div className="flex items-center gap-3 mb-4">
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

        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-6 text-gray-500 mb-8">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span>{article.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{formatDateTime(article.createdAt)}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            <span>{article.readTime} min read</span>
          </div>
          <div className="flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            <span>{viewCount.toLocaleString()} views</span>
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
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            Like ({likeCount})
          </Button>
          <Button
            variant={isSaved ? "default" : "outline"}
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
            Save ({saveCount})
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2 bg-transparent">
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            Share
          </Button>
        </div>

        <Separator />
      </motion.header>

      {/* Featured Image */}
      {article.thumbnail && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-12"
        >
          <div className="relative h-96 md:h-[500px] rounded-xl overflow-hidden shadow-lg">
            <Image
              src={article.thumbnail || "/placeholder.svg"}
              alt={article.title}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=500&width=800"
              }}
            />
          </div>
        </motion.div>
      )}

      {/* Article Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-12"
        >
          <Separator className="mb-6" />
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-sm">
                {tag}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Article Footer */}
      <motion.footer
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="border-t pt-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant={isLiked ? "default" : "outline"} onClick={handleLike} className="flex items-center gap-2">
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
              {isLiked ? "Liked" : "Like"} ({likeCount})
            </Button>
            <Button variant={isSaved ? "default" : "outline"} onClick={handleSave} className="flex items-center gap-2">
              <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Saved" : "Save"} ({saveCount})
            </Button>
          </div>
          <Button variant="outline" onClick={handleShare} className="flex items-center gap-2 bg-transparent">
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            Share Article
          </Button>
        </div>
      </motion.footer>
    </article>
  )
}
