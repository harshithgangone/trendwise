export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`👁️ [VIEW API] Tracking view for article ID: ${id}`)

    // For now, return a mock response since we don't have user authentication
    // In a real app, you would update the database here
    const mockResponse = {
      success: true,
      views: Math.floor(Math.random() * 1000) + 100, // Random view count for demo
      articleId: id,
    }

    console.log(`👁️ [VIEW API] Returning mock view data:`, mockResponse)

    return NextResponse.json(mockResponse)
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
