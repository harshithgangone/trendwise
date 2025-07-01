"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface UserPreferences {
  savedArticles: string[]
  likedArticles: string[]
  recentlyViewed: string[]
}

interface Article {
  _id: string
  title: string
  slug: string
  excerpt: string
  thumbnail: string
  createdAt: string
  tags: string[]
  readTime: number
}

export function useUserPreferences() {
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences>({
    savedArticles: [],
    likedArticles: [],
    recentlyViewed: [],
  })

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (session?.user?.email) {
      const stored = localStorage.getItem(`user_preferences_${session.user.email}`)
      if (stored) {
        try {
          setPreferences(JSON.parse(stored))
        } catch (error) {
          console.error("Error parsing stored preferences:", error)
        }
      }
    }
  }, [session?.user?.email])

  // Save preferences to localStorage whenever they change
  const savePreferences = (newPreferences: UserPreferences) => {
    if (session?.user?.email) {
      localStorage.setItem(`user_preferences_${session.user.email}`, JSON.stringify(newPreferences))
      setPreferences(newPreferences)
    }
  }

  const saveArticle = async (articleId: string) => {
    const isCurrentlySaved = preferences.savedArticles.includes(articleId)
    const newSaved = isCurrentlySaved
      ? preferences.savedArticles.filter((id) => id !== articleId)
      : [...preferences.savedArticles, articleId]

    savePreferences({
      ...preferences,
      savedArticles: newSaved,
    })

    // Call backend to update saves count
    try {
      await fetch(`/api/articles/save/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: !isCurrentlySaved }),
      })
    } catch (error) {
      console.error("Failed to update saves count on backend:", error)
    }

    return !isCurrentlySaved // Return new state
  }

  const likeArticle = async (articleId: string) => {
    const isCurrentlyLiked = preferences.likedArticles.includes(articleId)
    const newLiked = isCurrentlyLiked
      ? preferences.likedArticles.filter((id) => id !== articleId)
      : [...preferences.likedArticles, articleId]

    savePreferences({
      ...preferences,
      likedArticles: newLiked,
    })

    // Call backend to update likes count
    try {
      await fetch(`/api/articles/like/${articleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ increment: !isCurrentlyLiked }),
      })
    } catch (error) {
      console.error("Failed to update likes count on backend:", error)
    }

    return !isCurrentlyLiked // Return new state
  }

  const addToRecentlyViewed = (articleId: string) => {
    const newViewed = [articleId, ...preferences.recentlyViewed.filter((id) => id !== articleId)].slice(0, 10) // Keep last 10

    savePreferences({
      ...preferences,
      recentlyViewed: newViewed,
    })
  }

  const isArticleSaved = (articleId: string) => preferences.savedArticles.includes(articleId)
  const isArticleLiked = (articleId: string) => preferences.likedArticles.includes(articleId)

  return {
    preferences,
    saveArticle,
    likeArticle,
    addToRecentlyViewed,
    isArticleSaved,
    isArticleLiked,
  }
}
