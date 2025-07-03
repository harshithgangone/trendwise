const Article = require("../models/Article")
const trendBot = require("../services/trendBot")
const gnewsService = require("../services/gnewsService")
const groqService = require("../services/groqService")
const unsplashService = require("../services/unsplashService")

async function adminRoutes(fastify, options) {
  console.log("🔧 [ADMIN ROUTES] Registering admin routes...")

  // Get admin stats
  fastify.get("/api/admin/stats", async (request, reply) => {
    try {
      console.log("📊 [ADMIN] GET /api/admin/stats")

      const [totalArticles, publishedArticles, featuredArticles] = await Promise.all([
        Article.countDocuments(),
        Article.countDocuments({ status: "published" }),
        Article.countDocuments({ featured: true }),
      ])

      const recentArticles = await Article.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title createdAt views likes")
        .lean()

      const stats = {
        articles: {
          total: totalArticles,
          published: publishedArticles,
          featured: featuredArticles,
          recent: recentArticles,
        },
        trendBot: trendBot.getStatus(),
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      }

      console.log("✅ [ADMIN] Stats retrieved successfully")
      return { success: true, stats }
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching stats:", error.message)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch admin stats",
        message: error.message,
      })
    }
  })

  // Get bot status
  fastify.get("/api/admin/bot-status", async (request, reply) => {
    try {
      console.log("🤖 [ADMIN] GET /api/admin/bot-status")

      const status = trendBot.getStatus()

      return {
        success: true,
        status,
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error fetching bot status:", error.message)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch bot status",
        message: error.message,
      })
    }
  })

  // Toggle bot on/off
  fastify.post("/api/admin/toggle-bot", async (request, reply) => {
    try {
      console.log("🔄 [ADMIN] POST /api/admin/toggle-bot")

      const { action } = request.body

      if (action === "start") {
        await trendBot.start()
        console.log("✅ [ADMIN] TrendBot started")
      } else if (action === "stop") {
        await trendBot.stop()
        console.log("✅ [ADMIN] TrendBot stopped")
      } else {
        return reply.status(400).send({
          success: false,
          error: "Invalid action. Use 'start' or 'stop'",
        })
      }

      const status = trendBot.getStatus()

      return {
        success: true,
        message: `TrendBot ${action}ed successfully`,
        status,
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error toggling bot:", error.message)
      return reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
        message: error.message,
      })
    }
  })

  // Trigger bot manually
  fastify.post("/api/admin/trigger-bot", async (request, reply) => {
    try {
      console.log("🚀 [ADMIN] POST /api/admin/trigger-bot")

      const result = await trendBot.generateArticles()

      return {
        success: true,
        message: "Bot triggered successfully",
        result,
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error triggering bot:", error.message)
      return reply.status(500).send({
        success: false,
        error: "Failed to trigger bot",
        message: error.message,
      })
    }
  })

  // Get data source status
  fastify.get("/api/admin/data-source-status", async (request, reply) => {
    try {
      console.log("📡 [ADMIN] GET /api/admin/data-source-status")

      const sources = {
        gnews: { status: "unknown", error: null },
        groq: { status: "unknown", error: null },
        unsplash: { status: "unknown", error: null },
      }

      // Test GNews
      try {
        await gnewsService.testConnection()
        sources.gnews.status = "healthy"
      } catch (error) {
        sources.gnews.status = "unhealthy"
        sources.gnews.error = error.message
      }

      // Test Groq
      try {
        await groqService.testConnection()
        sources.groq.status = "healthy"
      } catch (error) {
        sources.groq.status = "unhealthy"
        sources.groq.error = error.message
      }

      // Test Unsplash
      try {
        await unsplashService.testConnection()
        sources.unsplash.status = "healthy"
      } catch (error) {
        sources.unsplash.status = "unhealthy"
        sources.unsplash.error = error.message
      }

      return {
        success: true,
        sources,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error checking data sources:", error.message)
      return reply.status(500).send({
        success: false,
        error: "Failed to check data sources",
        message: error.message,
      })
    }
  })

  console.log("✅ [ADMIN ROUTES] Admin routes registered successfully")
}

module.exports = adminRoutes
