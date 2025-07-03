export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback categories with zero article counts initially
const FALLBACK_CATEGORIES = [
  { name: "Technology", count: 0, slug: "technology" },
  { name: "Science", count: 0, slug: "science" },
  { name: "Environment", count: 0, slug: "environment" },
  { name: "Health", count: 0, slug: "health" },
  { name: "Business", count: 0, slug: "business" },
  { name: "Security", count: 0, slug: "security" },
  { name: "Innovation", count: 0, slug: "innovation" },
  { name: "Research", count: 0, slug: "research" },
]

export async function GET(request: NextRequest) {
  try {
    console.log("📂 [FRONTEND API] GET /api/articles/categories")

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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.categories?.length || 0} categories from backend`)
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
