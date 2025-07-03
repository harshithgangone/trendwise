import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 [FRONTEND API] GET /api/articles - Proxying to backend")

    // Get search params from the request
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    console.log(`📊 [FRONTEND API] Query params: ${queryString}`)
    console.log(`🔗 [FRONTEND API] Backend URL: ${BACKEND_URL}`)

    // Forward request to backend
    const backendUrl = `${BACKEND_URL}/articles${queryString ? `?${queryString}` : ""}`
    console.log(`📡 [FRONTEND API] Fetching from: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      cache: "no-store", // Ensure fresh data
    })

    console.log(`📈 [FRONTEND API] Backend response status: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ [FRONTEND API] Backend error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`❌ [FRONTEND API] Backend error details: ${errorText}`)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch articles from backend",
          details: errorText,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in articles route:", error)

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
