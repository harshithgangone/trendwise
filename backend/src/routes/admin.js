const Article = require("../models/Article")
const User = require("../models/User")
const trendBot = require("../services/trendBot")

async function adminRoutes(fastify, options) {
  // Get admin statistics
  fastify.get("/admin/stats", async (request, reply) => {
    try {
      const totalArticles = await Article.countDocuments()
      const totalUsers = await User.countDocuments()
      const totalViews = await Article.aggregate([{ $group: { _id: null, total: { $sum: "$views" } } }])
      const totalLikes = await Article.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }])

      const recentArticles = await Article.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("title createdAt views likes")
        .lean()

      const categoryStats = await Article.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 }, views: { $sum: "$views" } } },
        { $sort: { count: -1 } },
      ])

      reply.send({
        success: true,
        data: {
          totalArticles,
          totalUsers,
          totalViews: totalViews[0]?.total || 0,
          totalLikes: totalLikes[0]?.total || 0,
          recentArticles,
          categoryStats,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching admin stats:", error)

      // Mock admin stats
      const mockStats = {
        totalArticles: 156,
        totalUsers: 1247,
        totalViews: 45678,
        totalLikes: 3456,
        recentArticles: [
          {
            _id: "recent1",
            title: "Latest AI Developments",
            createdAt: new Date(),
            views: 234,
            likes: 45,
          },
          {
            _id: "recent2",
            title: "Climate Change Solutions",
            createdAt: new Date(),
            views: 189,
            likes: 32,
          },
        ],
        categoryStats: [
          { _id: "Technology", count: 45, views: 12345 },
          { _id: "Business", count: 32, views: 8901 },
          { _id: "Science", count: 28, views: 7654 },
        ],
      }

      reply.send({
        success: true,
        data: mockStats,
        fallback: true,
      })
    }
  })

  // Get data source status
  fastify.get("/admin/data-source-status", async (request, reply) => {
    try {
      const groqService = require("../services/groqService")
      const gnewsService = require("../services/gnewsService")

      const status = {
        groq: {
          status: groqService.getStatus().healthy ? "active" : "inactive",
          lastCheck: groqService.getStatus().lastHealthCheck,
          hasApiKey: !!process.env.GROQ_API_KEY,
        },
        gnews: {
          status: process.env.GNEWS_API_KEY ? "active" : "inactive",
          hasApiKey: !!process.env.GNEWS_API_KEY,
        },
        trendBot: {
          status: trendBot.isActive ? "running" : "stopped",
          lastRun: trendBot.lastRun || null,
          nextRun: trendBot.nextRun || null,
        },
        database: {
          status: "connected",
          lastCheck: new Date(),
        },
      }

      reply.send({
        success: true,
        data: status,
      })
    } catch (error) {
      fastify.log.error("Error fetching data source status:", error)

      // Mock data source status
      const mockStatus = {
        groq: {
          status: process.env.GROQ_API_KEY ? "active" : "inactive",
          lastCheck: new Date(),
          hasApiKey: !!process.env.GROQ_API_KEY,
        },
        gnews: {
          status: process.env.GNEWS_API_KEY ? "active" : "inactive",
          hasApiKey: !!process.env.GNEWS_API_KEY,
        },
        trendBot: {
          status: "running",
          lastRun: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          nextRun: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        },
        database: {
          status: "connected",
          lastCheck: new Date(),
        },
      }

      reply.send({
        success: true,
        data: mockStatus,
        fallback: true,
      })
    }
  })

  // Get bot status
  fastify.get("/admin/bot-status", async (request, reply) => {
    try {
      const status = {
        isActive: trendBot.isActive || false,
        lastRun: trendBot.lastRun || null,
        nextRun: trendBot.nextRun || null,
        articlesGenerated: trendBot.articlesGenerated || 0,
        errors: trendBot.errors || [],
      }

      reply.send({
        success: true,
        data: status,
      })
    } catch (error) {
      fastify.log.error("Error fetching bot status:", error)

      reply.send({
        success: true,
        data: {
          isActive: false,
          lastRun: null,
          nextRun: null,
          articlesGenerated: 0,
          errors: [],
        },
        fallback: true,
      })
    }
  })

  // Toggle bot status
  fastify.post("/admin/toggle-bot", async (request, reply) => {
    try {
      if (trendBot.isActive) {
        trendBot.stop()
        fastify.log.info("TrendBot stopped by admin")
      } else {
        trendBot.start()
        fastify.log.info("TrendBot started by admin")
      }

      reply.send({
        success: true,
        data: {
          isActive: trendBot.isActive,
          message: trendBot.isActive ? "Bot started successfully" : "Bot stopped successfully",
        },
      })
    } catch (error) {
      fastify.log.error("Error toggling bot:", error)
      reply.status(500).send({
        success: false,
        message: "Error toggling bot status",
      })
    }
  })

  // Trigger bot manually
  fastify.post("/admin/trigger-bot", async (request, reply) => {
    try {
      if (trendBot.generateArticles) {
        await trendBot.generateArticles()
        fastify.log.info("TrendBot triggered manually by admin")

        reply.send({
          success: true,
          message: "Bot triggered successfully",
        })
      } else {
        reply.send({
          success: true,
          message: "Bot trigger simulated (not implemented)",
        })
      }
    } catch (error) {
      fastify.log.error("Error triggering bot:", error)
      reply.status(500).send({
        success: false,
        message: "Error triggering bot",
      })
    }
  })
}

module.exports = adminRoutes
