import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [FRONTEND API] Articles API called")

    const { searchParams } = request.nextUrl
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const tag = searchParams.get("tag") || ""
    const category = searchParams.get("category") || ""

    console.log(
      `📊 [FRONTEND API] Query params - page: ${page}, limit: ${limit}, search: "${search}", tag: "${tag}", category: "${category}"`,
    )

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    try {
      console.log("🔗 [FRONTEND API] Attempting to fetch from backend:", backendUrl)

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(tag && { tag }),
        ...(category && { category }),
      })

      const apiUrl = `${backendUrl}/api/articles?${queryParams.toString()}`
      console.log("📡 [FRONTEND API] Full API URL:", apiUrl)

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      })

      console.log(`📈 [FRONTEND API] Backend response status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ [FRONTEND API] Successfully fetched ${data.articles?.length || 0} articles from backend`)

        return NextResponse.json({
          success: true,
          articles: data.articles || [],
          pagination: data.pagination || {
            page,
            limit,
            total: data.articles?.length || 0,
            pages: Math.ceil((data.articles?.length || 0) / limit),
            hasNext: false,
          },
        })
      } else {
        throw new Error(`Backend responded with status: ${response.status}`)
      }
    } catch (backendError) {
      console.log(
        "⚠️ [FRONTEND API] Backend not available, using mock data:",
        backendError instanceof Error ? backendError.message : "Unknown error",
      )

      // Enhanced mock data with more articles
      const mockArticles = [
        {
          _id: "1",
          title: "The Future of AI in Healthcare: Revolutionary Changes Ahead",
          slug: "future-ai-healthcare-revolutionary-changes",
          excerpt:
            "Exploring how artificial intelligence is revolutionizing medical diagnosis, treatment, and patient care across the globe.",
          content: `# The Future of AI in Healthcare: Revolutionary Changes Ahead

Artificial intelligence is transforming healthcare in unprecedented ways, offering new possibilities for diagnosis, treatment, and patient care that were unimaginable just a decade ago.

## Current AI Applications in Healthcare

### Diagnostic Imaging
AI-powered diagnostic tools are now capable of detecting diseases like cancer, heart conditions, and neurological disorders with accuracy that often surpasses human specialists.

### Drug Discovery
Machine learning algorithms are accelerating drug discovery processes, reducing the time from concept to clinical trials from years to months.

### Personalized Treatment
AI systems analyze patient data to create personalized treatment plans, considering genetic factors, medical history, and lifestyle choices.

## The Road Ahead

The integration of AI in healthcare promises to make medical care more accessible, accurate, and affordable for patients worldwide.

## Key Takeaways

- AI diagnostic tools are becoming more accurate than human specialists
- Drug discovery timelines are being dramatically reduced
- Personalized medicine is becoming a reality through AI analysis
- Healthcare accessibility is improving through AI-powered solutions`,
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date().toISOString(),
          tags: ["AI", "Healthcare", "Technology", "Medicine"],
          category: "Technology",
          readTime: 5,
          views: 1250,
          likes: 89,
          saves: 34,
          featured: true,
          author: "TrendBot AI",
          status: "published",
        },
        {
          _id: "2",
          title: "Climate Change Solutions: Innovative Technologies for 2024",
          slug: "climate-change-solutions-innovative-technologies-2024",
          excerpt:
            "Discover the latest breakthrough technologies and innovative approaches being developed to combat climate change and build a sustainable future.",
          content: `# Climate Change Solutions: Innovative Technologies for 2024

As we face the growing challenges of climate change, innovative technologies are emerging as powerful tools in our fight for a sustainable future.

## Breakthrough Technologies

### Carbon Capture and Storage
Advanced carbon capture technologies are being deployed at industrial scale, removing CO2 directly from the atmosphere.

### Renewable Energy Innovations
Next-generation solar panels and wind turbines are achieving unprecedented efficiency rates, making clean energy more affordable than ever.

### Green Hydrogen Production
Revolutionary electrolysis techniques are making green hydrogen production economically viable for large-scale industrial applications.

## Implementation Strategies

### Corporate Adoption
Major corporations are investing billions in clean technology solutions, driving innovation and market adoption.

### Government Initiatives
Policy frameworks and incentives are accelerating the deployment of climate solutions worldwide.

## Looking Forward

The convergence of technology, policy, and market forces is creating unprecedented opportunities for climate action.

## Key Points

- Carbon capture technology is reaching commercial viability
- Renewable energy costs continue to plummet
- Green hydrogen is becoming the fuel of the future
- Corporate and government support is accelerating adoption`,
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          tags: ["Climate", "Environment", "Sustainability", "Technology"],
          category: "Environment",
          readTime: 7,
          views: 2100,
          likes: 156,
          saves: 78,
          featured: false,
          author: "TrendBot AI",
          status: "published",
        },
        {
          _id: "3",
          title: "The Rise of Remote Work Culture: Transforming Modern Workplace",
          slug: "rise-remote-work-culture-transforming-workplace",
          excerpt:
            "How remote work is fundamentally reshaping the modern workplace, employee expectations, and the future of professional collaboration.",
          content: `# The Rise of Remote Work Culture: Transforming Modern Workplace

Remote work has evolved from a temporary pandemic solution to a permanent transformation of how we think about work, productivity, and professional relationships.

## The New Work Paradigm

### Flexibility as Standard
Remote work has established flexibility as a core expectation rather than a perk, fundamentally changing employer-employee relationships.

### Technology Integration
Advanced collaboration tools and cloud-based systems have made remote work not just possible, but often more efficient than traditional office work.

### Global Talent Access
Companies can now access talent from anywhere in the world, breaking down geographical barriers to hiring.

## Challenges and Solutions

### Communication Evolution
Teams are developing new communication protocols and using advanced tools to maintain connection and collaboration.

### Work-Life Balance
The blending of home and work spaces has created new challenges and opportunities for maintaining healthy boundaries.

## Future Implications

### Hybrid Models
Most organizations are adopting hybrid approaches that combine remote flexibility with in-person collaboration.

### Urban Planning Impact
Remote work is influencing urban development, housing markets, and transportation infrastructure.

## Key Insights

- Remote work is now a permanent feature of the modern workplace
- Technology has enabled new levels of collaboration and productivity
- Hybrid models are becoming the preferred approach for most organizations
- The impact extends beyond work to urban planning and lifestyle choices`,
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          tags: ["Work", "Culture", "Technology", "Business"],
          category: "Business",
          readTime: 6,
          views: 1800,
          likes: 124,
          saves: 56,
          featured: false,
          author: "TrendBot AI",
          status: "published",
        },
      ]

      // Filter mock data based on query parameters
      let filteredArticles = [...mockArticles]

      if (search) {
        const searchLower = search.toLowerCase()
        filteredArticles = filteredArticles.filter(
          (article) =>
            article.title.toLowerCase().includes(searchLower) ||
            article.excerpt.toLowerCase().includes(searchLower) ||
            article.content.toLowerCase().includes(searchLower),
        )
      }

      if (tag) {
        const tagLower = tag.toLowerCase()
        filteredArticles = filteredArticles.filter((article) =>
          article.tags.some((t) => t.toLowerCase().includes(tagLower)),
        )
      }

      if (category) {
        const categoryLower = category.toLowerCase()
        filteredArticles = filteredArticles.filter((article) => article.category.toLowerCase().includes(categoryLower))
      }

      // Pagination
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedArticles = filteredArticles.slice(startIndex, endIndex)

      console.log(
        `📊 [FRONTEND API] Returning ${paginatedArticles.length} mock articles (page ${page}/${Math.ceil(filteredArticles.length / limit)})`,
      )

      return NextResponse.json({
        success: true,
        articles: paginatedArticles,
        pagination: {
          page,
          limit,
          total: filteredArticles.length,
          pages: Math.ceil(filteredArticles.length / limit),
          hasNext: endIndex < filteredArticles.length,
        },
      })
    }
  } catch (error) {
    console.error("❌ [FRONTEND API] Critical error in articles API:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch articles",
        articles: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
        },
      },
      { status: 500 },
    )
  }
}
