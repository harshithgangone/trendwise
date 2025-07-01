import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("📂 [FRONTEND API] Fetching categories...")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${backendUrl}/api/articles/meta/categories`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Successfully fetched ${data.categories?.length || 0} categories`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching categories:", error)

    // Fallback categories
    const fallbackCategories = [
      { name: "Technology", count: 25, slug: "technology" },
      { name: "AI", count: 18, slug: "ai" },
      { name: "Sustainability", count: 15, slug: "sustainability" },
      { name: "Business", count: 12, slug: "business" },
      { name: "Health", count: 10, slug: "health" },
      { name: "Science", count: 8, slug: "science" },
      { name: "Innovation", count: 7, slug: "innovation" },
      { name: "Future", count: 6, slug: "future" },
      { name: "Trends", count: 5, slug: "trends" },
      { name: "Analysis", count: 4, slug: "analysis" },
    ]

    return NextResponse.json({
      success: true,
      categories: fallbackCategories,
    })
  }
}
