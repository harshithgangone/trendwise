export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback trending articles
const FALLBACK_TRENDING = [
  {
    _id: "trending-1",
    title: "AI Breakthrough: New Language Model Achieves Human-Level Performance",
    slug: "ai-breakthrough-language-model-2024",
    excerpt: "Revolutionary AI system demonstrates unprecedented understanding and reasoning capabilities.",
    content: `<h2>AI Milestone Achieved</h2><p>A groundbreaking new language model has achieved human-level performance across multiple cognitive tasks, marking a significant milestone in artificial intelligence development.</p>`,
    category: "Technology",
    tags: ["AI", "Breakthrough", "Technology"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readTime: 7,
    views: 0,
    likes: 0,
    saves: 0,
    featured: true,
    trending: true,
  },
  {
    _id: "trending-2",
    title: "Global Climate Summit Announces Major Green Energy Initiative",
    slug: "climate-summit-green-energy-initiative-2024",
    excerpt: "World leaders commit to unprecedented investment in renewable energy infrastructure.",
    content: `<h2>Historic Climate Agreement</h2><p>The latest global climate summit has resulted in a historic agreement to accelerate the transition to renewable energy sources worldwide.</p>`,
    category: "Environment",
    tags: ["Climate", "Green Energy", "Global"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    readTime: 5,
    views: 0,
    likes: 0,
    saves: 0,
    featured: true,
    trending: true,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "6")

    console.log(`🔥 [FRONTEND API] Fetching trending articles - limit: ${limit}`)

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${BACKEND_URL}/api/articles/trending?limit=${limit}`, {
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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} trending articles`)

        // Ensure proper structure
        if (data.articles) {
          data.articles = data.articles.map((article: any) => ({
            ...article,
            views: article.views || 0,
            likes: article.likes || 0,
            saves: article.saves || 0,
            thumbnail: article.thumbnail || article.imageUrl || "/placeholder.svg?height=400&width=600",
            author: article.author || "TrendWise AI",
            readTime: article.readTime || 5,
          }))
        }

        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for trending`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable for trending, using fallback")

      return NextResponse.json({
        success: true,
        articles: FALLBACK_TRENDING.slice(0, limit),
        total: FALLBACK_TRENDING.length,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching trending articles:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trending articles",
        articles: [],
        total: 0,
      },
      { status: 500 },
    )
  }
}
