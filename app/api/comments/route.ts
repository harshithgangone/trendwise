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
      console.log("⚠️ [COMMENTS API] No valid articleId provided")
      return NextResponse.json({
        success: true,
        comments: [],
        total: 0,
      })
    }

    console.log(`💬 [COMMENTS API] Fetching comments for article: ${articleId}`)

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
        console.log(`✅ [COMMENTS API] Successfully fetched ${data.comments?.length || 0} comments`)
        return NextResponse.json({
          success: true,
          comments: data.comments || [],
          total: data.total || 0,
        })
      } else {
        console.log(`⚠️ [COMMENTS API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [COMMENTS API] Backend unavailable, returning empty comments")
      return NextResponse.json({
        success: true,
        comments: [],
        total: 0,
      })
    }
  } catch (error) {
    console.error("❌ [COMMENTS API] Error fetching comments:", error)
    return NextResponse.json({
      success: true,
      comments: [],
      total: 0,
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("💬 [COMMENTS API] POST request received")

    const session = await getServerSession(authOptions)

    if (!session || !session.user || !session.user.email) {
      console.log("❌ [COMMENTS API] No valid session found")
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required. Please sign in to post comments.",
        },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { articleId, content } = body

    console.log(`💬 [COMMENTS API] Posting comment for article: ${articleId}`)

    if (!articleId || !content || articleId === "undefined") {
      console.log("❌ [COMMENTS API] Missing required fields")
      return NextResponse.json(
        {
          success: false,
          error: "Article ID and content are required",
        },
        { status: 400 },
      )
    }

    if (content.trim().length < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Comment cannot be empty",
        },
        { status: 400 },
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Comment is too long (max 1000 characters)",
        },
        { status: 400 },
      )
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const commentData = {
        articleId,
        content: content.trim(),
        author: {
          name: session.user.name || "Anonymous User",
          email: session.user.email,
          image: session.user.image || "/placeholder.svg?height=40&width=40",
        },
      }

      console.log("💬 [COMMENTS API] Sending to backend:", commentData)

      const response = await fetch(`${BACKEND_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        body: JSON.stringify(commentData),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [COMMENTS API] Successfully posted comment")
        return NextResponse.json({
          success: true,
          comment: data.comment,
          message: "Comment posted successfully!",
        })
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [COMMENTS API] Backend error: ${response.status} - ${errorText}`)

        return NextResponse.json(
          {
            success: false,
            error: `Failed to post comment (${response.status})`,
          },
          { status: response.status },
        )
      }
    } catch (backendError: any) {
      console.log("⚠️ [COMMENTS API] Backend unavailable:", backendError.message)

      if (backendError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Request timed out. Please try again.",
          },
          { status: 408 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Unable to post comment at this time. Please try again later.",
        },
        { status: 503 },
      )
    }
  } catch (error: any) {
    console.error("❌ [COMMENTS API] Unexpected error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 },
    )
  }
}
