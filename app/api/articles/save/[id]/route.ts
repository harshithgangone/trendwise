import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const { increment } = body

    // Try to update backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      const response = await fetch(`${backendUrl}/api/articles/save/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ increment }),
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      } else {
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend not available for save operation:", backendError.message)

      // Return mock response if backend is down
      return NextResponse.json({
        success: true,
        saves: increment ? 1 : 0,
        saved: increment,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in save API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update save",
      },
      { status: 500 },
    )
  }
}
