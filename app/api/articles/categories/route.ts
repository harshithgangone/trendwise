import { type NextRequest, NextResponse } from "next/server"

// Mark this route as dynamic since we might use query parameters
export const dynamic = "force-dynamic"

// Mock categories for fallback
const mockCategories = [
  { name: "Technology", count: 15, slug: "technology" },
  { name: "AI", count: 8, slug: "ai" },
  { name: "Healthcare", count: 6, slug: "healthcare" },
  { name: "Climate", count: 4, slug: "climate" },
  { name: "Work", count: 7, slug: "work" },
  { name: "Culture", count: 5, slug: "culture" },
  { name: "Environment", count: 3, slug: "environment" },
  { name: "Sustainability", count: 4, slug: "sustainability" },
]

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔍 [FRONTEND API] Attempting to fetch categories from backend...")

      // Try the correct backend endpoint
      const apiUrl = `${backendUrl}/api/articles/categories`
      console.log("🔗 [FRONTEND API] Categories API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.length || 0} categories from database`)

        return NextResponse.json({
          success: true,
          categories: data,
        })
      } else {
        console.log(`⚠️ [FRONTEND API] Backend categories responded with status ${response.status}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend categories not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        categories: mockCategories,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching categories:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
        categories: mockCategories,
      },
      { status: 500 },
    )
  }
}
