export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`🔖 [SAVE API] Processing save for article ID: ${id}`)

    // For now, return a mock response since we don't have user authentication
    // In a real app, you would check authentication and update the database
    const mockResponse = {
      success: true,
      saved: Math.random() > 0.5, // Random save state for demo
      saves: Math.floor(Math.random() * 50) + 5, // Random save count for demo
      articleId: id,
    }

    console.log(`🔖 [SAVE API] Returning mock save data:`, mockResponse)

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error("🔖 [SAVE API] Error processing save:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process save",
      },
      { status: 500 },
    )
  }
}
