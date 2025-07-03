import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://your-backend-url.onrender.com"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    console.log(`📖 [FRONTEND] Fetching article: ${params.slug}`)

    const response = await fetch(`${BACKEND_URL}/api/articles/${params.slug}`, {
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

      // Return fallback article
      return NextResponse.json({
        success: true,
        article: {
          _id: "fallback-article",
          title: "Article Not Found - Explore TrendWise",
          slug: params.slug,
          excerpt: "The requested article could not be found. Explore our other trending content powered by AI.",
          content: `
            <h2>Article Not Available</h2>
            <p>We're sorry, but the article you're looking for is currently not available. This could be due to:</p>
            <ul>
              <li>The article may have been moved or removed</li>
              <li>There might be a temporary connection issue</li>
              <li>The content is being updated by our AI systems</li>
            </ul>
            <p>Please try browsing our other articles or return to the homepage to discover more trending content.</p>
          `,
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date().toISOString(),
          tags: ["TrendWise", "AI", "News"],
          readTime: 2,
          views: 0,
          featured: false,
          author: "TrendWise AI",
          category: "General",
        },
      })
    }

    const data = await response.json()
    console.log(`✅ [FRONTEND] Got article: ${data.article?.title}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error("❌ [FRONTEND] Error fetching article:", error)

    return NextResponse.json({
      success: true,
      article: {
        _id: "error-fallback",
        title: "Connection Error - TrendWise",
        slug: params.slug,
        excerpt: "There was a connection error while fetching this article. Please try again later.",
        content: `
          <h2>Connection Error</h2>
          <p>We're experiencing some technical difficulties connecting to our content servers.</p>
          <p>Please try refreshing the page or return to the homepage to browse other articles.</p>
          <p>Our AI-powered system is working to resolve this issue automatically.</p>
        `,
        thumbnail: "/placeholder.svg?height=400&width=600",
        createdAt: new Date().toISOString(),
        tags: ["Error", "TrendWise"],
        readTime: 1,
        views: 0,
        featured: false,
        author: "TrendWise System",
        category: "System",
      },
    })
  }
}
