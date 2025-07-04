export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`👁️ [VIEW API] Tracking real view for article: ${id}`)

    // Try to update view count in backend
    try {
      const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"
      const response = await fetch(`${BACKEND_URL}/api/articles/${id}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [VIEW API] Real view tracked in backend:`, data)
        return NextResponse.json({
          success: true,
          views: data.views,
          articleId: id,
        })
      } else {
        console.log(`⚠️ [VIEW API] Backend failed, not incrementing view`)
      }
    } catch (backendError) {
      console.log(`⚠️ [VIEW API] Backend unavailable, not incrementing view`)
    }

    // Don't increment views if backend is unavailable - return current count
    return NextResponse.json({
      success: false,
      message: "View not tracked - backend unavailable",
      articleId: id,
    })
  } catch (error) {
    console.error("❌ [VIEW API] Error tracking view:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to track view",
      },
      { status: 500 },
    )
  }
}
