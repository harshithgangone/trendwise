export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    console.log("👤 [USER PREFERENCES API] Starting request")
    
    const session = await getServerSession(authOptions)
    console.log("👤 [USER PREFERENCES API] Session:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      email: session?.user?.email
    })

    if (!session?.user?.id) {
      console.log("❌ [USER PREFERENCES API] No user ID in session")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required - no user ID found",
        },
        { status: 401 },
      )
    }

    console.log(`👤 [USER PREFERENCES API] Fetching preferences for user: ${session.user.id}`)

    // For now, return mock preferences since we're having database issues
    // This will allow the profile page to work while we fix the backend
    const mockPreferences = {
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

    console.log("✅ [USER PREFERENCES API] Returning mock preferences")
    
    return NextResponse.json({
      success: true,
      preferences: mockPreferences,
      source: "mock_data",
    })
  } catch (error) {
    console.error("❌ [USER PREFERENCES API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user preferences",
      },
      { status: 500 },
    )
  }
}