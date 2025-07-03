import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()

    console.log(`💾 [FRONTEND API] POST /api/articles/${id}/save`)

    const response = await fetch(`${BACKEND_URL}/articles/${id}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in save route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process save",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
