export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    console.log(`📖 [FRONTEND API] Fetching article by slug: ${slug}`)

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${BACKEND_URL}/api/articles/${slug}`, {
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
        console.log(`✅ [FRONTEND API] Successfully fetched article: ${data.article?.title || slug}`)

        // Ensure proper article structure
        if (data.article) {
          const article = {
            _id: data.article._id,
            title: data.article.title || "Untitled Article",
            slug: data.article.slug || slug,
            content:
              data.article.content ||
              `<h2>Content Loading</h2><p>This article content is being processed. Please refresh the page.</p>`,
            excerpt: data.article.excerpt || "Article excerpt not available.",
            thumbnail: data.article.thumbnail || data.article.imageUrl || "/placeholder.svg?height=400&width=600",
            author: data.article.author || "TrendWise AI",
            createdAt: data.article.createdAt || new Date().toISOString(),
            readTime: data.article.readTime || 5,
            views: data.article.views || 0,
            likes: data.article.likes || 0,
            saves: data.article.saves || 0,
            category: data.article.category || "General",
            tags: data.article.tags || [],
            featured: data.article.featured || false,
            trending: data.article.trending || false,
          }

          return NextResponse.json({
            success: true,
            article: article,
          })
        }
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status} for slug: ${slug}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log(`⚠️ [FRONTEND API] Backend unavailable for article ${slug}, using fallback`)

      // Create a fallback article with actual content
      const fallbackArticle = {
        _id: `fallback-${slug}`,
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        slug: slug,
        excerpt: "This article is currently being processed by our AI system.",
        content: `
          <div class="article-content">
            <h1>${slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</h1>
            
            <p>We're currently processing this article with our AI-powered content system. The article will be available shortly with comprehensive information on this topic.</p>
            
            <h2>What's Happening?</h2>
            <p>Our TrendBot is working to:</p>
            <ul>
              <li>Gather the latest information on this topic</li>
              <li>Generate comprehensive, accurate content</li>
              <li>Add relevant images and media</li>
              <li>Ensure the content meets our quality standards</li>
            </ul>
            
            <h2>Please Try Again</h2>
            <p>Refresh this page in a few minutes to see the complete article, or browse our other trending content while you wait.</p>
            
            <p><strong>Thank you for your patience as we work to bring you the best AI-generated content!</strong></p>
          </div>
        `,
        category: "General",
        tags: ["Loading", "AI Processing"],
        thumbnail: "/placeholder.svg?height=400&width=600",
        author: "TrendWise AI",
        createdAt: new Date().toISOString(),
        readTime: 2,
        views: 0,
        likes: 0,
        saves: 0,
        featured: false,
        trending: false,
      }

      return NextResponse.json({
        success: true,
        article: fallbackArticle,
      })
    }
  } catch (error) {
    console.error(`❌ [FRONTEND API] Error fetching article ${params.slug}:`, error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch article",
        message: "The article could not be loaded at this time.",
      },
      { status: 500 },
    )
  }
}
