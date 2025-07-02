import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Mock trending articles data
const mockTrendingArticles = [
  {
    _id: "trending-1",
    title: "AI Revolution: How Machine Learning is Transforming Industries",
    slug: "ai-revolution-machine-learning-transforming-industries",
    excerpt:
      "Discover how artificial intelligence and machine learning are revolutionizing everything from healthcare to finance, creating unprecedented opportunities and challenges.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "Technology", "Innovation", "Future"],
    category: "Technology",
    readTime: 6,
    views: 2500,
    likes: 189,
    saves: 67,
    featured: true,
    author: "TrendBot AI",
    trendData: {
      trendScore: 95,
      searchVolume: "High",
      source: "Google Trends",
    },
  },
  {
    _id: "trending-2",
    title: "Sustainable Energy Breakthrough: Solar Power Efficiency Reaches New Heights",
    slug: "sustainable-energy-breakthrough-solar-power-efficiency",
    excerpt:
      "Scientists achieve record-breaking solar panel efficiency, bringing us closer to a fully renewable energy future with game-changing implications.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ["Energy", "Sustainability", "Innovation", "Environment"],
    category: "Environment",
    readTime: 5,
    views: 1800,
    likes: 142,
    saves: 89,
    featured: true,
    author: "TrendBot AI",
    trendData: {
      trendScore: 88,
      searchVolume: "High",
      source: "News Analysis",
    },
  },
  {
    _id: "trending-3",
    title: "Remote Work Evolution: The Future of Digital Collaboration",
    slug: "remote-work-evolution-future-digital-collaboration",
    excerpt:
      "As remote work becomes permanent, new technologies and methodologies are reshaping how teams collaborate and companies operate globally.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ["Remote Work", "Technology", "Business", "Future"],
    category: "Business",
    readTime: 7,
    views: 1650,
    likes: 98,
    saves: 45,
    featured: false,
    author: "TrendBot AI",
    trendData: {
      trendScore: 82,
      searchVolume: "Medium",
      source: "Social Media",
    },
  },
]

export async function GET(request: NextRequest) {
  try {
    console.log("🔥 [FRONTEND API] Trending articles API called")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔗 [FRONTEND API] Attempting to fetch trending articles from backend:", backendUrl)

      const apiUrl = `${backendUrl}/api/articles/trending/top`
      console.log("📡 [FRONTEND API] Trending API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      })

      console.log(`📈 [FRONTEND API] Backend trending response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(
          `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} trending articles from backend`,
        )

        if (data.success && data.articles && Array.isArray(data.articles)) {
          // Add trend data to articles if not present
          const articlesWithTrendData = data.articles.map((article) => ({
            ...article,
            trendData: article.trendData || {
              trendScore: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
              searchVolume: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)],
              source: ["Google Trends", "Social Media", "News Analysis"][Math.floor(Math.random() * 3)],
            },
          }))

          return NextResponse.json({
            success: true,
            articles: articlesWithTrendData,
          })
        } else {
          throw new Error("Invalid trending articles response format from backend")
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [FRONTEND API] Backend trending error response: ${errorText}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend trending articles not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      console.log(`📊 [FRONTEND API] Returning ${mockTrendingArticles.length} mock trending articles`)

      return NextResponse.json({
        success: true,
        articles: mockTrendingArticles,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Critical error in trending articles API:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch trending articles",
        articles: mockTrendingArticles,
      },
      { status: 500 },
    )
  }
}
