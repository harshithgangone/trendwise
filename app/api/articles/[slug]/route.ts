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

      console.log(`🌐 [FRONTEND API] Calling backend: ${BACKEND_URL}/api/articles/${slug}`)

      const response = await fetch(`${BACKEND_URL}/api/articles/${slug}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "TrendWise-Frontend/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`📡 [FRONTEND API] Backend response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched from backend:`, {
          title: data.article?.title,
          hasContent: !!data.article?.content,
        })

        // Ensure proper article structure
        if (data.article) {
          const article = {
            _id: data.article._id || `fallback-${slug}`,
            title: data.article.title || slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            slug: data.article.slug || slug,
            content:
              data.article.content ||
              `<div class="article-content">
                <h2>Article Content</h2>
                <p>This article is currently being processed by our AI system. The content will be available shortly.</p>
                <p>Please refresh the page in a few minutes to see the complete article.</p>
              </div>`,
            excerpt: data.article.excerpt || "This article is currently being processed.",
            thumbnail: data.article.thumbnail || data.article.imageUrl || "/placeholder.svg?height=400&width=600",
            author: data.article.author || "TrendWise AI",
            createdAt: data.article.createdAt || new Date().toISOString(),
            readTime: data.article.readTime || 5,
            views: data.article.views || 0,
            likes: data.article.likes || 0,
            saves: data.article.saves || 0,
            category: data.article.category || "General",
            tags: data.article.tags || ["News"],
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
      console.log(`⚠️ [FRONTEND API] Backend unavailable for article ${slug}, using fallback:`, backendError)

      // Create a comprehensive fallback article
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
            
            <div class="alert alert-info">
              <h3>Stay Updated</h3>
              <p><strong>Thank you for your patience!</strong> We're committed to bringing you the highest quality AI-generated content. This article will be worth the wait.</p>
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
