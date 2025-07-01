import { type NextRequest, NextResponse } from "next/server"

// Mock data for development - this ensures the frontend works even if backend is down
const mockArticles = [
  {
    _id: "1",
    title: "The Future of Artificial Intelligence in 2024",
    slug: "future-of-ai-2024",
    excerpt: "Exploring the latest developments in AI technology and their impact on various industries.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "Technology", "Future"],
    readTime: 5,
  },
  {
    _id: "2",
    title: "Sustainable Technology Trends Shaping Tomorrow",
    slug: "sustainable-tech-trends",
    excerpt: "How green technology is revolutionizing the way we live and work.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ["Sustainability", "Technology", "Environment"],
    readTime: 7,
  },
  {
    _id: "3",
    title: "The Rise of Remote Work Culture",
    slug: "remote-work-culture-rise",
    excerpt: "Understanding the shift towards remote work and its long-term implications.",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    tags: ["Remote Work", "Culture", "Business"],
    readTime: 6,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const search = searchParams.get("search") || ""
    const tag = searchParams.get("tag") || ""

    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      const response = await fetch(
        `${backendUrl}/api/articles?page=${page}&limit=${limit}&search=${search}&tag=${tag}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data)
      } else {
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log("Backend not available, using mock data:", backendError.message)

      // Filter mock data based on search and tag
      let filteredArticles = mockArticles

      if (search) {
        filteredArticles = filteredArticles.filter(
          (article) =>
            article.title.toLowerCase().includes(search.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(search.toLowerCase()),
        )
      }

      if (tag) {
        filteredArticles = filteredArticles.filter((article) =>
          article.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase())),
        )
      }

      return NextResponse.json({
        success: true,
        articles: filteredArticles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: filteredArticles.length,
          pages: Math.ceil(filteredArticles.length / Number.parseInt(limit)),
        },
      })
    }
  } catch (error) {
    console.error("Error in articles API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        articles: mockArticles, // Fallback to mock data
      },
      { status: 500 },
    )
  }
}
