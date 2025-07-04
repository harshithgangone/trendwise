export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 },
      )
    }

    console.log(`👤 [USER PREFERENCES] Fetching preferences for user: ${session.user.id}`)

    // Try to fetch user preferences from backend
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

      const response = await fetch(`${BACKEND_URL}/api/user/preferences/${session.user.id}`, {
          method: "GET",
          headers: {
          "Content-Type": "application/json",
  },
})

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [USER PREFERENCES] Fetched from backend:`, {
          likedCount: data.preferences?.likedArticles?.length || 0,
          savedCount: data.preferences?.savedArticles?.length || 0,
          recentCount: data.preferences?.recentlyViewed?.length || 0,
        })

        return NextResponse.json({
          success: true,
          preferences: data.preferences,
          source: "backend",
        })
      }
    } catch (backendError) {
      console.log(`⚠️ [USER PREFERENCES] Backend unavailable`)
    }

    // Return empty preferences if backend is unavailable
    const emptyPreferences = {
      userId: session.user.id,
      email: session.user.email,
      likedArticles: [],
      savedArticles: [],
      recentlyViewed: [],
      preferences: {
        categories: [],
        tags: [],
        readingTime: "any",
      },
    }

    return NextResponse.json({
      success: true,
      preferences: emptyPreferences,
      source: "fallback",
    })
  } catch (error) {
    console.error("❌ [USER PREFERENCES] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user preferences",
      },
      { status: 500 },
    )
  }
}
