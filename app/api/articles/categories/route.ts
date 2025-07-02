import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("📂 [FRONTEND API] Categories API called")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔗 [FRONTEND API] Attempting to fetch categories from backend:", backendUrl)

      const apiUrl = `${backendUrl}/api/articles/meta/categories`
      console.log("📡 [FRONTEND API] Categories API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      })

      console.log(`📈 [FRONTEND API] Backend categories response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.categories?.length || 0} categories from backend`)

        return NextResponse.json({
          success: true,
          categories: data.categories || [],
        })
      } else {
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend categories not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      const mockCategories = [
        { name: "Technology", count: 15, slug: "technology" },
        { name: "Business", count: 12, slug: "business" },
        { name: "Health", count: 8, slug: "health" },
        { name: "Science", count: 10, slug: "science" },
        { name: "Environment", count: 6, slug: "environment" },
        { name: "Entertainment", count: 5, slug: "entertainment" },
      ]

      console.log(`📊 [FRONTEND API] Returning ${mockCategories.length} mock categories`)

      return NextResponse.json({
        success: true,
        categories: mockCategories,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Critical error in categories API:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
        categories: [],
      },
      { status: 500 },
    )
  }
}
