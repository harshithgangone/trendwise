export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback categories
const FALLBACK_CATEGORIES = [
  { name: "Technology", count: 45, slug: "technology" },
  { name: "Business", count: 32, slug: "business" },
  { name: "Science", count: 28, slug: "science" },
  { name: "Health", count: 24, slug: "health" },
  { name: "Environment", count: 19, slug: "environment" },
  { name: "Politics", count: 16, slug: "politics" },
  { name: "Sports", count: 12, slug: "sports" },
  { name: "Entertainment", count: 8, slug: "entertainment" },
]

export async function GET(request: NextRequest) {
  try {
    console.log("📂 [FRONTEND API] Fetching categories")

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.categories?.length || 0} categories`)
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for categories`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for categories, using fallback")

      return NextResponse.json({
        success: true,
        categories: FALLBACK_CATEGORIES,
        total: FALLBACK_CATEGORIES.length,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching categories:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
        categories: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
