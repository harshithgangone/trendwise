const axios = require("axios")

class GNewsService {
  constructor() {
    this.apiKey = process.env.GNEWS_API_KEY
    this.baseUrl = "https://gnews.io/api/v4"
    this.isHealthy = false
    this.lastError = null

    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS SERVICE] No API key found")
      this.lastError = "No API key configured"
    } else {
      console.log(`✅ [GNEWS SERVICE] Loaded GNEWS_API_KEY: ${this.apiKey.substring(0, 6)}****`)
    }
  }

  async testConnection() {
    try {
      console.log("🔍 [GNEWS SERVICE] Testing connection...")

      if (!this.apiKey) {
        throw new Error("No API key configured")
      }

      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          token: this.apiKey,
          lang: "en",
          max: 1,
        },
        timeout: 10000,
      })

      if (response.data && response.data.articles) {
        this.isHealthy = true
        this.lastError = null
        console.log("✅ [GNEWS SERVICE] Connection test successful")
        return true
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      this.isHealthy = false
      this.lastError = error.message
      console.error("❌ [GNEWS SERVICE] Connection test failed:", error.message)
      return false
    }
  }

  async searchNews(query, options = {}) {
    try {
      console.log(`🔍 [GNEWS SERVICE] Searching for: "${query}"`)

      if (!this.apiKey) {
        throw new Error("No API key configured")
      }

      const params = {
        q: query,
        token: this.apiKey,
        lang: options.lang || "en",
        country: options.country || "us",
        max: options.max || 10,
        in: options.in || "title,description",
        nullable: options.nullable || "description,content,image",
        sortby: options.sortby || "publishedAt",
      }

      console.log(`🔍 [GNEWS SERVICE] Searching for: "${query}"`)

      const response = await axios.get(`${this.baseUrl}/search`, {
        params,
        timeout: 15000,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS SERVICE] Found ${response.data.articles.length} articles for "${query}"`)
        return this.processArticles(response.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error(`❌ [GNEWS SERVICE] Search failed for "${query}":`, error.message)

      if (error.response?.status === 403) {
        console.error("🔑 [GNEWS SERVICE] API key invalid or quota exceeded")
      }

      // Return mock data as fallback
      return this.getMockNews(query)
    }
  }

  async getTopHeadlines(options = {}) {
    try {
      console.log("📰 [GNEWS SERVICE] Fetching top headlines...")

      if (!this.apiKey) {
        throw new Error("No API key configured")
      }

      const params = {
        token: this.apiKey,
        lang: options.lang || "en",
        country: options.country || "us",
        max: options.max || 10,
        category: options.category || "general",
        nullable: "description,content,image",
      }

      console.log("📰 [GNEWS SERVICE] Fetching top headlines...")

      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params,
        timeout: 15000,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS SERVICE] Found ${response.data.articles.length} headlines`)
        return this.processArticles(response.data)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Headlines fetch failed:", error.message)
      return this.getMockNews("headlines")
    }
  }

  async getMultipleQueries(queries = []) {
    try {
      console.log(`🔍 [GNEWS SERVICE] Fetching multiple queries: ${queries.join(", ")}`)

      const promises = queries.map((query) =>
        this.searchNews(query, { max: 5 }).catch((error) => {
          console.error(`❌ [GNEWS SERVICE] Query "${query}" failed:`, error.message)
          return { articles: [] }
        }),
      )

      const results = await Promise.all(promises)

      // Combine all articles
      const allArticles = []
      results.forEach((result) => {
        if (result.articles) {
          allArticles.push(...result.articles)
        }
      })

      // Remove duplicates based on URL
      const uniqueArticles = this.removeDuplicates(allArticles)

      console.log(`✅ [GNEWS SERVICE] Combined ${uniqueArticles.length} unique articles from ${queries.length} queries`)

      return {
        totalArticles: uniqueArticles.length,
        articles: uniqueArticles,
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Multiple queries failed:", error.message)
      return this.getMockNews("multiple")
    }
  }

  async getTrendingTopics() {
    try {
      console.log("📈 [GNEWS SERVICE] Fetching trending topics...")

      const topics = [
        "artificial intelligence",
        "cryptocurrency",
        "climate change",
        "technology",
        "politics",
        "business",
        "health",
        "science",
      ]

      const results = []

      for (const topic of topics.slice(0, 3)) {
        // Limit to 3 topics to avoid rate limits
        const result = await this.searchNews(topic, { max: 5 })
        if (result.success && result.articles.length > 0) {
          results.push({
            topic,
            articles: result.articles,
          })
        }

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log(`✅ [GNEWS SERVICE] Fetched trending topics: ${results.length} topics`)
      return {
        success: true,
        topics: results,
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Error fetching trending topics:", error.message)
      return {
        success: false,
        error: error.message,
        topics: [],
      }
    }
  }

  processArticles(data) {
    if (!data.articles || !Array.isArray(data.articles)) {
      return { success: false, totalArticles: 0, articles: [] }
    }

    const processedArticles = data.articles.map((article) => ({
      title: article.title || "Untitled",
      description: article.description || "",
      content: article.content || article.description || "",
      url: article.url || "",
      image: article.image || null,
      publishedAt: article.publishedAt || new Date().toISOString(),
      source: {
        name: article.source?.name || "Unknown Source",
        url: article.source?.url || "",
      },
    }))

    return {
      success: true,
      totalArticles: data.totalArticles || processedArticles.length,
      articles: processedArticles,
    }
  }

  removeDuplicates(articles) {
    const seen = new Set()
    return articles.filter((article) => {
      const key = article.url || article.title
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  getMockNews(query) {
    console.log(`🎭 [GNEWS SERVICE] Generating mock news for: ${query}`)

    const mockArticles = [
      {
        title: "Breaking: Major Technology Breakthrough Announced",
        description:
          "Scientists have made a significant breakthrough in quantum computing technology that could revolutionize the industry.",
        content:
          "In a groundbreaking announcement today, researchers at leading technology institutes revealed a major advancement in quantum computing capabilities. This breakthrough promises to accelerate computational speeds by orders of magnitude, potentially transforming industries from finance to healthcare. The new quantum processors demonstrate unprecedented stability and error correction, bringing practical quantum computing closer to reality than ever before.",
        url: "https://example.com/tech-breakthrough",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800",
        publishedAt: new Date().toISOString(),
        source: {
          name: "Tech News Daily",
          url: "https://technewsdaily.com",
        },
      },
      {
        title: "Global Climate Summit Reaches Historic Agreement",
        description: "World leaders unite on ambitious climate action plan with unprecedented commitments.",
        content:
          "The Global Climate Summit concluded today with a historic agreement that sets new standards for international environmental cooperation. The comprehensive plan includes binding commitments from major economies to achieve net-zero emissions by 2040, significant investments in renewable energy infrastructure, and innovative carbon capture technologies. Environmental experts are calling this agreement a turning point in the fight against climate change.",
        url: "https://example.com/climate-summit",
        image: "https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=800",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: {
          name: "Global News Network",
          url: "https://globalnews.com",
        },
      },
      {
        title: "Revolutionary Medical Treatment Shows Promise",
        description: "New gene therapy approach demonstrates remarkable success in clinical trials.",
        content:
          "A revolutionary gene therapy treatment has shown extraordinary promise in Phase III clinical trials, offering hope for patients with previously incurable genetic disorders. The treatment, developed over a decade of research, uses advanced CRISPR technology to correct genetic mutations at the cellular level. Early results indicate a 95% success rate in treating the targeted conditions, with minimal side effects reported.",
        url: "https://example.com/medical-breakthrough",
        image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: {
          name: "Medical Journal Today",
          url: "https://medicaljournal.com",
        },
      },
    ]

    return {
      success: false,
      totalArticles: mockArticles.length,
      articles: mockArticles,
    }
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastError: this.lastError,
      hasApiKey: !!this.apiKey,
      service: "GNews",
    }
  }
}

// Create singleton instance
const gnewsService = new GNewsService()

module.exports = gnewsService
