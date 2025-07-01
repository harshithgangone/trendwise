import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔥 [FRONTEND API] Fetching trending articles...")

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${backendUrl}/api/articles/trending/top`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} trending articles`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching trending articles:", error)

    // Fallback trending articles
    const fallbackArticles = [
      {
        _id: "trending-1",
        title: "AI Revolution: The Future is Now",
        slug: "ai-revolution-future-now",
        excerpt:
          "Artificial Intelligence is transforming every aspect of our lives. Discover the latest breakthroughs.",
        thumbnail: "/placeholder.svg?height=400&width=600",
        createdAt: new Date().toISOString(),
        tags: ["AI", "Technology", "Future"],
        readTime: 5,
        views: 15420,
        featured: true,
        trendData: {
          trendScore: 95,
          searchVolume: "2M+",
          source: "google",
        },
      },
      {
        _id: "trending-2",
        title: "Sustainable Tech: Green Innovation",
        slug: "sustainable-tech-green-innovation",
        excerpt: "How green technology is reshaping industries and creating a sustainable future.",
        thumbnail: "/placeholder.svg?height=400&width=600",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        tags: ["Sustainability", "Technology", "Environment"],
        readTime: 7,
        views: 12350,
        featured: false,
        trendData: {
          trendScore: 88,
          searchVolume: "1.5M+",
          source: "google",
        },
      },
    ]

    return NextResponse.json({
      success: true,
      articles: fallbackArticles,
    })
  }
}
