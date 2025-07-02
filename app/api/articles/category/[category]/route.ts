import { NextResponse } from "next/server"

// Mock categories for fallback
const mockCategories = [
  { name: "Technology", count: 15 },
  { name: "AI", count: 12 },
  { name: "Healthcare", count: 8 },
  { name: "Climate", count: 6 },
  { name: "Work", count: 10 },
  { name: "Culture", count: 7 },
  { name: "Environment", count: 5 },
  { name: "Sustainability", count: 4 },
]

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔍 [FRONTEND API] Attempting to fetch categories from backend...")

      const response = await fetch(`${backendUrl}/api/articles/meta/categories`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        // ✅ Use Next.js cache control instead of cache: 'no-store'
        next: { revalidate: 300 }, // Cache categories for 5 minutes
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.length || 0} categories from database`)

        return NextResponse.json({
          success: true,
          categories: data,
        })
      } else {
        console.log(
          `⚠️ [FRONTEND API] Backend responded with status ${response.status}, falling back to mock categories`,
        )
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available, using mock categories:",
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
