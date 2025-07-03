import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://your-backend-url.onrender.com"

export async function GET(request: NextRequest) {
  try {
    console.log("🔥 [FRONTEND] Fetching trending articles...")

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "6"

    const response = await fetch(`${BACKEND_URL}/api/articles/trending?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      console.error(`❌ [FRONTEND] Backend error: ${response.status}`)

      // Return fallback trending articles
      return NextResponse.json({
        success: true,
        articles: [
          {
            _id: "trending-1",
            title: "AI Revolution: How Machine Learning is Changing Everything",
            slug: "ai-revolution-machine-learning",
            excerpt:
              "Explore the transformative impact of artificial intelligence and machine learning across industries, from healthcare to finance.",
            thumbnail: "/placeholder.svg?height=400&width=600",
            createdAt: new Date().toISOString(),
            tags: ["AI", "Machine Learning", "Technology"],
            readTime: 8,
            views: 5420,
            featured: true,
            author: "TrendWise AI",
            category: "Technology",
          },
          {
            _id: "trending-2",
            title: "Breaking: Latest Developments in Sustainable Technology",
            slug: "sustainable-technology-developments",
            excerpt:
              "Discover the cutting-edge innovations in green technology that are shaping a more sustainable future for our planet.",
            thumbnail: "/placeholder.svg?height=400&width=600",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            tags: ["Sustainability", "Green Tech", "Innovation"],
            readTime: 6,
            views: 3890,
            featured: true,
            author: "TrendWise AI",
            category: "Environment",
          },
          {
            _id: "trending-3",
            title: "The Future of Work: Remote Collaboration Tools",
            slug: "future-work-remote-collaboration",
            excerpt:
              "Analyzing the evolution of remote work technologies and their impact on productivity and workplace culture.",
            thumbnail: "/placeholder.svg?height=400&width=600",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            tags: ["Remote Work", "Collaboration", "Productivity"],
            readTime: 7,
            views: 2750,
            featured: false,
            author: "TrendWise AI",
            category: "Business",
          },
        ],
      })
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND] Got ${data.articles?.length || 0} trending articles`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error fetching trending articles:", error)

    return NextResponse.json({
      success: true,
      articles: [
        {
          _id: "fallback-trending-1",
          title: "TrendWise: Revolutionizing News with AI",
          slug: "trendwise-revolutionizing-news-ai",
          excerpt:
            "Discover how TrendWise is transforming the news industry with advanced AI algorithms and real-time trend analysis.",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date().toISOString(),
          tags: ["TrendWise", "AI", "News"],
          readTime: 5,
          views: 8900,
          featured: true,
          author: "TrendWise AI",
          category: "Technology",
        },
      ],
    })
  }
}
