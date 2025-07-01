"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Share2, Bookmark, Heart } from "lucide-react"
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
  thumbnail: string
  createdAt: string
  tags: string[]
  readTime: number
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
  saves?: number
  likes?: number
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

  // Update local state when preferences change
  useEffect(() => {
    setIsSaved(isArticleSaved(article._id))
    setIsLiked(isArticleLiked(article._id))
  }, [article._id, isArticleSaved, isArticleLiked])

  // Add to recently viewed when component mounts
  useEffect(() => {
    if (session?.user) {
      addToRecentlyViewed(article._id)
    }
  }, [article._id, session?.user, addToRecentlyViewed])

  // Refetch article from backend
  const refetchArticle = async () => {
    try {
      const response = await fetch(`/api/articles/by-id/${article._id}`)
      if (response.ok) {
        const updated = await response.json()
        setArticle(updated)
      }
    } catch (error) {
      console.error('Failed to refetch article:', error)
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

    const newSavedState = await saveArticle(article._id)
    setIsSaved(newSavedState)
    await refetchArticle()
    toast({
      title: newSavedState ? "Article saved!" : "Article unsaved",
      description: newSavedState ? "Article added to your saved list." : "Article removed from your saved list.",
    })
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

    const newLikedState = await likeArticle(article._id)
    setIsLiked(newLikedState)
    await refetchArticle()
    toast({
      title: newLikedState ? "Article liked!" : "Like removed",
      description: newLikedState ? "Thanks for liking this article!" : "You unliked this article.",
    })
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
          {article.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">{article.title}</h1>

        <div className="flex items-center justify-between flex-wrap gap-4 text-gray-600 mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              {formatDateTime(article.createdAt)}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {article.readTime} min read
            </div>
            {article.author && (
              <div className="flex items-center">
                <span className="text-sm">By {article.author}</span>
              </div>
            )}
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
              className={isSaved ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
            >
              <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <span className="flex items-center text-gray-500 text-sm ml-1">
              <Bookmark className="h-4 w-4 mr-1" />
              {article.saves ?? 0}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLike}
              className={isLiked ? "bg-red-50 text-red-600 border-red-200" : ""}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {isLiked ? "Liked" : "Like"}
            </Button>
            <span className="flex items-center text-gray-500 text-sm ml-1">
              <Heart className="h-4 w-4 mr-1" />
              {article.likes ?? 0}
            </span>
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
                <span className="ml-2">• Published {new Date(article.trendData.publishedAt).toLocaleDateString()}</span>
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
            alt={article.title}
            width={800}
            height={400}
            className="w-full h-auto"
            priority
          />
        </motion.div>
      )}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: article.content }}
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
            className={isSaved ? "bg-blue-50 text-blue-600 border-blue-200" : ""}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isSaved ? "fill-current" : ""}`} />
            {isSaved ? "Saved" : "Save for Later"}
          </Button>
          <Button
            variant="outline"
            onClick={handleLike}
            className={isLiked ? "bg-red-50 text-red-600 border-red-200" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? "Liked" : "Like Article"}
          </Button>
        </div>
      </motion.div>
    </article>
  )
}
