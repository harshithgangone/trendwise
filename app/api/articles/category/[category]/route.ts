import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { category: string } }) {
  try {
    const { category } = params
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"

    console.log(`📂 [FRONTEND API] Fetching articles for category: ${category}`)

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(
      `${backendUrl}/api/articles/category/${encodeURIComponent(category)}?page=${page}&limit=${limit}`,
      {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(
      `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles for category "${category}"`,
    )

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching articles by category:", error)

    // Fallback articles for category
    const fallbackArticles = [
      {
        _id: `${params.category}-1`,
        title: `Latest in ${params.category}`,
        slug: `latest-in-${params.category.toLowerCase()}`,
        excerpt: `Discover the most recent developments and insights in ${params.category}.`,
        thumbnail: "/placeholder.svg?height=400&width=600",
        createdAt: new Date().toISOString(),
        tags: [params.category, "Latest", "Insights"],
        readTime: 5,
        views: 1250,
        featured: false,
      },
    ]

    return NextResponse.json({
      success: true,
      articles: fallbackArticles,
      category: params.category,
      pagination: {
        page: 1,
        limit: 10,
        total: fallbackArticles.length,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    })
  }
}
