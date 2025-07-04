export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  const startTime = Date.now()

  try {
    const { slug } = params
    console.log(`📖 [FRONTEND API] ==========================================`)
    console.log(`📖 [FRONTEND API] Starting fetch for article slug: ${slug}`)
    console.log(`📖 [FRONTEND API] Request URL: ${request.url}`)
    console.log(`📖 [FRONTEND API] Backend URL: ${BACKEND_URL}`)
    console.log(`📖 [FRONTEND API] Timestamp: ${new Date().toISOString()}`)

    // Validate slug
    if (!slug || slug.trim() === "") {
      console.error(`❌ [FRONTEND API] Invalid slug provided: "${slug}"`)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid slug",
          message: "Article slug is required",
        },
        { status: 400 },
      )
    }

    // Try to fetch from backend first - USING CORRECT FASTIFY ROUTE
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const backendUrl = `${BACKEND_URL}/api/articles/slug/${encodeURIComponent(slug)}`
      console.log(`🌐 [FRONTEND API] Calling backend URL: ${backendUrl}`)

      const response = await fetch(backendUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`📡 [FRONTEND API] Backend response status: ${response.status}`)
      console.log(`📡 [FRONTEND API] Backend response statusText: ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched from backend:`, {
          success: data.success,
          hasArticle: !!data.article,
          articleId: data.article?._id,
          title: data.article?.title,
          slug: data.article?.slug,
          hasContent: !!data.article?.content,
          views: data.article?.views,
          likes: data.article?.likes,
          saves: data.article?.saves,
        })

        // Ensure proper article structure with REAL DATA
        if (data.success && data.article) {
          const article = {
            _id: data.article._id || `backend-${slug}`,
            title: data.article.title || slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            slug: data.article.slug || slug,
            content:
              data.article.content ||
              `
              <div class="article-content">
                <h2>Content Loading</h2>
                <p>This article content is being processed. Please refresh the page in a moment.</p>
              </div>
            `,
            excerpt: data.article.excerpt || "Article excerpt not available.",
            thumbnail: data.article.thumbnail || data.article.featuredImage || "/placeholder.svg?height=400&width=600",
            author: data.article.author || "TrendWise AI",
            createdAt: data.article.createdAt || new Date().toISOString(),
            readTime: data.article.readTime || 5,
            views: data.article.views || 0, // REAL views from backend
            likes: data.article.likes || 0, // REAL likes from backend
            saves: data.article.saves || 0, // REAL saves from backend
            category: data.article.category || "General",
            tags: data.article.tags || ["News"],
            featured: data.article.featured || false,
            trending: data.article.trending || false,
          }

          console.log(`✅ [FRONTEND API] Processed article with REAL data:`, {
            _id: article._id,
            title: article.title,
            slug: article.slug,
            views: article.views,
            likes: article.likes,
            saves: article.saves,
          })

          const responseTime = Date.now() - startTime
          console.log(`✅ [FRONTEND API] Response time: ${responseTime}ms`)
          console.log(`📖 [FRONTEND API] ==========================================`)

          return NextResponse.json({
            success: true,
            article: article,
            source: "backend",
            responseTime: responseTime,
          })
        } else {
          console.error(`❌ [FRONTEND API] Invalid backend response structure:`, data)
          throw new Error("Invalid response structure from backend")
        }
      } else if (response.status === 404) {
        const errorData = await response.json().catch(() => ({}))
        console.log(`🔍 [FRONTEND API] Article not found in backend:`, errorData)
        console.log(`🔍 [FRONTEND API] Available slugs from backend:`, errorData.availableSlugs)
        throw new Error(`Article not found: ${slug}`)
      } else {
        const errorText = await response.text()
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for slug: ${slug}`)
        console.log(`⚠️ [FRONTEND API] Backend error response: ${errorText}`)
        throw new Error(`Backend error: ${response.status} - ${errorText}`)
      }
    } catch (backendError) {
      console.log(`⚠️ [FRONTEND API] Backend unavailable for article ${slug}:`, backendError)

      // Create a comprehensive fallback article with ZERO counts (no dummy data)
      const fallbackArticle = {
        _id: `fallback-${slug}`,
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        slug: slug,
        excerpt: "This article is currently being processed by our AI-powered content system.",
        content: `
          <div class="article-content">
            <h1>${slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</h1>
            
            <p class="lead">We're currently processing this article with our advanced AI-powered content system. The full article will be available shortly with comprehensive information on this topic.</p>
            
            <h2>What's Happening Behind the Scenes?</h2>
            <p>Our TrendBot is working diligently to:</p>
            <ul>
              <li><strong>Gather Information:</strong> Collecting the latest and most relevant information on this topic from trusted sources</li>
              <li><strong>Generate Content:</strong> Creating comprehensive, well-researched content using advanced AI technology</li>
              <li><strong>Add Media:</strong> Sourcing relevant images and multimedia content to enhance the reading experience</li>
              <li><strong>Quality Assurance:</strong> Ensuring the content meets our high standards for accuracy and readability</li>
            </ul>
            
            <h2>What You Can Do</h2>
            <p>While you wait for the complete article:</p>
            <ul>
              <li>Refresh this page in a few minutes to check for updates</li>
              <li>Browse our other trending articles on the homepage</li>
              <li>Follow us on social media for the latest updates</li>
              <li>Sign up for our newsletter to get notified when new content is published</li>
            </ul>
            
            <div class="bg-blue-50 border-l-4 border-blue-400 p-4 my-6">
              <h3 class="text-lg font-semibold text-blue-800 mb-2">Stay Updated</h3>
              <p class="text-blue-700"><strong>Thank you for your patience!</strong> We're committed to bringing you the highest quality AI-generated content. This article will be worth the wait.</p>
            </div>
            
            <h2>Related Topics</h2>
            <p>While this article is being prepared, you might be interested in exploring related topics on our platform. Our AI system continuously monitors trends and generates fresh content on the most relevant subjects.</p>
          </div>
        `,
        category: "Technology",
        tags: ["AI Processing", "Coming Soon", "TrendWise"],
        thumbnail: "/placeholder.svg?height=400&width=600",
        author: "TrendWise AI",
        createdAt: new Date().toISOString(),
        readTime: 3,
        views: 0, // NO dummy data - real zero
        likes: 0, // NO dummy data - real zero
        saves: 0, // NO dummy data - real zero
        featured: false,
        trending: false,
      }

      console.log(`🔄 [FRONTEND API] Created fallback article with REAL zero counts:`, {
        _id: fallbackArticle._id,
        title: fallbackArticle.title,
        slug: fallbackArticle.slug,
        views: fallbackArticle.views,
        likes: fallbackArticle.likes,
        saves: fallbackArticle.saves,
      })

      const responseTime = Date.now() - startTime
      console.log(`🔄 [FRONTEND API] Fallback response time: ${responseTime}ms`)
      console.log(`📖 [FRONTEND API] ==========================================`)

      return NextResponse.json({
        success: true,
        article: fallbackArticle,
        source: "fallback",
        responseTime: responseTime,
        backendError: backendError instanceof Error ? backendError.message : String(backendError),
      })
    }
  } catch (error) {
    console.error(`❌ [FRONTEND API] Critical error fetching article ${params.slug}:`, error)
    console.error(`❌ [FRONTEND API] Error stack:`, error instanceof Error ? error.stack : "No stack trace")

    const responseTime = Date.now() - startTime
    console.log(`❌ [FRONTEND API] Error response time: ${responseTime}ms`)
    console.log(`📖 [FRONTEND API] ==========================================`)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article",
        message: "The article could not be loaded at this time.",
        slug: params.slug,
        responseTime: responseTime,
        errorDetails: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
