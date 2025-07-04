export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`❤️ [LIKE API] Processing like for article ID: ${id}`)

    // For now, return a mock response since we don't have user authentication
    // In a real app, you would check authentication and update the database
    const mockResponse = {
      success: true,
      liked: Math.random() > 0.5, // Random like state for demo
      likes: Math.floor(Math.random() * 100) + 10, // Random like count for demo
      articleId: id,
    }

    console.log(`❤️ [LIKE API] Returning mock like data:`, mockResponse)

    return NextResponse.json(mockResponse)
  } catch (error) {
    console.error("❤️ [LIKE API] Error processing like:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process like",
      },
      { status: 500 },
    )
  }
}
