import { type NextRequest, NextResponse } from "next/server"

// Mark this route as dynamic since we're using query parameters
export const dynamic = "force-dynamic"

// Mock data for development - this ensures the frontend works even if backend is down
const mockArticles = [
  {
    _id: "1",
    title: "AI Revolution: How Machine Learning is Transforming Healthcare",
    slug: "ai-revolution-healthcare-transformation",
    excerpt:
      "Artificial intelligence is revolutionizing medical diagnosis, treatment planning, and patient care across healthcare systems worldwide.",
    content:
      "# AI Revolution: How Machine Learning is Transforming Healthcare\n\nArtificial intelligence is transforming healthcare in unprecedented ways, from diagnostic imaging to personalized treatment plans...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date().toISOString(),
    tags: ["AI", "Healthcare", "Technology", "Innovation"],
    readTime: 5,
    views: 0, // Start with zero views
    likes: 0, // Start with zero likes
    saves: 0, // Start with zero saves
    featured: true,
    trendData: {
      source: "gnews",
      trendScore: 85,
      searchVolume: "10K-100K",
    },
  },
  {
    _id: "2",
    title: "Sustainable Technology: Green Innovation Shaping the Future",
    slug: "sustainable-technology-green-innovation",
    excerpt:
      "Environmental technology solutions are gaining momentum as companies prioritize sustainability and carbon neutrality goals.",
    content:
      "# Sustainable Technology: Green Innovation Shaping the Future\n\nAs climate change concerns grow, sustainable technology is becoming a critical focus...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ["Sustainability", "Green Tech", "Environment", "Innovation"],
    readTime: 6,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trendData: {
      source: "gnews",
      trendScore: 78,
      searchVolume: "5K-50K",
    },
  },
  {
    _id: "3",
    title: "Digital Transformation: Business Evolution in the Modern Era",
    slug: "digital-transformation-business-evolution",
    excerpt:
      "Companies worldwide are embracing digital transformation to enhance efficiency, improve customer experience, and stay competitive.",
    content:
      "# Digital Transformation: Business Evolution in the Modern Era\n\nDigital transformation has become more than just a buzzword...",
    thumbnail: "/placeholder.svg?height=400&width=600",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ["Digital", "Business", "Transformation", "Technology"],
    readTime: 7,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trendData: {
      source: "gnews",
      trendScore: 72,
      searchVolume: "3K-30K",
    },
  },
]

export async function GET(request: NextRequest) {
  try {
    // Now we can safely use searchParams since route is marked as dynamic
    const { searchParams } = request.nextUrl
    const page = searchParams.get("page") || "1"
    const limit = searchParams.get("limit") || "10"
    const search = searchParams.get("search") || ""
    const tag = searchParams.get("tag") || ""
    const category = searchParams.get("category") || ""

    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔍 [FRONTEND API] Attempting to fetch articles from backend database...")

      // Build query parameters for backend API
      const queryParams = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(tag && { tag }),
        ...(category && { category }),
      })

      const apiUrl = `${backendUrl}/api/articles?${queryParams.toString()}`
      console.log("🔗 [FRONTEND API] API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store", // Since route is dynamic, we can use no-store
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(
          `✅ [FRONTEND API] Successfully fetched ${data.articles?.length || data.length || 0} articles from database`,
        )

        // Handle different response formats from backend
        if (Array.isArray(data)) {
          return NextResponse.json({
            success: true,
            articles: data,
            pagination: {
              page: Number.parseInt(page),
              limit: Number.parseInt(limit),
              total: data.length,
              pages: Math.ceil(data.length / Number.parseInt(limit)),
            },
          })
        } else if (data.articles) {
          return NextResponse.json(data)
        } else {
          throw new Error("Invalid response format from backend")
        }
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status}, falling back to mock data`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      // Filter mock data based on search, tag, and category
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

      if (category) {
        filteredArticles = filteredArticles.filter((article) =>
          article.tags.some((t) => t.toLowerCase().includes(category.toLowerCase())),
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
    console.error("❌ [FRONTEND API] Error in articles API route:", error)

    // Always return a response, even on error
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        articles: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: mockArticles.length,
          pages: Math.ceil(mockArticles.length / 10),
        },
      },
      { status: 500 },
    )
  }
}
