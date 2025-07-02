const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  // Get all articles
  fastify.get("/", async (request, reply) => {
    try {
      console.log("📚 [BACKEND DB] Fetching articles from database...")
      const { page = 1, limit = 10, search, tag, category } = request.query

      const query = { status: "published" }

      if (search) {
        query.$text = { $search: search }
      }

      if (tag) {
        query.tags = { $in: [tag] }
      }

      if (category) {
        query.tags = { $in: [category] }
      }

      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content") // Exclude full content for list view

      const total = await Article.countDocuments(query)

      console.log(`✅ [BACKEND DB] Successfully retrieved ${articles.length} articles from database (${total} total)`)

      if (articles.length === 0) {
        console.log("📝 [BACKEND DB] No articles found in database")
      }

      reply.send({
        success: true,
        articles,
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
      console.error("❌ [BACKEND DB] Error fetching articles:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
      })
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
      console.log(`🔍 [BACKEND DB] Fetching article with slug: ${slug}`)

      const article = await Article.findOne({
        slug,
        status: "published",
      })

      if (!article) {
        console.log(`❌ [BACKEND DB] Article not found with slug: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count for real user interaction
      article.views = (article.views || 0) + 1
      await article.save()

      console.log(`✅ [BACKEND DB] Successfully retrieved article: ${article.title} (Views: ${article.views})`)
      reply.send(article)
    } catch (error) {
      console.error("❌ [BACKEND DB] Error fetching article:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get trending articles
  fastify.get("/trending/top", async (request, reply) => {
    try {
      console.log("🔥 [BACKEND DB] Fetching trending articles...")

      const articles = await Article.find({ status: "published" })
        .sort({ views: -1, likes: -1, saves: -1 })
        .limit(10)
        .select("-content")

      console.log(`✅ [BACKEND DB] Retrieved ${articles.length} trending articles`)
      reply.send({
        success: true,
        articles,
      })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error fetching trending articles:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
      })
    }
  })

  // Get articles by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query
      console.log(`📂 [BACKEND DB] Fetching articles for category: ${category}`)

      const articles = await Article.find({
        tags: { $in: [category] },
        status: "published",
      })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")

      const total = await Article.countDocuments({
        tags: { $in: [category] },
        status: "published",
      })

      console.log(`✅ [BACKEND DB] Retrieved ${articles.length} articles for category: ${category}`)
      reply.send({
        success: true,
        articles,
        category,
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
      console.error("❌ [BACKEND DB] Error fetching articles by category:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
      })
    }
  })

  // Get available categories
  fastify.get("/meta/categories", async (request, reply) => {
    try {
      console.log("🏷️ [BACKEND DB] Fetching all categories...")

      const categories = await Article.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])

      const formattedCategories = categories.map((cat) => ({
        name: cat._id,
        count: cat.count,
        slug: cat._id.toLowerCase().replace(/\s+/g, "-"),
      }))

      console.log(`✅ [BACKEND DB] Retrieved ${categories.length} categories`)
      reply.send({
        success: true,
        categories: formattedCategories,
      })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error fetching categories:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
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

      // Only real user interactions count
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

      // Only real user interactions count
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

  // Add view tracking endpoint
  fastify.post("/view/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      console.log(`👁️ [BACKEND DB] User ${userId || "anonymous"} viewed article ${id}`)

      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({ success: false, error: "Article not found" })
      }

      // Increment view count for real user interaction
      article.views = (article.views || 0) + 1
      await article.save()

      console.log(`✅ [BACKEND DB] Article ${id} now has ${article.views} views`)

      reply.send({
        success: true,
        views: article.views,
        message: "View recorded successfully",
      })
    } catch (error) {
      console.error("❌ [BACKEND DB] Error updating view:", error.message)
      reply.status(500).send({ success: false, error: "Failed to update view" })
    }
  })
}

module.exports = articleRoutes
