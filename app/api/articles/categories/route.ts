import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const mockCategories = [
  { name: "Technology", count: 25, slug: "technology" },
  { name: "AI", count: 18, slug: "ai" },
  { name: "Healthcare", count: 12, slug: "healthcare" },
  { name: "Environment", count: 15, slug: "environment" },
  { name: "Business", count: 20, slug: "business" },
  { name: "Science", count: 8, slug: "science" },
  { name: "Innovation", count: 10, slug: "innovation" },
  { name: "Sustainability", count: 14, slug: "sustainability" },
  { name: "Climate", count: 9, slug: "climate" },
  { name: "Work", count: 11, slug: "work" },
]

export async function GET() {
  try {
    console.log("📂 [FRONTEND API] Categories API called")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔗 [FRONTEND API] Attempting to fetch categories from backend:", backendUrl)

      const response = await fetch(`${backendUrl}/api/articles/categories`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      console.log(`📈 [FRONTEND API] Categories backend response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched categories from backend:`, data)

        // Handle different response formats
        if (data.categories && Array.isArray(data.categories)) {
          return NextResponse.json({
            success: true,
            categories: data.categories,
          })
        } else if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            categories: data,
          })
        } else {
          throw new Error("Invalid categories response format")
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [FRONTEND API] Categories backend error: ${errorText}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Categories backend not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

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
        categories: mockCategories,
      },
      { status: 500 },
    )
  }
}
