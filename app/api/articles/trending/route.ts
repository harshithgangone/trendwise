import { NextResponse } from "next/server"

// Mock trending articles
const mockTrendingArticles = [
  {
    _id: "trending-1",
    title: "Breaking: Revolutionary AI Breakthrough Changes Everything",
    slug: "revolutionary-ai-breakthrough-changes-everything",
    excerpt:
      "Scientists announce a major breakthrough in artificial intelligence that could reshape technology as we know it.",
    content: "In a groundbreaking development that has sent shockwaves through the tech industry...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "Technology", "Breaking News", "Innovation"],
    readTime: 6,
    views: 15420,
    likes: 892,
    saves: 234,
    featured: true,
    trending: true,
    trendScore: 95,
  },
  {
    _id: "trending-2",
    title: "Global Climate Summit Reaches Historic Agreement",
    slug: "global-climate-summit-historic-agreement",
    excerpt: "World leaders unite on unprecedented climate action plan with binding commitments.",
    content: "After days of intense negotiations, world leaders have reached a historic agreement...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ["Climate", "Politics", "Environment", "Global"],
    readTime: 8,
    views: 12350,
    likes: 567,
    saves: 189,
    featured: true,
    trending: true,
    trendScore: 88,
  },
  {
    _id: "trending-3",
    title: "Space Mission Discovers Potential Signs of Life",
    slug: "space-mission-discovers-potential-signs-life",
    excerpt:
      "NASA's latest mission to Mars uncovers compelling evidence that could change our understanding of life in the universe.",
    content: "In what could be the most significant discovery in space exploration history...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ["Space", "Science", "NASA", "Discovery"],
    readTime: 7,
    views: 9876,
    likes: 445,
    saves: 156,
    featured: true,
    trending: true,
    trendScore: 82,
  },
]

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔥 [FRONTEND API] Fetching trending articles...")
      const apiUrl = `${backendUrl}/api/articles/trending`
      console.log("🔗 [FRONTEND API] Trending API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(
          `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || data.length || 0} trending articles`,
        )

        if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            articles: data,
          })
        } else if (data.articles) {
          return NextResponse.json(data)
        } else {
          throw new Error("Invalid response format from backend")
        }
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, using mock trending articles`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available for trending articles, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        articles: mockTrendingArticles,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching trending articles:", error)

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
