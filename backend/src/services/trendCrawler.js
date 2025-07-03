const gnewsService = require("./gnewsService")

class TrendCrawler {
  constructor() {
    this.isHealthy = false
    this.lastError = null
    this.sources = ["gnews"]

    console.log("🕷️ [TrendCrawler] Initialized with multiple sources")
  }

  async crawlTrends() {
    try {
      console.log("🕷️ [TrendCrawler] Starting trend crawling...")

      const allTrends = []

      // Crawl from GNews
      try {
        const gnewsTrends = await this.crawlGNewsTrends()
        if (gnewsTrends.length > 0) {
          allTrends.push(...gnewsTrends)
          console.log(`✅ [TrendCrawler] Got ${gnewsTrends.length} trends from GNews`)
        }
      } catch (error) {
        console.error("❌ [TrendCrawler] GNews crawling failed:", error.message)
      }

      // If no trends found, generate fallback trends
      if (allTrends.length === 0) {
        console.warn("⚠️ [TrendCrawler] No trends found, generating fallback trends")
        allTrends.push(...this.generateFallbackTrends())
      }

      this.isHealthy = allTrends.length > 0
      this.lastError = allTrends.length === 0 ? "No trends found" : null

      console.log(`✅ [TrendCrawler] Total trends found: ${allTrends.length}`)

      return {
        success: true,
        trends: allTrends,
        sources: this.sources,
      }
    } catch (error) {
      this.isHealthy = false
      this.lastError = error.message
      console.error("❌ [TrendCrawler] Error crawling trends:", error.message)

      return {
        success: false,
        error: error.message,
        trends: this.generateFallbackTrends(),
      }
    }
  }

  async crawlGNewsTrends() {
    try {
      console.log("📰 [TrendCrawler] Crawling GNews trends...")

      // Get top headlines
      const headlines = await gnewsService.getTopHeadlines({ max: 10 })

      if (!headlines.success || !headlines.articles) {
        throw new Error("Failed to fetch headlines from GNews")
      }

      // Get trending topics
      const trendingTopics = await gnewsService.getTrendingTopics()

      const trends = []

      // Process headlines
      headlines.articles.forEach((article) => {
        trends.push({
          title: article.title,
          description: article.description,
          url: article.url,
          source: article.source?.name || "GNews",
          publishedAt: article.publishedAt,
          image: article.image,
          trendScore: this.calculateTrendScore(article),
          category: this.categorizeArticle(article),
          type: "headline",
        })
      })

      // Process trending topics
      if (trendingTopics.success && trendingTopics.topics) {
        trendingTopics.topics.forEach((topicData) => {
          topicData.articles.forEach((article) => {
            trends.push({
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source?.name || "GNews",
              publishedAt: article.publishedAt,
              image: article.image,
              trendScore: this.calculateTrendScore(article),
              category: this.categorizeArticle(article),
              type: "trending",
              topic: topicData.topic,
            })
          })
        })
      }

      // Remove duplicates based on URL
      const uniqueTrends = trends.filter((trend, index, self) => index === self.findIndex((t) => t.url === trend.url))

      // Sort by trend score
      uniqueTrends.sort((a, b) => b.trendScore - a.trendScore)

      return uniqueTrends.slice(0, 15) // Return top 15 trends
    } catch (error) {
      console.error("❌ [TrendCrawler] Error crawling GNews:", error.message)
      return []
    }
  }

  calculateTrendScore(article) {
    let score = 50 // Base score

    // Recent articles get higher scores
    const publishedAt = new Date(article.publishedAt)
    const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 1) score += 30
    else if (hoursAgo < 6) score += 20
    else if (hoursAgo < 24) score += 10

    // Articles with images get bonus points
    if (article.image) score += 10

    // Longer descriptions might indicate more substantial content
    if (article.description && article.description.length > 100) score += 5

    // Popular sources get bonus points
    const popularSources = ["BBC", "CNN", "Reuters", "AP", "The Guardian"]
    if (popularSources.includes(article.source?.name)) score += 15

    return Math.min(100, score) // Cap at 100
  }

  categorizeArticle(article) {
    const title = (article.title || "").toLowerCase()
    const description = (article.description || "").toLowerCase()
    const content = title + " " + description

    const categories = {
      Technology: ["tech", "ai", "artificial intelligence", "software", "digital", "cyber"],
      Business: ["business", "economy", "market", "finance", "company", "trade"],
      Politics: ["politics", "government", "election", "policy", "congress", "president"],
      Health: ["health", "medical", "doctor", "disease", "treatment", "medicine"],
      Science: ["science", "research", "study", "discovery", "experiment"],
      Sports: ["sports", "game", "team", "player", "championship", "league"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "film"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        return category
      }
    }

    return "General"
  }

  generateFallbackTrends() {
    console.log("🔄 [TrendCrawler] Generating fallback trends...")

    const fallbackTrends = [
      {
        title: "Breaking: Major Technology Breakthrough Announced",
        description: "Scientists have made a significant breakthrough in quantum computing technology.",
        url: "#",
        source: "TrendWise",
        publishedAt: new Date().toISOString(),
        image: null,
        trendScore: 85,
        category: "Technology",
        type: "fallback",
      },
      {
        title: "Global Markets Show Strong Performance",
        description: "International markets are showing positive trends across multiple sectors.",
        url: "#",
        source: "TrendWise",
        publishedAt: new Date().toISOString(),
        image: null,
        trendScore: 75,
        category: "Business",
        type: "fallback",
      },
      {
        title: "Climate Change Initiative Gains Momentum",
        description: "New environmental policies are being implemented worldwide.",
        url: "#",
        source: "TrendWise",
        publishedAt: new Date().toISOString(),
        image: null,
        trendScore: 70,
        category: "Science",
        type: "fallback",
      },
    ]

    return fallbackTrends
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastError: this.lastError,
      sources: this.sources,
      service: "TrendCrawler",
    }
  }
}

// Create singleton instance
const trendCrawler = new TrendCrawler()

module.exports = trendCrawler
