"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

const useUserPreferences = () => {
  const { data: session } = useSession()
  const [likedArticles, setLikedArticles] = useState<string[]>([])
  const [savedArticles, setSavedArticles] = useState<string[]>([])

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!session?.user?.email) return

      try {
        const response = await fetch(`/api/user/preferences?userId=${session.user.email}`)
        if (response.ok) {
          const data = await response.json()
          setLikedArticles(data.likedArticles || [])
          setSavedArticles(data.savedArticles || [])
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error)
      }
    }

    fetchUserPreferences()
  }, [session?.user?.email])

  const isArticleLiked = useCallback(
    (articleId: string) => {
      return likedArticles.includes(articleId)
    },
    [likedArticles],
  )

  const isArticleSaved = useCallback(
    (articleId: string) => {
      return savedArticles.includes(articleId)
    },
    [savedArticles],
  )

  const likeArticle = useCallback(
    async (articleId: string): Promise<boolean> => {
      if (!session?.user?.email) return false

      try {
        const currentlyLiked = isArticleLiked(articleId)
        const action = currentlyLiked ? "unlike" : "like"

        const response = await fetch(`/api/articles/${articleId}/like`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: session.user.email,
            action: action,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const newLikedState = data.isLiked

          if (newLikedState) {
            setLikedArticles((prev) => [...prev.filter((id) => id !== articleId), articleId])
          } else {
            setLikedArticles((prev) => prev.filter((id) => id !== articleId))
          }

          return newLikedState
        }
        return currentlyLiked
      } catch (error) {
        console.error("Error liking article:", error)
        return isArticleLiked(articleId)
      }
    },
    [session?.user?.email, isArticleLiked],
  )

  const saveArticle = useCallback(
    async (articleId: string): Promise<boolean> => {
      if (!session?.user?.email) return false

      try {
        const currentlySaved = isArticleSaved(articleId)
        const action = currentlySaved ? "unsave" : "save"

        const response = await fetch(`/api/articles/${articleId}/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: session.user.email,
            action: action,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const newSavedState = data.isSaved

          if (newSavedState) {
            setSavedArticles((prev) => [...prev.filter((id) => id !== articleId), articleId])
          } else {
            setSavedArticles((prev) => prev.filter((id) => id !== articleId))
          }

          return newSavedState
        }
        return currentlySaved
      } catch (error) {
        console.error("Error saving article:", error)
        return isArticleSaved(articleId)
      }
    },
    [session?.user?.email, isArticleSaved],
  )

  return {
    likedArticles,
    savedArticles,
    isArticleLiked,
    isArticleSaved,
    likeArticle,
    saveArticle,
  }
}

export default useUserPreferences
