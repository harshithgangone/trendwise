const Article = require("../models/Article")

async function trendsRoutes(fastify, options) {
  // Get trending topics
  fastify.get("/trends/topics", async (request, reply) => {
    try {
      const trendingTopics = await Article.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 }, totalViews: { $sum: "$views" } } },
        { $sort: { totalViews: -1, count: -1 } },
        { $limit: 20 },
        { $project: { topic: "$_id", count: 1, totalViews: 1, _id: 0 } },
      ])

      reply.send({
        success: true,
        data: trendingTopics,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending topics:", error)

      // Mock trending topics
      const mockTopics = [
        { topic: "AI", count: 25, totalViews: 15420 },
        { topic: "Climate Change", count: 18, totalViews: 12350 },
        { topic: "Technology", count: 32, totalViews: 11890 },
        { topic: "Innovation", count: 22, totalViews: 9876 },
        { topic: "Sustainability", count: 15, totalViews: 8765 },
        { topic: "Remote Work", count: 19, totalViews: 7654 },
        { topic: "Healthcare", count: 14, totalViews: 6543 },
        { topic: "Education", count: 12, totalViews: 5432 },
      ]

      reply.send({
        success: true,
        data: mockTopics,
        fallback: true,
      })
    }
  })

  // Get trending articles by time period
  fastify.get("/trends/articles", async (request, reply) => {
    try {
      const { period = "week" } = request.query
      const dateFilter = new Date()

      switch (period) {
        case "day":
          dateFilter.setDate(dateFilter.getDate() - 1)
          break
        case "week":
          dateFilter.setDate(dateFilter.getDate() - 7)
          break
        case "month":
          dateFilter.setMonth(dateFilter.getMonth() - 1)
          break
        default:
          dateFilter.setDate(dateFilter.getDate() - 7)
      }

      const trendingArticles = await Article.find({
        createdAt: { $gte: dateFilter },
      })
        .sort({ views: -1, likes: -1 })
        .limit(10)
        .lean()

      reply.send({
        success: true,
        data: trendingArticles,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles:", error)

      // Mock trending articles
      const mockTrendingArticles = [
        {
          _id: "trend1",
          title: "Revolutionary AI Breakthrough Changes Everything",
          excerpt: "Scientists announce major AI advancement with far-reaching implications.",
          category: "Technology",
          tags: ["AI", "Breakthrough", "Technology"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 8945,
          likes: 456,
          saves: 123,
          readTime: 8,
        },
        {
          _id: "trend2",
          title: "Climate Solutions Show Unprecedented Success",
          excerpt: "New environmental initiatives demonstrate remarkable progress in carbon reduction.",
          category: "Environment",
          tags: ["Climate", "Environment", "Solutions"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 7234,
          likes: 389,
          saves: 98,
          readTime: 6,
        },
      ]

      reply.send({
        success: true,
        data: mockTrendingArticles,
        fallback: true,
      })
    }
  })

  // Get category trends
  fastify.get("/trends/categories", async (request, reply) => {
    try {
      const categoryTrends = await Article.aggregate([
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalLikes: { $sum: "$likes" },
            avgReadTime: { $avg: "$readTime" },
          },
        },
        { $sort: { totalViews: -1 } },
        {
          $project: {
            category: "$_id",
            count: 1,
            totalViews: 1,
            totalLikes: 1,
            avgReadTime: { $round: ["$avgReadTime", 1] },
            _id: 0,
          },
        },
      ])

      reply.send({
        success: true,
        data: categoryTrends,
      })
    } catch (error) {
      fastify.log.error("Error fetching category trends:", error)

      // Mock category trends
      const mockCategoryTrends = [
        {
          category: "Technology",
          count: 45,
          totalViews: 125430,
          totalLikes: 5678,
          avgReadTime: 6.2,
        },
        {
          category: "Business",
          count: 32,
          totalViews: 89012,
          totalLikes: 4321,
          avgReadTime: 5.8,
        },
        {
          category: "Science",
          count: 28,
          totalViews: 76543,
          totalLikes: 3456,
          avgReadTime: 7.1,
        },
        {
          category: "Environment",
          count: 23,
          totalViews: 65432,
          totalLikes: 2987,
          avgReadTime: 5.5,
        },
      ]

      reply.send({
        success: true,
        data: mockCategoryTrends,
        fallback: true,
      })
    }
  })
}

module.exports = trendsRoutes
