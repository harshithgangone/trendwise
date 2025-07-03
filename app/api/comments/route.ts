export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get("articleId")

    if (!articleId || articleId === "undefined") {
      console.log("⚠️ [FRONTEND API] No valid articleId provided for comments")
      return NextResponse.json({
        success: true,
        comments: [],
        total: 0,
      })
    }

    console.log(`💬 [FRONTEND API] Fetching comments for article: ${articleId}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${BACKEND_URL}/api/comments?articleId=${articleId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.comments?.length || 0} comments`)
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for comments`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for comments, returning empty array")

      return NextResponse.json({
        success: true,
        comments: [],
        total: 0,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching comments:", error)

    return NextResponse.json({
      success: true,
      comments: [],
      total: 0,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }

    const { articleId, content } = await request.json()

    if (!articleId || !content || articleId === "undefined") {
      return NextResponse.json({ success: false, error: "Article ID and content are required" }, { status: 400 })
    }

    console.log(`💬 [FRONTEND API] Posting comment for article: ${articleId}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        body: JSON.stringify({
          articleId,
          content,
          author: {
            name: session.user.name || "Anonymous",
            email: session.user.email,
            image: session.user.image || "/placeholder.svg?height=40&width=40",
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully posted comment")
        return NextResponse.json(data)
      } else {
        const errorData = await response.json()
        console.log(`⚠️ [FRONTEND API] Backend error posting comment: ${response.status}`)
        return NextResponse.json(errorData, { status: response.status })
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for posting comment")

      return NextResponse.json(
        {
          success: false,
          error: "Unable to post comment at this time. Please try again later.",
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error posting comment:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to post comment",
      },
      { status: 500 },
    )
  }
}
