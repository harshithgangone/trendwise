"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, Bookmark, Share2, Eye, Clock, Calendar } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Article {
  _id: string
  title: string
  slug: string
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

interface ArticleCardProps {
  article: Article
  variant?: "default" | "featured" | "compact"
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const { toast } = useToast()
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(article.likes || 0)
  const [saveCount, setSaveCount] = useState(article.saves || 0)

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const response = await fetch(`/api/articles/like/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setIsLiked(data.liked)
        setLikeCount(data.likes)
      } else if (response.status === 401) {
        toast({
          title: "Login Required",
          description: "Please log in to like articles.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error liking article:", error)
    }
  }

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const response = await fetch(`/api/articles/save/${article._id}`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setIsSaved(data.saved)
        setSaveCount(data.saves)
      } else if (response.status === 401) {
        toast({
          title: "Login Required",
          description: "Please log in to save articles.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving article:", error)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const url = `${window.location.origin}/article/${article.slug}`

    try {
      if (navigator.share) {
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

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        whileHover={{ y: -5 }}
        className="group"
      >
        <Link href={`/article/${article.slug}`}>
          <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src={article.thumbnail || "/placeholder.svg"}
                    alt={article.title}
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {article.category}
                  </Badge>
                  <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {article.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}m
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="group"
    >
      <Link href={`/article/${article.slug}`}>
        <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden">
          {/* Article Image */}
          <div className="relative h-48 overflow-hidden">
            <Image
              src={article.thumbnail || "/placeholder.svg"}
              alt={article.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge variant="secondary" className="bg-white/90 text-gray-900">
                {article.category}
              </Badge>
              {article.featured && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white">Featured</Badge>
              )}
              {article.trending && (
                <Badge className="bg-gradient-to-r from-red-400 to-pink-500 text-white">Trending</Badge>
              )}
            </div>
          </div>

          <CardHeader className="pb-3">
            <h3 className="font-bold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
              {article.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2">{article.excerpt}</p>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Author and Meta */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt={article.author} />
                <AvatarFallback className="text-xs">{article.author.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{article.author}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateTime(article.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {article.readTime}m
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {article.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {article.views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  {likeCount}
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark className="w-4 h-4" />
                  {saveCount}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-red-600" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current text-blue-600" : ""}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 p-0 hover:bg-gray-50">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  )
}
