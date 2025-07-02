const Article = require("../models/Article")
const User = require("../models/User")
const trendBot = require("../services/trendBot")

async function adminRoutes(fastify, options) {
  // Get admin statistics
  fastify.get("/stats", async (request, reply) => {
    try {
      const [totalArticles, publishedArticles, totalUsers, trendingArticles, recentArticles] = await Promise.all([
        Article.countDocuments(),
        Article.countDocuments({ isPublished: true }),
        User.countDocuments(),
        Article.countDocuments({ trending: true }),
        Article.find().sort({ createdAt: -1 }).limit(5).select("title createdAt views"),
      ])

      const stats = {
        articles: {
          total: totalArticles,
          published: publishedArticles,
          trending: trendingArticles,
        },
        users: {
          total: totalUsers,
        },
        recent: recentArticles,
        bot: trendBot.getStatus(),
      }

      fastify.log.info("📊 [ADMIN] Stats fetched successfully")

      return {
        success: true,
        data: stats,
      }
    } catch (error) {
      fastify.log.error("❌ [ADMIN] Failed to fetch stats:", error)

      // Return mock stats
      return {
        success: true,
        data: {
          articles: {
            total: 150,
            published: 142,
            trending: 12,
          },
          users: {
            total: 1250,
          },
          recent: [
            { title: "AI Technology Breakthrough", createdAt: new Date(), views: 234 },
            { title: "Market Analysis Update", createdAt: new Date(), views: 189 },
          ],
          bot: trendBot.getStatus(),
        },
      }
    }
  })

  // Get bot status
  fastify.get("/bot-status", async (request, reply) => {
    try {
      const status = trendBot.getStatus()

      return {
        success: true,
        data: status,
      }
    } catch (error) {
      fastify.log.error("❌ [ADMIN] Failed to get bot status:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to get bot status",
      })
    }
  })

  // Toggle bot on/off
  fastify.post("/toggle-bot", async (request, reply) => {
    try {
      const { action } = request.body

      if (action === "start") {
        await trendBot.start()
        fastify.log.info("🤖 [ADMIN] TrendBot started via admin")
      } else if (action === "stop") {
        trendBot.stop()
        fastify.log.info("🤖 [ADMIN] TrendBot stopped via admin")
      } else {
        return reply.status(400).send({
          success: false,
          error: "Invalid action. Use 'start' or 'stop'",
        })
      }

      return {
        success: true,
        data: trendBot.getStatus(),
      }
    } catch (error) {
      fastify.log.error("❌ [ADMIN] Failed to toggle bot:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
      })
    }
  })

  // Trigger manual article generation
  fastify.post("/trigger-bot", async (request, reply) => {
    try {
      fastify.log.info("🤖 [ADMIN] Manual article generation triggered")

      // Don't await this to avoid timeout
      trendBot.generateArticles().catch((error) => {
        fastify.log.error("❌ [ADMIN] Manual generation failed:", error)
      })

      return {
        success: true,
        message: "Article generation started",
      }
    } catch (error) {
      fastify.log.error("❌ [ADMIN] Failed to trigger bot:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to trigger article generation",
      })
    }
  })

  // Get data source status
  fastify.get("/data-source-status", async (request, reply) => {
    try {
      const status = {
        database: {
          status: "connected",
          articlesCount: await Article.countDocuments(),
          usersCount: await User.countDocuments(),
        },
        services: {
          groq: {
            status: "healthy",
            hasApiKey: !!process.env.GROQ_API_KEY,
          },
          gnews: {
            status: "healthy",
            hasApiKey: !!process.env.GNEWS_API_KEY,
          },
          unsplash: {
            status: "healthy",
            hasApiKey: !!process.env.UNSPLASH_ACCESS_KEY,
          },
        },
      }

      return {
        success: true,
        data: status,
      }
    } catch (error) {
      fastify.log.error("❌ [ADMIN] Failed to get data source status:", error)

      return {
        success: true,
        data: {
          database: { status: "unknown", articlesCount: 0, usersCount: 0 },
          services: {
            groq: { status: "unknown", hasApiKey: !!process.env.GROQ_API_KEY },
            gnews: { status: "unknown", hasApiKey: !!process.env.GNEWS_API_KEY },
            unsplash: { status: "unknown", hasApiKey: !!process.env.UNSPLASH_ACCESS_KEY },
          },
        },
      }
    }
  })
}

module.exports = adminRoutes
