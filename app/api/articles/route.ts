import { type NextRequest, NextResponse } from "next/server"

// Mark this route as dynamic since we're using query parameters
export const dynamic = "force-dynamic"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 [FRONTEND API] GET /api/articles - Starting request")

    // Get search params from the request
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    console.log(`📊 [FRONTEND API] Query params: ${queryString}`)
    console.log(`🔗 [FRONTEND API] Backend URL: ${BACKEND_URL}`)

    // Build the backend URL - note the correct path
    const backendUrl = `${BACKEND_URL}/api/articles${queryString ? `?${queryString}` : ""}`
    console.log(`📡 [FRONTEND API] Fetching from: ${backendUrl}`)

    // Forward request to backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    try {
      const response = await fetch(backendUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store", // Ensure fresh data
      })

      clearTimeout(timeoutId)

      console.log(`📈 [FRONTEND API] Backend response status: ${response.status}`)

      if (!response.ok) {
        console.error(`❌ [FRONTEND API] Backend error: ${response.status} ${response.statusText}`)

        let errorText = ""
        try {
          errorText = await response.text()
          console.error(`❌ [FRONTEND API] Backend error details: ${errorText}`)
        } catch (e) {
          console.error("❌ [FRONTEND API] Could not read error response")
        }

        // Return fallback data for client
        return NextResponse.json({
          success: false,
          error: "Backend temporarily unavailable",
          articles: [], // Empty array so frontend doesn't break
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        })
      }

      const data = await response.json()
      console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles`)

      // Ensure the response has the expected structure
      const responseData = {
        success: data.success !== false,
        articles: data.articles || [],
        pagination: data.pagination || {
          page: 1,
          limit: 10,
          total: data.articles?.length || 0,
          pages: Math.ceil((data.articles?.length || 0) / 10),
          hasNext: false,
          hasPrev: false,
        },
      }

      return NextResponse.json(responseData)
    } catch (fetchError) {
      clearTimeout(timeoutId)

      if (fetchError.name === "AbortError") {
        console.error("❌ [FRONTEND API] Request timeout")
      } else {
        console.error("❌ [FRONTEND API] Fetch error:", fetchError)
      }

      // Return fallback response
      return NextResponse.json({
        success: false,
        error: "Unable to connect to backend",
        articles: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in articles route:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        articles: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      },
      { status: 500 },
    )
  }
}
