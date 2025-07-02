"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Share2, Bookmark, Heart, Twitter, Eye, User } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TweetsSection } from "@/components/tweets-section"
import { useToast } from "@/hooks/use-toast"
import { useUserPreferences } from "@/hooks/use-user-preferences"
import type { Tweet } from "@/components/tweets-section"

interface Article {
  _id: string
  title: string
  content: string
  excerpt: string
  thumbnail: string
  createdAt: string
  tags: string[]
  category: string
  readTime: number
  views: number
  likes: number
  saves: number
  author?: string
  trendData?: {
    sourceName?: string
    sourceUrl?: string
    publishedAt?: string
  }
  media?: {
    images?: string[]
    videos?: string[]
    tweets?: Tweet[]
  }
  twitterSearchUrl?: string
}

interface ArticleContentProps {
  article: Article
}

export function ArticleContent({ article: initialArticle }: ArticleContentProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { saveArticle, likeArticle, addToRecentlyViewed, isArticleSaved, isArticleLiked } = useUserPreferences()

  const [article, setArticle] = useState(initialArticle)
  const [isSaved, setIsSaved] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Safely format date with fallback
  const formatSafeDateTime = (dateString: string | undefined) => {
    if (!dateString) return "Unknown date"
    try {
      return formatDateTime(dateString)
    } catch (error) {
      console.error("Date formatting error:", error)
      return "Unknown date"
    }
  }

  // Update local state when preferences change
  useEffect(() => {
    if (session?.user && article?._id) {
      try {
        setIsSaved(isArticleSaved(article._id))
        setIsLiked(isArticleLiked(article._id))
      } catch (error) {
        console.error("Error updating preferences:", error)
      }
    }
  }, [article?._id, session?.user, isArticleSaved, isArticleLiked])

  // Add to recently viewed when component mounts
  useEffect(() => {
    if (session?.user && article?._id) {
      try {
        addToRecentlyViewed(article._id)
      } catch (error) {
        console.error("Error adding to recently viewed:", error)
      }
    }
  }, [article?._id, session?.user, addToRecentlyViewed])

  // Refetch article from backend
  const refetchArticle = async () => {
    if (!article?._id) return

    try {
      const response = await fetch(`/api/articles/by-id/${article._id}`)
      if (response.ok) {
        const updated = await response.json()
        setArticle(updated)
      }
    } catch (error) {
      console.error("Failed to refetch article:", error)
    }
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          url: window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: "Link copied!",
          description: "Article link has been copied to your clipboard.",
        })
      }
    } catch (error) {
      console.error("Share failed:", error)
      toast({
        title: "Share failed",
        description: "Unable to share the article.",
        variant: "destructive",
      })
    }
  }

  const handleSave = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save articles.",
        variant: "destructive",
      })
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    if (!article?._id) return

    setIsSaving(true)
    try {
      const newSavedState = await saveArticle(article._id)
      setIsSaved(newSavedState)
      await refetchArticle()
      toast({
        title: newSavedState ? "Article saved!" : "Article unsaved",
        description: newSavedState ? "Article added to your saved list." : "Article removed from your saved list.",
      })
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "Error",
        description: "Failed to update save status.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLike = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like articles.",
        variant: "destructive",
      })
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    if (!article?._id) return

    setIsLiking(true)
    try {
      const newLikedState = await likeArticle(article._id)
      setIsLiked(newLikedState)
      await refetchArticle()
      toast({
        title: newLikedState ? "Article liked!" : "Like removed",
        description: newLikedState ? "Thanks for liking this article!" : "You unliked this article.",
      })
    } catch (error) {
      console.error("Like error:", error)
      toast({
        title: "Error",
        description: "Failed to update like status.",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const openTwitterSearch = () => {
    if (!article?.title) return

    const searchQuery = encodeURIComponent(article.title)
    const twitterUrl = `https://twitter.com/search?q=${searchQuery}`
    window.open(twitterUrl, "_blank")
  }

  // Safety check for article data
  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Article not found</h1>
          <p className="text-gray-600">The requested article could not be loaded.</p>
        </div>
      </div>
    )
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="mb-8"
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {article.category && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {article.category}
            </Badge>
          )}
          {article.tags &&
            article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{article.title || "Untitled Article"}</h1>

        {article.excerpt && <p className="text-xl text-gray-600 mb-6 leading-relaxed">{article.excerpt}</p>}

        <div className="flex items-center justify-between flex-wrap gap-4 text-gray-600 mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              <span>{article.author || "TrendWise AI"}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {formatSafeDateTime(article.createdAt)}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {article.readTime || 5} min read
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              {(article.views || 0).toLocaleString()} views
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className={isSaved ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Saved" : "Save"} ({article.saves || 0})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              disabled={isLiking}
              className={isLiked ? "bg-red-50 text-red-600 border-red-200" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {isLiked ? "Liked" : "Like"} ({article.likes || 0})
            </Button>

            <Button variant="outline" size="sm" onClick={openTwitterSearch}>
              <Twitter className="h-4 w-4 mr-2" />
              View Tweets
            </Button>
          </div>
        </div>

        {/* Source Attribution */}
        {article.trendData?.sourceName && (
          <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-sm text-gray-600">
              <strong>Source:</strong>{" "}
              {article.trendData.sourceUrl ? (
                <a
                  href={article.trendData.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  {article.trendData.sourceName}
                </a>
              ) : (
                article.trendData.sourceName
              )}
              {article.trendData.publishedAt && (
                <span className="ml-2">• Published {formatSafeDateTime(article.trendData.publishedAt)}</span>
              )}
            </p>
          </div>
        )}
      </motion.header>

      {/* Featured Image */}
      {article.thumbnail && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8 rounded-xl overflow-hidden"
        >
          <Image
            src={article.thumbnail || "/placeholder.svg"}
            alt={article.title || "Article image"}
            width={800}
            height={400}
            className="w-full h-auto"
            priority
            onError={(e) => {
              console.log("Image failed to load:", article.thumbnail)
              e.currentTarget.src = "/placeholder.svg?height=400&width=800"
            }}
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: article.content || "<p>Content not available.</p>" }}
      />

      {/* Media Gallery */}
      {article.media && (article.media.images || article.media.videos) && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12"
        >
          <h3 className="text-2xl font-bold mb-6">Related Media</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {article.media.images?.slice(0, 4).map((image, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                <Image
                  src={image || "/placeholder.svg"}
                  alt={`Related image ${index + 1}`}
                  width={400}
                  height={300}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=300&width=400"
                  }}
                />
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Tweets Section */}
      {article.media?.tweets && article.media.tweets.length > 0 && (
        <TweetsSection
          tweets={article.media.tweets}
          title="Social Media Buzz"
          query={article.title}
          searchUrl={article.twitterSearchUrl}
        />
      )}

      {/* Article Actions */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="mt-12 pt-8 border-t border-gray-200"
      >
        <div className="flex items-center justify-center space-x-4">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Article
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className={isSaved ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save for Later"} ({article.saves || 0})
          </Button>
          <Button
            variant="outline"
            onClick={handleLike}
            disabled={isLiking}
            className={isLiked ? "bg-red-50 text-red-600 border-red-200" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? "Liked" : "Like Article"} ({article.likes || 0})
          </Button>
        </div>
      </motion.div>
    </article>
  )
}
