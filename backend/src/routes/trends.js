const Article = require("../models/Article")

async function trendsRoutes(fastify, options) {
  // Get trending topics
  fastify.get("/trends/topics", async (request, reply) => {
    try {
      const { limit = 10 } = request.query

      // Get trending articles based on views and recent activity
      const trendingArticles = await Article.find({ status: "published" })
        .sort({ views: -1, createdAt: -1 })
        .limit(Number.parseInt(limit))
        .select("title tags category views createdAt")
        .lean()

      // Extract trending topics from articles
      const topicCounts = {}
      trendingArticles.forEach((article) => {
        article.tags.forEach((tag) => {
          topicCounts[tag] = (topicCounts[tag] || 0) + article.views
        })
      })

      // Sort topics by total views
      const trendingTopics = Object.entries(topicCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, Number.parseInt(limit))
        .map(([topic, views]) => ({
          topic,
          views,
          articles: trendingArticles.filter((article) => article.tags.includes(topic)).length,
        }))

      reply.send({
        success: true,
        topics: trendingTopics,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      fastify.log.error("Error fetching trending topics:", error)

      // Mock trending topics
      const mockTopics = [
        { topic: "AI", views: 15420, articles: 12 },
        { topic: "Technology", views: 12890, articles: 18 },
        { topic: "Climate", views: 9876, articles: 8 },
        { topic: "Business", views: 8765, articles: 15 },
        { topic: "Innovation", views: 7654, articles: 10 },
        { topic: "Health", views: 6543, articles: 7 },
        { topic: "Science", views: 5432, articles: 9 },
        { topic: "Environment", views: 4321, articles: 6 },
      ]

      const limit = request.query.limit || 10 // Declare the limit variable

      reply.send({
        success: true,
        topics: mockTopics.slice(0, Number.parseInt(limit)),
        timestamp: new Date().toISOString(),
      })
    }
  })

  // Get trending articles by topic
  fastify.get("/trends/articles/:topic", async (request, reply) => {
    try {
      const { topic } = request.params
      const { limit = 10 } = request.query

      const articles = await Article.find({
        status: "published",
        tags: { $in: [new RegExp(topic, "i")] },
      })
        .sort({ views: -1, createdAt: -1 })
        .limit(Number.parseInt(limit))
        .lean()

      reply.send({
        success: true,
        topic,
        articles,
        count: articles.length,
      })
    } catch (error) {
      fastify.log.error("Error fetching trending articles by topic:", error)

      // Mock articles for topic
      const mockArticles = [
        {
          _id: "trend1",
          title: `Latest ${request.params.topic} Developments`,
          slug: `latest-${request.params.topic.toLowerCase()}-developments`,
          excerpt: `Discover the newest trends and developments in ${request.params.topic}.`,
          category: "Technology",
          tags: [request.params.topic, "Trending", "Latest"],
          author: "TrendBot AI",
          thumbnail: "/placeholder.svg?height=400&width=600",
          createdAt: new Date(),
          views: 1234,
          likes: 89,
          saves: 45,
          readTime: 5,
        },
      ]

      const limit = request.query.limit || 10 // Declare the limit variable

      reply.send({
        success: true,
        topic: request.params.topic,
        articles: mockArticles,
        count: 1,
      })
    }
  })
}

module.exports = trendsRoutes
