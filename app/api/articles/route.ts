import { type NextRequest, NextResponse } from "next/server"

// Force dynamic rendering
export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback articles for when backend is unavailable
const FALLBACK_ARTICLES = [
  {
    _id: "fallback-1",
    title: "The Future of Artificial Intelligence in 2024",
    slug: "future-of-ai-2024",
    excerpt: "Exploring the latest developments in AI technology and their impact on various industries.",
    content: "Artificial Intelligence continues to evolve at an unprecedented pace...",
    category: "Technology",
    tags: ["AI", "Technology", "Future"],
    imageUrl: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    readTime: 5,
    likes: 42,
    views: 1250,
    comments: 8,
    trending: true,
    featured: true,
  },
  {
    _id: "fallback-2",
    title: "Climate Change Solutions: Innovation and Hope",
    slug: "climate-change-solutions-2024",
    excerpt: "Discovering breakthrough technologies and initiatives combating climate change.",
    content: "Climate change remains one of the most pressing challenges of our time...",
    category: "Environment",
    tags: ["Climate", "Environment", "Innovation"],
    imageUrl: "/placeholder.svg?height=400&width=600",
    author: "Environmental Team",
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    readTime: 7,
    likes: 38,
    views: 980,
    comments: 12,
    trending: false,
    featured: true,
  },
  {
    _id: "fallback-3",
    title: "The Rise of Remote Work Culture",
    slug: "remote-work-culture-rise",
    excerpt: "How remote work is reshaping the modern workplace and employee expectations.",
    content: "The pandemic accelerated the adoption of remote work...",
    category: "Business",
    tags: ["Remote Work", "Business", "Culture"],
    imageUrl: "/placeholder.svg?height=400&width=600",
    author: "Business Insights",
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
    readTime: 6,
    likes: 29,
    views: 750,
    comments: 5,
    trending: true,
    featured: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "9")
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    console.log("📰 [FRONTEND API] Fetching articles:", { page, limit, category, search })

    // Try to fetch from backend
    try {
      const backendUrl = new URL("/api/articles", BACKEND_URL)
      backendUrl.searchParams.set("page", page.toString())
      backendUrl.searchParams.set("limit", limit.toString())
      if (category) backendUrl.searchParams.set("category", category)
      if (search) backendUrl.searchParams.set("search", search)

      console.log("🔗 [FRONTEND API] Backend URL:", backendUrl.toString())

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(backendUrl.toString(), {
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
        console.log("✅ [FRONTEND API] Successfully fetched from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback articles")

      // Filter fallback articles based on query parameters
      let filteredArticles = [...FALLBACK_ARTICLES]

      if (category) {
        filteredArticles = filteredArticles.filter(
          (article) => article.category.toLowerCase() === category.toLowerCase(),
        )
      }

      if (search) {
        const searchLower = search.toLowerCase()
        filteredArticles = filteredArticles.filter(
          (article) =>
            article.title.toLowerCase().includes(searchLower) ||
            article.excerpt.toLowerCase().includes(searchLower) ||
            article.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
        )
      }

      // Implement pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedArticles = filteredArticles.slice(startIndex, endIndex)

      return NextResponse.json({
        success: true,
        articles: paginatedArticles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredArticles.length / limit),
          totalArticles: filteredArticles.length,
          hasNextPage: endIndex < filteredArticles.length,
          hasPrevPage: page > 1,
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in articles route:", error)

    return NextResponse.json({
      success: true,
      articles: FALLBACK_ARTICLES.slice(0, 3),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalArticles: 3,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })
  }
}
