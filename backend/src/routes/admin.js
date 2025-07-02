const trendBot = require("../services/trendBot")
const Article = require("../models/Article")

async function adminRoutes(fastify, options) {
  // Get admin dashboard stats
  fastify.get("/stats", async (request, reply) => {
    try {
      console.log("📊 [ADMIN API] Fetching dashboard stats...")

      const [totalArticles, publishedArticles, draftArticles, todayArticles, totalViews, featuredArticles] =
        await Promise.all([
          Article.countDocuments(),
          Article.countDocuments({ status: "published" }),
          Article.countDocuments({ status: "draft" }),
          Article.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          }),
          Article.aggregate([{ $group: { _id: null, totalViews: { $sum: "$views" } } }]),
          Article.countDocuments({ featured: true }),
        ])

      const botStatus = trendBot.getStatus()
      const botStats = trendBot.getStats()

      const stats = {
        articles: {
          total: totalArticles,
          published: publishedArticles,
          draft: draftArticles,
          today: todayArticles,
          featured: featuredArticles,
        },
        engagement: {
          totalViews: totalViews[0]?.totalViews || 0,
          avgViewsPerArticle: totalArticles > 0 ? Math.round((totalViews[0]?.totalViews || 0) / totalArticles) : 0,
        },
        bot: {
          isActive: botStatus.isActive,
          lastRun: botStatus.lastRun,
          nextRun: botStatus.nextRun,
          totalRuns: botStats.totalRuns,
          successfulRuns: botStats.successfulRuns,
          articlesGenerated: botStats.articlesGenerated,
          errors: botStats.errors,
          successRate: botStats.totalRuns > 0 ? Math.round((botStats.successfulRuns / botStats.totalRuns) * 100) : 0,
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
        },
      }

      console.log("✅ [ADMIN API] Stats fetched successfully")
      reply.send({ success: true, stats })
    } catch (error) {
      console.error("❌ [ADMIN API] Error fetching stats:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch admin stats",
      })
    }
  })

  // Get bot status
  fastify.get("/bot-status", async (request, reply) => {
    try {
      const status = trendBot.getStatus()
      console.log("🤖 [ADMIN API] Bot status requested")

      reply.send({
        success: true,
        status: {
          isActive: status.isActive,
          lastRun: status.lastRun,
          nextRun: status.nextRun,
          stats: trendBot.getStats(),
          crawlerStatus: status.crawlerStatus,
        },
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error getting bot status:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to get bot status",
      })
    }
  })

  // Start/Stop bot
  fastify.post("/toggle-bot", async (request, reply) => {
    try {
      const { action } = request.body
      console.log(`🎛️ [ADMIN API] Bot ${action} requested`)

      let result
      if (action === "start") {
        result = await trendBot.start()
      } else if (action === "stop") {
        result = await trendBot.stop()
      } else {
        return reply.status(400).send({
          success: false,
          error: 'Invalid action. Use "start" or "stop"',
        })
      }

      console.log(`✅ [ADMIN API] Bot ${action} completed:`, result.message)
      reply.send(result)
    } catch (error) {
      console.error(`❌ [ADMIN API] Error toggling bot:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to toggle bot",
      })
    }
  })

  // Trigger manual bot run
  fastify.post("/trigger-bot", async (request, reply) => {
    try {
      console.log("🎯 [ADMIN API] Manual bot run triggered")

      const result = await trendBot.triggerManualRun()

      console.log("✅ [ADMIN API] Manual run completed:", result.message)
      reply.send(result)
    } catch (error) {
      console.error("❌ [ADMIN API] Error triggering manual run:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to trigger manual run",
      })
    }
  })

  // Get data source status
  fastify.get("/data-source-status", async (request, reply) => {
    try {
      console.log("📡 [ADMIN API] Data source status requested")

      const totalArticles = await Article.countDocuments()
      const recentArticles = await Article.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })

      // Check if we have articles from GNews (real data)
      const gnewsArticles = await Article.countDocuments({
        "trendData.source": "gnews",
      })

      const botStatus = trendBot.getStatus()
      const isRealData = gnewsArticles > 0 && botStatus.crawlerStatus?.dataSource === "gnews"

      const status = {
        isRealData: isRealData,
        source: isRealData ? "GNews API" : "Fallback Data",
        lastUpdate: botStatus.lastRun || new Date().toISOString(),
        articlesCount: totalArticles,
        recentArticles: recentArticles,
        gnewsArticles: gnewsArticles,
        botActive: botStatus.isActive,
        dataSourceDetails: {
          gnews: gnewsArticles,
          fallback: totalArticles - gnewsArticles,
          total: totalArticles,
        },
      }

      console.log("✅ [ADMIN API] Data source status:", {
        isRealData,
        source: status.source,
        articles: totalArticles,
      })

      reply.send(status)
    } catch (error) {
      console.error("❌ [ADMIN API] Error getting data source status:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to get data source status",
      })
    }
  })

  // Get recent articles for admin
  fastify.get("/articles", async (request, reply) => {
    try {
      const { page = 1, limit = 20 } = request.query
      console.log(`📚 [ADMIN API] Fetching admin articles (page ${page})`)

      const articles = await Article.find()
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("title slug status createdAt views featured tags trendData.source")

      const total = await Article.countDocuments()

      console.log(`✅ [ADMIN API] Found ${articles.length} articles for admin`)

      reply.send({
        success: true,
        articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error fetching admin articles:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
      })
    }
  })

  // Delete article
  fastify.delete("/articles/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`🗑️ [ADMIN API] Deleting article: ${id}`)

      const article = await Article.findByIdAndDelete(id)

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ADMIN API] Article deleted: "${article.title}"`)
      reply.send({
        success: true,
        message: "Article deleted successfully",
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error deleting article:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to delete article",
      })
    }
  })

  // Update article status
  fastify.patch("/articles/:id/status", async (request, reply) => {
    try {
      const { id } = request.params
      const { status } = request.body

      console.log(`📝 [ADMIN API] Updating article status: ${id} -> ${status}`)

      const article = await Article.findByIdAndUpdate(id, { status }, { new: true })

      if (!article) {
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ADMIN API] Article status updated: "${article.title}" -> ${status}`)
      reply.send({
        success: true,
        message: "Article status updated successfully",
        article,
      })
    } catch (error) {
      console.error("❌ [ADMIN API] Error updating article status:", error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to update article status",
      })
    }
  })
}

module.exports = adminRoutes
