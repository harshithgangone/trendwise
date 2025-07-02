const axios = require("axios")
const cheerio = require("cheerio")

class TrendCrawler {
  constructor() {
    this.baseURL = "https://news.google.com/rss"
    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ]
    this.requestDelay = 2000 // 2 seconds between requests
    this.maxRetries = 3
  }

  // Get random user agent for requests
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
  }

  // Add delay between requests
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Make HTTP request with retry logic
  async makeRequest(url, options = {}) {
    const config = {
      timeout: 10000,
      headers: {
        "User-Agent": this.getRandomUserAgent(),
        Accept: "application/rss+xml, application/xml, text/xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        ...options.headers,
      },
      ...options,
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔍 [TrendCrawler] Making request to: ${url} (Attempt ${attempt})`)
        const response = await axios.get(url, config)
        console.log(`✅ [TrendCrawler] Request successful: ${response.status}`)
        return response
      } catch (error) {
        console.error(`❌ [TrendCrawler] Request failed (Attempt ${attempt}):`, error.message)

        if (attempt === this.maxRetries) {
          throw new Error(`Failed to fetch ${url} after ${this.maxRetries} attempts: ${error.message}`)
        }

        // Exponential backoff
        const backoffDelay = Math.pow(2, attempt) * 1000
        console.log(`⏳ [TrendCrawler] Retrying in ${backoffDelay}ms...`)
        await this.delay(backoffDelay)
      }
    }
  }

  // Parse RSS feed using Cheerio
  parseRSSFeed(xmlData) {
    try {
      console.log(`📄 [TrendCrawler] Parsing RSS feed...`)
      const $ = cheerio.load(xmlData, { xmlMode: true })
      const items = []

      $("item").each((index, element) => {
        const $item = $(element)
        const title = $item.find("title").text().trim()
        const link = $item.find("link").text().trim()
        const description = $item.find("description").text().trim()
        const pubDate = $item.find("pubDate").text().trim()
        const source = $item.find("source").text().trim()

        if (title && link) {
          items.push({
            title,
            link,
            description: this.cleanDescription(description),
            publishedAt: new Date(pubDate || Date.now()),
            source: source || "Google News",
            category: this.extractCategory(title, description),
            keywords: this.extractKeywords(title, description),
          })
        }
      })

      console.log(`✅ [TrendCrawler] Parsed ${items.length} items from RSS feed`)
      return items
    } catch (error) {
      console.error(`❌ [TrendCrawler] RSS parsing failed:`, error.message)
      return []
    }
  }

  // Clean HTML from description
  cleanDescription(description) {
    if (!description) return ""

    // Remove HTML tags and decode entities
    const $ = cheerio.load(description)
    return $.text().trim().substring(0, 300)
  }

  // Extract category from content
  extractCategory(title, description) {
    const content = `${title} ${description}`.toLowerCase()

    const categories = {
      technology: [
        "tech",
        "ai",
        "artificial intelligence",
        "software",
        "app",
        "digital",
        "cyber",
        "robot",
        "automation",
      ],
      business: ["business", "economy", "market", "stock", "finance", "company", "startup", "investment"],
      health: ["health", "medical", "doctor", "hospital", "medicine", "disease", "treatment", "wellness"],
      science: ["science", "research", "study", "discovery", "experiment", "scientist", "innovation"],
      sports: ["sports", "football", "basketball", "soccer", "game", "player", "team", "championship"],
      entertainment: ["movie", "film", "music", "celebrity", "entertainment", "show", "actor", "singer"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        return category
      }
    }

    return "general"
  }

  // Extract keywords from content
  extractKeywords(title, description) {
    const content = `${title} ${description}`.toLowerCase()
    const words = content.match(/\b\w{4,}\b/g) || []

    // Filter common words and get unique keywords
    const stopWords = [
      "this",
      "that",
      "with",
      "have",
      "will",
      "from",
      "they",
      "been",
      "said",
      "each",
      "which",
      "their",
      "time",
      "more",
      "very",
      "what",
      "know",
      "just",
      "first",
      "into",
      "over",
      "think",
      "also",
      "your",
      "work",
      "life",
      "only",
      "can",
      "still",
      "should",
      "after",
      "being",
      "now",
      "made",
      "before",
      "here",
      "through",
      "when",
      "where",
      "much",
      "some",
      "these",
      "many",
      "would",
      "there",
    ]

    const keywords = [...new Set(words)].filter((word) => !stopWords.includes(word) && word.length > 3).slice(0, 10)

    return keywords
  }

  // Fetch trending topics from Google News
  async fetchTrendingTopics(category = "") {
    try {
      console.log(`🚀 [TrendCrawler] Fetching trending topics for category: ${category || "all"}`)

      let url = `${this.baseURL}?hl=en-US&gl=US&ceid=US:en`

      // Add category if specified
      if (category) {
        const categoryMap = {
          technology: "TECHNOLOGY",
          business: "BUSINESS",
          health: "HEALTH",
          science: "SCIENCE",
          sports: "SPORTS",
          entertainment: "ENTERTAINMENT",
        }

        if (categoryMap[category]) {
          url += `&topic=${categoryMap[category]}`
        }
      }

      const response = await this.makeRequest(url)
      const trends = this.parseRSSFeed(response.data)

      // Filter and sort trends
      const filteredTrends = trends
        .filter((trend) => trend.title.length > 10 && trend.title.length < 200)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 20)

      console.log(`✅ [TrendCrawler] Successfully fetched ${filteredTrends.length} trending topics`)
      return filteredTrends
    } catch (error) {
      console.error(`❌ [TrendCrawler] Failed to fetch trending topics:`, error.message)
      return []
    }
  }

  // Fetch trending topics from multiple categories
  async fetchMultipleCategoryTrends() {
    try {
      console.log(`🔄 [TrendCrawler] Fetching trends from multiple categories...`)

      const categories = ["technology", "business", "health", "science"]
      const allTrends = []

      for (const category of categories) {
        try {
          const trends = await this.fetchTrendingTopics(category)
          allTrends.push(...trends)

          // Add delay between category requests
          await this.delay(this.requestDelay)
        } catch (error) {
          console.error(`❌ [TrendCrawler] Failed to fetch ${category} trends:`, error.message)
        }
      }

      // Remove duplicates and sort by recency
      const uniqueTrends = allTrends
        .filter((trend, index, self) => index === self.findIndex((t) => t.title === trend.title))
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
        .slice(0, 15)

      console.log(`✅ [TrendCrawler] Collected ${uniqueTrends.length} unique trends from all categories`)
      return uniqueTrends
    } catch (error) {
      console.error(`❌ [TrendCrawler] Multi-category fetch failed:`, error.message)
      return []
    }
  }

  // Search for specific topic trends
  async searchTopicTrends(query) {
    try {
      console.log(`🔍 [TrendCrawler] Searching for topic: ${query}`)

      const searchUrl = `${this.baseURL}/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`
      const response = await this.makeRequest(searchUrl)
      const trends = this.parseRSSFeed(response.data)

      const relevantTrends = trends
        .filter(
          (trend) =>
            trend.title.toLowerCase().includes(query.toLowerCase()) ||
            trend.description.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 10)

      console.log(`✅ [TrendCrawler] Found ${relevantTrends.length} trends for query: ${query}`)
      return relevantTrends
    } catch (error) {
      console.error(`❌ [TrendCrawler] Topic search failed for "${query}":`, error.message)
      return []
    }
  }

  // Get trending topics with enhanced metadata
  async getEnhancedTrends() {
    try {
      console.log(`🚀 [TrendCrawler] Starting enhanced trend collection...`)

      const trends = await this.fetchMultipleCategoryTrends()

      // Enhance trends with additional metadata
      const enhancedTrends = trends.map((trend) => ({
        ...trend,
        slug: this.generateSlug(trend.title),
        trendScore: this.calculateTrendScore(trend),
        readingTime: this.estimateReadingTime(trend.description),
        socialShareable: this.isSocialShareable(trend.title),
        contentPotential: this.assessContentPotential(trend),
      }))

      // Sort by trend score
      enhancedTrends.sort((a, b) => b.trendScore - a.trendScore)

      console.log(`✅ [TrendCrawler] Enhanced ${enhancedTrends.length} trends with metadata`)
      return enhancedTrends
    } catch (error) {
      console.error(`❌ [TrendCrawler] Enhanced trend collection failed:`, error.message)
      return []
    }
  }

  // Generate URL-friendly slug
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-")
      .substring(0, 60)
  }

  // Calculate trend score based on various factors
  calculateTrendScore(trend) {
    let score = 0

    // Recency score (newer = higher)
    const hoursOld = (Date.now() - new Date(trend.publishedAt)) / (1000 * 60 * 60)
    score += Math.max(0, 24 - hoursOld) * 2

    // Title length score (optimal length)
    const titleLength = trend.title.length
    if (titleLength >= 30 && titleLength <= 80) score += 10

    // Keyword relevance score
    score += trend.keywords.length * 2

    // Category bonus
    const popularCategories = ["technology", "business", "health"]
    if (popularCategories.includes(trend.category)) score += 5

    return Math.round(score)
  }

  // Estimate reading time for content
  estimateReadingTime(text) {
    const wordsPerMinute = 200
    const wordCount = text.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  // Check if content is suitable for social sharing
  isSocialShareable(title) {
    const shareableKeywords = [
      "breakthrough",
      "revolutionary",
      "amazing",
      "incredible",
      "shocking",
      "surprising",
      "new",
      "latest",
      "trending",
    ]
    return shareableKeywords.some((keyword) => title.toLowerCase().includes(keyword))
  }

  // Assess content generation potential
  assessContentPotential(trend) {
    let potential = "medium"

    // High potential indicators
    const highPotentialKeywords = ["ai", "technology", "breakthrough", "innovation", "research", "study"]
    const hasHighPotential = highPotentialKeywords.some(
      (keyword) => trend.title.toLowerCase().includes(keyword) || trend.description.toLowerCase().includes(keyword),
    )

    if (hasHighPotential && trend.description.length > 100) {
      potential = "high"
    } else if (trend.description.length < 50) {
      potential = "low"
    }

    return potential
  }

  // Health check for the crawler service
  async healthCheck() {
    try {
      console.log(`🏥 [TrendCrawler] Running health check...`)

      const testUrl = `${this.baseURL}?hl=en-US&gl=US&ceid=US:en`
      const response = await this.makeRequest(testUrl)

      const isHealthy = response.status === 200 && response.data.includes("<rss")

      const healthStatus = {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        responseTime: response.headers["x-response-time"] || "unknown",
        dataSize: response.data.length,
        lastCheck: new Date().toISOString(),
      }

      console.log(`${isHealthy ? "✅" : "❌"} [TrendCrawler] Health check ${healthStatus.status}`)
      return healthStatus
    } catch (error) {
      console.error(`❌ [TrendCrawler] Health check failed:`, error.message)
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }
}

module.exports = TrendCrawler
