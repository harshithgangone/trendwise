const trendBot = require("../services/trendBot")
const Article = require("../models/Article")
const Comment = require("../models/Comment")
const User = require("../models/User")

async function adminRoutes(fastify, options) {
  // Get admin dashboard stats
  fastify.get("/admin/stats", async (request, reply) => {
    try {
      console.log("📊 [ADMIN API] GET /admin/stats - Fetching admin statistics")

      const [totalArticles, totalComments, totalUsers, recentArticles] = await Promise.all([
        Article.countDocuments(),
        Comment.countDocuments(),
        User.countDocuments(),
        Article.find().sort({ createdAt: -1 }).limit(5).select("title createdAt views likes").lean(),
      ])

      const stats = {
        totalArticles,
        totalComments,
        totalUsers,
        recentArticles: recentArticles.map((article) => ({
          _id: article._id.toString(),
          title: article.title,
          createdAt: article.createdAt,
          views: article.views || 0,
          likes: article.likes || 0,
        })),
      }

      console.log(`✅ [ADMIN API] Stats: ${totalArticles} articles, ${totalComments} comments, ${totalUsers} users`)

      return reply.send({
        success: true,
        stats,
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error fetching stats:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch admin statistics",
        message: error.message,
      })
    }
  })

  // Get bot status
  fastify.get("/admin/bot-status", async (request, reply) => {
    try {
      console.log("🤖 [ADMIN API] GET /admin/bot-status - Fetching bot status")

      const trendBot = require("../services/trendBot")
      const status = trendBot.getStatus ? trendBot.getStatus() : { isActive: false, lastRun: null }

      console.log(`✅ [ADMIN API] Bot status: ${status.isActive ? "active" : "inactive"}`)

      return reply.send({
        success: true,
        botStatus: status,
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error fetching bot status:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch bot status",
        message: error.message,
        botStatus: { isActive: false, lastRun: null },
      })
    }
  })

  // Start/Stop bot
  fastify.post("/admin/toggle-bot", async (request, reply) => {
    try {
      console.log("🤖 [ADMIN API] POST /admin/toggle-bot - Toggling bot status")

      const trendBot = require("../services/trendBot")
      const { action } = request.body

      let result = { success: false, message: "Unknown action" }

      if (action === "start") {
        if (trendBot.start && typeof trendBot.start === "function") {
          await trendBot.start()
          result = { success: true, message: "TrendBot started successfully" }
          console.log("✅ [ADMIN API] TrendBot started")
        } else {
          result = { success: false, message: "TrendBot start method not available" }
        }
      } else if (action === "stop") {
        if (trendBot.stop && typeof trendBot.stop === "function") {
          await trendBot.stop()
          result = { success: true, message: "TrendBot stopped successfully" }
          console.log("✅ [ADMIN API] TrendBot stopped")
        } else {
          result = { success: false, message: "TrendBot stop method not available" }
        }
      }

      return reply.send(result)
    } catch (error) {
      console.error("❌ [ADMIN API] Error toggling bot:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
        message: error.message,
      })
    }
  })

  // Trigger manual bot run
  fastify.post("/admin/trigger-bot", async (request, reply) => {
    try {
      console.log("🚀 [ADMIN API] POST /admin/trigger-bot - Manually triggering bot")

      const trendBot = require("../services/trendBot")

      if (trendBot.runCycle && typeof trendBot.runCycle === "function") {
        // Run bot cycle in background
        trendBot
          .runCycle()
          .then(() => {
            console.log("✅ [ADMIN API] Manual bot trigger completed successfully")
          })
          .catch((error) => {
            console.error("❌ [ADMIN API] Manual bot trigger failed:", error.message)
          })

        return reply.send({
          success: true,
          message: "TrendBot cycle triggered successfully",
        })
      } else {
        return reply.status(500).send({
          success: false,
          error: "TrendBot runCycle method not available",
        })
      }
    } catch (error) {
      console.error("❌ [ADMIN API] Error triggering bot:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to trigger bot",
        message: error.message,
      })
    }
  })

  // Get data source status
  fastify.get("/admin/data-source-status", async (request, reply) => {
    try {
      console.log("🔍 [ADMIN API] GET /admin/data-source-status - Checking data sources")

      const gnewsService = require("../services/gnewsService")
      const groqService = require("../services/groqService")
      const unsplashService = require("../services/unsplashService")

      const sources = {
        gnews: { status: "unknown", message: "Not tested" },
        groq: { status: "unknown", message: "Not tested" },
        unsplash: { status: "unknown", message: "Not tested" },
      }

      // Test GNews
      try {
        if (gnewsService.testConnection && typeof gnewsService.testConnection === "function") {
          await gnewsService.testConnection()
          sources.gnews = { status: "healthy", message: "Connection successful" }
        }
      } catch (error) {
        sources.gnews = { status: "unhealthy", message: error.message }
      }

      // Test Groq
      try {
        if (groqService.testConnection && typeof groqService.testConnection === "function") {
          await groqService.testConnection()
          sources.groq = { status: "healthy", message: "Connection successful" }
        }
      } catch (error) {
        sources.groq = { status: "unhealthy", message: error.message }
      }

      // Test Unsplash
      try {
        if (unsplashService.testConnection && typeof unsplashService.testConnection === "function") {
          await unsplashService.testConnection()
          sources.unsplash = { status: "healthy", message: "Connection successful" }
        }
      } catch (error) {
        sources.unsplash = { status: "unhealthy", message: error.message }
      }

      console.log("✅ [ADMIN API] Data source status checked")

      return reply.send({
        success: true,
        sources,
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error checking data sources:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to check data source status",
        message: error.message,
      })
    }
  })

  // Get articles for admin management
  fastify.get("/admin/articles", async (request, reply) => {
    try {
      console.log("📖 [ADMIN API] GET /admin/articles - Fetching articles for admin")

      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 20
      const skip = (page - 1) * limit

      const [articles, total] = await Promise.all([
        Article.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Article.countDocuments(),
      ])

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        status: article.status || "published",
        createdAt: article.createdAt,
        views: article.views || 0,
        likes: article.likes || 0,
        category: article.category || "general",
        featured: article.featured || false,
      }))

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }

      console.log(`✅ [ADMIN API] Found ${articles.length} articles for admin`)

      return reply.send({
        success: true,
        articles: transformedArticles,
        pagination,
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error fetching admin articles:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
        articles: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      })
    }
  })

  // Delete article
  fastify.delete("/admin/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`🗑️ [ADMIN API] DELETE /admin/articles/${id} - Deleting article`)

      const article = await Article.findByIdAndDelete(id)

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ADMIN API] Deleted article: ${article.title}`)

      return reply.send({
        success: true,
        message: "Article deleted successfully",
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error deleting article:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to delete article",
        message: error.message,
      })
    }
  })

  // Update article
  fastify.put("/admin/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params
      const updateData = request.body

      console.log(`✏️ [ADMIN API] PUT /admin/articles/${id} - Updating article`)

      const article = await Article.findByIdAndUpdate(id, updateData, { new: true }).lean()

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ADMIN API] Updated article: ${article.title}`)

      return reply.send({
        success: true,
        article: {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          status: article.status,
          createdAt: article.createdAt,
          views: article.views,
          likes: article.likes,
          category: article.category,
          featured: article.featured,
        },
        message: "Article updated successfully",
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error updating article:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to update article",
        message: error.message,
      })
    }
  })
}

module.exports = adminRoutes
