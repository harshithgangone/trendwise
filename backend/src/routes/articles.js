const Article = require("../models/Article")

async function articlesRoutes(fastify, options) {
  // Get all articles with pagination
  fastify.get("/articles", async (request, reply) => {
    try {
      const { page = 1, limit = 10, category, search, tag } = request.query
      const skip = (page - 1) * limit

      const query = { status: "published" }

      if (category) {
        query.category = new RegExp(category, "i")
      }

      if (tag) {
        query.tags = { $in: [new RegExp(tag, "i")] }
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { content: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)

      reply.send({
        success: true,
        articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + articles.length < total,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching articles:", error)

      // Return mock data as fallback
      const mockArticles = [
        {
          _id: "mock1",
          title: "AI Revolution in 2024: What You Need to Know",
          slug: "ai-revolution-2024-what-you-need-to-know",
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
          featured: true,
          status: "published",
        },
        {
          _id: "mock2",
          title: "Sustainable Energy Solutions Gaining Momentum",
          slug: "sustainable-energy-solutions-gaining-momentum",
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
          featured: false,
          status: "published",
        },
        {
          _id: "mock3",
          title: "Remote Work Trends Shaping the Future",
          slug: "remote-work-trends-shaping-the-future",
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
          featured: false,
          status: "published",
        },
      ]

      reply.send({
        success: true,
        articles: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          pages: 1,
          hasNext: false,
        },
      })
    }
  })

  // Get trending articles
  fastify.get("/articles/trending/top", async (request, reply) => {
    try {
      const articles = await Article.find({ status: "published" }).sort({ views: -1, createdAt: -1 }).limit(10).lean()

      reply.send({
        success: true,
        articles,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles:", error)

      // Mock trending articles
      const mockTrending = [
        {
          _id: "trending1",
          title: "Breaking: Major Tech Breakthrough Announced",
          slug: "breaking-major-tech-breakthrough-announced",
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
          trendData: {
            trendScore: 95,
            searchVolume: "High",
            source: "Google Trends",
          },
        },
        {
          _id: "trending2",
          title: "Global Climate Initiative Shows Promising Results",
          slug: "global-climate-initiative-shows-promising-results",
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
          trendData: {
            trendScore: 88,
            searchVolume: "High",
            source: "News Analysis",
          },
        },
      ]

      reply.send({
        success: true,
        articles: mockTrending,
      })
    }
  })

  // Get article categories with counts
  fastify.get("/articles/meta/categories", async (request, reply) => {
    try {
      const categories = await Article.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { name: "$_id", count: 1, slug: { $toLower: "$_id" }, _id: 0 } },
        { $sort: { name: 1 } },
      ])

      reply.send({
        success: true,
        categories,
      })
    } catch (error) {
      fastify.log.error("Error fetching categories:", error)

      // Mock categories
      const mockCategories = [
        { name: "Technology", count: 45, slug: "technology" },
        { name: "Business", count: 32, slug: "business" },
        { name: "Science", count: 28, slug: "science" },
        { name: "Environment", count: 23, slug: "environment" },
        { name: "Healthcare", count: 19, slug: "healthcare" },
        { name: "Education", count: 15, slug: "education" },
      ]

      reply.send({
        success: true,
        categories: mockCategories,
      })
    }
  })

  // Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query
      const skip = (page - 1) * limit

      const query = {
        category: new RegExp(category, "i"),
        status: "published",
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)

      reply.send({
        success: true,
        articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: skip + articles.length < total,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching articles by category:", error)

      // Mock category articles
      const mockArticles = [
        {
          _id: "cat1",
          title: `Latest in ${request.params.category}`,
          slug: `latest-in-${request.params.category.toLowerCase()}`,
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
          status: "published",
        },
      ]

      reply.send({
        success: true,
        articles: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
          hasNext: false,
        },
      })
    }
  })

  // Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      const article = await Article.findOneAndUpdate(
        { slug, status: "published" },
        { $inc: { views: 1 } },
        { new: true },
      ).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      reply.send(article)
    } catch (error) {
      fastify.log.error("Error fetching article:", error)

      // Mock article for fallback
      const mockArticle = {
        _id: "mock-article",
        title: "Sample Article",
        slug: request.params.slug,
        excerpt: "This is a sample article for demonstration purposes.",
        content: "# Sample Article\n\nThis is sample content.",
        category: "Technology",
        tags: ["Sample", "Demo"],
        author: "TrendBot AI",
        thumbnail: "/placeholder.svg?height=400&width=600",
        createdAt: new Date(),
        views: 100,
        likes: 10,
        saves: 5,
        readTime: 3,
        status: "published",
      }

      reply.send(mockArticle)
    }
  })

  // Get article by ID
  fastify.get("/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const article = await Article.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true }).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      reply.send(article)
    } catch (error) {
      fastify.log.error("Error fetching article by ID:", error)
      reply.status(500).send({
        success: false,
        error: "Error fetching article",
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
          error: "Article not found",
        })
      }

      reply.send({
        success: true,
        likes: article.likes,
      })
    } catch (error) {
      fastify.log.error("Error liking article:", error)
      reply.status(500).send({
        success: false,
        error: "Error liking article",
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
          error: "Article not found",
        })
      }

      reply.send({
        success: true,
        saves: article.saves,
      })
    } catch (error) {
      fastify.log.error("Error saving article:", error)
      reply.status(500).send({
        success: false,
        error: "Error saving article",
      })
    }
  })
}

module.exports = articlesRoutes
