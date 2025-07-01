import { type NextRequest, NextResponse } from "next/server"

// Mock article for development
const mockArticle = {
  _id: "mock-1",
  title: "Sample Article",
  slug: "sample-article",
  content: "<p>This is a sample article content.</p>",
  excerpt: "This is a sample article for development purposes.",
  thumbnail: "/placeholder.svg?height=400&width=600",
  createdAt: new Date().toISOString(),
  tags: ["Sample", "Development"],
  readTime: 3,
  views: 100,
  likes: 5,
  saves: 2,
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params

    // Try to fetch from backend first
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

    try {
      console.log(`🔍 [FRONTEND API] Fetching article with slug: ${slug}`)
      const response = await fetch(`${backendUrl}/api/articles/${slug}`, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched article: ${data.title || slug}`)
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with status ${response.status} for slug: ${slug}`)
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        `⚠️ [FRONTEND API] Backend not available for article ${slug}, using mock data:`,
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      // Return mock article with the requested slug
      return NextResponse.json({
        ...mockArticle,
        slug,
        title: `Article: ${slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
      })
    }
  } catch (error) {
    console.error(`❌ [FRONTEND API] Error fetching article ${params.slug}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article",
      },
      { status: 500 },
    )
  }
}
