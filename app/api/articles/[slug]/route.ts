export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    console.log(`🔍 [ARTICLE API] ==========================================`)
    console.log(`🔍 [ARTICLE API] Fetching article with slug: ${slug}`)
    console.log(`🔍 [ARTICLE API] Timestamp: ${new Date().toISOString()}`)

    const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"
    const backendUrl = `${BACKEND_URL}/api/articles/slug/${encodeURIComponent(slug)}`

    console.log(`🌐 [ARTICLE API] Backend URL: ${backendUrl}`)

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TrendWise-Frontend/1.0",
      },
      cache: "no-store",
    })

    console.log(`📡 [ARTICLE API] Backend response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [ARTICLE API] Backend error: ${response.status} ${response.statusText}`)
      console.error(`❌ [ARTICLE API] Error details: ${errorText}`)

      // Return fallback article if backend fails
      const fallbackArticle = {
        _id: "fallback-" + slug,
        title: "Article Temporarily Unavailable",
        slug: slug,
        content: `
          <div class="text-center py-12">
            <h2 class="text-2xl font-bold mb-4">Content Loading...</h2>
            <p class="text-gray-600 mb-6">We're having trouble loading this article right now. Please try refreshing the page or check back later.</p>
            <p class="text-sm text-gray-500">Our team has been notified and is working to resolve this issue.</p>
          </div>
        `,
        excerpt: "This article is temporarily unavailable. Please try again later.",
        thumbnail: "/placeholder.svg?height=400&width=800",
        author: "TrendWise Team",
        createdAt: new Date().toISOString(),
        readTime: 2,
        views: 0,
        likes: 0,
        saves: 0,
        category: "System",
        tags: ["system", "maintenance"],
        featured: false,
        trending: false,
      }

      return NextResponse.json({
        success: true,
        article: fallbackArticle,
        source: "fallback",
        message: "Using fallback content due to backend unavailability",
      })
    }

    const data = await response.json()
    console.log(`✅ [ARTICLE API] Backend response:`, {
      success: data.success,
      hasArticle: !!data.article,
      title: data.article?.title,
      slug: data.article?.slug,
    })

    if (data.success && data.article) {
      console.log(`🔍 [ARTICLE API] ==========================================`)
      return NextResponse.json({
        success: true,
        article: data.article,
        source: "backend",
      })
    } else {
      console.error(`❌ [ARTICLE API] Invalid backend response:`, data)
      throw new Error("Invalid response from backend")
    }
  } catch (error) {
    console.error("❌ [ARTICLE API] Critical error:", error)
    console.log(`🔍 [ARTICLE API] ==========================================`)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
