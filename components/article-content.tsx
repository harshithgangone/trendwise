"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  Bookmark,
  Share2,
  Eye,
  Clock,
  Calendar,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
} from "lucide-react"
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
  const [viewTracked, setViewTracked] = useState(false)

  console.log(`🎨 [ARTICLE CONTENT] Rendering article:`, {
    _id: article._id,
    title: article.title,
    slug: article.slug,
    initialViews: article.views,
    initialLikes: article.likes,
    initialSaves: article.saves,
  })

  // Track view only once when component mounts
  useEffect(() => {
    if (!viewTracked) {
      const trackView = async () => {
        try {
          console.log(`👁️ [VIEW TRACKING] Tracking real view for article: ${article._id}`)

          const response = await fetch(`/api/articles/view/${article._id}`, {
            method: "POST",
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              console.log(`👁️ [VIEW TRACKING] View tracked successfully:`, data)
              setViewCount(data.views)
            }
          } else {
            console.log(`👁️ [VIEW TRACKING] View tracking failed - keeping original count`)
          }
        } catch (error) {
          console.error("👁️ [VIEW TRACKING] Error tracking view:", error)
        } finally {
          setViewTracked(true)
        }
      }

      trackView()
    }
  }, [article._id, viewTracked])

  const handleLike = async () => {
    console.log(`❤️ [LIKE] Attempting to like article: ${article._id}`)

    if (!session) {
      console.log(`❤️ [LIKE] No session, showing login prompt`)
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

      console.log(`❤️ [LIKE] Response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`❤️ [LIKE] Real like response:`, data)
        setIsLiked(data.liked)
        setLikeCount(data.likes)
        toast({
          title: data.liked ? "Article Liked!" : "Like Removed",
          description: data.liked ? "Added to your liked articles." : "Removed from liked articles.",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to like article. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❤️ [LIKE] Error liking article:", error)
      toast({
        title: "Error",
        description: "Failed to like article. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    console.log(`🔖 [SAVE] Attempting to save article: ${article._id}`)

    if (!session) {
      console.log(`🔖 [SAVE] No session, showing login prompt`)
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

      console.log(`🔖 [SAVE] Response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`🔖 [SAVE] Real save response:`, data)
        setIsSaved(data.saved)
        setSaveCount(data.saves)
        toast({
          title: data.saved ? "Article Saved!" : "Save Removed",
          description: data.saved ? "Added to your saved articles." : "Removed from saved articles.",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to save article. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("🔖 [SAVE] Error saving article:", error)
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

    console.log(`📤 [SHARE] Sharing article:`, { platform, url, text })

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
      console.error("📤 [SHARE] Error sharing:", error)
    }
  }

  const handleViewRealTweets = () => {
    const searchQuery = article.title.split(" ").slice(0, 3).join(" ")
    const twitterSearchUrl = `https://twitter.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=live`
    window.open(twitterSearchUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto"
    >
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
            onError={(e) => {
              console.log(`🖼️ [IMAGE] Failed to load image: ${article.thumbnail}`)
              e.currentTarget.src = "/placeholder.svg?height=400&width=800"
            }}
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

      {/* Real Tweets Section */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">See Real Discussions</h3>
              <p className="text-blue-700">Check out what people are actually saying about this topic on Twitter</p>
            </div>
            <Button onClick={handleViewRealTweets} className="bg-blue-500 hover:bg-blue-600 text-white">
              <Twitter className="w-4 h-4 mr-2" />
              <ExternalLink className="w-4 h-4 mr-2" />
              View Real Tweets
            </Button>
          </div>
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
