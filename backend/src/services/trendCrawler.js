const { gnewsService } = require("./gnewsService")

class TrendCrawler {
  constructor() {
    this.sources = ["gnews", "fallback"]
    this.lastCrawl = null
    this.isHealthy = true
    this.errorCount = 0

    console.log("🕷️ [TrendCrawler] Initialized with multiple sources")
  }

  async crawlTrends(limit = 20) {
    try {
      console.log(`🕷️ [TrendCrawler] Starting trend crawl (limit: ${limit})...`)
      this.lastCrawl = new Date()

      let allTrends = []

      // Try GNews first
      try {
        const gnewsTrends = await gnewsService.getTrendingNews(limit)
        if (gnewsTrends && gnewsTrends.length > 0) {
          allTrends = allTrends.concat(
            gnewsTrends.map((trend) => ({
              ...trend,
              source: "gnews",
              crawledAt: new Date(),
            })),
          )
          console.log(`✅ [TrendCrawler] Got ${gnewsTrends.length} trends from GNews`)
        }
      } catch (error) {
        console.error("❌ [TrendCrawler] GNews failed:", error.message)
        this.errorCount++
      }

      // If we don't have enough trends, add fallback content
      if (allTrends.length < limit / 2) {
        console.log("⚠️ [TrendCrawler] Adding fallback trends...")
        const fallbackTrends = this.getFallbackTrends(limit - allTrends.length)
        allTrends = allTrends.concat(fallbackTrends)
      }

      // Remove duplicates and limit results
      const uniqueTrends = this.removeDuplicates(allTrends)
      const finalTrends = uniqueTrends.slice(0, limit)

      console.log(`✅ [TrendCrawler] Crawl complete - ${finalTrends.length} unique trends found`)

      this.isHealthy = true
      this.errorCount = 0

      return {
        success: true,
        trends: finalTrends,
        totalFound: finalTrends.length,
        sources: this.getSourceStats(finalTrends),
        crawledAt: this.lastCrawl,
      }
    } catch (error) {
      console.error("❌ [TrendCrawler] Crawl failed:", error.message)
      this.isHealthy = false
      this.errorCount++

      return {
        success: false,
        error: error.message,
        trends: this.getFallbackTrends(limit),
        crawledAt: this.lastCrawl,
      }
    }
  }

  removeDuplicates(trends) {
    const seen = new Set()
    return trends.filter((trend) => {
      const key = trend.title.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  getSourceStats(trends) {
    const stats = {}
    trends.forEach((trend) => {
      const source = trend.source || "unknown"
      stats[source] = (stats[source] || 0) + 1
    })
    return stats
  }

  getFallbackTrends(limit = 10) {
    const fallbackTrends = [
      {
        title: "Artificial Intelligence Revolutionizes Healthcare Diagnostics",
        description:
          "New AI systems are showing remarkable accuracy in medical diagnosis, potentially transforming patient care worldwide.",
        content:
          "Healthcare professionals are increasingly turning to artificial intelligence to enhance diagnostic accuracy and speed. Recent studies show AI systems can detect certain conditions with greater precision than traditional methods.",
        url: "https://example.com/ai-healthcare",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "HealthTech Today" },
        crawledAt: new Date(),
      },
      {
        title: "Sustainable Energy Solutions Reach New Efficiency Milestones",
        description:
          "Solar and wind technologies achieve record-breaking efficiency rates, making renewable energy more accessible than ever.",
        content:
          "The renewable energy sector is experiencing unprecedented growth as new technologies push efficiency boundaries. Solar panels and wind turbines are becoming more cost-effective and powerful.",
        url: "https://example.com/renewable-energy",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Green Energy News" },
        crawledAt: new Date(),
      },
      {
        title: "Global Markets Show Resilience Amid Economic Uncertainty",
        description:
          "Despite challenges, international markets demonstrate stability and growth potential across multiple sectors.",
        content:
          "Financial analysts are cautiously optimistic about market trends, noting strong fundamentals in key sectors despite ongoing global uncertainties.",
        url: "https://example.com/market-resilience",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Financial Insights" },
        crawledAt: new Date(),
      },
      {
        title: "Space Technology Advances Open New Frontiers",
        description:
          "Recent breakthroughs in space exploration technology are paving the way for ambitious missions and discoveries.",
        content:
          "The space industry is experiencing rapid innovation with new propulsion systems, satellite technologies, and exploration capabilities being developed.",
        url: "https://example.com/space-tech",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Space Explorer" },
        crawledAt: new Date(),
      },
      {
        title: "Educational Technology Transforms Learning Experiences",
        description:
          "Digital learning platforms and immersive technologies are reshaping how students engage with educational content.",
        content:
          "Schools and universities worldwide are adopting innovative educational technologies to create more engaging and effective learning environments.",
        url: "https://example.com/edtech-transform",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Education Innovation" },
        crawledAt: new Date(),
      },
      {
        title: "Cybersecurity Measures Evolve to Counter New Threats",
        description: "Organizations implement advanced security protocols as cyber threats become more sophisticated.",
        content:
          "The cybersecurity landscape is rapidly evolving with new threats emerging daily. Companies are investing heavily in advanced security measures and employee training.",
        url: "https://example.com/cybersecurity",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Security Today" },
        crawledAt: new Date(),
      },
      {
        title: "Urban Development Projects Focus on Sustainability",
        description:
          "Cities worldwide are implementing green building practices and sustainable urban planning initiatives.",
        content:
          "Urban planners are prioritizing sustainability in new development projects, incorporating green spaces, energy-efficient buildings, and smart city technologies.",
        url: "https://example.com/urban-sustainability",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Urban Planning Weekly" },
        crawledAt: new Date(),
      },
      {
        title: "Biotechnology Breakthroughs Promise Medical Advances",
        description:
          "Recent discoveries in biotechnology are opening new possibilities for treating previously incurable conditions.",
        content:
          "Researchers are making significant strides in biotechnology, developing new treatments and therapies that could revolutionize medicine.",
        url: "https://example.com/biotech-breakthrough",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "BioTech Review" },
        crawledAt: new Date(),
      },
    ]

    const selectedTrends = fallbackTrends
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, limit)
      .map((trend) => ({
        ...trend,
        source: "fallback",
      }))

    console.log(`📰 [TrendCrawler] Generated ${selectedTrends.length} fallback trends`)
    return selectedTrends
  }

  getHealthStatus() {
    return {
      status: this.isHealthy ? "healthy" : "unhealthy",
      lastCrawl: this.lastCrawl,
      errorCount: this.errorCount,
      sources: this.sources,
      timestamp: new Date().toISOString(),
    }
  }

  async testSources() {
    const results = {}

    // Test GNews
    try {
      await gnewsService.testConnection()
      results.gnews = { status: "healthy", error: null }
    } catch (error) {
      results.gnews = { status: "unhealthy", error: error.message }
    }

    // Fallback is always available
    results.fallback = { status: "healthy", error: null }

    return results
  }
}

// Create singleton instance
const trendCrawler = new TrendCrawler()

module.exports = { trendCrawler }
