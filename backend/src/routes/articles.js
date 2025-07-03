const express = require("express")
const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")
const router = express.Router()
const mongoose = require("mongoose")

async function articleRoutes(fastify, options) {
  // Get all articles with pagination and filtering
  router.get("/", async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const category = req.query.category
      const search = req.query.search

      console.log(`📰 [ARTICLES API] Fetching articles - Page: ${page}, Limit: ${limit}`)

      // Build query
      const query = { status: "published" }

      if (category && category !== "all") {
        query.category = new RegExp(category, "i")
      }

      if (search) {
        query.$or = [
          { title: new RegExp(search, "i") },
          { content: new RegExp(search, "i") },
          { tags: { $in: [new RegExp(search, "i")] } },
        ]
      }

      // Get articles with proper image handling
      const articles = await Article.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          slug: 1,
          excerpt: 1,
          featuredImage: 1,
          thumbnail: 1, // Include thumbnail field
          category: 1,
          tags: 1,
          author: 1,
          publishedAt: 1,
          readTime: 1,
          views: 1,
          likes: 1,
          shares: 1,
          trending: 1,
          trendScore: 1,
        })
        .lean()

      const total = await Article.countDocuments(query)

      // Process articles to ensure proper image URLs
      const processedArticles = articles.map((article) => ({
        ...article,
        // Use thumbnail first, then featuredImage, then fallback
        thumbnail:
          article.thumbnail ||
          article.featuredImage ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
        featuredImage:
          article.featuredImage ||
          article.thumbnail ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
      }))

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles`)

      res.json({
        articles: processedArticles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalArticles: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching articles:", error)
      res.status(500).json({
        error: "Failed to fetch articles",
        message: error.message,
      })
    }
  })

  // Get single article by slug
  router.get("/:slug", async (req, res) => {
    try {
      const { slug } = req.params

      console.log(`📖 [ARTICLES API] Fetching article by slug: ${slug}`)

      const article = await Article.findOne({
        slug: slug,
        status: "published",
      }).lean()

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: ${slug}`)
        return res.status(404).json({
          error: "Article not found",
        })
      }

      // Increment view count
      await Article.findByIdAndUpdate(article._id, {
        $inc: { views: 1 },
      })

      // Transform article for frontend compatibility
      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt,
        thumbnail: article.thumbnail || article.featuredImage || "/placeholder.svg?height=400&width=600",
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

      console.log(`✅ [ARTICLES API] Article found: ${article.title}`)
      console.log(`🐦 [ARTICLES API] Tweets available: ${transformedArticle.media.tweets.length}`)

      res.json(transformedArticle)
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching article:", error)
      res.status(500).json({
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // Get article by ID
  router.get("/by-id/:id", async (req, res) => {
    try {
      const { id } = req.params

      console.log(`📖 [ARTICLES API] Fetching article by ID: ${id}`)

      const article = await Article.findById(id).lean()

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: ${id}`)
        return res.status(404).json({
          error: "Article not found",
        })
      }

      // Process article to ensure proper image URLs and tweets
      const processedArticle = {
        ...article,
        thumbnail:
          article.thumbnail ||
          article.featuredImage ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
        featuredImage:
          article.featuredImage ||
          article.thumbnail ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
        media: {
          ...article.media,
          tweets: article.tweets || article.media?.tweets || [],
        },
        twitterSearchUrl: `https://twitter.com/search?q=${encodeURIComponent(article.title)}&src=typed_query&f=live`,
      }

      console.log(`✅ [ARTICLES API] Article found: ${article.title}`)

      res.json(processedArticle)
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching article:", error)
      res.status(500).json({
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // Get articles by category
  router.get("/category/:category", async (req, res) => {
    try {
      const { category } = req.params
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit

      console.log(`📂 [ARTICLES API] Fetching articles by category: ${category}`)

      const articles = await Article.find({
        category: new RegExp(category, "i"),
        status: "published",
      })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          title: 1,
          slug: 1,
          excerpt: 1,
          featuredImage: 1,
          thumbnail: 1,
          category: 1,
          tags: 1,
          author: 1,
          publishedAt: 1,
          readTime: 1,
          views: 1,
          likes: 1,
          shares: 1,
        })
        .lean()

      const total = await Article.countDocuments({
        category: new RegExp(category, "i"),
        status: "published",
      })

      // Process articles to ensure proper image URLs
      const processedArticles = articles.map((article) => ({
        ...article,
        thumbnail:
          article.thumbnail ||
          article.featuredImage ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
        featuredImage:
          article.featuredImage ||
          article.thumbnail ||
          `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`,
      }))

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles in category: ${category}`)

      res.json({
        articles: processedArticles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalArticles: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching articles by category:", error)
      res.status(500).json({
        error: "Failed to fetch articles by category",
        message: error.message,
      })
    }
  })

  // Get available categories
  router.get("/categories", async (req, res) => {
    try {
      console.log(`📂 [ARTICLES API] Fetching available categories`)

      const categories = await Article.distinct("category", { status: "published" })

      console.log(`✅ [ARTICLES API] Found categories: ${categories.join(", ")}`)

      res.json({
        categories: categories.filter((cat) => cat && cat.trim() !== ""),
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching categories:", error)
      res.status(500).json({
        error: "Failed to fetch categories",
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

  // Like/Unlike article
  fastify.post("/articles/:id/like", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, action } = request.body

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: "User ID is required",
        })
      }

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({ userId })
      if (!userPrefs) {
        userPrefs = new UserPreference({
          userId,
          email: userId, // Assuming userId is email for now
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
      }

      const articleObjectId = new mongoose.Types.ObjectId(id)
      const isCurrentlyLiked = userPrefs.likedArticles.some((item) => item.articleId.toString() === id)

      let updateOperation
      let newLikedState

      if (action === "like" && !isCurrentlyLiked) {
        // Add like
        userPrefs.likedArticles.push({
          articleId: articleObjectId,
          likedAt: new Date(),
        })
        updateOperation = { $inc: { likes: 1 } }
        newLikedState = true
      } else if (action === "unlike" || (action === "like" && isCurrentlyLiked)) {
        // Remove like
        userPrefs.likedArticles = userPrefs.likedArticles.filter((item) => item.articleId.toString() !== id)
        updateOperation = { $inc: { likes: -1 } }
        newLikedState = false
      } else {
        // No change needed
        const article = await Article.findById(id)
        return reply.send({
          success: true,
          likes: article.likes || 0,
          isLiked: isCurrentlyLiked,
          message: "No change needed",
        })
      }

      // Update article likes count
      const article = await Article.findByIdAndUpdate(id, updateOperation, {
        new: true,
        runValidators: true,
      })

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

      // Save user preferences
      await userPrefs.save()

      console.log(`❤️ [API] Article ${newLikedState ? "liked" : "unliked"}: ${article.title}`)

      return reply.send({
        success: true,
        likes: article.likes,
        isLiked: newLikedState,
        message: newLikedState ? "Article liked" : "Article unliked",
      })
    } catch (error) {
      console.error("❌ [API] Error updating article likes:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to update likes",
        message: error.message,
      })
    }
  })

  // Save/Unsave article
  fastify.post("/articles/:id/save", async (request, reply) => {
    try {
      const { id } = request.params
      const { userId, action } = request.body

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: "User ID is required",
        })
      }

      // Find or create user preferences
      let userPrefs = await UserPreference.findOne({ userId })
      if (!userPrefs) {
        userPrefs = new UserPreference({
          userId,
          email: userId, // Assuming userId is email for now
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
        })
      }

      const articleObjectId = new mongoose.Types.ObjectId(id)
      const isCurrentlySaved = userPrefs.savedArticles.some((item) => item.articleId.toString() === id)

      let updateOperation
      let newSavedState

      if (action === "save" && !isCurrentlySaved) {
        // Add save
        userPrefs.savedArticles.push({
          articleId: articleObjectId,
          savedAt: new Date(),
        })
        updateOperation = { $inc: { saves: 1 } }
        newSavedState = true
      } else if (action === "unsave" || (action === "save" && isCurrentlySaved)) {
        // Remove save
        userPrefs.savedArticles = userPrefs.savedArticles.filter((item) => item.articleId.toString() !== id)
        updateOperation = { $inc: { saves: -1 } }
        newSavedState = false
      } else {
        // No change needed
        const article = await Article.findById(id)
        return reply.send({
          success: true,
          saves: article.saves || 0,
          isSaved: isCurrentlySaved,
          message: "No change needed",
        })
      }

      // Update article saves count
      const article = await Article.findByIdAndUpdate(id, updateOperation, {
        new: true,
        runValidators: true,
      })

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

      // Save user preferences
      await userPrefs.save()

      console.log(`💾 [API] Article ${newSavedState ? "saved" : "unsaved"}: ${article.title}`)

      return reply.send({
        success: true,
        saves: article.saves,
        isSaved: newSavedState,
        message: newSavedState ? "Article saved" : "Article unsaved",
      })
    } catch (error) {
      console.error("❌ [API] Error updating article saves:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to update saves",
        message: error.message,
      })
    }
  })

  // Get user preferences
  fastify.get("/user/:userId/preferences", async (request, reply) => {
    try {
      const { userId } = request.params

      const userPrefs = await UserPreference.findOne({ userId })
        .populate("likedArticles.articleId", "title slug thumbnail")
        .populate("savedArticles.articleId", "title slug thumbnail")
        .populate("recentlyViewed.articleId", "title slug thumbnail")

      if (!userPrefs) {
        return reply.send({
          success: true,
          likedArticles: [],
          savedArticles: [],
          recentlyViewed: [],
          preferences: {},
        })
      }

      return reply.send({
        success: true,
        likedArticles: userPrefs.likedArticles,
        savedArticles: userPrefs.savedArticles,
        recentlyViewed: userPrefs.recentlyViewed,
        preferences: userPrefs.preferences,
      })
    } catch (error) {
      console.error("❌ [API] Error fetching user preferences:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch user preferences",
        message: error.message,
      })
    }
  })
}

module.exports = articleRoutes
