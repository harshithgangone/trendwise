import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback categories
const FALLBACK_CATEGORIES = [
  { name: "Technology", count: 45, slug: "technology" },
  { name: "Science", count: 32, slug: "science" },
  { name: "Business", count: 28, slug: "business" },
  { name: "Environment", count: 23, slug: "environment" },
  { name: "Health", count: 19, slug: "health" },
  { name: "Politics", count: 15, slug: "politics" },
  { name: "Sports", count: 12, slug: "sports" },
  { name: "Entertainment", count: 8, slug: "entertainment" },
]

export async function GET(request: NextRequest) {
  try {
    console.log("📂 [FRONTEND API] Fetching categories")

    // Try to fetch from backend
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${BACKEND_URL}/api/articles/categories`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FRONTEND API] Successfully fetched categories from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback categories")

      return NextResponse.json({
        success: true,
        categories: FALLBACK_CATEGORIES,
        total: FALLBACK_CATEGORIES.length,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching categories:", error)

    return NextResponse.json({
      success: true,
      categories: FALLBACK_CATEGORIES,
      total: FALLBACK_CATEGORIES.length,
    })
  }
}
