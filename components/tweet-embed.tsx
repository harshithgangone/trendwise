"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Repeat2, ExternalLink } from "lucide-react"
import type { Tweet } from "@/components/tweets-section"

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
    } else if (query) {
      const twitterSearchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`
      window.open(twitterSearchUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-300 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${tweet.username}`} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {tweet.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-semibold text-gray-900 truncate">{tweet.username}</h4>
                <span className="text-gray-500 text-sm">{tweet.handle}</span>
                <span className="text-gray-400 text-sm">•</span>
                <span className="text-gray-500 text-sm">{new Date(tweet.timestamp).toLocaleDateString()}</span>
              </div>

              <p className="text-gray-800 mb-3 leading-relaxed">{tweet.text}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6 text-gray-500">
                  <div className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-sm">{tweet.engagement?.replies || 0}</span>
                  </div>

                  <div className="flex items-center space-x-1 hover:text-green-500 cursor-pointer">
                    <Repeat2 className="h-4 w-4" />
                    <span className="text-sm">{tweet.engagement?.retweets || 0}</span>
                  </div>

                  <div className="flex items-center space-x-1 hover:text-red-500 cursor-pointer">
                    <Heart className="h-4 w-4" />
                    <span className="text-sm">{tweet.engagement?.likes || 0}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleViewOnTwitter}
                  className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View on Twitter
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
