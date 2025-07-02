const Article = require("../models/Article")
const User = require("../models/User")
const trendBot = require("../services/trendBot")

async function adminRoutes(fastify, options) {
  // Get admin statistics
  fastify.get("/stats", async (request, reply) => {
    try {
      const totalArticles = await Article.countDocuments()
      const totalUsers = await User.countDocuments()
      const trendingArticles = await Article.countDocuments({ trending: true })
      const recentArticles = await Article.countDocuments({
        publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })

      const topCategories = await Article.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])

      reply.send({
        success: true,
        data: {
          totalArticles,
          totalUsers,
          trendingArticles,
          recentArticles,
          topCategories,
          botStatus: trendBot.getStatus(),
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching admin stats:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch statistics",
        message: error.message,
      })
    }
  })

  // Toggle bot status
  fastify.post("/toggle-bot", async (request, reply) => {
    try {
      if (trendBot.isActive) {
        trendBot.stop()
      } else {
        await trendBot.start()
      }

      reply.send({
        success: true,
        data: {
          botStatus: trendBot.getStatus(),
        },
      })
    } catch (error) {
      fastify.log.error("Error toggling bot:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
        message: error.message,
      })
    }
  })

  // Trigger manual article generation
  fastify.post("/trigger-bot", async (request, reply) => {
    try {
      await trendBot.generateArticles()

      reply.send({
        success: true,
        message: "Article generation triggered successfully",
        data: {
          botStatus: trendBot.getStatus(),
        },
      })
    } catch (error) {
      fastify.log.error("Error triggering bot:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to trigger article generation",
        message: error.message,
      })
    }
  })
}

module.exports = adminRoutes
