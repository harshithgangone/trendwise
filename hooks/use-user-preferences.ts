"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"

interface UserPreferences {
  [articleId: string]: {
    liked: boolean
    saved: boolean
  }
}

interface UseUserPreferencesReturn {
  preferences: UserPreferences
  isLoading: boolean
  likeArticle: (articleId: string) => Promise<{ success: boolean; liked: boolean; likes: number }>
  saveArticle: (articleId: string) => Promise<{ success: boolean; saved: boolean; saves: number }>
  refreshPreferences: (articleIds: string[]) => Promise<void>
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { data: session } = useSession()
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [isLoading, setIsLoading] = useState(false)

  const refreshPreferences = async (articleIds: string[]) => {
    if (!session?.user?.email || articleIds.length === 0) return

    try {
      setIsLoading(true)
      console.log(`🔄 [USER PREFERENCES] Refreshing preferences for ${articleIds.length} articles`)

      const response = await fetch(
        `/api/users/${encodeURIComponent(session.user.email)}/preferences?articleIds=${articleIds.join(",")}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log(`✅ [USER PREFERENCES] Loaded preferences for ${Object.keys(data.preferences).length} articles`)
          setPreferences((prev) => ({ ...prev, ...data.preferences }))
        }
      }
    } catch (error) {
      console.error("❌ [USER PREFERENCES] Error refreshing preferences:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const likeArticle = async (articleId: string) => {
    try {
      console.log(`👍 [USER PREFERENCES] Liking article: ${articleId}`)

      // Optimistic update
      const currentLiked = preferences[articleId]?.liked || false
      setPreferences((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          liked: !currentLiked,
        },
      }))

      const response = await fetch(`/api/articles/like/${articleId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ [USER PREFERENCES] Like successful: ${data.liked ? "liked" : "unliked"}`)

        // Update with server response
        setPreferences((prev) => ({
          ...prev,
          [articleId]: {
            ...prev[articleId],
            liked: data.liked,
          },
        }))

        return {
          success: true,
          liked: data.liked,
          likes: data.likes,
        }
      } else {
        // Revert optimistic update on failure
        setPreferences((prev) => ({
          ...prev,
          [articleId]: {
            ...prev[articleId],
            liked: currentLiked,
          },
        }))

        console.error("❌ [USER PREFERENCES] Like failed:", data.error)
        return {
          success: false,
          liked: currentLiked,
          likes: 0,
        }
      }
    } catch (error) {
      console.error("❌ [USER PREFERENCES] Error liking article:", error)

      // Revert optimistic update on error
      const currentLiked = preferences[articleId]?.liked || false
      setPreferences((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          liked: !currentLiked,
        },
      }))

      return {
        success: false,
        liked: !currentLiked,
        likes: 0,
      }
    }
  }

  const saveArticle = async (articleId: string) => {
    if (!session?.user?.email) {
      console.log("❌ [USER PREFERENCES] No user session for saving")
      return {
        success: false,
        saved: false,
        saves: 0,
      }
    }

    try {
      console.log(`💾 [USER PREFERENCES] Saving article: ${articleId}`)

      // Optimistic update
      const currentSaved = preferences[articleId]?.saved || false
      setPreferences((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          saved: !currentSaved,
        },
      }))

      const response = await fetch(`/api/articles/save/${articleId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ [USER PREFERENCES] Save successful: ${data.saved ? "saved" : "unsaved"}`)

        // Update with server response
        setPreferences((prev) => ({
          ...prev,
          [articleId]: {
            ...prev[articleId],
            saved: data.saved,
          },
        }))

        return {
          success: true,
          saved: data.saved,
          saves: data.saves,
        }
      } else {
        // Revert optimistic update on failure
        setPreferences((prev) => ({
          ...prev,
          [articleId]: {
            ...prev[articleId],
            saved: currentSaved,
          },
        }))

        console.error("❌ [USER PREFERENCES] Save failed:", data.error)
        return {
          success: false,
          saved: currentSaved,
          saves: 0,
        }
      }
    } catch (error) {
      console.error("❌ [USER PREFERENCES] Error saving article:", error)

      // Revert optimistic update on error
      const currentSaved = preferences[articleId]?.saved || false
      setPreferences((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          saved: !currentSaved,
        },
      }))

      return {
        success: false,
        saved: !currentSaved,
        saves: 0,
      }
    }
  }

  return {
    preferences,
    isLoading,
    likeArticle,
    saveArticle,
    refreshPreferences,
  }
}
