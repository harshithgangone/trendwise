const Article = require("../models/Article")

async function trendsRoutes(fastify, options) {
  // Get trending topics
  fastify.get("/topics", async (request, reply) => {
    try {
      const { limit = 10 } = request.query

      const trendingTopics = await Article.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 }, totalViews: { $sum: "$views" } } },
        { $sort: { totalViews: -1, count: -1 } },
        { $limit: Number.parseInt(limit) },
        { $project: { topic: "$_id", count: 1, totalViews: 1, _id: 0 } },
      ])

      // If no trending topics, return mock data
      if (trendingTopics.length === 0) {
        const mockTopics = [
          { topic: "AI", count: 15, totalViews: 5420 },
          { topic: "Technology", count: 12, totalViews: 4890 },
          { topic: "Climate", count: 8, totalViews: 3210 },
          { topic: "Business", count: 10, totalViews: 2980 },
          { topic: "Health", count: 6, totalViews: 2450 },
        ]

        return {
          success: true,
          data: mockTopics,
        }
      }

      reply.send({
        success: true,
        data: trendingTopics,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending topics:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending topics",
        message: error.message,
      })
    }
  })

  // Get trending articles by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { limit = 5 } = request.query

      const articles = await Article.find({ category, trending: true })
        .sort({ views: -1, publishedAt: -1 })
        .limit(Number.parseInt(limit))
        .select("title excerpt imageUrl slug views likes publishedAt")
        .exec()

      reply.send({
        success: true,
        data: articles,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles by category:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
      })
    }
  })
}

module.exports = trendsRoutes
