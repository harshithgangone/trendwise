export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log(`🔥 [TRENDING API] Fetching trending articles`)

    const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"
    const backendUrl = `${BACKEND_URL}/api/articles/trending`

    console.log(`🌐 [TRENDING API] Backend URL: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log(`📡 [TRENDING API] Backend response status: ${response.status}`)

    if (!response.ok) {
      console.error(`❌ [TRENDING API] Backend error: ${response.status}`)

      // Return fallback trending articles
      const fallbackArticles = [
        {
          _id: "trending-1",
          title: "AI Revolution: How Machine Learning is Transforming Industries",
          slug: "ai-revolution-machine-learning-transforming-industries",
          excerpt:
            "Discover how artificial intelligence and machine learning are reshaping the business landscape across various sectors.",
          thumbnail: "/placeholder.svg?height=400&width=600",
          author: "TrendWise AI",
          createdAt: new Date().toISOString(),
          readTime: 8,
          views: 1250,
          likes: 89,
          saves: 34,
          category: "Technology",
          tags: ["AI", "Machine Learning", "Technology", "Innovation"],
          featured: true,
          trending: true,
          trendData: {
            trendScore: 95,
            searchVolume: "High",
            source: "Google Trends",
          },
        },
        {
          _id: "trending-2",
          title: "Sustainable Energy: The Future of Power Generation",
          slug: "sustainable-energy-future-power-generation",
          excerpt: "Exploring renewable energy sources and their impact on global sustainability efforts.",
          thumbnail: "/placeholder.svg?height=400&width=600",
          author: "Green Tech Reporter",
          createdAt: new Date().toISOString(),
          readTime: 6,
          views: 980,
          likes: 67,
          saves: 28,
          category: "Environment",
          tags: ["Renewable Energy", "Sustainability", "Climate Change"],
          featured: false,
          trending: true,
          trendData: {
            trendScore: 88,
            searchVolume: "Medium",
            source: "News Analytics",
          },
        },
      ]

      return NextResponse.json({
        success: true,
        articles: fallbackArticles,
        source: "fallback",
        message: "Using fallback trending content",
      })
    }

    const data = await response.json()
    console.log(`✅ [TRENDING API] Backend response:`, {
      success: data.success,
      articleCount: data.articles?.length || 0,
    })

    return NextResponse.json({
      success: true,
      articles: data.articles || [],
      source: "backend",
    })
  } catch (error) {
    console.error("❌ [TRENDING API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trending articles",
      },
      { status: 500 },
    )
  }
}
