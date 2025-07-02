import { type NextRequest, NextResponse } from "next/server"

// Mock data for development - this ensures the frontend works even if backend is down
const mockArticles = [
  {
    _id: "1",
    title: "The Future of AI in Healthcare",
    slug: "future-ai-healthcare",
    excerpt: "Exploring how artificial intelligence is revolutionizing medical diagnosis and treatment.",
    content: "Artificial intelligence is transforming healthcare in unprecedented ways...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "Healthcare", "Technology"],
    readTime: 5,
    views: 1250,
    likes: 89,
    saves: 34,
    featured: true,
  },
  {
    _id: "2",
    title: "Climate Change Solutions for 2024",
    slug: "climate-change-solutions-2024",
    excerpt: "Innovative approaches to combat climate change and build a sustainable future.",
    content: "As we face the growing challenges of climate change...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ["Climate", "Environment", "Sustainability"],
    readTime: 7,
    views: 2100,
    likes: 156,
    saves: 78,
    featured: false,
  },
  {
    _id: "3",
    title: "The Rise of Remote Work Culture",
    slug: "rise-remote-work-culture",
    excerpt: "How remote work is reshaping the modern workplace and employee expectations.",
    content: "Remote work has become more than just a trend...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    tags: ["Work", "Culture", "Technology"],
    readTime: 6,
    views: 1800,
    likes: 124,
    saves: 56,
    featured: false,
  },
]

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const page = url.searchParams.get("page") || "1"
    const limit = url.searchParams.get("limit") || "10"
    const search = url.searchParams.get("search") || ""
    const tag = url.searchParams.get("tag") || ""

    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔍 [FRONTEND API] Attempting to fetch articles from backend database...")
      const apiUrl = `${backendUrl}/api/articles?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&tag=${encodeURIComponent(tag)}`
      console.log("🔗 [FRONTEND API] API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(
          `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || data.length || 0} articles from database`,
        )

        // Handle different response formats from backend
        if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            articles: data,
            pagination: {
              page: Number.parseInt(page),
              limit: Number.parseInt(limit),
              total: data.length,
              pages: Math.ceil(data.length / Number.parseInt(limit)),
            },
          })
        } else if (data.articles) {
          return NextResponse.json(data)
        } else {
          throw new Error("Invalid response format from backend")
        }
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, falling back to mock data`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      // Filter mock data based on search and tag
      let filteredArticles = mockArticles

      if (search) {
        filteredArticles = filteredArticles.filter(
          (article) =>
            article.title.toLowerCase().includes(search.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(search.toLowerCase()),
        )
      }

      if (tag) {
        filteredArticles = filteredArticles.filter((article) =>
          article.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())),
        )
      }

      return NextResponse.json({
        success: true,
        articles: filteredArticles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: filteredArticles.length,
          pages: Math.ceil(filteredArticles.length / Number.parseInt(limit)),
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error in articles API route:", error)

    // Always return a response, even on error
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        articles: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: mockArticles.length,
          pages: Math.ceil(mockArticles.length / 10),
        },
      },
      { status: 500 },
    )
  }
}
