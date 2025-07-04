export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log(`📂 [CATEGORIES API] Fetching categories`)

    const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"
    const backendUrl = `${BACKEND_URL}/api/articles/categories`

    console.log(`🌐 [CATEGORIES API] Backend URL: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log(`📡 [CATEGORIES API] Backend response status: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ [CATEGORIES API] Backend error: ${response.status}`)

      // Return fallback categories
      const fallbackCategories = [
        { name: "Technology", count: 45, slug: "technology" },
        { name: "Business", count: 32, slug: "business" },
        { name: "Science", count: 28, slug: "science" },
        { name: "Health", count: 24, slug: "health" },
        { name: "Environment", count: 19, slug: "environment" },
        { name: "Politics", count: 16, slug: "politics" },
        { name: "Sports", count: 14, slug: "sports" },
        { name: "Entertainment", count: 12, slug: "entertainment" },
      ]

      return NextResponse.json({
        success: true,
        categories: fallbackCategories,
        source: "fallback",
        message: "Using fallback categories",
      })
    }

    const data = await response.json()
    console.log(`✅ [CATEGORIES API] Backend response:`, {
      success: data.success,
      categoryCount: data.categories?.length || 0,
    })

    return NextResponse.json({
      success: true,
      categories: data.categories || [],
      source: "backend",
    })
  } catch (error) {
    console.error("❌ [CATEGORIES API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch categories",
      },
      { status: 500 },
    )
  }
}
