export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback trending articles with zero engagement
const FALLBACK_TRENDING = [
  {
    _id: "trending-1",
    title: "AI Models Achieve New Benchmark in Language Understanding",
    slug: "ai-models-language-understanding-benchmark",
    excerpt:
      "Latest AI language models demonstrate unprecedented performance in complex reasoning tasks, marking a significant milestone in artificial intelligence development.",
    category: "Technology",
    tags: ["AI", "Language Models", "Benchmarks", "Technology"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    readTime: 6,
    views: 0,
    likes: 0,
    saves: 0,
    trending: true,
    featured: true,
  },
  {
    _id: "trending-2",
    title: "Renewable Energy Storage Solutions Show Promise for Grid Stability",
    slug: "renewable-energy-storage-grid-stability",
    excerpt:
      "New battery technologies and energy storage systems are addressing the intermittency challenges of renewable energy sources.",
    category: "Environment",
    tags: ["Renewable Energy", "Battery Technology", "Grid Storage", "Sustainability"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readTime: 4,
    views: 0,
    likes: 0,
    saves: 0,
    trending: true,
    featured: false,
  },
  {
    _id: "trending-3",
    title: "Cybersecurity Threats Evolve with Advanced AI-Powered Attacks",
    slug: "cybersecurity-ai-powered-attacks-evolution",
    excerpt:
      "Security experts warn of sophisticated AI-driven cyber attacks while developing new defense mechanisms to counter emerging threats.",
    category: "Security",
    tags: ["Cybersecurity", "AI Attacks", "Security", "Technology"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 5400000).toISOString(),
    readTime: 5,
    views: 0,
    likes: 0,
    saves: 0,
    trending: true,
    featured: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "6")

    console.log(`🔥 [FRONTEND API] GET /api/articles/trending - limit: ${limit}`)

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

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
        console.log(
          `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} trending articles from backend`,
        )

        // Ensure all articles have proper structure and zero initial engagement
        if (data.articles) {
          data.articles = data.articles.map((article: any) => ({
            ...article,
            views: article.views || 0,
            likes: article.likes || 0,
            saves: article.saves || 0,
            thumbnail: article.thumbnail || article.imageUrl || "/placeholder.svg?height=400&width=600",
          }))
        }

        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback trending articles")

      return NextResponse.json({
        success: true,
        articles: FALLBACK_TRENDING.slice(0, limit),
        total: FALLBACK_TRENDING.length,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching trending articles:", error)

    return NextResponse.json({
      success: true,
      articles: FALLBACK_TRENDING.slice(0, 3),
      total: 3,
    })
  }
}
