"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, Eye, Star, Heart, Bookmark } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

interface Article {
  _id: string
  title: string
  slug: string
  excerpt: string
  thumbnail: string
  createdAt: string
  tags: string[]
  readTime: number
  views?: number
  featured?: boolean
  likes?: number
  saves?: number
}

interface ArticleCardProps {
  article: Article
  index?: number
}

export function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card
        className={`h-full overflow-hidden transition-all duration-300 border-0 shadow-soft hover:shadow-large group ${
          article.featured ? "card-featured" : "card-professional"
        }`}
      >
        <div className="relative h-56 overflow-hidden">
          <Image
            src={article.thumbnail || "/placeholder.svg?height=224&width=400"}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Featured badge */}
          {article.featured && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-medium">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="bg-white/90 text-gray-800 border-0 shadow-soft">
              {article.tags[0] || "Trending"}
            </Badge>
          </div>

          {/* Views counter */}
          {article.views && (
            <div className="absolute bottom-4 right-4 flex items-center text-white text-sm font-medium space-x-2">
              <Eye className="w-4 h-4 mr-1" />
              {article.views.toLocaleString()}
              <Heart className="w-4 h-4 ml-3 mr-1" />
              {(article.likes ?? 0).toLocaleString()}
              <Bookmark className="w-4 h-4 ml-3 mr-1" />
              {(article.saves ?? 0).toLocaleString()}
            </div>
          )}
        </div>

        <CardContent className="p-6">
          <h3 className="text-xl font-bold mb-3 line-clamp-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
            <Link href={`/article/${article.slug}`} className="hover:underline">
              {article.title}
            </Link>
          </h3>
          <p className="text-gray-600 line-clamp-3 mb-4 leading-relaxed">{article.excerpt}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {article.tags.slice(1, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs border-gray-300 text-gray-600 hover:bg-gray-100">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>

        <CardFooter className="px-6 pb-6 pt-0 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDateTime(article.createdAt)}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {article.readTime} min read
            </div>
          </div>

          <Link
            href={`/article/${article.slug}`}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300"
          >
            Read more →
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
