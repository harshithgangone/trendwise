export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
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

    console.log(`❤️ [LIKE API] Processing real like for article: ${id} by user: ${session.user.id}`)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${BACKEND_URL}/api/articles/${id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [LIKE API] Real like processed in backend:`, data)
        return NextResponse.json({
          success: true,
          liked: data.liked,
          likes: data.likes,
          articleId: id,
        })
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [LIKE API] Backend failed: ${response.status} - ${errorText}`)
      }
    } catch (backendError) {
      console.log(`⚠️ [LIKE API] Backend unavailable:`, backendError)
    }

    // Return error if backend is unavailable
    return NextResponse.json(
      {
        success: false,
        error: "Like service unavailable",
      },
      { status: 503 },
    )
  } catch (error) {
    console.error("❌ [LIKE API] Error processing like:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process like",
      },
      { status: 500 },
    )
  }
}
