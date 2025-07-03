import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:10000"

export async function GET(request: NextRequest) {
  try {
    console.log("🔗 [FRONTEND API] GET /api/articles - Proxying to backend")

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const category = searchParams.get("category") || ""
    const featured = searchParams.get("featured") || ""

    let backendUrl = `${BACKEND_URL}/api/articles?page=${page}&limit=${limit}`
    if (category) {
      backendUrl += `&category=${category}`
    }
    if (featured) {
      backendUrl += `&featured=${featured}`
    }

    console.log(`📡 [FRONTEND API] Fetching from backend: ${backendUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log(`📊 [FRONTEND API] Backend response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [FRONTEND API] Backend error: ${response.status} ${response.statusText}`)
      console.error(`❌ [FRONTEND API] Error details: ${errorText}`)

      // Return fallback response
      return NextResponse.json(
        {
          success: false,
          error: "Backend temporarily unavailable",
          details: errorText,
          articles: [],
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        { status: 503 },
      )
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles`)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("❌ [FRONTEND API] Error fetching articles:", error.message)

    // Check if it's a timeout error
    if (error.name === "AbortError") {
      console.error("⏰ [FRONTEND API] Request timed out")
    }

    // Return fallback response with empty articles
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
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

export async function POST(request: NextRequest) {
  try {
    console.log("🔗 [FRONTEND API] POST /api/articles - Proxying to backend")

    const body = await request.json()
    const backendUrl = `${BACKEND_URL}/api/articles`

    console.log(`📡 [FRONTEND API] Posting to backend: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      body: JSON.stringify(body),
    })

    console.log(`📊 [FRONTEND API] Backend response status: ${response.status}`)

    const data = await response.json()

    if (!response.ok) {
      console.error(`❌ [FRONTEND API] Backend error:`, data)
      return NextResponse.json(data, { status: response.status })
    }

    console.log(`✅ [FRONTEND API] Successfully created article`)
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    console.error("❌ [FRONTEND API] Error creating article:", error.message)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create article",
        message: error.message,
      },
      { status: 500 },
    )
  }
}
