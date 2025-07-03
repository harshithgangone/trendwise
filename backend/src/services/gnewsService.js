const axios = require("axios")
require("dotenv").config()

console.log(
  `[GNEWS SERVICE] Loaded GNEWS_API_KEY: ${process.env.GNEWS_API_KEY ? process.env.GNEWS_API_KEY.slice(0, 4) + "****" : "NOT FOUND"}`,
)

class GNewsService {
  constructor() {
    this.apiKey = process.env.GNEWS_API_KEY
    this.baseUrl = "https://gnews.io/api/v4"
    this.requestTimeout = 15000
    this.maxRetries = 3
  }

  async fetchTopNews(limit = 10) {
    console.log(`[GNEWS SERVICE] Fetching top news with limit: ${limit}`)
    console.log(`[GNEWS SERVICE] API Key: ${this.apiKey ? "Present" : "Missing"}`)

    if (!this.apiKey) {
      console.log("[GNEWS SERVICE] No API key provided, returning empty results")
      return []
    }

    try {
      const url = `${this.baseUrl}/search?q=top news&max=${limit}&lang=en&token=${this.apiKey}`
      console.log(`[GNEWS SERVICE] Fetching GNews articles from: ${url}`)

      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          "User-Agent": "TrendWise/1.0",
        },
      })

      console.log(`[GNEWS SERVICE] GNews API response status: ${response.status}`)

      if (response.data && response.data.articles) {
        const articles = response.data.articles.map((article) => ({
          title: article.title,
          description: article.description,
          content: article.content || article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          image: article.image,
          source: article.source?.name || "GNews",
          category: "General",
          tags: [],
          score: 50,
        }))

        console.log(`[GNEWS SERVICE] Retrieved ${articles.length} articles from GNews.`)
        return articles
      }

      console.log("[GNEWS SERVICE] No articles found in response")
      return []
    } catch (error) {
      console.error("[GNEWS SERVICE] Error fetching news:", error.message)

      if (error.response) {
        console.error(`[GNEWS SERVICE] API Error Status: ${error.response.status}`)
        console.error(`[GNEWS SERVICE] API Error Data:`, error.response.data)
      }

      return []
    }
  }

  async searchNews(query, limit = 10) {
    console.log(`[GNEWS SERVICE] Searching news for: "${query}" with limit: ${limit}`)

    if (!this.apiKey) {
      console.log("[GNEWS SERVICE] No API key provided, returning empty results")
      return []
    }

    try {
      const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&max=${limit}&lang=en&token=${this.apiKey}`
      console.log(`[GNEWS SERVICE] Fetching search results from: ${url}`)

      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          "User-Agent": "TrendWise/1.0",
        },
      })

      console.log(`[GNEWS SERVICE] Search API response status: ${response.status}`)

      if (response.data && response.data.articles) {
        const articles = response.data.articles.map((article) => ({
          title: article.title,
          description: article.description,
          content: article.content || article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          image: article.image,
          source: article.source?.name || "GNews",
          category: "General",
          tags: [],
          score: 50,
        }))

        console.log(`[GNEWS SERVICE] Retrieved ${articles.length} search results from GNews.`)
        return articles
      }

      console.log("[GNEWS SERVICE] No articles found in search response")
      return []
    } catch (error) {
      console.error(`[GNEWS SERVICE] Error searching news for "${query}":`, error.message)

      if (error.response) {
        console.error(`[GNEWS SERVICE] Search API Error Status: ${error.response.status}`)
        console.error(`[GNEWS SERVICE] Search API Error Data:`, error.response.data)
      }

      return []
    }
  }

  async getTrendingTopics(limit = 10) {
    console.log(`[GNEWS SERVICE] Getting trending topics with limit: ${limit}`)

    // Try multiple queries to get diverse content
    const queries = ["trending news", "breaking news", "technology", "business", "health"]
    const allArticles = []

    for (const query of queries) {
      try {
        const articles = await this.searchNews(query, Math.ceil(limit / queries.length))
        allArticles.push(...articles)

        if (allArticles.length >= limit) break
      } catch (error) {
        console.error(`[GNEWS SERVICE] Error fetching for query "${query}":`, error.message)
      }
    }

    // Remove duplicates and limit results
    const uniqueArticles = this.removeDuplicates(allArticles).slice(0, limit)

    if (uniqueArticles.length > 0) {
      console.log(`[GNEWS SERVICE] Successfully retrieved ${uniqueArticles.length} trending topics`)
      return {
        success: true,
        trends: uniqueArticles.map((article) => ({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          publishedAt: article.publishedAt,
          image: article.image,
          source: "gnews",
          category: article.category || "General",
          tags: article.tags || [],
          score: article.score || 50,
        })),
      }
    }

    console.log("[GNEWS SERVICE] No trending topics found")
    return { success: false, trends: [], error: "No articles from GNews" }
  }

  removeDuplicates(articles) {
    const seen = new Set()
    return articles.filter((article) => {
      const key = article.url || article.title.toLowerCase()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async testConnection() {
    console.log("[GNEWS SERVICE] Testing connection...")

    if (!this.apiKey) {
      console.log("[GNEWS SERVICE] No API key configured")
      return {
        success: false,
        error: "No API key configured",
        timestamp: new Date().toISOString(),
      }
    }

    try {
      console.log("[GNEWS SERVICE] Testing API connection...")
      console.log(
        `[GNEWS SERVICE] Using API key: ${this.apiKey.substring(0, 4)}...${this.apiKey.substring(this.apiKey.length - 4)}`,
      )

      const startTime = Date.now()
      const response = await axios.get(`${this.baseUrl}/search?q=test&max=1&lang=en&token=${this.apiKey}`, {
        timeout: 5000,
        headers: {
          "User-Agent": "TrendWise/1.0",
        },
      })
      const endTime = Date.now()

      console.log("[GNEWS SERVICE] Connection test successful")
      console.log(`[GNEWS SERVICE] Response time: ${endTime - startTime}ms`)

      return {
        success: true,
        status: response.status,
        responseTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("[GNEWS SERVICE] Connection test failed:", error.message)

      const errorDetails = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }

      if (error.response) {
        errorDetails.status = error.response.status
        errorDetails.statusText = error.response.statusText
        console.error(`[GNEWS SERVICE] API Error Status: ${error.response.status} - ${error.response.statusText}`)
        console.error(`[GNEWS SERVICE] API Error Data: ${JSON.stringify(error.response.data || {})}`)

        if (error.response.status === 401) {
          console.error("[GNEWS SERVICE] Authentication failed - check API key")
          errorDetails.authError = true
        }
      } else if (error.request) {
        console.error("[GNEWS SERVICE] Network error - no response received")
        errorDetails.networkError = true
      }

      return errorDetails
    }
  }

  getStatus() {
    return {
      apiKey: !!this.apiKey,
      baseUrl: this.baseUrl,
      timeout: this.requestTimeout,
      maxRetries: this.maxRetries,
    }
  }
}

// Create and export singleton instance
const gnewsService = new GNewsService()
module.exports = gnewsService

// Also export the functions for backward compatibility
module.exports.fetchGNewsArticles = async (query, max = 10) => {
  return await gnewsService.searchNews(query, max)
}

module.exports.getTrendingTopics = async (limit = 10) => {
  return await gnewsService.getTrendingTopics(limit)
}

module.exports.testConnection = async () => {
  return await gnewsService.testConnection()
}
