const Article = require("../models/Article")

// Mock articles for fallback
const mockArticles = [
  {
    _id: "1",
    title: "The Future of AI in Healthcare: Revolutionary Changes Ahead",
    slug: "future-ai-healthcare-revolutionary-changes",
    excerpt:
      "Exploring how artificial intelligence is revolutionizing medical diagnosis, treatment, and patient care across the globe.",
    content:
      "# The Future of AI in Healthcare\n\nArtificial intelligence is transforming healthcare in unprecedented ways...",
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
      "Discover the latest breakthrough technologies and innovative approaches being developed to combat climate change.",
    content: "# Climate Change Solutions\n\nAs we face the growing challenges of climate change...",
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
    excerpt: "How remote work is fundamentally reshaping the modern workplace and employee expectations.",
    content: "# The Rise of Remote Work Culture\n\nRemote work has evolved from a temporary pandemic solution...",
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

async function articlesRoutes(fastify, options) {
  // Get all articles
  fastify.get("/articles", async (request, reply) => {
    try {
      fastify.log.info("📖 [BACKEND] Fetching articles...")

      const { page = 1, limit = 10, search, tag, category } = request.query
      const skip = (page - 1) * limit

      const query = { status: "published" }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
        ]
      }

      if (tag) {
        query.tags = { $in: [new RegExp(tag, "i")] }
      }

      if (category) {
        query.category = { $regex: category, $options: "i" }
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)

      fastify.log.info(`✅ [BACKEND] Found ${articles.length} articles`)

      return {
        success: true,
        articles: articles.length > 0 ? articles : mockArticles.slice(0, limit),
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: articles.length > 0 ? total : mockArticles.length,
          pages: articles.length > 0 ? Math.ceil(total / limit) : Math.ceil(mockArticles.length / limit),
          hasNext: articles.length > 0 ? skip + articles.length < total : false,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching articles:", error)

      return {
        success: true,
        articles: mockArticles.slice(0, Number.parseInt(request.query.limit || 10)),
        pagination: {
          page: Number.parseInt(request.query.page || 1),
          limit: Number.parseInt(request.query.limit || 10),
          total: mockArticles.length,
          pages: Math.ceil(mockArticles.length / Number.parseInt(request.query.limit || 10)),
          hasNext: false,
          hasPrev: false,
        },
      }
    }
  })

  // Get trending articles
  fastify.get("/articles/trending", async (request, reply) => {
    try {
      fastify.log.info("🔥 [BACKEND] Fetching trending articles...")

      const articles = await Article.find({ status: "published" })
        .sort({ views: -1, likes: -1, createdAt: -1 })
        .limit(12)
        .lean()

      fastify.log.info(`✅ [BACKEND] Found ${articles.length} trending articles`)

      return {
        success: true,
        articles: articles.length > 0 ? articles : mockArticles.filter((a) => a.featured || a.views > 1000),
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching trending articles:", error)

      return {
        success: true,
        articles: mockArticles.filter((a) => a.featured || a.views > 1000),
      }
    }
  })

  // Get categories
  fastify.get("/articles/categories", async (request, reply) => {
    try {
      fastify.log.info("📂 [BACKEND] Fetching categories...")

      const categories = await Article.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, slug: { $toLower: "$_id" }, _id: 0 } },
        { $sort: { count: -1 } },
      ])

      fastify.log.info(`✅ [BACKEND] Found ${categories.length} categories`)

      const mockCategories = [
        { name: "Technology", count: 15, slug: "technology" },
        { name: "Business", count: 12, slug: "business" },
        { name: "Environment", count: 8, slug: "environment" },
        { name: "Healthcare", count: 6, slug: "healthcare" },
        { name: "Science", count: 10, slug: "science" },
      ]

      return {
        success: true,
        categories: categories.length > 0 ? categories : mockCategories,
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching categories:", error)

      return {
        success: true,
        categories: [
          { name: "Technology", count: 15, slug: "technology" },
          { name: "Business", count: 12, slug: "business" },
          { name: "Environment", count: 8, slug: "environment" },
          { name: "Healthcare", count: 6, slug: "healthcare" },
          { name: "Science", count: 10, slug: "science" },
        ],
      }
    }
  })

  // Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 12 } = request.query
      const skip = (page - 1) * limit

      fastify.log.info(`📂 [BACKEND] Fetching articles for category: ${category}`)

      const articles = await Article.find({
        category: { $regex: category, $options: "i" },
        status: "published",
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .lean()

      const total = await Article.countDocuments({
        category: { $regex: category, $options: "i" },
        status: "published",
      })

      fastify.log.info(`✅ [BACKEND] Found ${articles.length} articles for category "${category}"`)

      const mockCategoryArticles = mockArticles.filter((a) => a.category.toLowerCase().includes(category.toLowerCase()))

      return {
        success: true,
        articles: articles.length > 0 ? articles : mockCategoryArticles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: articles.length > 0 ? total : mockCategoryArticles.length,
          pages: articles.length > 0 ? Math.ceil(total / limit) : Math.ceil(mockCategoryArticles.length / limit),
          hasNext: articles.length > 0 ? skip + articles.length < total : false,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      fastify.log.error(`❌ [BACKEND] Error fetching articles for category:`, error)

      const mockCategoryArticles = mockArticles.filter((a) =>
        a.category.toLowerCase().includes(request.params.category.toLowerCase()),
      )

      return {
        success: true,
        articles: mockCategoryArticles,
        pagination: {
          page: 1,
          limit: 12,
          total: mockCategoryArticles.length,
          pages: Math.ceil(mockCategoryArticles.length / 12),
          hasNext: false,
          hasPrev: false,
        },
      }
    }
  })

  // Get article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      fastify.log.info(`📖 [BACKEND] Fetching article by slug: ${slug}`)

      const article = await Article.findOne({ slug, status: "published" }).lean()

      if (article) {
        // Increment views
        await Article.updateOne({ _id: article._id }, { $inc: { views: 1 } })
        article.views = (article.views || 0) + 1

        fastify.log.info(`✅ [BACKEND] Found article: ${article.title}`)
        return { success: true, article }
      }

      // Fallback to mock data
      const mockArticle = mockArticles.find((a) => a.slug === slug)
      if (mockArticle) {
        fastify.log.info(`✅ [BACKEND] Found mock article: ${mockArticle.title}`)
        return { success: true, article: mockArticle }
      }

      return reply.code(404).send({ success: false, error: "Article not found" })
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching article:", error)
      return reply.code(500).send({ success: false, error: "Internal server error" })
    }
  })

  // Get article by ID
  fastify.get("/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      fastify.log.info(`📖 [BACKEND] Fetching article by ID: ${id}`)

      const article = await Article.findById(id).lean()

      if (article) {
        fastify.log.info(`✅ [BACKEND] Found article: ${article.title}`)
        return { success: true, article }
      }

      // Fallback to mock data
      const mockArticle = mockArticles.find((a) => a._id === id)
      if (mockArticle) {
        return { success: true, article: mockArticle }
      }

      return reply.code(404).send({ success: false, error: "Article not found" })
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching article by ID:", error)
      return reply.code(500).send({ success: false, error: "Internal server error" })
    }
  })
}

module.exports = articlesRoutes
