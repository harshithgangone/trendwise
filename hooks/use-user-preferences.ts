"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface UserPreference {
  userId?: string
  email?: string
  likedArticles: string[]
  savedArticles: string[]
  recentlyViewed: string[]
}

export function useUserPreferences() {
  const { data: session, status } = useSession()
  const [preferences, setPreferences] = useState<UserPreference>({
    likedArticles: [],
    savedArticles: [],
    recentlyViewed: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only fetch preferences if user is authenticated
    if (status === "authenticated" && session?.user) {
      const loadPreferences = async () => {
        try {
          // Try to load from localStorage first for immediate display
          const storedPrefs = localStorage.getItem(`userPrefs_${session.user?.email}`)
          if (storedPrefs) {
            setPreferences(JSON.parse(storedPrefs))
          }

          // Then fetch from backend to ensure we have the latest data
          const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"
          const response = await fetch(
            `${backendUrl}/api/user/preferences?email=${encodeURIComponent(session.user.email || "")}`,
          )

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.preferences) {
              // Transform backend data to frontend format
              const prefs = {
                userId: data.preferences.userId,
                email: data.preferences.email,
                likedArticles: data.preferences.likedArticles.map((item: any) => item.articleId),
                savedArticles: data.preferences.savedArticles.map((item: any) => item.articleId),
                recentlyViewed: data.preferences.recentlyViewed.map((item: any) => item.articleId),
              }

              setPreferences(prefs)
              // Update localStorage
              localStorage.setItem(`userPrefs_${session.user?.email}`, JSON.stringify(prefs))
            }
          }
        } catch (error) {
          console.error("Error loading user preferences:", error)
        } finally {
          setLoading(false)
        }
      }

      loadPreferences()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [session, status])

  // Function to add an article to recently viewed
  const addToRecentlyViewed = (articleId: string) => {
    if (!articleId || !session?.user?.email) return

    setPreferences((prev) => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.recentlyViewed.filter((id) => id !== articleId)
      // Add to beginning of array (most recent first)
      const updated = [articleId, ...filtered].slice(0, 20) // Keep only last 20

      // Update localStorage
      const updatedPrefs = { ...prev, recentlyViewed: updated }
      localStorage.setItem(`userPrefs_${session.user?.email}`, JSON.stringify(updatedPrefs))

      // Update backend asynchronously
      updateBackendPreferences(updatedPrefs)

      return updatedPrefs
    })
  }

  // Function to toggle liked status
  const toggleLiked = (articleId: string) => {
    if (!articleId || !session?.user?.email) return false

    let isNowLiked = false

    setPreferences((prev) => {
      const isLiked = prev.likedArticles.includes(articleId)
      let updated

      if (isLiked) {
        // Remove from liked
        updated = prev.likedArticles.filter((id) => id !== articleId)
        isNowLiked = false
      } else {
        // Add to liked
        updated = [...prev.likedArticles, articleId]
        isNowLiked = true
      }

      // Update localStorage
      const updatedPrefs = { ...prev, likedArticles: updated }
      localStorage.setItem(`userPrefs_${session.user?.email}`, JSON.stringify(updatedPrefs))

      // Update backend asynchronously
      updateBackendPreferences(updatedPrefs)

      return updatedPrefs
    })

    return isNowLiked
  }

  // Function to toggle saved status
  const toggleSaved = (articleId: string) => {
    if (!articleId || !session?.user?.email) return false

    let isNowSaved = false

    setPreferences((prev) => {
      const isSaved = prev.savedArticles.includes(articleId)
      let updated

      if (isSaved) {
        // Remove from saved
        updated = prev.savedArticles.filter((id) => id !== articleId)
        isNowSaved = false
      } else {
        // Add to saved
        updated = [...prev.savedArticles, articleId]
        isNowSaved = true
      }

      // Update localStorage
      const updatedPrefs = { ...prev, savedArticles: updated }
      localStorage.setItem(`userPrefs_${session.user?.email}`, JSON.stringify(updatedPrefs))

      // Update backend asynchronously
      updateBackendPreferences(updatedPrefs)

      return updatedPrefs
    })

    return isNowSaved
  }

  // Helper function to update backend
  const updateBackendPreferences = async (prefs: UserPreference) => {
    if (!session?.user?.email) return

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"
      await fetch(`${backendUrl}/api/user/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: session.user.email,
          preferences: prefs,
        }),
      })
    } catch (error) {
      console.error("Error updating user preferences:", error)
    }
  }

  // Check if an article is liked
  const isLiked = (articleId: string) => {
    return preferences.likedArticles.includes(articleId)
  }

  // Check if an article is saved
  const isSaved = (articleId: string) => {
    return preferences.savedArticles.includes(articleId)
  }

  return {
    preferences,
    loading,
    addToRecentlyViewed,
    toggleLiked,
    toggleSaved,
    isLiked,
    isSaved,
  }
}
