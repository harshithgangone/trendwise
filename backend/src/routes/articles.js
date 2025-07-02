const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/", async (request, reply) => {
    try {
      const { page = 1, limit = 10, category, search, sort = "createdAt" } = request.query

      const query = { isPublished: true }

      // Add category filter
      if (category && category !== "all") {
        query.category = new RegExp(category, "i")
      }

      // Add search filter
      if (search) {
        query.$or = [
          { title: new RegExp(search, "i") },
          { content: new RegExp(search, "i") },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      const skip = (page - 1) * limit
      const sortOrder = sort === "views" ? { views: -1 } : { createdAt: -1 }

      const articles = await Article.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-content") // Exclude full content for list view

      const total = await Article.countDocuments(query)

      fastify.log.info(`📰 [ARTICLES] Retrieved ${articles.length} articles (page ${page})`)

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
          title: "Breaking: Major Technology Breakthrough Announced",
          slug: "major-technology-breakthrough",
          summary:
            "Scientists have announced a revolutionary breakthrough that could change the way we interact with technology forever.",
          category: "Technology",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["technology", "breakthrough", "innovation"],
          isPublished: true,
          isTrending: true,
          views: 1250,
          likes: 89,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          _id: "mock2",
          title: "Global Markets Show Strong Recovery Signs",
          slug: "global-markets-recovery",
          summary:
            "Financial analysts report positive indicators across major global markets, suggesting a strong economic recovery.",
          category: "Business",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["business", "markets", "economy"],
          isPublished: true,
          isTrending: false,
          views: 892,
          likes: 45,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        },
        {
          _id: "mock3",
          title: "Revolutionary Health Study Reveals Surprising Results",
          slug: "health-study-surprising-results",
          summary:
            "A comprehensive health study spanning five years has revealed unexpected findings about modern lifestyle impacts.",
          category: "Health",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["health", "study", "lifestyle"],
          isPublished: true,
          isTrending: true,
          views: 1456,
          likes: 123,
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
      ]

      return {
        success: true,
        data: mockArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          pages: 1,
        },
        fallback: true,
      }
    }
  })

  // Get single article by ID
  fastify.get("/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`🔍 [BACKEND DB] Fetching article with ID: ${id}`)

      const article = await Article.findById(id)

      if (!article) {
        console.log(`❌ [BACKEND DB] Article not found with ID: ${id}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [BACKEND DB] Successfully retrieved article: ${article.title}`)
      reply.send(article)
    } catch (error) {
      console.error("❌ [BACKEND DB] Error fetching article by ID:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
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
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })

      fastify.log.info(`📖 [ARTICLES] Retrieved article: ${article.title}`)

      return {
        success: true,
        data: article,
      }
    } catch (error) {
      fastify.log.error("❌ [ARTICLES] Failed to fetch article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get trending articles
  fastify.get("/trending", async (request, reply) => {
    try {
      const { limit = 5 } = request.query

      const articles = await Article.find({
        isPublished: true,
        $or: [{ isTrending: true }, { views: { $gte: 1000 } }],
      })
        .sort({ views: -1, createdAt: -1 })
        .limit(Number.parseInt(limit))
        .select("-content")

      fastify.log.info(`🔥 [ARTICLES] Retrieved ${articles.length} trending articles`)

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
          title: "AI Revolution: How Machine Learning is Changing Everything",
          slug: "ai-revolution-machine-learning",
          summary:
            "Artificial Intelligence continues to transform industries at an unprecedented pace, with new applications emerging daily.",
          category: "Technology",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["ai", "machine-learning", "technology"],
          isPublished: true,
          isTrending: true,
          views: 2340,
          likes: 156,
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        {
          _id: "trending2",
          title: "Climate Change: New Solutions Show Promise",
          slug: "climate-change-new-solutions",
          summary:
            "Scientists worldwide are developing innovative approaches to combat climate change with encouraging results.",
          category: "Science",
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: ["climate", "environment", "solutions"],
          isPublished: true,
          isTrending: true,
          views: 1890,
          likes: 134,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        },
      ]

      return {
        success: true,
        data: mockTrending,
        fallback: true,
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
        slug: cat._id.toLowerCase().replace(/\s+/g, "-"),
      }))

      fastify.log.info(`📂 [ARTICLES] Retrieved ${categories.length} categories`)

      return {
        success: true,
        data: formattedCategories,
      }
    } catch (error) {
      fastify.log.error("❌ [ARTICLES] Failed to fetch categories:", error)

      // Return mock categories
      const mockCategories = [
        { name: "Technology", count: 15, slug: "technology" },
        { name: "Business", count: 12, slug: "business" },
        { name: "Health", count: 10, slug: "health" },
        { name: "Science", count: 8, slug: "science" },
        { name: "Sports", count: 6, slug: "sports" },
        { name: "Entertainment", count: 5, slug: "entertainment" },
      ]

      return {
        success: true,
        data: mockCategories,
        fallback: true,
      }
    }
  })

  // Get articles by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query

      const query = {
        isPublished: true,
        category: new RegExp(category, "i"),
      }

      const skip = (page - 1) * limit

      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .select("-content")

      const total = await Article.countDocuments(query)

      fastify.log.info(`📂 [ARTICLES] Retrieved ${articles.length} articles for category: ${category}`)

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
          _id: "cat1",
          title: `Latest ${request.params.category} News Update`,
          slug: `latest-${request.params.category.toLowerCase()}-news`,
          summary: `Stay updated with the latest developments in ${request.params.category}.`,
          category: request.params.category,
          author: "TrendBot AI",
          imageUrl: "/placeholder.svg?height=400&width=600",
          tags: [request.params.category.toLowerCase(), "news", "update"],
          isPublished: true,
          isTrending: false,
          views: 456,
          likes: 23,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ]

      return {
        success: true,
        data: mockCategoryArticles,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
        fallback: true,
      }
    }
  })

  // Get articles by tag
  fastify.get("/tag/:tag", async (request, reply) => {
    try {
      const { tag } = request.params
      const { page = 1, limit = 10 } = request.query
      console.log(`🏷️ [BACKEND DB] Fetching articles for tag: ${tag}`)

      const articles = await Article.find({
        tags: { $in: [tag] },
        status: "published",
      })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")

      const total = await Article.countDocuments({
        tags: { $in: [tag] },
        status: "published",
      })

      console.log(`✅ [BACKEND DB] Retrieved ${articles.length} articles for tag: ${tag}`)
      reply.send({
        success: true,
        articles,
        tag,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error fetching articles by tag:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by tag",
      })
    }
  })

  // Like/unlike an article
  fastify.post("/like/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { increment } = request.body
      console.log(`👍 [BACKEND DB] ${increment ? "Liking" : "Unliking"} article ${id}`)

      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({ success: false, error: "Article not found" })
      }

      if (increment) {
        article.likes = (article.likes || 0) + 1
      } else {
        article.likes = Math.max(0, (article.likes || 0) - 1)
      }
      await article.save()

      console.log(`✅ [BACKEND DB] Article ${id} now has ${article.likes} likes`)
      reply.send({ success: true, likes: article.likes, liked: increment })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error updating likes:", error.message)
      reply.status(500).send({ success: false, error: "Failed to update likes" })
    }
  })

  // Save/unsave an article
  fastify.post("/save/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { increment } = request.body
      console.log(`💾 [BACKEND DB] ${increment ? "Saving" : "Unsaving"} article ${id}`)

      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({ success: false, error: "Article not found" })
      }

      if (increment) {
        article.saves = (article.saves || 0) + 1
      } else {
        article.saves = Math.max(0, (article.saves || 0) - 1)
      }
      await article.save()

      console.log(`✅ [BACKEND DB] Article ${id} now has ${article.saves} saves`)
      reply.send({ success: true, saves: article.saves, saved: increment })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error updating saves:", error.message)
      reply.status(500).send({ success: false, error: "Failed to update saves" })
    }
  })
}

module.exports = articleRoutes
