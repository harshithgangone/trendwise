export const dynamic = "force-dynamic"
export const revalidate = 0

import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "https://trendwise-backend-frpp.onrender.com"

// Fallback articles with realistic content but zero engagement
const FALLBACK_ARTICLES = [
  {
    _id: "fallback-1",
    title: "Breaking: Major Tech Companies Announce AI Safety Initiative",
    slug: "tech-companies-ai-safety-initiative",
    excerpt:
      "Leading technology companies have joined forces to establish new safety standards for artificial intelligence development and deployment.",
    content: `
      <h2>Industry Leaders Unite for AI Safety</h2>
      <p>In an unprecedented move, major technology companies including Google, Microsoft, OpenAI, and others have announced a comprehensive AI safety initiative aimed at establishing industry-wide standards for responsible AI development.</p>
      
      <h3>Key Components of the Initiative</h3>
      <p>The initiative focuses on several critical areas:</p>
      <ul>
        <li>Establishing common safety protocols for AI model training</li>
        <li>Creating transparent reporting mechanisms for AI capabilities</li>
        <li>Developing shared resources for AI safety research</li>
        <li>Implementing standardized testing procedures</li>
      </ul>
      
      <h3>Industry Impact</h3>
      <p>This collaboration represents a significant step forward in addressing growing concerns about AI safety and alignment. The initiative aims to ensure that as AI systems become more powerful, they remain beneficial and controllable.</p>
      
      <h3>Timeline and Implementation</h3>
      <p>The companies plan to begin implementing these standards within the next six months, with full adoption expected by the end of 2024. Regular progress reports will be published quarterly.</p>
    `,
    category: "Technology",
    tags: ["AI", "Safety", "Technology", "Industry"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    readTime: 4,
    views: 0,
    likes: 0,
    saves: 0,
    featured: true,
    trending: true,
  },
  {
    _id: "fallback-2",
    title: "Climate Tech Startups Secure Record Funding in Q4 2024",
    slug: "climate-tech-startups-record-funding",
    excerpt:
      "Climate technology startups have raised over $2.5 billion in the fourth quarter, marking a significant milestone for the green tech sector.",
    content: `
      <h2>Green Tech Investment Surge</h2>
      <p>The climate technology sector has experienced unprecedented growth in investment, with startups focusing on renewable energy, carbon capture, and sustainable manufacturing leading the charge.</p>
      
      <h3>Investment Breakdown</h3>
      <p>The $2.5 billion in funding was distributed across various climate tech sectors:</p>
      <ul>
        <li>Renewable Energy Storage: $800 million</li>
        <li>Carbon Capture Technologies: $650 million</li>
        <li>Sustainable Manufacturing: $500 million</li>
        <li>Green Transportation: $400 million</li>
        <li>Other Climate Solutions: $150 million</li>
      </ul>
      
      <h3>Market Outlook</h3>
      <p>Investors are increasingly confident in climate tech solutions as governments worldwide implement stricter environmental regulations and carbon pricing mechanisms.</p>
      
      <h3>Notable Deals</h3>
      <p>Several startups secured significant Series B and C funding rounds, indicating growing maturity in the climate tech ecosystem and investor confidence in scalable solutions.</p>
    `,
    category: "Environment",
    tags: ["Climate", "Startups", "Funding", "Green Tech"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    readTime: 3,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trending: true,
  },
  {
    _id: "fallback-3",
    title: "Breakthrough in Quantum Computing Achieved by Research Team",
    slug: "quantum-computing-breakthrough-research",
    excerpt:
      "Scientists have demonstrated a new quantum error correction method that could accelerate the development of practical quantum computers.",
    content: `
      <h2>Quantum Error Correction Milestone</h2>
      <p>A team of researchers has successfully demonstrated a novel approach to quantum error correction that significantly reduces the computational overhead required for fault-tolerant quantum computing.</p>
      
      <h3>Technical Achievement</h3>
      <p>The breakthrough involves a new class of quantum error-correcting codes that can detect and correct errors more efficiently than previous methods, bringing practical quantum computing closer to reality.</p>
      
      <h3>Implications for Industry</h3>
      <p>This advancement could accelerate the timeline for quantum computers to solve real-world problems in:</p>
      <ul>
        <li>Drug discovery and molecular simulation</li>
        <li>Financial modeling and risk analysis</li>
        <li>Cryptography and cybersecurity</li>
        <li>Materials science and engineering</li>
      </ul>
      
      <h3>Next Steps</h3>
      <p>The research team plans to collaborate with industry partners to implement these error correction methods in existing quantum computing platforms and scale up the technology.</p>
    `,
    category: "Science",
    tags: ["Quantum Computing", "Research", "Technology", "Science"],
    thumbnail: "/placeholder.svg?height=400&width=600",
    author: "TrendWise AI",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    readTime: 5,
    views: 0,
    likes: 0,
    saves: 0,
    featured: false,
    trending: false,
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "9")
    const category = searchParams.get("category")
    const search = searchParams.get("search")

    console.log(`📰 [FRONTEND API] GET /api/articles - page: ${page}, limit: ${limit}`)

    // Try to fetch from backend first
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      let backendUrl = `${BACKEND_URL}/api/articles?page=${page}&limit=${limit}`
      if (category) backendUrl += `&category=${encodeURIComponent(category)}`
      if (search) backendUrl += `&search=${encodeURIComponent(search)}`

      const response = await fetch(backendUrl, {
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
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles from backend`)

        // Ensure all articles have proper structure and zero initial engagement
        if (data.articles) {
          data.articles = data.articles.map((article: any) => ({
            ...article,
            views: article.views || 0,
            likes: article.likes || 0,
            saves: article.saves || 0,
            thumbnail: article.thumbnail || article.imageUrl || "/placeholder.svg?height=400&width=600",
          }))
        }

        return NextResponse.json(data)
      } else {
        console.log(`⚠️ [FRONTEND API] Backend responded with ${response.status}`)
        throw new Error(`Backend error: ${response.status}`)
      }
    } catch (backendError) {
      console.log("⚠️ [FRONTEND API] Backend unavailable, using fallback articles")

      // Apply filters to fallback articles
      let filteredArticles = [...FALLBACK_ARTICLES]

      if (category) {
        filteredArticles = filteredArticles.filter(
          (article) => article.category.toLowerCase() === category.toLowerCase(),
        )
      }

      if (search) {
        const searchLower = search.toLowerCase()
        filteredArticles = filteredArticles.filter(
          (article) =>
            article.title.toLowerCase().includes(searchLower) ||
            article.excerpt.toLowerCase().includes(searchLower) ||
            article.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
        )
      }

      // Pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedArticles = filteredArticles.slice(startIndex, endIndex)

      return NextResponse.json({
        success: true,
        articles: paginatedArticles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredArticles.length / limit),
          totalArticles: filteredArticles.length,
          hasNextPage: endIndex < filteredArticles.length,
          hasPrevPage: page > 1,
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Error fetching articles:", error)

    return NextResponse.json({
      success: true,
      articles: FALLBACK_ARTICLES.slice(0, 3),
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalArticles: 3,
        hasNextPage: false,
        hasPrevPage: false,
      },
    })
  }
}
