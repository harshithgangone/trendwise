const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")

async function articleRoutes(fastify, options) {
  console.log("📰 [ARTICLE ROUTES] Registering article routes...")

  // Get all articles with pagination
  fastify.get("/api/articles", async (request, reply) => {
    try {
      console.log("📖 [ARTICLES] GET /api/articles - Fetching articles...")

      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const category = request.query.category
      const featured = request.query.featured === "true"
      const skip = (page - 1) * limit

      console.log(
        `📊 [ARTICLES] Query params - page: ${page}, limit: ${limit}, category: ${category}, featured: ${featured}`,
      )

      // Build query
      const query = {}
      if (category && category !== "all") {
        query.category = new RegExp(category, "i")
      }
      if (featured) {
        query.featured = true
      }

      console.log("🔍 [ARTICLES] MongoDB query:", JSON.stringify(query))

      // Get articles with pagination
      const articles = await Article.find(query).sort({ createdAt: -1, featured: -1 }).skip(skip).limit(limit).lean()

      // Get total count for pagination
      const total = await Article.countDocuments(query)
      const pages = Math.ceil(total / limit)

      console.log(`✅ [ARTICLES] Found ${articles.length} articles (${total} total)`)

      // Transform articles for frontend
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "..." || "No excerpt available",
        thumbnail: article.thumbnail || article.featuredImage || "/placeholder.svg?height=224&width=400",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0, // Real views, no dummy data
        featured: article.featured || false,
        likes: article.likes || 0, // Real likes, no dummy data
        saves: article.saves || 0, // Real saves, no dummy data
        author: article.author || "TrendWise AI",
      }))

      const response = {
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      }

      console.log("📤 [ARTICLES] Sending response with", transformedArticles.length, "articles")
      return response
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
        articles: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      })
    }
  })

  // Get single article by slug - FIXED ROUTE
  fastify.get("/api/articles/slug/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [ARTICLES] ==========================================`)
      console.log(`📖 [ARTICLES] GET /api/articles/slug/${slug}`)
      console.log(`📖 [ARTICLES] Request timestamp: ${new Date().toISOString()}`)

      // Find article by slug
      console.log(`🔍 [ARTICLES] Searching for article with slug: ${slug}`)
      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        console.log(`❌ [ARTICLES] Article not found with slug: ${slug}`)
        console.log(`🔍 [ARTICLES] Checking all available slugs...`)

        // Debug: Show all available slugs
        const allArticles = await Article.find({}, { slug: 1, title: 1 }).lean()
        console.log(
          `📋 [ARTICLES] Available articles:`,
          allArticles.map((a) => ({ slug: a.slug, title: a.title })),
        )

        return reply.status(404).send({
          success: false,
          error: "Article not found",
          requestedSlug: slug,
          availableSlugs: allArticles.map((a) => a.slug),
        })
      }

      console.log(`✅ [ARTICLES] Article found:`, {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        hasContent: !!article.content,
        contentLength: article.content?.length,
        category: article.category,
        author: article.author,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
      })

      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content || `<h2>Content Loading</h2><p>This article content is being processed.</p>`,
        excerpt: article.excerpt || article.content?.substring(0, 300) + "..." || "No excerpt available",
        thumbnail: article.thumbnail || article.featuredImage || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0, // Real views
        featured: article.featured || false,
        likes: article.likes || 0, // Real likes
        saves: article.saves || 0, // Real saves
        author: article.author || "TrendWise AI",
        trending: article.trending || false,
      }

      console.log(`✅ [ARTICLES] Transformed article data:`, {
        _id: transformedArticle._id,
        title: transformedArticle.title,
        slug: transformedArticle.slug,
        hasContent: !!transformedArticle.content,
        views: transformedArticle.views,
        likes: transformedArticle.likes,
        saves: transformedArticle.saves,
      })

      console.log(`📤 [ARTICLES] Sending successful response for: ${article.title}`)
      console.log(`📖 [ARTICLES] ==========================================`)

      return {
        success: true,
        article: transformedArticle,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching article:", error)
      console.error("❌ [ARTICLES] Error stack:", error.stack)
      console.log(`📖 [ARTICLES] ==========================================`)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
        slug: request.params.slug,
      })
    }
  })

  // Get article by ID
  fastify.get("/api/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`📖 [ARTICLES] GET /api/articles/by-id/${id}`)

      const article = await Article.findById(id).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
        thumbnail: article.thumbnail || article.featuredImage,
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        author: article.author || "TrendWise AI",
      }

      return transformedArticle
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching article by ID:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Track article view - REAL DATA
  fastify.post("/api/articles/:id/view", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`👁️ [ARTICLES] Tracking REAL view for article: ${id}`)

      const article = await Article.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ARTICLES] REAL view tracked. New count: ${article.views}`)

      return {
        success: true,
        views: article.views,
        articleId: id,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error tracking view:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to track view",
      })
    }
  })

  // Like/unlike article - REAL DATA WITH USER PREFERENCES
  fastify.post("/api/articles/:id/like", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, userEmail } = request.body

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: "User ID required",
        })
      }

      console.log(`❤️ [ARTICLES] Processing REAL like for article: ${id} by user: ${userId}`)

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({ userId })
      if (!userPrefs) {
        userPrefs = new UserPreference({
          userId,
          email: userEmail,
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
        console.log(`👤 [ARTICLES] Created new user preferences for: ${userId}`)
      }

      // Check if article is already liked
      const isLiked = userPrefs.likedArticles.some((item) => item.articleId.toString() === id)

      let article
      if (isLiked) {
        // Unlike the article
        userPrefs.likedArticles = userPrefs.likedArticles.filter((item) => item.articleId.toString() !== id)
        article = await Article.findByIdAndUpdate(id, { $inc: { likes: -1 } }, { new: true })
        console.log(`💔 [ARTICLES] Article unliked. New REAL count: ${article.likes}`)
      } else {
        // Like the article
        userPrefs.likedArticles.push({
          articleId: id,
          likedAt: new Date(),
        })
        article = await Article.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
        console.log(`❤️ [ARTICLES] Article liked. New REAL count: ${article.likes}`)
      }

      await userPrefs.save()

      return {
        success: true,
        liked: !isLiked,
        likes: article.likes, // Real count from database
        articleId: id,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error processing like:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to process like",
      })
    }
  })

  // Save/unsave article - REAL DATA WITH USER PREFERENCES
  fastify.post("/api/articles/:id/save", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, userEmail } = request.body

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: "User ID required",
        })
      }

      console.log(`🔖 [ARTICLES] Processing REAL save for article: ${id} by user: ${userId}`)

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({ userId })
      if (!userPrefs) {
        userPrefs = new UserPreference({
          userId,
          email: userEmail,
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
        console.log(`👤 [ARTICLES] Created new user preferences for: ${userId}`)
      }

      // Check if article is already saved
      const isSaved = userPrefs.savedArticles.some((item) => item.articleId.toString() === id)

      let article
      if (isSaved) {
        // Unsave the article
        userPrefs.savedArticles = userPrefs.savedArticles.filter((item) => item.articleId.toString() !== id)
        article = await Article.findByIdAndUpdate(id, { $inc: { saves: -1 } }, { new: true })
        console.log(`🗑️ [ARTICLES] Article unsaved. New REAL count: ${article.saves}`)
      } else {
        // Save the article
        userPrefs.savedArticles.push({
          articleId: id,
          savedAt: new Date(),
        })
        article = await Article.findByIdAndUpdate(id, { $inc: { saves: 1 } }, { new: true })
        console.log(`🔖 [ARTICLES] Article saved. New REAL count: ${article.saves}`)
      }

      await userPrefs.save()

      return {
        success: true,
        saved: !isSaved,
        saves: article.saves, // Real count from database
        articleId: id,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error processing save:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to process save",
      })
    }
  })

  // Get trending articles - REAL DATA
  fastify.get("/api/articles/trending", async (request, reply) => {
    try {
      console.log("🔥 [ARTICLES] GET /api/articles/trending")

      const articles = await Article.find({}).sort({ views: -1, likes: -1, createdAt: -1 }).limit(10).lean()

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
        thumbnail: article.thumbnail || article.featuredImage,
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0, // Real views
        featured: article.featured || false,
        likes: article.likes || 0, // Real likes
        saves: article.saves || 0, // Real saves
        author: article.author || "TrendWise AI",
        trending: true,
      }))

      console.log(`✅ [ARTICLES] Found ${transformedArticles.length} trending articles with REAL data`)
      return {
        success: true,
        articles: transformedArticles,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching trending articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
        articles: [],
      })
    }
  })

  // Get articles by category - REAL DATA
  fastify.get("/api/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const skip = (page - 1) * limit

      console.log(`📂 [ARTICLES] GET /api/articles/category/${category}`)

      const query = { category: new RegExp(category, "i") }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

      const total = await Article.countDocuments(query)
      const pages = Math.ceil(total / limit)

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
        thumbnail: article.thumbnail || article.featuredImage,
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0, // Real views
        featured: article.featured || false,
        likes: article.likes || 0, // Real likes
        saves: article.saves || 0, // Real saves
        author: article.author || "TrendWise AI",
      }))

      console.log(`✅ [ARTICLES] Found ${transformedArticles.length} articles in category ${category} with REAL data`)
      return {
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching articles by category:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
        message: error.message,
        articles: [],
      })
    }
  })

  // Get categories with real counts - FIXED TO SHOW ONLY DB CATEGORIES
  fastify.get("/api/articles/categories", async (request, reply) => {
    try {
      console.log(`📂 [ARTICLES] GET /api/articles/categories`)

      // Get unique categories from actual articles in database
      const categories = await Article.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            _id: { $ne: null, $ne: "" }, // Filter out null/empty categories
          },
        },
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
        {
          $sort: { count: -1 },
        },
      ])

      console.log(`✅ [ARTICLES] Found ${categories.length} REAL categories from database`)

      return {
        success: true,
        categories: categories.filter((cat) => cat.name && typeof cat.name === "string"),
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching categories:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
        message: error.message,
        categories: [],
      })
    }
  })

  // Get user preferences with populated articles - FIXED FOR REAL USER DATA
  fastify.get("/api/user/preferences/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      console.log(`👤 [ARTICLES] Fetching preferences for user: ${userId}`)

      const preferences = await UserPreference.findOne({ userId }).lean()

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
          preferences: {
            userId,
            likedArticles: [],
            savedArticles: [],
            recentlyViewed: [],
          },
        }
      }

      // Get full article data for liked articles
      const likedArticleIds = preferences.likedArticles.map((item) => item.articleId)
      const likedArticles = await Article.find({ _id: { $in: likedArticleIds } }).lean()

      // Get full article data for saved articles
      const savedArticleIds = preferences.savedArticles.map((item) => item.articleId)
      const savedArticles = await Article.find({ _id: { $in: savedArticleIds } }).lean()

      // Get full article data for recently viewed articles
      const recentlyViewedIds = preferences.recentlyViewed.map((item) => item.articleId)
      const recentlyViewedArticles = await Article.find({ _id: { $in: recentlyViewedIds } }).lean()

      console.log(
        `✅ [ARTICLES] Found preferences with ${likedArticles.length} likes, ${savedArticles.length} saves, ${recentlyViewedArticles.length} recent`,
      )

      return {
        success: true,
        preferences: {
          userId: preferences.userId,
          likedArticles: likedArticles.map((article) => ({
            articleId: {
              _id: article._id.toString(),
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
              thumbnail: article.thumbnail || article.featuredImage,
              createdAt: article.createdAt,
              category: article.category,
              views: article.views || 0,
              likes: article.likes || 0,
              saves: article.saves || 0,
            },
          })),
          savedArticles: savedArticles.map((article) => ({
            articleId: {
              _id: article._id.toString(),
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
              thumbnail: article.thumbnail || article.featuredImage,
              createdAt: article.createdAt,
              category: article.category,
              views: article.views || 0,
              likes: article.likes || 0,
              saves: article.saves || 0,
            },
          })),
          recentlyViewed: recentlyViewedArticles.map((article) => ({
            articleId: {
              _id: article._id.toString(),
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
              thumbnail: article.thumbnail || article.featuredImage,
              createdAt: article.createdAt,
              category: article.category,
              views: article.views || 0,
              likes: article.likes || 0,
              saves: article.saves || 0,
            },
          })),
        },
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
