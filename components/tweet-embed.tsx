"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageCircle, Repeat2, Heart, Search } from "lucide-react"

interface Tweet {
  username: string
  handle: string
  text: string
  link: string
  timestamp: string
  engagement?: {
    likes: number
    retweets: number
    replies: number
  }
}

interface TweetEmbedProps {
  tweet: Tweet
  index?: number
  searchUrl?: string
  query?: string
}

export function TweetEmbed({ tweet, index = 0, searchUrl, query }: TweetEmbedProps) {
  const handleViewOnTwitter = () => {
    if (searchUrl) {
      window.open(searchUrl, "_blank", "noopener,noreferrer")
    } else {
      window.open(tweet.link, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={`/placeholder.svg?height=40&width=40`} alt={tweet.username} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {tweet.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Tweet Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-gray-900 truncate">{tweet.username}</span>
                <span className="text-gray-500 text-sm">{tweet.handle}</span>
                <span className="text-gray-400 text-sm">•</span>
                <span className="text-gray-400 text-sm">{new Date(tweet.timestamp).toLocaleDateString()}</span>
              </div>

              <p className="text-gray-800 mb-3 leading-relaxed">{tweet.text}</p>

              {/* Tweet Engagement Stats */}
              {tweet.engagement && (
                <div className="flex items-center space-x-6 text-gray-500 text-sm mb-3">
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{tweet.engagement.replies}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Repeat2 className="h-4 w-4" />
                    <span>{tweet.engagement.retweets}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{tweet.engagement.likes}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded-full">🤖 AI Generated Tweet</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewOnTwitter}
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 bg-transparent"
                >
                  <Search className="h-4 w-4 mr-1" />
                  View Real Tweets
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
