const trendCrawler = require("../services/trendCrawler")

async function trendRoutes(fastify, options) {
  // Get current trending topics
  fastify.get("/current", async (request, reply) => {
    try {
      const { source = "all", geo = "US" } = request.query

      let trends = []

      if (source === "google" || source === "all") {
        const googleTrends = await trendCrawler.getGoogleTrends(geo)
        trends = [...trends, ...googleTrends]
      }

      if (source === "twitter" || source === "all") {
        const twitterTrends = await trendCrawler.getTwitterTrends()
        trends = [...trends, ...twitterTrends]
      }

      reply.send({
        success: true,
        trends,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trends",
      })
    }
  })

  // Search for specific trend data
  fastify.get("/search/:query", async (request, reply) => {
    try {
      const { query } = request.params

      const [relatedContent, mediaContent] = await Promise.all([
        trendCrawler.searchRelatedContent(query),
        trendCrawler.getMediaContent(query),
      ])

      reply.send({
        success: true,
        query,
        relatedContent,
        media: mediaContent,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to search trend data",
      })
    }
  })
}

module.exports = trendRoutes
