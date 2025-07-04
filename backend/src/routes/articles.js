const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")

async function articleRoutes(fastify, options) {
  console.log("📰 [ARTICLE ROUTES] Registering article routes...")

  // Get all articles with pagination
  fastify.get("/api/articles", async (request, reply) => {
    try {
      const { page = 1, limit = 12, category, search, featured } = request.query
      const skip = (page - 1) * limit

      console.log(`📖 [BACKEND] GET /api/articles - Page: ${page}, Limit: ${limit}, Category: ${category || "all"}`)

      const query = {}

      // Add category filter
      if (category && category !== "all") {
        query.tags = { $in: [new RegExp(category, "i")] }
      }

      // Add search filter
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { excerpt: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      // Add featured filter
      if (featured === "true") {
        query.featured = true
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)
      const totalPages = Math.ceil(total / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      console.log(`✅ [BACKEND] Found ${articles.length} articles (${total} total)`)

      reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        })),
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages,
          totalArticles: total,
          hasNext,
          hasPrev,
          limit: Number.parseInt(limit),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching articles:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
      })
    }
  })

  // Get single article by slug - FIXED ROUTE
  fastify.get("/api/articles/slug/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [BACKEND] GET /api/articles/slug/${slug}`)

      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        console.log(`❌ [BACKEND] Article not found: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [BACKEND] Found article: ${article.title}`)

      reply.send({
        success: true,
        article: {
          ...article,
          _id: article._id.toString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching article:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get article by ID
  fastify.get("/api/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`📖 [BACKEND] GET /api/articles/by-id/${id}`)

      const article = await Article.findById(id).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      reply.send({
        success: true,
        article: {
          ...article,
          _id: article._id.toString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching article by ID:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get trending articles - REAL DATA
  fastify.get("/api/articles/trending", async (request, reply) => {
    try {
      const { limit = 10 } = request.query
      console.log(`🔥 [BACKEND] GET /api/articles/trending - Limit: ${limit}`)

      const articles = await Article.find({})
        .sort({
          views: -1,
          likes: -1,
          createdAt: -1,
        })
        .limit(Number.parseInt(limit))
        .lean()

      console.log(`✅ [BACKEND] Found ${articles.length} trending articles`)

      reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        })),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching trending articles:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
      })
    }
  })

  // Get categories with real counts
  fastify.get("/api/articles/categories", async (request, reply) => {
    try {
      console.log("📂 [BACKEND] GET /api/articles/categories")

      const categories = await Article.aggregate([
        { $unwind: "$tags" },
        {
          $group: {
            _id: "$tags",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        {
          $project: {
            name: "$_id",
            count: 1,
            slug: {
              $toLower: {
                $replaceAll: {
                  input: "$_id",
                  find: " ",
                  replacement: "-",
                },
              },
            },
            _id: 0,
          },
        },
      ])

      console.log(`✅ [BACKEND] Found ${categories.length} categories`)

      reply.send({
        success: true,
        categories: categories.filter((cat) => cat.name && typeof cat.name === "string"),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching categories:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
      })
    }
  })

  // Get articles by category - REAL DATA
  fastify.get("/api/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 12 } = request.query
      const skip = (page - 1) * limit

      console.log(`📂 [BACKEND] GET /api/articles/category/${category} - Page: ${page}`)

      const query = {
        tags: { $in: [new RegExp(category, "i")] },
      }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number.parseInt(limit)).lean()

      const total = await Article.countDocuments(query)
      const totalPages = Math.ceil(total / limit)

      console.log(`✅ [BACKEND] Found ${articles.length} articles in category "${category}"`)

      reply.send({
        success: true,
        articles: articles.map((article) => ({
          ...article,
          _id: article._id.toString(),
          views: article.views || 0,
          likes: article.likes || 0,
          saves: article.saves || 0,
        })),
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages,
          totalArticles: total,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          limit: Number.parseInt(limit),
        },
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error fetching articles by category:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
      })
    }
  })

  // Track article view - REAL DATA
  fastify.post("/api/articles/view/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { userEmail } = request.body

      console.log(`👁️ [BACKEND] POST /api/articles/view/${id} - User: ${userEmail || "anonymous"}`)

      // Update article view count
      const article = await Article.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Track user view if authenticated
      if (userEmail) {
        await UserPreference.findOneAndUpdate(
          { userEmail },
          {
            $addToSet: { viewedArticles: id },
            $set: { lastActive: new Date() },
          },
          { upsert: true },
        )
      }

      console.log(`✅ [BACKEND] Article view tracked. Total views: ${article.views}`)

      reply.send({
        success: true,
        views: article.views,
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error tracking view:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to track view",
      })
    }
  })

  // Like/unlike article - REAL DATA WITH USER PREFERENCES
  fastify.post("/api/articles/like/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { userEmail, action } = request.body

      if (!userEmail) {
        return reply.status(401).send({
          success: false,
          error: "Authentication required",
        })
      }

      console.log(`❤️ [BACKEND] POST /api/articles/like/${id} - User: ${userEmail}, Action: ${action}`)

      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      let userPrefs = await UserPreference.findOne({ userEmail })
      if (!userPrefs) {
        userPrefs = new UserPreference({ userEmail })
      }

      const isLiked = userPrefs.likedArticles.includes(id)

      if (action === "like" && !isLiked) {
        // Like the article
        article.likes = (article.likes || 0) + 1
        userPrefs.likedArticles.push(id)
      } else if (action === "unlike" && isLiked) {
        // Unlike the article
        article.likes = Math.max((article.likes || 0) - 1, 0)
        userPrefs.likedArticles = userPrefs.likedArticles.filter((articleId) => articleId.toString() !== id)
      }

      await article.save()
      await userPrefs.save()

      console.log(`✅ [BACKEND] Article ${action}d. Total likes: ${article.likes}`)

      reply.send({
        success: true,
        likes: article.likes,
        isLiked: userPrefs.likedArticles.includes(id),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error handling like:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to handle like",
      })
    }
  })

  // Save/unsave article - REAL DATA WITH USER PREFERENCES
  fastify.post("/api/articles/save/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const { userEmail, action } = request.body

      if (!userEmail) {
        return reply.status(401).send({
          success: false,
          error: "Authentication required",
        })
      }

      console.log(`💾 [BACKEND] POST /api/articles/save/${id} - User: ${userEmail}, Action: ${action}`)

      const article = await Article.findById(id)
      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      let userPrefs = await UserPreference.findOne({ userEmail })
      if (!userPrefs) {
        userPrefs = new UserPreference({ userEmail })
      }

      const isSaved = userPrefs.savedArticles.includes(id)

      if (action === "save" && !isSaved) {
        // Save the article
        article.saves = (article.saves || 0) + 1
        userPrefs.savedArticles.push(id)
      } else if (action === "unsave" && isSaved) {
        // Unsave the article
        article.saves = Math.max((article.saves || 0) - 1, 0)
        userPrefs.savedArticles = userPrefs.savedArticles.filter((articleId) => articleId.toString() !== id)
      }

      await article.save()
      await userPrefs.save()

      console.log(`✅ [BACKEND] Article ${action}d. Total saves: ${article.saves}`)

      reply.send({
        success: true,
        saves: article.saves,
        isSaved: userPrefs.savedArticles.includes(id),
      })
    } catch (error) {
      console.error("❌ [BACKEND] Error handling save:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to handle save",
      })
    }
  })

  // Create new article
  fastify.post("/api/articles", async (request, reply) => {
    try {
      console.log("📝 [ARTICLES] POST /api/articles - Creating article...")

      const articleData = request.body
      console.log("📄 [ARTICLES] Article data received:", {
        title: articleData.title,
        category: articleData.category,
        tags: articleData.tags,
      })

      // Generate unique slug
      const baseSlug = articleData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      let slug = baseSlug
      let counter = 1

      while (await Article.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      console.log(`🔗 [ARTICLES] Generated unique slug: ${slug}`)

      const article = new Article({
        ...articleData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0, // Start with 0 real views
        likes: 0, // Start with 0 real likes
        saves: 0, // Start with 0 real saves
      })

      await article.save()
      console.log(`✅ [ARTICLES] Article created: ${article.title} (${article.slug})`)

      return {
        success: true,
        article: {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          thumbnail: article.thumbnail,
          createdAt: article.createdAt,
          category: article.category,
          tags: article.tags,
        },
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error creating article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to create article",
        message: error.message,
      })
    }
  })

  // Get user preferences with populated articles
  fastify.get("/api/user/preferences/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      console.log(`👤 [ARTICLES] Fetching preferences for user: ${userId}`)

      const preferences = await UserPreference.findOne({ userId })
        .populate("likedArticles.articleId", "title slug excerpt thumbnail createdAt category views likes saves")
        .populate("savedArticles.articleId", "title slug excerpt thumbnail createdAt category views likes saves")
        .populate("recentlyViewed.articleId", "title slug excerpt thumbnail createdAt category views likes saves")

      if (!preferences) {
        console.log(`👤 [ARTICLES] No preferences found, creating new for user: ${userId}`)
        const newPrefs = new UserPreference({
          userId,
          email: "",
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
        await newPrefs.save()

        return {
          success: true,
          preferences: newPrefs,
        }
      }

      console.log(
        `✅ [ARTICLES] Found preferences with ${preferences.likedArticles.length} likes, ${preferences.savedArticles.length} saves`,
      )

      return {
        success: true,
        preferences,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching user preferences:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch user preferences",
      })
    }
  })

  console.log("✅ [ARTICLE ROUTES] Article routes registered successfully with REAL DATA functionality")
}

module.exports = articleRoutes
