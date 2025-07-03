const Article = require("../models/Article")
const { trendBot } = require("../services/trendBot")
const { gnewsService } = require("../services/gnewsService")
const { unsplashService } = require("../services/unsplashService")
const { groqService } = require("../services/groqService")

async function adminRoutes(fastify, options) {
  console.log("📊 [ADMIN ROUTES] Registering admin routes...")

  // Get system statistics
  fastify.get("/admin/stats", async (request, reply) => {
    try {
      console.log("📊 [ADMIN] Getting system stats...")

      const totalArticles = await Article.countDocuments()
      const recentArticles = await Article.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      const featuredArticles = await Article.countDocuments({ featured: true })

      const categories = await Article.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])

      const stats = {
        totalArticles,
        recentArticles,
        featuredArticles,
        categories: categories.map((cat) => ({
          name: cat._id || "Uncategorized",
          count: cat.count,
        })),
        systemHealth: {
          database: "healthy",
          services: "operational",
          lastUpdate: new Date().toISOString(),
        },
      }

      console.log("✅ [ADMIN] Stats retrieved successfully")
      return { success: true, stats }
    } catch (error) {
      console.error("❌ [ADMIN] Error getting stats:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to get system stats",
        message: error.message,
      })
    }
  })

  // Get bot status
  fastify.get("/admin/bot-status", async (request, reply) => {
    try {
      const status = {
        isRunning: trendBot && typeof trendBot.isRunning === "function" ? trendBot.isRunning() : false,
        lastRun: trendBot && trendBot.lastRun ? trendBot.lastRun : null,
        articlesGenerated: trendBot && trendBot.articlesGenerated ? trendBot.articlesGenerated : 0,
        status: "operational",
      }

      return { success: true, status }
    } catch (error) {
      console.error("❌ [ADMIN] Error getting bot status:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to get bot status",
        message: error.message,
      })
    }
  })

  // Toggle bot on/off
  fastify.post("/admin/toggle-bot", async (request, reply) => {
    try {
      const { action } = request.body

      if (action === "start") {
        if (trendBot && typeof trendBot.start === "function") {
          await trendBot.start()
          console.log("✅ [ADMIN] TrendBot started")
          return { success: true, message: "TrendBot started successfully" }
        } else {
          return reply.status(400).send({
            success: false,
            error: "TrendBot start method not available",
          })
        }
      } else if (action === "stop") {
        if (trendBot && typeof trendBot.stop === "function") {
          await trendBot.stop()
          console.log("✅ [ADMIN] TrendBot stopped")
          return { success: true, message: "TrendBot stopped successfully" }
        } else {
          return reply.status(400).send({
            success: false,
            error: "TrendBot stop method not available",
          })
        }
      } else {
        return reply.status(400).send({
          success: false,
          error: 'Invalid action. Use "start" or "stop"',
        })
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error toggling bot:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
        message: error.message,
      })
    }
  })

  // Trigger bot manually
  fastify.post("/admin/trigger-bot", async (request, reply) => {
    try {
      console.log("🤖 [ADMIN] Manually triggering TrendBot...")

      if (trendBot && typeof trendBot.generateArticles === "function") {
        const result = await trendBot.generateArticles()
        console.log("✅ [ADMIN] TrendBot triggered successfully")
        return {
          success: true,
          message: "TrendBot triggered successfully",
          result,
        }
      } else {
        return reply.status(400).send({
          success: false,
          error: "TrendBot generateArticles method not available",
        })
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error triggering bot:", error)
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
      const sources = {
        gnews: false,
        unsplash: false,
        groq: false,
      }

      // Test GNews
      try {
        if (gnewsService && typeof gnewsService.testConnection === "function") {
          await gnewsService.testConnection()
          sources.gnews = true
        }
      } catch (error) {
        console.log("⚠️ [ADMIN] GNews not available:", error.message)
      }

      // Test Unsplash
      try {
        if (unsplashService && typeof unsplashService.testConnection === "function") {
          await unsplashService.testConnection()
          sources.unsplash = true
        }
      } catch (error) {
        console.log("⚠️ [ADMIN] Unsplash not available:", error.message)
      }

      // Test Groq
      try {
        if (groqService && typeof groqService.testConnection === "function") {
          await groqService.testConnection()
          sources.groq = true
        }
      } catch (error) {
        console.log("⚠️ [ADMIN] Groq not available:", error.message)
      }

      const isUsingRealData = sources.gnews || sources.unsplash || sources.groq
      const source = sources.gnews ? "GNews" : sources.unsplash ? "Unsplash" : sources.groq ? "Groq" : "Mock Data"

      return {
        success: true,
        sources,
        isUsingRealData,
        source,
      }
    } catch (error) {
      console.error("❌ [ADMIN] Error checking data sources:", error)
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
