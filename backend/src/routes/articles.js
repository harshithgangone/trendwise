const Article = require("../models/Article")

async function articlesRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/", async (request, reply) => {
    try {
      const { page = 1, limit = 10, category, search, sort = "publishedAt" } = request.query

      const query = {}
      if (category && category !== "all") {
        query.category = category
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      const sortOptions = {}
      switch (sort) {
        case "views":
          sortOptions.views = -1
          break
        case "likes":
          sortOptions.likes = -1
          break
        case "trending":
          sortOptions.trending = -1
          sortOptions.publishedAt = -1
          break
        default:
          sortOptions.publishedAt = -1
      }

      const articles = await Article.find(query)
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec()

      const total = await Article.countDocuments(query)

      // If no articles found, return mock data
      if (articles.length === 0) {
        const mockArticles = [
          {
            _id: "mock1",
            title: "Welcome to TrendWise - Your AI-Powered News Platform",
            excerpt: "Discover the latest trends and breaking news powered by artificial intelligence.",
            content:
              "TrendWise is revolutionizing how you consume news by leveraging cutting-edge AI technology to bring you the most relevant and trending stories from around the world.",
            category: "technology",
            tags: ["AI", "News", "Technology"],
            author: "TrendWise Team",
            publishedAt: new Date(),
            imageUrl: "/placeholder.svg?height=400&width=600&text=Welcome+to+TrendWise",
            slug: "welcome-to-trendwise",
            views: 1250,
            likes: 89,
            trending: true,
          },
          {
            _id: "mock2",
            title: "The Future of Artificial Intelligence in Journalism",
            excerpt: "Exploring how AI is transforming the landscape of modern journalism and news reporting.",
            content:
              "Artificial Intelligence is reshaping journalism by automating content creation, fact-checking, and personalized news delivery. This transformation brings both opportunities and challenges for the industry.",
            category: "technology",
            tags: ["AI", "Journalism", "Future"],
            author: "AI Reporter",
            publishedAt: new Date(Date.now() - 3600000),
            imageUrl: "/placeholder.svg?height=400&width=600&text=AI+Journalism",
            slug: "future-of-ai-journalism",
            views: 892,
            likes: 67,
            trending: true,
          },
        ]

        return {
          success: true,
          data: mockArticles,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages: 1,
            totalArticles: mockArticles.length,
            hasNext: false,
            hasPrev: false,
          },
        }
      }

      reply.send({
        success: true,
        data: articles,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalArticles: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching articles:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
      })
    }
  })

  // Get trending articles
  fastify.get("/trending", async (request, reply) => {
    try {
      const { limit = 10 } = request.query

      const articles = await Article.find({ trending: true })
        .sort({ views: -1, publishedAt: -1 })
        .limit(Number.parseInt(limit))
        .exec()

      // If no trending articles, return mock trending data
      if (articles.length === 0) {
        const mockTrending = [
          {
            _id: "trending1",
            title: "Breaking: Major AI Breakthrough Announced",
            excerpt: "Scientists reveal groundbreaking advancement in artificial intelligence technology.",
            category: "technology",
            author: "Tech Reporter",
            publishedAt: new Date(),
            imageUrl: "/placeholder.svg?height=400&width=600&text=AI+Breakthrough",
            slug: "ai-breakthrough-announced",
            views: 2500,
            likes: 189,
            trending: true,
          },
          {
            _id: "trending2",
            title: "Global Climate Summit Reaches Historic Agreement",
            excerpt: "World leaders unite on unprecedented climate action plan.",
            category: "environment",
            author: "Environmental Correspondent",
            publishedAt: new Date(Date.now() - 1800000),
            imageUrl: "/placeholder.svg?height=400&width=600&text=Climate+Summit",
            slug: "climate-summit-agreement",
            views: 1890,
            likes: 156,
            trending: true,
          },
        ]

        return {
          success: true,
          data: mockTrending,
        }
      }

      reply.send({
        success: true,
        data: articles,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
      })
    }
  })

  // Get article categories
  fastify.get("/categories", async (request, reply) => {
    try {
      const categories = await Article.distinct("category")

      // If no categories found, return default categories
      if (categories.length === 0) {
        const defaultCategories = [
          "technology",
          "business",
          "science",
          "health",
          "environment",
          "politics",
          "sports",
          "entertainment",
        ]

        return {
          success: true,
          data: defaultCategories,
        }
      }

      reply.send({
        success: true,
        data: categories,
      })
    } catch (error) {
      fastify.log.error("Error fetching categories:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
        message: error.message,
      })
    }
  })

  // Get single article by slug
  fastify.get("/:slug", async (request, reply) => {
    try {
      const { slug } = request.params

      const article = await Article.findOne({ slug })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment views
      article.views += 1
      await article.save()

      reply.send({
        success: true,
        data: article,
      })
    } catch (error) {
      fastify.log.error("Error fetching article:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })
}

module.exports = articlesRoutes
