import { NextResponse } from "next/server"

// Mock categories
const mockCategories = [
  { name: "Technology", slug: "technology", count: 45 },
  { name: "Business", slug: "business", count: 32 },
  { name: "Health", slug: "health", count: 28 },
  { name: "Science", slug: "science", count: 24 },
  { name: "Entertainment", slug: "entertainment", count: 19 },
  { name: "Sports", slug: "sports", count: 16 },
  { name: "Politics", slug: "politics", count: 14 },
  { name: "Environment", slug: "environment", count: 12 },
]

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("📂 [FRONTEND API] Fetching categories...")
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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.categories?.length || data.length || 0} categories`)

        if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            categories: data,
          })
        } else if (data.categories) {
          return NextResponse.json(data)
        } else {
          throw new Error("Invalid response format from backend")
        }
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, using mock categories`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for categories, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        categories: mockCategories,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in categories API route:", error)

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
