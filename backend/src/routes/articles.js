const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")
const TrendBot = require("../services/trendBot")

async function articleRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  fastify.get("/articles", async (request, reply) => {
    try {
      console.log("📡 [ARTICLES API] Received request for articles")
      console.log("🔍 [ARTICLES API] Query params:", request.query)

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
      if (category && category !== "all") {
        query.category = { $regex: category, $options: "i" }
      }
      if (featured === "true") {
        query.featured = true
      }

      let sortObj = {}
      switch (sort) {
        case "views":
          sortObj = { views: -1, createdAt: -1 }
          break
        case "likes":
          sortObj = { likes: -1, createdAt: -1 }
          break
        case "trending":
          sortObj = { trendScore: -1, views: -1, createdAt: -1 }
          break
        default:
          sortObj = { createdAt: -1 }
      }

      console.log("[ARTICLES API] Query:", JSON.stringify(query))
      console.log("[ARTICLES API] Sort:", JSON.stringify(sortObj))
      console.log(`[ARTICLES API] Pagination: page=${pageNum}, limit=${limitNum}, skip=${skip}`)

      const [articles, total] = await Promise.all([
        Article.find(query).sort(sortObj).skip(skip).limit(limitNum).select("-content").lean(),
        Article.countDocuments(query),
      ])

      console.log(`[ARTICLES API] Found ${articles.length} articles, total in DB: ${total}`)

      const totalPages = Math.ceil(total / limitNum)

      // Transform articles for frontend compatibility
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.featuredImage || article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt || article.publishedAt,
        tags: article.tags || [],
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        trendData: {
          source: article.source?.name || "TrendWise",
          trendScore: article.trendScore || 50,
          searchVolume: "1K-10K",
        },
      }))

      console.log(`[ARTICLES API] Sending ${transformedArticles.length} articles to frontend.`)

      return reply.send({
        success: true,
        articles: transformedArticles,
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
        message: error.message,
      })
    }
  })

  // Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params

      console.log(`👁️ [API] Fetching article by slug: ${slug}`)

      const article = await Article.findOne({ slug, status: "published" }).lean()

      if (!article) {
        console.log(`❌ [API] Article not found: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })
      article.views = (article.views || 0) + 1

      console.log(`👁️ [API] Article viewed: ${article.title}`)

      // Transform article for frontend compatibility
      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        thumbnail: article.featuredImage || article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt || article.publishedAt,
        tags: article.tags || [],
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        meta: {
          description: article.seo?.metaDescription || article.excerpt,
          keywords: article.seo?.keywords || article.tags?.join(", "),
        },
        source: article.source,
        media: {
          ...article.media,
          tweets: article.tweets || article.media?.tweets || [],
        },
        twitterSearchUrl: `https://twitter.com/search?q=${encodeURIComponent(article.title)}&src=typed_query&f=live`,
        trendData: {
          source: article.source?.name || "TrendWise",
          trendScore: article.trendScore || 50,
          searchVolume: "1K-10K",
        },
      }

      return reply.send({
        success: true,
        ...transformedArticle,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching article:", error)
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

      const article = await Article.findById(id).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Transform article for frontend compatibility
      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        thumbnail: article.featuredImage || article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt || article.publishedAt,
        tags: article.tags || [],
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        media: {
          ...article.media,
          tweets: article.tweets || article.media?.tweets || [],
        },
        twitterSearchUrl: `https://twitter.com/search?q=${encodeURIComponent(article.title)}&src=typed_query&f=live`,
      }

      return reply.send({
        success: true,
        ...transformedArticle,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching article by ID:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // Like/Unlike article
  fastify.post("/articles/:id/like", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, userEmail } = request.body

      console.log(`👍 [ARTICLES API] Processing like for article ${id} by user ${userEmail || userId}`)

      if (!userId && !userEmail) {
        return reply.status(400).send({
          success: false,
          error: "User ID or email required",
        })
      }

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({
        $or: [{ userId: userId }, { email: userEmail }],
      })

      if (!userPrefs) {
        console.log(`📝 [ARTICLES API] Creating new user preferences for ${userEmail || userId}`)
        userPrefs = new UserPreference({
          userId: userId || userEmail,
          email: userEmail,
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
      }

      // Check if already liked
      const alreadyLiked = userPrefs.likedArticles.some((like) => like.articleId.toString() === id)

      let article
      if (alreadyLiked) {
        // Unlike
        console.log(`👎 [ARTICLES API] Unliking article ${id}`)
        userPrefs.likedArticles = userPrefs.likedArticles.filter((like) => like.articleId.toString() !== id)
        article = await Article.findByIdAndUpdate(id, { $inc: { likes: -1 } }, { new: true })
      } else {
        // Like
        console.log(`👍 [ARTICLES API] Liking article ${id}`)
        userPrefs.likedArticles.push({
          articleId: id,
          likedAt: new Date(),
        })
        article = await Article.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      }

      await userPrefs.save()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ARTICLES API] Like operation completed. Article likes: ${article.likes}`)
      return reply.send({
        success: true,
        liked: !alreadyLiked,
        likes: article.likes,
        message: alreadyLiked ? "Article unliked" : "Article liked",
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error processing like:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to process like",
        message: error.message,
      })
    }
  })

  // Save/Unsave article
  fastify.post("/articles/:id/save", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, userEmail } = request.body

      console.log(`💾 [ARTICLES API] Processing save for article ${id} by user ${userEmail || userId}`)

      if (!userId && !userEmail) {
        return reply.status(400).send({
          success: false,
          error: "User ID or email required",
        })
      }

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({
        $or: [{ userId: userId }, { email: userEmail }],
      })

      if (!userPrefs) {
        console.log(`📝 [ARTICLES API] Creating new user preferences for ${userEmail || userId}`)
        userPrefs = new UserPreference({
          userId: userId || userEmail,
          email: userEmail,
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
      }

      // Check if already saved
      const alreadySaved = userPrefs.savedArticles.some((save) => save.articleId.toString() === id)

      let article
      if (alreadySaved) {
        // Unsave
        console.log(`🗑️ [ARTICLES API] Unsaving article ${id}`)
        userPrefs.savedArticles = userPrefs.savedArticles.filter((save) => save.articleId.toString() !== id)
        article = await Article.findByIdAndUpdate(id, { $inc: { saves: -1 } }, { new: true })
      } else {
        // Save
        console.log(`💾 [ARTICLES API] Saving article ${id}`)
        userPrefs.savedArticles.push({
          articleId: id,
          savedAt: new Date(),
        })
        article = await Article.findByIdAndUpdate(id, { $inc: { saves: 1 } }, { new: true })
      }

      await userPrefs.save()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ARTICLES API] Save operation completed. Article saves: ${article.saves}`)
      return reply.send({
        success: true,
        saved: !alreadySaved,
        saves: article.saves,
        message: alreadySaved ? "Article unsaved" : "Article saved",
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error processing save:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to process save",
        message: error.message,
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
          trendScore: -1,
          views: -1,
          likes: -1,
          createdAt: -1,
        })
        .limit(limitNum)
        .select("-content")
        .lean()

      console.log(`🔥 [API] Fetched ${articles.length} trending articles`)

      // Transform articles for frontend compatibility
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.featuredImage || article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt || article.publishedAt,
        tags: article.tags || [],
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        trendData: {
          source: article.source?.name || "TrendWise",
          trendScore: article.trendScore || 50,
          searchVolume: "1K-10K",
        },
      }))

      return reply.send({
        success: true,
        articles: transformedArticles,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching trending articles:", error)
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

      // Transform articles for frontend compatibility
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.featuredImage || article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt || article.publishedAt,
        tags: article.tags || [],
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
      }))

      return reply.send({
        success: true,
        articles: transformedArticles,
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
        message: error.message,
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
        message: error.message,
      })
    }
  })

  // Manual refresh endpoint to trigger GNews/AI fetch
  fastify.post("/articles/refresh", async (request, reply) => {
    try {
      console.log("🔄 [API] Manual refresh endpoint called. Triggering TrendBot manualTrigger...")
      const result = await TrendBot.manualTrigger()
      console.log("✅ [API] Manual refresh completed.", result)
      return reply.send({ success: true, result })
    } catch (error) {
      console.error("❌ [API] Error in manual refresh endpoint:", error)
      return reply.status(500).send({ success: false, error: error.message })
    }
  })
}

module.exports = articleRoutes
