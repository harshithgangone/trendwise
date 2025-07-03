"use client"

import { useState, useEffect } from "react"

interface UserPreferences {
  likedArticles: string[]
  savedArticles: string[]
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences
  isLiked: (articleId: string) => boolean
  isSaved: (articleId: string) => boolean
  toggleLike: (articleId: string) => Promise<boolean>
  toggleSave: (articleId: string) => Promise<boolean>
  loading: boolean
}

export function useUserPreferences(userId?: string): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>({
    likedArticles: [],
    savedArticles: [],
  })
  const [loading, setLoading] = useState(false)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("userPreferences")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPreferences(parsed)
      } catch (error) {
        console.error("Error parsing stored preferences:", error)
      }
    }
  }, [])

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userPreferences", JSON.stringify(preferences))
  }, [preferences])

  const isLiked = (articleId: string): boolean => {
    return preferences.likedArticles.includes(articleId)
  }

  const isSaved = (articleId: string): boolean => {
    return preferences.savedArticles.includes(articleId)
  }

  const toggleLike = async (articleId: string): Promise<boolean> => {
    const wasLiked = isLiked(articleId)

    // Optimistic update
    setPreferences((prev) => ({
      ...prev,
      likedArticles: wasLiked
        ? prev.likedArticles.filter((id) => id !== articleId)
        : [...prev.likedArticles, articleId],
    }))

    try {
      setLoading(true)
      const response = await fetch(`/api/articles/${articleId}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId || "anonymous",
        }),
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on failure
        setPreferences((prev) => ({
          ...prev,
          likedArticles: wasLiked
            ? [...prev.likedArticles, articleId]
            : prev.likedArticles.filter((id) => id !== articleId),
        }))
        throw new Error(data.error || "Failed to toggle like")
      }

      return data.liked
    } catch (error) {
      console.error("Error toggling like:", error)
      // Revert optimistic update on error
      setPreferences((prev) => ({
        ...prev,
        likedArticles: wasLiked
          ? [...prev.likedArticles, articleId]
          : prev.likedArticles.filter((id) => id !== articleId),
      }))
      return wasLiked
    } finally {
      setLoading(false)
    }
  }

  const toggleSave = async (articleId: string): Promise<boolean> => {
    if (!userId) {
      throw new Error("User must be logged in to save articles")
    }

    const wasSaved = isSaved(articleId)

    // Optimistic update
    setPreferences((prev) => ({
      ...prev,
      savedArticles: wasSaved
        ? prev.savedArticles.filter((id) => id !== articleId)
        : [...prev.savedArticles, articleId],
    }))

    try {
      setLoading(true)
      const response = await fetch(`/api/articles/${articleId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        // Revert optimistic update on failure
        setPreferences((prev) => ({
          ...prev,
          savedArticles: wasSaved
            ? [...prev.savedArticles, articleId]
            : prev.savedArticles.filter((id) => id !== articleId),
        }))
        throw new Error(data.error || "Failed to toggle save")
      }

      return data.saved
    } catch (error) {
      console.error("Error toggling save:", error)
      // Revert optimistic update on error
      setPreferences((prev) => ({
        ...prev,
        savedArticles: wasSaved
          ? [...prev.savedArticles, articleId]
          : prev.savedArticles.filter((id) => id !== articleId),
      }))
      return wasSaved
    } finally {
      setLoading(false)
    }
  }

  return {
    preferences,
    isLiked,
    isSaved,
    toggleLike,
    toggleSave,
    loading,
  }
}
