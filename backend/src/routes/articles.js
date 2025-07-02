const Article = require("../models/Article")
const groqService = require("../services/groqService")

async function articlesRoutes(fastify, options) {
  // Get all articles with pagination
  fastify.get("/articles", async (request, reply) => {
    try {
      const { page = 1, limit = 10, category, search } = request.query
      const skip = (page - 1) * limit

      const query = {}
      if (category) query.category = category
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)

      reply.send({
        success: true,
        data: articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching articles:", error)

      // Return mock data as fallback
      const mockArticles = [
        {
          _id: "mock1",
          title: "AI Revolution in 2024: What You Need to Know",
          excerpt: "Artificial Intelligence continues to transform industries worldwide with breakthrough innovations.",
          content: "# AI Revolution in 2024\n\nArtificial Intelligence is reshaping our world...",
          category: "Technology",
          tags: ["AI", "Technology", "Innovation"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 1250,
          likes: 89,
          saves: 34,
          readTime: 5,
        },
        {
          _id: "mock2",
          title: "Sustainable Energy Solutions Gaining Momentum",
          excerpt: "Renewable energy technologies are becoming more efficient and cost-effective than ever before.",
          content: "# Sustainable Energy Solutions\n\nThe future of energy is green...",
          category: "Environment",
          tags: ["Energy", "Sustainability", "Environment"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 892,
          likes: 67,
          saves: 23,
          readTime: 4,
        },
        {
          _id: "mock3",
          title: "Remote Work Trends Shaping the Future",
          excerpt: "How remote work is transforming business operations and employee satisfaction globally.",
          content: "# Remote Work Trends\n\nThe workplace has evolved dramatically...",
          category: "Business",
          tags: ["Remote Work", "Business", "Future"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 1456,
          likes: 112,
          saves: 45,
          readTime: 6,
        },
      ]

      reply.send({
        success: true,
        data: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          pages: 1,
        },
        fallback: true,
      })
    }
  })

  // Get trending articles
  fastify.get("/articles/trending", async (request, reply) => {
    try {
      const articles = await Article.find({ featured: true }).sort({ views: -1, createdAt: -1 }).limit(10).lean()

      reply.send({
        success: true,
        data: articles,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles:", error)

      // Mock trending articles
      const mockTrending = [
        {
          _id: "trending1",
          title: "Breaking: Major Tech Breakthrough Announced",
          excerpt: "Industry leaders reveal game-changing innovation that could reshape technology.",
          category: "Technology",
          tags: ["Breaking", "Technology", "Innovation"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 5420,
          likes: 234,
          saves: 89,
          readTime: 7,
          featured: true,
        },
        {
          _id: "trending2",
          title: "Global Climate Initiative Shows Promising Results",
          excerpt: "New environmental policies are making a significant impact on carbon reduction.",
          category: "Environment",
          tags: ["Climate", "Environment", "Policy"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 3890,
          likes: 178,
          saves: 67,
          readTime: 5,
          featured: true,
        },
      ]

      reply.send({
        success: true,
        data: mockTrending,
        fallback: true,
      })
    }
  })

  // Get article categories
  fastify.get("/articles/categories", async (request, reply) => {
    try {
      const categories = await Article.distinct("category")
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const count = await Article.countDocuments({ category })
          return { name: category, count }
        }),
      )

      reply.send({
        success: true,
        data: categoriesWithCounts,
      })
    } catch (error) {
      fastify.log.error("Error fetching categories:", error)

      // Mock categories
      const mockCategories = [
        { name: "Technology", count: 45 },
        { name: "Business", count: 32 },
        { name: "Science", count: 28 },
        { name: "Environment", count: 23 },
        { name: "Healthcare", count: 19 },
        { name: "Education", count: 15 },
      ]

      reply.send({
        success: true,
        data: mockCategories,
        fallback: true,
      })
    }
  })

  // Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query
      const skip = (page - 1) * limit

      const articles = await Article.find({ category })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .lean()

      const total = await Article.countDocuments({ category })

      reply.send({
        success: true,
        data: articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching articles by category:", error)

      // Mock category articles
      const mockArticles = [
        {
          _id: "cat1",
          title: `Latest in ${request.params.category}`,
          excerpt: `Discover the newest developments in ${request.params.category}.`,
          category: request.params.category,
          tags: [request.params.category, "Latest", "News"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 567,
          likes: 34,
          saves: 12,
          readTime: 4,
        },
      ]

      reply.send({
        success: true,
        data: mockArticles,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
        fallback: true,
      })
    }
  })

  // Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          message: "Article not found",
        })
      }

      // Increment view count
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })

      reply.send({
        success: true,
        data: { ...article, views: article.views + 1 },
      })
    } catch (error) {
      fastify.log.error("Error fetching article:", error)
      reply.status(500).send({
        success: false,
        message: "Error fetching article",
      })
    }
  })

  // Like an article
  fastify.post("/articles/like/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const article = await Article.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          message: "Article not found",
        })
      }

      reply.send({
        success: true,
        data: { likes: article.likes },
      })
    } catch (error) {
      fastify.log.error("Error liking article:", error)
      reply.status(500).send({
        success: false,
        message: "Error liking article",
      })
    }
  })

  // Save an article
  fastify.post("/articles/save/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const article = await Article.findByIdAndUpdate(id, { $inc: { saves: 1 } }, { new: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          message: "Article not found",
        })
      }

      reply.send({
        success: true,
        data: { saves: article.saves },
      })
    } catch (error) {
      fastify.log.error("Error saving article:", error)
      reply.status(500).send({
        success: false,
        message: "Error saving article",
      })
    }
  })
}

module.exports = articlesRoutes
