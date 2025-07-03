import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:10000"

export async function GET(request: NextRequest) {
  try {
    console.log("📖 [FRONTEND] Fetching articles from backend...")

    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const category = searchParams.get("category")
    const featured = searchParams.get("featured")

    // Build query parameters
    const params = new URLSearchParams({
      page,
      limit,
    })

    if (category) params.append("category", category)
    if (featured) params.append("featured", featured)

    const backendUrl = `${BACKEND_URL}/api/articles?${params.toString()}`
    console.log("🔗 [FRONTEND] Backend URL:", backendUrl)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      console.error(`❌ [FRONTEND] Backend responded with ${response.status}: ${response.statusText}`)

      // Return fallback response
      return NextResponse.json(
        {
          success: false,
          error: "Backend temporarily unavailable",
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
        { status: 500 },
      )
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND] Got ${data.articles?.length || 0} articles from backend`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error fetching articles:", error)

    // Return fallback response with error details
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
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

export async function POST(request: NextRequest) {
  try {
    console.log("📝 [FRONTEND] Creating new article...")

    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.error(`❌ [FRONTEND] Backend responded with ${response.status}: ${response.statusText}`)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create article",
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("✅ [FRONTEND] Article created successfully")

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error creating article:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create article",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
