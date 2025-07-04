export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`❤️ [LIKE API] Processing like for article: ${id}`)

    // For now, just return a mock response since we don't have user authentication set up
    // In a real app, you'd check if user is logged in and toggle their like status
    const mockLiked = Math.random() > 0.5
    const mockLikes = Math.floor(Math.random() * 100) + 10

    console.log(`❤️ [LIKE API] Mock like status: ${mockLiked}, count: ${mockLikes}`)

    return NextResponse.json({
      success: true,
      liked: mockLiked,
      likes: mockLikes,
      articleId: id,
    })
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
