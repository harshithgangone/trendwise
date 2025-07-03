import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback trending articles
const FALLBACK_TRENDING = [
  {
    _id: "trending-1",
    title: "AI Breakthrough: New Language Model Surpasses GPT-4",
    slug: "ai-breakthrough-new-language-model",
    excerpt: "Revolutionary AI model demonstrates unprecedented capabilities in reasoning and creativity.",
    category: "Technology",
    tags: ["AI", "Machine Learning", "Innovation"],
    imageUrl: "/placeholder.svg?height=300&width=500",
    author: "Tech Reporter",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    readTime: 4,
    likes: 156,
    views: 3420,
    comments: 23,
    trending: true,
  },
  {
    _id: "trending-2",
    title: "Quantum Computing Milestone: 1000-Qubit Processor Achieved",
    slug: "quantum-computing-1000-qubit-milestone",
    excerpt: "Scientists achieve new quantum computing record, bringing us closer to practical applications.",
    category: "Science",
    tags: ["Quantum", "Computing", "Science"],
    imageUrl: "/placeholder.svg?height=300&width=500",
    author: "Science Team",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    readTime: 6,
    likes: 89,
    views: 2100,
    comments: 15,
    trending: true,
  },
  {
    _id: "trending-3",
    title: "Sustainable Energy: Solar Efficiency Reaches 50%",
    slug: "solar-efficiency-reaches-50-percent",
    excerpt: "New solar panel technology achieves record-breaking efficiency rates.",
    category: "Environment",
    tags: ["Solar", "Energy", "Sustainability"],
    imageUrl: "/placeholder.svg?height=300&width=500",
    author: "Green Tech",
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    readTime: 5,
    likes: 67,
    views: 1800,
    comments: 12,
    trending: true,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "6")

    console.log("🔥 [FRONTEND API] Fetching trending articles")

    // Try to fetch from backend
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
        console.log("✅ [FRONTEND API] Successfully fetched trending from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback trending")

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
