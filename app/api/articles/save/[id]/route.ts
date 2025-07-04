export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`🔖 [SAVE API] Processing save for article: ${id}`)

    // For now, just return a mock response since we don't have user authentication set up
    // In a real app, you'd check if user is logged in and toggle their save status
    const mockSaved = Math.random() > 0.5
    const mockSaves = Math.floor(Math.random() * 50) + 5

    console.log(`🔖 [SAVE API] Mock save status: ${mockSaved}, count: ${mockSaves}`)

    return NextResponse.json({
      success: true,
      saved: mockSaved,
      saves: mockSaves,
      articleId: id,
    })
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
