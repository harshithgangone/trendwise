import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback article for when backend is unavailable
const FALLBACK_ARTICLE = {
  _id: "fallback-article",
  title: "The Future of Artificial Intelligence in 2024",
  slug: "future-of-ai-2024",
  excerpt: "Exploring the latest developments in AI technology and their impact on various industries.",
  content: `
    <h2>The AI Revolution Continues</h2>
    <p>Artificial Intelligence continues to evolve at an unprecedented pace, transforming industries and reshaping how we work, communicate, and solve complex problems.</p>
    
    <h3>Key Developments in 2024</h3>
    <p>This year has seen remarkable breakthroughs in machine learning, natural language processing, and computer vision. From advanced chatbots to autonomous systems, AI is becoming more sophisticated and accessible.</p>
    
    <h3>Industry Impact</h3>
    <p>Healthcare, finance, education, and manufacturing are experiencing significant transformations through AI integration. These changes promise increased efficiency, better decision-making, and innovative solutions to longstanding challenges.</p>
    
    <h3>Looking Ahead</h3>
    <p>As we progress through 2024, the focus shifts to responsible AI development, ensuring these powerful technologies benefit society while addressing ethical considerations and potential risks.</p>
  `,
  category: "Technology",
  tags: ["AI", "Technology", "Future", "Innovation"],
  imageUrl: "/placeholder.svg?height=400&width=600",
  author: "TrendWise AI",
  publishedAt: new Date(Date.now() - 86400000).toISOString(),
  readTime: 5,
  likes: 42,
  views: 1250,
  comments: 8,
  trending: true,
  featured: true,
}

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params
    console.log("📰 [FRONTEND API] Fetching article by slug:", slug)

    // Try to fetch from backend
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
        console.log("✅ [FRONTEND API] Successfully fetched article from backend")
        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback article")

      // Return fallback article with the requested slug
      const fallbackWithSlug = {
        ...FALLBACK_ARTICLE,
        slug: slug,
        title: `Article: ${slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}`,
      }

      return NextResponse.json({
        success: true,
        article: fallbackWithSlug,
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching article:", error)

    return NextResponse.json({
      success: true,
      article: FALLBACK_ARTICLE,
    })
  }
}
