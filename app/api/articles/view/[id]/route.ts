export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`👁️ [VIEW API] Tracking view for article: ${id}`)

    // For now, just return a mock response since we don't have user tracking set up
    // In a real app, you'd increment the view count in your database
    const mockViews = Math.floor(Math.random() * 1000) + 100

    console.log(`👁️ [VIEW API] Mock view count: ${mockViews}`)

    return NextResponse.json({
      success: true,
      views: mockViews,
      articleId: id,
    })
  } catch (error) {
    console.error("👁️ [VIEW API] Error tracking view:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to track view",
      },
      { status: 500 },
    )
  }
}
