import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    console.log(`👍 [FRONTEND API] POST /api/articles/${id}/like`)

    // Get user session
    const session = await getServerSession(authOptions)
    const userId = session?.user?.email || null

    console.log(`👤 [FRONTEND API] User: ${userId || "Anonymous"}`)

    // Forward request to backend
    const backendUrl = `${BACKEND_URL}/articles/${id}/like`
    console.log(`📡 [FRONTEND API] Forwarding to: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      body: JSON.stringify({ userId }),
    })

    console.log(`📈 [FRONTEND API] Backend response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [FRONTEND API] Backend error: ${errorText}`)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to like article",
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Like operation successful: ${JSON.stringify(data)}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in like route:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
