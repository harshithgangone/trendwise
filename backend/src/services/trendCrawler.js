const gnewsService = require("./gnewsService")

class TrendCrawler {
  constructor() {
    this.sources = ["gnews", "fallback"]
    this.isInitialized = true
    console.log("🕷️ [TrendCrawler] Initialized with multiple sources")
  }

  async crawlTrends() {
    console.log("🔍 [TrendCrawler] Starting trend crawling...")

    try {
      // Try to get trends from GNews first
      const gnewsTrends = await this.crawlGNewsTrends()

      if (gnewsTrends && gnewsTrends.length > 0) {
        console.log(`✅ [TrendCrawler] Found ${gnewsTrends.length} trends from GNews`)
        return {
          success: true,
          trends: gnewsTrends,
          source: "gnews",
        }
      }

      // Fallback to mock trends
      console.log("⚠️ [TrendCrawler] GNews failed, using fallback trends")
      const fallbackTrends = this.getFallbackTrends()

      return {
        success: true,
        trends: fallbackTrends,
        source: "fallback",
      }
    } catch (error) {
      console.error("❌ [TrendCrawler] Error crawling trends:", error.message)

      // Return fallback trends on error
      const fallbackTrends = this.getFallbackTrends()
      return {
        success: false,
        trends: fallbackTrends,
        source: "fallback",
        error: error.message,
      }
    }
  }

  async crawlGNewsTrends() {
    try {
      console.log("📡 [TrendCrawler] Crawling GNews for trending topics...")

      // Get trending news from GNews
      const newsArticles = await gnewsService.getTrendingNews(15)

      if (!newsArticles || newsArticles.length === 0) {
        console.log("⚠️ [TrendCrawler] No articles from GNews")
        return []
      }

      // Transform news articles into trend format
      const trends = newsArticles.map((article, index) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.image,
        source: article.source?.name || "GNews",
        category: this.categorizeArticle(article.title, article.description),
        trendScore: this.calculateTrendScore(article, index),
        type: "news",
        topic: this.extractTopic(article.title),
        publishedAt: article.publishedAt,
      }))

      // Sort by trend score
      trends.sort((a, b) => b.trendScore - a.trendScore)

