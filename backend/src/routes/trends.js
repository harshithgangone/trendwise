const Article = require("../models/Article")

async function trendsRoutes(fastify, options) {
  // Get trending topics
  fastify.get("/topics", async (request, reply) => {
    try {
      const { limit = 10 } = request.query

      // Get trending articles and extract topics
      const trendingArticles = await Article.find({
        trending: true,
        isPublished: true,
      })
        .sort({ views: -1, likes: -1 })
        .limit(Number.parseInt(limit))
        .select("title tags category views likes")

      const topics = trendingArticles.map((article) => ({
        title: article.title,
        category: article.category,
        tags: article.tags,
        engagement: article.views + article.likes * 2,
      }))

      fastify.log.info(`🔥 [TRENDS] Fetched ${topics.length} trending topics`)

      return {
        success: true,
        data: topics,
      }
    } catch (error) {
      fastify.log.error("❌ [TRENDS] Failed to fetch trending topics:", error)

      // Return mock trending topics
      const mockTopics = [
        {
          title: "AI Revolution in Healthcare",
          category: "technology",
          tags: ["ai", "healthcare", "innovation"],
          engagement: 1500,
        },
        {
          title: "Climate Change Solutions",
          category: "science",
          tags: ["climate", "environment", "research"],
          engagement: 1200,
        },
        {
          title: "Cryptocurrency Market Update",
          category: "business",
          tags: ["crypto", "finance", "market"],
          engagement: 980,
        },
      ]

      return {
        success: true,
        data: mockTopics,
      }
    }
  })

  // Get trending by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { limit = 5 } = request.query

      const trendingInCategory = await Article.find({
        category: category.toLowerCase(),
        trending: true,
        isPublished: true,
      })
        .sort({ views: -1, createdAt: -1 })
        .limit(Number.parseInt(limit))
        .select("-content")

      fastify.log.info(`🔥 [TRENDS] Fetched ${trendingInCategory.length} trending articles for ${category}`)

      return {
        success: true,
        data: trendingInCategory,
      }
    } catch (error) {
      fastify.log.error(`❌ [TRENDS] Failed to fetch trending for category ${request.params.category}:`, error)

      return {
        success: true,
        data: [],
      }
    }
  })

  // Get trending hashtags
  fastify.get("/hashtags", async (request, reply) => {
    try {
      const { limit = 20 } = request.query

      // Aggregate tags from trending articles
      const tagAggregation = await Article.aggregate([
        { $match: { trending: true, isPublished: true } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: Number.parseInt(limit) },
      ])

      const hashtags = tagAggregation.map((tag) => ({
        tag: tag._id,
        count: tag.count,
      }))

      fastify.log.info(`#️⃣ [TRENDS] Fetched ${hashtags.length} trending hashtags`)

      return {
        success: true,
        data: hashtags,
      }
    } catch (error) {
      fastify.log.error("❌ [TRENDS] Failed to fetch trending hashtags:", error)

      // Return mock hashtags
      const mockHashtags = [
        { tag: "ai", count: 15 },
        { tag: "technology", count: 12 },
        { tag: "business", count: 10 },
        { tag: "science", count: 8 },
        { tag: "health", count: 6 },
      ]

      return {
        success: true,
        data: mockHashtags,
      }
    }
  })
}

module.exports = trendsRoutes
