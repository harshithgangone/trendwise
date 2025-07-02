import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const mockTrendingArticles = [
  {
    _id: "trending-1",
    title: "AI Breakthrough: ChatGPT-5 Announced with Revolutionary Features",
    slug: "ai-breakthrough-chatgpt-5-announced-revolutionary-features",
    excerpt:
      "OpenAI announces ChatGPT-5 with unprecedented capabilities in reasoning, multimodal understanding, and real-time learning.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "ChatGPT", "Technology", "OpenAI"],
    category: "Technology",
    readTime: 4,
    views: 5420,
    likes: 342,
    saves: 156,
    featured: true,
    trending: true,
    trendingScore: 95,
  },
  {
    _id: "trending-2",
    title: "Climate Summit 2024: Historic Agreement on Carbon Neutrality",
    slug: "climate-summit-2024-historic-agreement-carbon-neutrality",
    excerpt:
      "World leaders reach unprecedented agreement on accelerated carbon neutrality targets and funding mechanisms.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ["Climate", "Environment", "Politics", "Sustainability"],
    category: "Environment",
    readTime: 6,
    views: 3890,
    likes: 267,
    saves: 89,
    featured: true,
    trending: true,
    trendingScore: 88,
  },
  {
    _id: "trending-3",
    title: "Tesla's New Battery Technology Promises 1000-Mile Range",
    slug: "tesla-new-battery-technology-1000-mile-range",
    excerpt:
      "Tesla unveils revolutionary solid-state battery technology that could transform electric vehicle adoption worldwide.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ["Tesla", "Electric Vehicles", "Battery", "Technology"],
    category: "Technology",
    readTime: 5,
    views: 4200,
    likes: 298,
    saves: 134,
    featured: true,
    trending: true,
    trendingScore: 82,
  },
  {
    _id: "trending-4",
    title: "Quantum Internet: First Intercontinental Quantum Communication",
    slug: "quantum-internet-first-intercontinental-quantum-communication",
    excerpt:
      "Scientists achieve first successful intercontinental quantum communication, marking a milestone toward the quantum internet.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    tags: ["Quantum", "Internet", "Communication", "Science"],
    category: "Science",
    readTime: 7,
    views: 2100,
    likes: 189,
    saves: 67,
    featured: false,
    trending: true,
    trendingScore: 75,
  },
  {
    _id: "trending-5",
    title: "Remote Work Revolution: Major Companies Go Fully Distributed",
    slug: "remote-work-revolution-major-companies-fully-distributed",
    excerpt:
      "Fortune 500 companies announce permanent shift to fully distributed workforce, reshaping the future of work.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    tags: ["Remote Work", "Business", "Future of Work", "Technology"],
    category: "Business",
    readTime: 5,
    views: 3100,
    likes: 234,
    saves: 98,
    featured: false,
    trending: true,
    trendingScore: 71,
  },
]

export async function GET() {
  try {
    console.log("🔥 [FRONTEND API] Trending articles API called")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔗 [FRONTEND API] Attempting to fetch trending articles from backend:", backendUrl)

      const response = await fetch(`${backendUrl}/api/articles/trending`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      })

      console.log(`📈 [FRONTEND API] Trending backend response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched trending articles from backend:`, data)

        // Handle different response formats
        if (data.articles && Array.isArray(data.articles)) {
          return NextResponse.json({
            success: true,
            articles: data.articles,
          })
        } else if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            articles: data,
          })
        } else {
          throw new Error("Invalid trending articles response format")
        }
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [FRONTEND API] Trending backend error: ${errorText}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Trending backend not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      return NextResponse.json({
        success: true,
        articles: mockTrendingArticles,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Critical error in trending API:", error)

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