      console.log(`✅ [TrendCrawler] Processed ${trends.length} trends from GNews`)
      return trends
    } catch (error) {
      console.error("❌ [TrendCrawler] Error crawling GNews trends:", error.message)
      return []
    }
  }

  getFallbackTrends() {
    const fallbackTrends = [
      {
        title: "Artificial Intelligence Revolutionizes Healthcare Diagnostics",
        description:
          "New AI-powered diagnostic tools are showing unprecedented accuracy in early disease detection, potentially saving millions of lives.",
        content:
          "Healthcare professionals are increasingly turning to artificial intelligence to enhance diagnostic accuracy and speed. Recent studies show that AI systems can detect certain conditions with over 95% accuracy, often identifying issues that human doctors might miss. This breakthrough technology is being implemented in hospitals worldwide, marking a significant step forward in medical care.",
        url: "https://example.com/ai-healthcare",
        image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
        source: "TechHealth News",
        category: "Health",
        trendScore: 95,
        type: "technology",
        topic: "AI Healthcare",
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Sustainable Energy Breakthrough: Solar Efficiency Reaches New Heights",
        description:
          "Scientists achieve record-breaking solar panel efficiency, bringing renewable energy closer to widespread adoption.",
        content:
          "A team of researchers has developed solar panels with 47% efficiency, nearly doubling the performance of current commercial panels. This breakthrough could make solar energy more cost-effective than fossil fuels in most regions, accelerating the global transition to renewable energy sources.",
        url: "https://example.com/solar-breakthrough",
        image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=400&fit=crop",
        source: "Green Energy Today",
        category: "Science",
        trendScore: 88,
        type: "breakthrough",
        topic: "Renewable Energy",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        title: "Global Economic Recovery Shows Strong Momentum",
        description:
          "International markets demonstrate resilience as economic indicators point to sustained growth across major economies.",
        content:
          "Economic analysts report positive trends across multiple sectors, with unemployment rates declining and consumer confidence reaching pre-pandemic levels. The recovery appears to be gaining momentum, driven by technological innovation and increased investment in infrastructure projects.",
        url: "https://example.com/economic-recovery",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
        source: "Financial Times",
        category: "Business",
        trendScore: 82,
        type: "economic",
        topic: "Economic Recovery",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        title: "Space Exploration Milestone: Mars Mission Reveals Groundbreaking Discoveries",
        description:
          "Latest Mars rover findings provide compelling evidence of past microbial life, reshaping our understanding of the Red Planet.",
        content:
          "The Mars Perseverance rover has uncovered mineral formations that strongly suggest the presence of ancient microbial life. These findings represent one of the most significant discoveries in space exploration history, opening new possibilities for understanding life beyond Earth.",
        url: "https://example.com/mars-discovery",
        image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=400&fit=crop",
        source: "Space News Network",
        category: "Science",
        trendScore: 90,
        type: "discovery",
        topic: "Space Exploration",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        title: "Cybersecurity Alert: New Protection Protocols Defend Against Advanced Threats",
        description:
          "Innovative cybersecurity measures successfully thwart sophisticated attacks, setting new standards for digital protection.",
        content:
          "Security experts have developed advanced protection protocols that use machine learning to predict and prevent cyber attacks before they occur. These systems have already prevented several major security breaches, demonstrating their effectiveness against even the most sophisticated threats.",
        url: "https://example.com/cybersecurity-breakthrough",
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop",
        source: "CyberSec Today",
        category: "Technology",
        trendScore: 85,
        type: "security",
        topic: "Cybersecurity",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
      },
    ]

    console.log(`🎭 [TrendCrawler] Generated ${fallbackTrends.length} fallback trends`)
    return fallbackTrends
  }

  categorizeArticle(title, description) {
    const text = (title + " " + description).toLowerCase()

    const categories = {
      Technology: ["tech", "ai", "artificial intelligence", "software", "digital", "cyber", "innovation"],
      Business: ["business", "economy", "market", "finance", "company", "corporate", "investment"],
      Health: ["health", "medical", "healthcare", "medicine", "disease", "treatment", "wellness"],
      Science: ["science", "research", "discovery", "study", "breakthrough", "experiment"],
      Politics: ["politics", "government", "election", "policy", "congress", "political"],
      Sports: ["sports", "game", "team", "player", "championship", "match"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "film", "show"],
      World: ["world", "international", "global", "country", "nation"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category
      }
    }

    return "General"
  }

  calculateTrendScore(article, index) {
    let score = 100 - index * 5 // Base score decreases with position

    // Boost score based on recency
    if (article.publishedAt) {
      const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60)
      if (hoursAgo < 1) score += 20
      else if (hoursAgo < 6) score += 10
      else if (hoursAgo < 24) score += 5
    }

    // Boost score based on content quality
    if (article.description && article.description.length > 100) score += 10
    if (article.content && article.content.length > 500) score += 15

    // Boost score for certain keywords
    const trendingKeywords = ["breaking", "urgent", "exclusive", "major", "significant", "unprecedented"]
    const text = (article.title + " " + article.description).toLowerCase()
    trendingKeywords.forEach((keyword) => {
      if (text.includes(keyword)) score += 5
    })

    return Math.min(100, Math.max(0, score))
  }

  extractTopic(title) {
    // Extract the main topic from the title
    const words = title.split(" ")
    const stopWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"]
    const meaningfulWords = words.filter((word) => !stopWords.includes(word.toLowerCase()) && word.length > 3)

    return meaningfulWords.slice(0, 3).join(" ")
  }

  async healthCheck() {
    try {
      console.log("🏥 [TrendCrawler] Performing health check...")

      // Test GNews service
      const gnewsHealthy = await gnewsService.testConnection().catch(() => false)

      const status = {
        status: "healthy",
        sources: {
          gnews: gnewsHealthy,
          fallback: true,
        },
        timestamp: new Date().toISOString(),
      }

      console.log("✅ [TrendCrawler] Health check completed:", status)
      return status
    } catch (error) {
      console.error("❌ [TrendCrawler] Health check failed:", error.message)
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

// Create singleton instance
const trendCrawler = new TrendCrawler()

module.exports = trendCrawler
