export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback articles for when backend is unavailable
const FALLBACK_ARTICLES = [
  {
    _id: "fallback-1",
    title: "The Future of Artificial Intelligence in 2024",
    slug: "future-of-ai-2024",
    excerpt: "Exploring the latest developments in AI technology and their impact on various industries.",
    content: `<h2>The AI Revolution Continues</h2><p>Artificial Intelligence continues to evolve at an unprecedented pace, transforming industries and reshaping how we work, communicate, and solve complex problems.</p><h3>Key Developments in 2024</h3><p>This year has seen remarkable breakthroughs in machine learning, natural language processing, and computer vision. From advanced chatbots to autonomous systems, AI is becoming more sophisticated and accessible.</p>`,
    category: "Technology",
    tags: ["AI", "Technology", "Future"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    readTime: 5,
    views: 0,
    likes: 0,
    saves: 0,
    featured: true,
    trending: true,
  },
  {
    _id: "fallback-2",
    title: "Sustainable Technology Trends Shaping Tomorrow",
    slug: "sustainable-tech-trends-2024",
    excerpt: "How green technology is revolutionizing industries and creating a more sustainable future.",
    content: `<h2>Green Tech Revolution</h2><p>Sustainable technology is no longer just a trend—it's becoming a necessity as companies worldwide prioritize environmental responsibility.</p><h3>Renewable Energy Advances</h3><p>Solar, wind, and other renewable energy sources are becoming more efficient and cost-effective, driving widespread adoption across industries.</p>`,
    category: "Environment",
    tags: ["Sustainability", "Green Tech", "Environment"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    readTime: 4,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trending: true,
  },
  {
    _id: "fallback-3",
    title: "Digital Transformation in Modern Business",
    slug: "digital-transformation-business-2024",
    excerpt: "How businesses are adapting to digital-first strategies and emerging technologies.",
    content: `<h2>The Digital Business Landscape</h2><p>Digital transformation has accelerated beyond expectations, with businesses rapidly adopting new technologies to stay competitive.</p><h3>Cloud Computing Dominance</h3><p>Cloud-first strategies are enabling businesses to scale efficiently while reducing operational costs and improving flexibility.</p>`,
    category: "Business",
    tags: ["Digital", "Business", "Technology"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    readTime: 6,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trending: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "9")
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    console.log(`📰 [FRONTEND API] Fetching articles - page: ${page}, limit: ${limit}`)

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      let backendUrl = `${BACKEND_URL}/api/articles?page=${page}&limit=${limit}`
      if (category) backendUrl += `&category=${encodeURIComponent(category)}`
      if (search) backendUrl += `&search=${encodeURIComponent(search)}`

      const response = await fetch(backendUrl, {
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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles from backend`)

        // Ensure all articles have proper structure with zero initial engagement for new articles
        if (data.articles) {
          data.articles = data.articles.map((article: any) => ({
            ...article,
            views: article.views || 0,
            likes: article.likes || 0,
            saves: article.saves || 0,
            thumbnail: article.thumbnail || article.imageUrl || "/placeholder.svg?height=400&width=600",
            author: article.author || "TrendWise AI",
            readTime: article.readTime || 5,
            content: article.content || `<p>Content for "${article.title}" is being processed by our AI system.</p>`,
          }))
        }

        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback articles")

      // Return fallback articles with pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedArticles = FALLBACK_ARTICLES.slice(startIndex, endIndex)

      return NextResponse.json({
        success: true,
        articles: paginatedArticles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(FALLBACK_ARTICLES.length / limit),
          totalArticles: FALLBACK_ARTICLES.length,
          hasNextPage: endIndex < FALLBACK_ARTICLES.length,
          hasPrevPage: page > 1,
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching articles:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        articles: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalArticles: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      },
      { status: 500 },
    )
  }
}
