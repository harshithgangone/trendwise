const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")

async function articleRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/articles", async (request, reply) => {
    try {
      console.log("📖 [BACKEND] GET /articles - Fetching articles from database")

      const { page = 1, limit = 10, search = "", tag = "", category = "", featured = null } = request.query

      console.log(
        `📊 [BACKEND] Query params: page=${page}, limit=${limit}, search="${search}", tag="${tag}", category="${category}", featured=${featured}`,
      )

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

      if (featured !== null) {
        query.featured = featured === "true"
      }

      console.log(`🔍 [BACKEND] MongoDB query: ${JSON.stringify(query)}`)

      // Calculate pagination
      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      // Get total count
      const total = await Article.countDocuments(query)
      console.log(`📊 [BACKEND] Total articles matching query: ${total}`)

      // Get articles
      const articles = await Article.find(query)
        .sort({ createdAt: -1, featured: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-content") // Exclude full content for list view
        .lean()

      console.log(`✅ [BACKEND] Retrieved ${articles.length} articles from database`)

      // Calculate pagination info
      const totalPages = Math.ceil(total / limitNum)
      const hasNext = pageNum < totalPages
      const hasPrev = pageNum > 1

      const response = {
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: totalPages,
          hasNext,
          hasPrev,
        },
      }

      console.log(`📤 [BACKEND] Sending response with ${response.articles.length} articles`)
      return reply.send(response)
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
      })
    }
  })

  // Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [BACKEND] GET /articles/${slug} - Fetching single article`)

      const article = await Article.findOne({ slug, status: "published" }).lean()

      if (!article) {
        console.log(`❌ [BACKEND] Article not found: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })
      article.views = (article.views || 0) + 1

      console.log(`✅ [BACKEND] Article found: ${article.title}`)
      return reply.send({
        success: true,
        article: {
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // Get article by ID
  fastify.get("/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`📖 [BACKEND] GET /articles/by-id/${id} - Fetching article by ID`)

      const article = await Article.findById(id).lean()

      if (!article) {
        console.log(`❌ [BACKEND] Article not found: ${id}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [BACKEND] Article found: ${article.title}`)
      return reply.send({
        success: true,
        article: {
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching article by ID:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // Get trending articles
  fastify.get("/articles/trending", async (request, reply) => {
    try {
      const { limit = 10 } = request.query
      console.log(`📈 [BACKEND] GET /articles/trending - Fetching trending articles`)

      const articles = await Article.find({ status: "published" })
        .sort({
          views: -1,
          likes: -1,
          "trendData.trendScore": -1,
          createdAt: -1,
        })
        .limit(Number.parseInt(limit))
        .select("-content")
        .lean()

      console.log(`✅ [BACKEND] Retrieved ${articles.length} trending articles`)
      return reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        })),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching trending articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
      })
    }
  })

  // Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query

      console.log(`📂 [BACKEND] GET /articles/category/${category} - Fetching articles by category`)

      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      const query = {
        status: "published",
        category: { $regex: category, $options: "i" },
      }

      const total = await Article.countDocuments(query)
      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select("-content")
        .lean()

      console.log(`✅ [BACKEND] Retrieved ${articles.length} articles in category: ${category}`)
      return reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching articles by category:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
        message: error.message,
      })
    }
  })

  // Get all categories
  fastify.get("/articles/categories", async (request, reply) => {
    try {
      console.log("📂 [BACKEND] GET /articles/categories - Fetching all categories")

      const categories = await Article.distinct("category", { status: "published" })

      console.log(`✅ [BACKEND] Retrieved ${categories.length} categories`)
      return reply.send({
        success: true,
        categories: categories.filter((cat) => cat && cat.trim() !== ""),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching categories:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
        message: error.message,
      })
    }
  })

  // Like an article
  fastify.post("/articles/:id/like", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      console.log(`👍 [BACKEND] POST /articles/${id}/like - User: ${userId}`)

      // Find the article
      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      let userPreference = null
      let isLiked = false

      if (userId) {
        // Get or create user preference
        userPreference = await UserPreference.findOne({ userId })
        if (!userPreference) {
          userPreference = new UserPreference({ userId, likedArticles: [], savedArticles: [] })
        }

        // Check if already liked
        isLiked = userPreference.likedArticles.includes(id)

        if (isLiked) {
          // Unlike
          userPreference.likedArticles = userPreference.likedArticles.filter((articleId) => articleId.toString() !== id)
          article.likes = Math.max(0, (article.likes || 0) - 1)
          console.log(`👎 [BACKEND] User ${userId} unliked article ${id}`)
        } else {
          // Like
          userPreference.likedArticles.push(id)
          article.likes = (article.likes || 0) + 1
          console.log(`👍 [BACKEND] User ${userId} liked article ${id}`)
        }

        await userPreference.save()
      } else {
        // Anonymous like - just increment
        article.likes = (article.likes || 0) + 1
        console.log(`👍 [BACKEND] Anonymous user liked article ${id}`)
      }

      await article.save()

      return reply.send({
        success: true,
        liked: userId ? !isLiked : true,
        likes: article.likes,
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error liking article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to like article",
        message: error.message,
      })
    }
  })

  // Save an article
  fastify.post("/articles/:id/save", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId } = request.body

      console.log(`💾 [BACKEND] POST /articles/${id}/save - User: ${userId}`)

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: "User ID required for saving articles",
        })
      }

      // Find the article
      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Get or create user preference
      let userPreference = await UserPreference.findOne({ userId })
      if (!userPreference) {
        userPreference = new UserPreference({ userId, likedArticles: [], savedArticles: [] })
      }

      // Check if already saved
      const isSaved = userPreference.savedArticles.includes(id)

      if (isSaved) {
        // Unsave
        userPreference.savedArticles = userPreference.savedArticles.filter((articleId) => articleId.toString() !== id)
        article.saves = Math.max(0, (article.saves || 0) - 1)
        console.log(`🗑️ [BACKEND] User ${userId} unsaved article ${id}`)
      } else {
        // Save
        userPreference.savedArticles.push(id)
        article.saves = (article.saves || 0) + 1
        console.log(`💾 [BACKEND] User ${userId} saved article ${id}`)
      }

      await userPreference.save()
      await article.save()

      return reply.send({
        success: true,
        saved: !isSaved,
        saves: article.saves,
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error saving article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to save article",
        message: error.message,
      })
    }
  })

  // Get user's liked articles
  fastify.get("/users/:userId/liked", async (request, reply) => {
    try {
      const { userId } = request.params
      const { page = 1, limit = 10 } = request.query

      console.log(`👍 [BACKEND] GET /users/${userId}/liked - Fetching liked articles`)

      const userPreference = await UserPreference.findOne({ userId })
      if (!userPreference || !userPreference.likedArticles.length) {
        return reply.send({
          success: true,
          articles: [],
          pagination: { page: 1, limit: Number.parseInt(limit), total: 0, pages: 0 },
        })
      }

      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      const total = userPreference.likedArticles.length
      const articleIds = userPreference.likedArticles.slice(skip, skip + limitNum)

      const articles = await Article.find({
        _id: { $in: articleIds },
        status: "published",
      })
        .select("-content")
        .lean()

      console.log(`✅ [BACKEND] Retrieved ${articles.length} liked articles for user ${userId}`)
      return reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._i.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching liked articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch liked articles",
        message: error.message,
      })
    }
  })

  // Get user's saved articles
  fastify.get("/users/:userId/saved", async (request, reply) => {
    try {
      const { userId } = request.params
      const { page = 1, limit = 10 } = request.query

      console.log(`💾 [BACKEND] GET /users/${userId}/saved - Fetching saved articles`)

      const userPreference = await UserPreference.findOne({ userId })
      if (!userPreference || !userPreference.savedArticles.length) {
        return reply.send({
          success: true,
          articles: [],
          pagination: { page: 1, limit: Number.parseInt(limit), total: 0, pages: 0 },
        })
      }

      const pageNum = Math.max(1, Number.parseInt(page))
      const limitNum = Math.min(50, Math.max(1, Number.parseInt(limit)))
      const skip = (pageNum - 1) * limitNum

      const total = userPreference.savedArticles.length
      const articleIds = userPreference.savedArticles.slice(skip, skip + limitNum)

      const articles = await Article.find({
        _id: { $in: articleIds },
        status: "published",
      })
        .select("-content")
        .lean()

      console.log(`✅ [BACKEND] Retrieved ${articles.length} saved articles for user ${userId}`)
      return reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          createdAt: article.createdAt || article.publishedAt || new Date().toISOString(),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching saved articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch saved articles",
        message: error.message,
      })
    }
  })

  // Get user preferences (liked/saved status for articles)
  fastify.get("/users/:userId/preferences", async (request, reply) => {
    try {
      const { userId } = request.params
      const { articleIds } = request.query // Comma-separated article IDs

      console.log(`⚙️ [BACKEND] GET /users/${userId}/preferences - Fetching user preferences`)

      const userPreference = await UserPreference.findOne({ userId })
      if (!userPreference) {
        return reply.send({
          success: true,
          preferences: {},
        })
      }

      const preferences = {}

      if (articleIds) {
        const ids = articleIds.split(",")
        ids.forEach((id) => {
          preferences[id] = {
            liked: userPreference.likedArticles.includes(id),
            saved: userPreference.savedArticles.includes(id),
          }
        })
      }

      return reply.send({
        success: true,
        preferences,
        totalLiked: userPreference.likedArticles.length,
        totalSaved: userPreference.savedArticles.length,
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching user preferences:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch user preferences",
        message: error.message,
      })
    }
  })
}

module.exports = articleRoutes
