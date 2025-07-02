const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/articles", async (request, reply) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        tag = "",
        category = "",
        featured = "",
        sort = "createdAt",
      } = request.query

      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      // Build query
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

      if (featured === "true") {
        query.featured = true
      }

      // Build sort object
      let sortObj = {}
      switch (sort) {
        case "views":
          sortObj = { views: -1, createdAt: -1 }
          break
        case "likes":
          sortObj = { likes: -1, createdAt: -1 }
          break
        case "trending":
          sortObj = { "trendData.trendScore": -1, views: -1, createdAt: -1 }
          break
        default:
          sortObj = { createdAt: -1 }
      }

      // Execute query
      const [articles, total] = await Promise.all([
        Article.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .select("-content") // Exclude full content for list view
          .lean(),
        Article.countDocuments(query),
      ])

      const totalPages = Math.ceil(total / limitNum)

      console.log(`📊 [API] Fetched ${articles.length} articles (page ${pageNum}/${totalPages})`)

      return reply.send({
        success: true,
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      })
    } catch (error) {
      console.error("❌ [API] Error fetching articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
      })
    }
  })

  // Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params

      const article = await Article.findOne({ slug, status: "published" }).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })
      article.views = (article.views || 0) + 1

      console.log(`👁️ [API] Article viewed: ${article.title}`)

      return reply.send({
        success: true,
        ...article,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get article by ID
  fastify.get("/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params

      const article = await Article.findById(id).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      return reply.send({
        success: true,
        ...article,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching article by ID:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Like/Unlike article
  fastify.post("/articles/like/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { increment } = request.body

      const updateOperation = increment ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }

      const article = await Article.findByIdAndUpdate(id, updateOperation, { new: true, runValidators: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Ensure likes don't go below 0
      if (article.likes < 0) {
        article.likes = 0
        await article.save()
      }

      console.log(`❤️ [API] Article ${increment ? "liked" : "unliked"}: ${article.title}`)

      return reply.send({
        success: true,
        likes: article.likes,
        message: increment ? "Article liked" : "Article unliked",
      })
    } catch (error) {
      console.error("❌ [API] Error updating article likes:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to update likes",
      })
    }
  })

  // Save/Unsave article
  fastify.post("/articles/save/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { increment } = request.body

      const updateOperation = increment ? { $inc: { saves: 1 } } : { $inc: { saves: -1 } }

      const article = await Article.findByIdAndUpdate(id, updateOperation, { new: true, runValidators: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Ensure saves don't go below 0
      if (article.saves < 0) {
        article.saves = 0
        await article.save()
      }

      console.log(`💾 [API] Article ${increment ? "saved" : "unsaved"}: ${article.title}`)

      return reply.send({
        success: true,
        saves: article.saves,
        message: increment ? "Article saved" : "Article unsaved",
      })
    } catch (error) {
      console.error("❌ [API] Error updating article saves:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to update saves",
      })
    }
  })

  // Get trending articles
  fastify.get("/articles/trending", async (request, reply) => {
    try {
      const { limit = 10 } = request.query
      const limitNum = Math.min(20, Math.max(1, Number.parseInt(limit)))

      const articles = await Article.find({ status: "published" })
        .sort({
          "trendData.trendScore": -1,
          views: -1,
          likes: -1,
          createdAt: -1,
        })
        .limit(limitNum)
        .select("-content")
        .lean()

      console.log(`🔥 [API] Fetched ${articles.length} trending articles`)

      return reply.send({
        success: true,
        articles,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching trending articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
      })
    }
  })

  // Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query

      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(20, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      const [articles, total] = await Promise.all([
        Article.find({
          category: { $regex: category, $options: "i" },
          status: "published",
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .select("-content")
          .lean(),
        Article.countDocuments({
          category: { $regex: category, $options: "i" },
          status: "published",
        }),
      ])

      const totalPages = Math.ceil(total / limitNum)

      console.log(`📂 [API] Fetched ${articles.length} articles in category: ${category}`)

      return reply.send({
        success: true,
        articles,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
        },
      })
    } catch (error) {
      console.error("❌ [API] Error fetching articles by category:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
      })
    }
  })

  // Get available categories
  fastify.get("/articles/categories", async (request, reply) => {
    try {
      const categories = await Article.distinct("category", { status: "published" })

      console.log(`📋 [API] Found ${categories.length} categories`)

      return reply.send({
        success: true,
        categories: categories.filter((cat) => cat && cat.trim()),
      })
    } catch (error) {
      console.error("❌ [API] Error fetching categories:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
      })
    }
  })
}

module.exports = articleRoutes
