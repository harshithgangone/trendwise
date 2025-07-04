"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"

interface UserPreferences {
  userId: string
  email: string
  likedArticles: string[]
  savedArticles: string[]
  recentlyViewed: string[]
  preferences: {
    categories: string[]
    tags: string[]
    readingTime: string
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  userId: "",
  email: "",
  savedArticles: [],
  likedArticles: [],
  recentlyViewed: [],
  preferences: {
    categories: [],
    tags: [],
    readingTime: "",
  },
}

export function useUserPreferences() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserPreferences()
    } else {
      setLoading(false)
    }
  }, [session])

  const fetchUserPreferences = async () => {
    try {
      console.log(`👤 [USER PREFERENCES HOOK] Fetching preferences for user: ${session?.user?.id}`)

      const response = await fetch("/api/user/preferences")

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [USER PREFERENCES HOOK] Fetched preferences:`, {
          likedCount: data.preferences?.likedArticles?.length || 0,
          savedCount: data.preferences?.savedArticles?.length || 0,
        })
        setPreferences(data.preferences)
      } else {
        console.error(`❌ [USER PREFERENCES HOOK] Failed to fetch preferences: ${response.status}`)
        setError("Failed to load user preferences")
      }
    } catch (error) {
      console.error("❌ [USER PREFERENCES HOOK] Error:", error)
      setError("Failed to load user preferences")
    } finally {
      setLoading(false)
    }
  }

  const refreshPreferences = () => {
    if (session?.user?.id) {
      setLoading(true)
      fetchUserPreferences()
    }
  }

  // Save preferences to localStorage
  const savePreferences = useCallback(
    (newPreferences: UserPreferences) => {
      if (session?.user?.email) {
        try {
          localStorage.setItem(`preferences_${session.user.email}`, JSON.stringify(newPreferences))
          setPreferences(newPreferences)
        } catch (error) {
          console.error("Error saving preferences:", error)
          toast({
            title: "Error",
            description: "Failed to save preferences",
            variant: "destructive",
          })
        }
      }
    },
    [session?.user?.email, toast],
  )

  // Save article
  const saveArticle = useCallback(
    async (articleId: string): Promise<boolean> => {
      if (!session?.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to save articles",
          variant: "destructive",
        })
        return false
      }

      try {
        const currentSaved = preferences?.savedArticles || []
        const isCurrentlySaved = currentSaved.includes(articleId)
        const newSavedArticles = isCurrentlySaved
          ? currentSaved.filter((id) => id !== articleId)
          : [...currentSaved, articleId]

        const newPreferences = {
          ...preferences,
          savedArticles: newSavedArticles,
        }

        savePreferences(newPreferences)

        // Try to update backend
        try {
          const response = await fetch(`/api/articles/save/${articleId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: isCurrentlySaved ? "unsave" : "save" }),
          })

          if (!response.ok) {
            console.log("Backend save failed, but local state updated")
          }
        } catch (error) {
          console.log("Backend unavailable for save, but local state updated")
        }

        return !isCurrentlySaved
      } catch (error) {
        console.error("Error saving article:", error)
        toast({
          title: "Error",
          description: "Failed to save article",
          variant: "destructive",
        })
        return false
      }
    },
    [preferences, savePreferences, session?.user, toast],
  )

  // Like article
  const likeArticle = useCallback(
    async (articleId: string): Promise<boolean> => {
      if (!session?.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in to like articles",
          variant: "destructive",
        })
        return false
      }

      try {
        const currentLiked = preferences?.likedArticles || []
        const isCurrentlyLiked = currentLiked.includes(articleId)
        const newLikedArticles = isCurrentlyLiked
          ? currentLiked.filter((id) => id !== articleId)
          : [...currentLiked, articleId]

        const newPreferences = {
          ...preferences,
          likedArticles: newLikedArticles,
        }

        savePreferences(newPreferences)

        // Try to update backend
        try {
          const response = await fetch(`/api/articles/like/${articleId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: isCurrentlyLiked ? "unlike" : "like" }),
          })

          if (!response.ok) {
            console.log("Backend like failed, but local state updated")
          }
        } catch (error) {
          console.log("Backend unavailable for like, but local state updated")
        }

        return !isCurrentlyLiked
      } catch (error) {
        console.error("Error liking article:", error)
        toast({
          title: "Error",
          description: "Failed to like article",
          variant: "destructive",
        })
        return false
      }
    },
    [preferences, savePreferences, session?.user, toast],
  )

  // Add to recently viewed
  const addToRecentlyViewed = useCallback(
    (articleId: string) => {
      if (!session?.user || !articleId) return

      try {
        const currentViewed = preferences?.recentlyViewed || []
        const newRecentlyViewed = [articleId, ...currentViewed.filter((id) => id !== articleId)].slice(0, 10)

        const newPreferences = {
          ...preferences,
          recentlyViewed: newRecentlyViewed,
        }

        savePreferences(newPreferences)
      } catch (error) {
        console.error("Error adding to recently viewed:", error)
      }
    },
    [preferences, savePreferences, session?.user],
  )

  // Check if article is saved
  const isArticleSaved = useCallback(
    (articleId: string): boolean => {
      return (preferences?.savedArticles || []).includes(articleId)
    },
    [preferences?.savedArticles],
  )

  // Check if article is liked
  const isArticleLiked = useCallback(
    (articleId: string): boolean => {
      return (preferences?.likedArticles || []).includes(articleId)
    },
    [preferences?.likedArticles],
  )

  return {
    preferences,
    loading,
    error,
    refreshPreferences,
    saveArticle,
    likeArticle,
    addToRecentlyViewed,
    isArticleSaved,
    isArticleLiked,
    savePreferences,
  }
}
