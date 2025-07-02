const Article = require("../models/Article")

async function articlesRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/", async (request, reply) => {
    try {
      const { page = 1, limit = 12, category, search, trending } = request.query
      const skip = (page - 1) * limit

      // Build query
      const query = { isPublished: true }

      if (category && category !== "all") {
        query.category = category
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      if (trending === "true") {
        query.trending = true
      }

      // Execute query
      const articles = await Article.find(query)
        .sort({ createdAt: -1, views: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-content") // Exclude full content for list view

      const total = await Article.countDocuments(query)

      fastify.log.info(`📰 [ARTICLES] Fetched ${articles.length} articles (page ${page})`)

      return {
        success: true,
        data: articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      fastify.log.error("❌ [ARTICLES] Failed to fetch articles:", error)

      // Return mock data as fallback
      const mockArticles = [
        {
          _id: "mock1",
          title: "Breaking: AI Technology Revolutionizes News Industry",
          summary: "Artificial intelligence is transforming how news is created and consumed worldwide.",
          category: "technology",
          slug: "ai-technology-revolutionizes-news",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["technology", "ai", "news"],
          publishedAt: new Date(),
          views: 1250,
          likes: 89,
          trending: true,
        },
        {
          _id: "mock2",
          title: "Global Markets Show Strong Recovery Signs",
          summary: "Financial markets worldwide are displaying positive indicators for economic recovery.",
          category: "business",
          slug: "global-markets-recovery-signs",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["business", "markets", "economy"],
          publishedAt: new Date(Date.now() - 3600000),
          views: 980,
          likes: 67,
          trending: true,
        },
        {
          _id: "mock3",
          title: "Climate Change: New Research Reveals Urgent Findings",
          summary: "Scientists present groundbreaking research on climate change impacts and solutions.",
          category: "science",
          slug: "climate-change-research-findings",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["science", "climate", "research"],
          publishedAt: new Date(Date.now() - 7200000),
          views: 756,
          likes: 45,
          trending: false,
        },
      ]

      return {
        success: true,
        data: mockArticles,
        pagination: {
          page: 1,
          limit: 12,
          total: 3,
          pages: 1,
        },
      }
    }
  })

  // Get trending articles
  fastify.get("/trending", async (request, reply) => {
    try {
      const { limit = 10 } = request.query

      const articles = await Article.find({
        isPublished: true,
        trending: true,
      })
        .sort({ views: -1, likes: -1, createdAt: -1 })
        .limit(Number.parseInt(limit))
        .select("-content")

      fastify.log.info(`🔥 [ARTICLES] Fetched ${articles.length} trending articles`)

      return {
        success: true,
        data: articles,
      }
    } catch (error) {
      fastify.log.error("❌ [ARTICLES] Failed to fetch trending articles:", error)

      // Return mock trending data
      const mockTrending = [
        {
          _id: "trending1",
          title: "Tech Giants Announce Major AI Partnership",
          summary: "Leading technology companies join forces for groundbreaking AI development.",
          category: "technology",
          slug: "tech-giants-ai-partnership",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["technology", "ai", "partnership"],
          publishedAt: new Date(),
          views: 2340,
          likes: 156,
          trending: true,
        },
        {
          _id: "trending2",
          title: "Breakthrough in Renewable Energy Storage",
          summary: "New battery technology promises to revolutionize renewable energy storage.",
          category: "science",
          slug: "renewable-energy-storage-breakthrough",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["science", "energy", "technology"],
          publishedAt: new Date(Date.now() - 1800000),
          views: 1890,
          likes: 134,
          trending: true,
        },
      ]

      return {
        success: true,
        data: mockTrending,
      }
    }
  })

  // Get article categories
  fastify.get("/categories", async (request, reply) => {
    try {
      const categories = await Article.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])

      const formattedCategories = categories.map((cat) => ({
        name: cat._id,
        count: cat.count,
        slug: cat._id.toLowerCase(),
      }))

      fastify.log.info(`📂 [ARTICLES] Fetched ${categories.length} categories`)

      return {
        success: true,
        data: formattedCategories,
      }
    } catch (error) {
      fastify.log.error("❌ [ARTICLES] Failed to fetch categories:", error)

      // Return mock categories
      const mockCategories = [
        { name: "technology", count: 45, slug: "technology" },
        { name: "business", count: 38, slug: "business" },
        { name: "science", count: 32, slug: "science" },
        { name: "health", count: 28, slug: "health" },
        { name: "entertainment", count: 24, slug: "entertainment" },
      ]

      return {
        success: true,
        data: mockCategories,
      }
    }
  })

  // Get single article by slug
  fastify.get("/:slug", async (request, reply) => {
    try {
      const { slug } = request.params

      const article = await Article.findOne({ slug, isPublished: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      article.views += 1
      await article.save()

      fastify.log.info(`📖 [ARTICLES] Fetched article: ${article.title}`)

      return {
        success: true,
        data: article,
      }
    } catch (error) {
      fastify.log.error(`❌ [ARTICLES] Failed to fetch article ${request.params.slug}:`, error)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get articles by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 12 } = request.query
      const skip = (page - 1) * limit

      const articles = await Article.find({
        category: category.toLowerCase(),
        isPublished: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-content")

      const total = await Article.countDocuments({
        category: category.toLowerCase(),
        isPublished: true,
      })

      fastify.log.info(`📂 [ARTICLES] Fetched ${articles.length} articles for category: ${category}`)

      return {
        success: true,
        data: articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      fastify.log.error(`❌ [ARTICLES] Failed to fetch articles for category ${request.params.category}:`, error)

      // Return mock data for the category
      const mockCategoryArticles = [
        {
          _id: `mock-${request.params.category}-1`,
          title: `Latest ${request.params.category.charAt(0).toUpperCase() + request.params.category.slice(1)} News`,
          summary: `Stay updated with the latest developments in ${request.params.category}.`,
          category: request.params.category.toLowerCase(),
          slug: `latest-${request.params.category}-news`,
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: [request.params.category, "news", "updates"],
          publishedAt: new Date(),
          views: 456,
          likes: 23,
          trending: false,
        },
      ]

      return {
        success: true,
        data: mockCategoryArticles,
        pagination: {
          page: 1,
          limit: 12,
          total: 1,
          pages: 1,
        },
      }
    }
  })
}

module.exports = articlesRoutes
