const axios = require("axios")

class GNewsService {
  constructor() {
    this.apiKey = process.env.GNEWS_API_KEY
    this.baseUrl = "https://gnews.io/api/v4"
    this.isInitialized = !!this.apiKey

    if (this.isInitialized) {
      console.log("✅ [GNEWS SERVICE] Initialized with API key")
    } else {
      console.log("⚠️ [GNEWS SERVICE] No API key found, using fallback mode")
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      throw new Error("GNews API key not configured")
    }

    try {
      const response = await axios.get(`${this.baseUrl}/top-headlines`, {
        params: {
          token: this.apiKey,
          lang: "en",
          max: 1,
        },
        timeout: 10000,
      })

      if (response.data && response.data.articles) {
        console.log("✅ [GNEWS SERVICE] Connection test successful")
        return true
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Connection test failed:", error.message)
      throw error
    }
  }

  async getTrendingNews(limit = 10) {
    if (!this.isInitialized) {
      console.log("⚠️ [GNEWS SERVICE] API not initialized, using fallback")
      return this.getFallbackNews()
    }

    try {
      console.log(`📡 [GNEWS SERVICE] Fetching ${limit} trending news articles...`)

      // Try multiple queries to get diverse content
      const queries = [
        { category: "general" },
        { category: "technology" },
        { category: "business" },
        { q: "breaking news" },
        { q: "trending" },
      ]

      let allArticles = []

      for (const query of queries) {
        try {
          const response = await axios.get(`${this.baseUrl}/top-headlines`, {
            params: {
              token: this.apiKey,
              lang: "en",
              max: Math.ceil(limit / queries.length) + 2,
              ...query,
            },
            timeout: 15000,
          })

          if (response.data && response.data.articles) {
            allArticles = allArticles.concat(response.data.articles)
            console.log(`📰 [GNEWS SERVICE] Got ${response.data.articles.length} articles for query:`, query)
          }

          // Small delay between requests
          await new Promise((resolve) => setTimeout(resolve, 500))
        } catch (queryError) {
          console.log(`⚠️ [GNEWS SERVICE] Query failed:`, query, queryError.message)
          continue
        }
      }

      if (allArticles.length === 0) {
        console.log("⚠️ [GNEWS SERVICE] No articles found, using fallback")
        return this.getFallbackNews()
      }

      // Remove duplicates based on URL
      const uniqueArticles = allArticles.filter(
        (article, index, self) => index === self.findIndex((a) => a.url === article.url),
      )

      // Transform and limit results
      const transformedArticles = uniqueArticles.slice(0, limit).map((article) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.image,
        publishedAt: article.publishedAt,
        source: article.source,
      }))

      console.log(`✅ [GNEWS SERVICE] Successfully fetched ${transformedArticles.length} unique articles`)
      return transformedArticles
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Error fetching news:", error.message)
      return this.getFallbackNews()
    }
  }

  async searchNews(query, limit = 10) {
    if (!this.isInitialized) {
      console.log("⚠️ [GNEWS SERVICE] API not initialized, using fallback")
      return this.getFallbackNews()
    }

    try {
      console.log(`🔍 [GNEWS SERVICE] Searching for: "${query}"`)

      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          token: this.apiKey,
          q: query,
          lang: "en",
          max: limit,
          sortby: "relevance",
        },
        timeout: 15000,
      })

      if (response.data && response.data.articles) {
        const articles = response.data.articles.map((article) => ({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
          image: article.image,
          publishedAt: article.publishedAt,
          source: article.source,
        }))

        console.log(`✅ [GNEWS SERVICE] Found ${articles.length} articles for "${query}"`)
        return articles
      }

      return []
    } catch (error) {
      console.error(`❌ [GNEWS SERVICE] Error searching for "${query}":`, error.message)
      return this.getFallbackNews()
    }
  }

  getFallbackNews() {
    const fallbackArticles = [
      {
        title: "Technology Innovation Drives Market Growth",
        description: "Latest technological advancements are creating new opportunities across various industries.",
        content:
          "The rapid pace of technological innovation continues to reshape industries and create new market opportunities. Companies are investing heavily in digital transformation initiatives.",
        url: "https://example.com/tech-innovation",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Tech Today", url: "https://techtoday.com" },
      },
      {
        title: "Global Economic Outlook Shows Positive Trends",
        description: "Economic indicators suggest continued growth and stability in major markets worldwide.",
        content:
          "Financial experts are optimistic about the global economic outlook, citing strong fundamentals and positive market indicators across multiple regions.",
        url: "https://example.com/economic-outlook",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Economic Review", url: "https://economicreview.com" },
      },
      {
        title: "Sustainable Development Goals Gain Momentum",
        description: "Organizations worldwide are making significant progress toward achieving sustainability targets.",
        content:
          "The push for sustainable development is gaining momentum as organizations implement innovative solutions to address environmental challenges.",
        url: "https://example.com/sustainability",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Green Future", url: "https://greenfuture.com" },
      },
      {
        title: "Healthcare Innovation Improves Patient Outcomes",
        description: "Medical breakthroughs and technological advances are revolutionizing patient care.",
        content:
          "Healthcare providers are leveraging cutting-edge technology and innovative treatment approaches to improve patient outcomes and reduce costs.",
        url: "https://example.com/healthcare-innovation",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Medical News", url: "https://medicalnews.com" },
      },
      {
        title: "Education Technology Transforms Learning",
        description:
          "Digital learning platforms and tools are changing how students access and engage with educational content.",
        content:
          "The education sector is experiencing a digital transformation as schools and universities adopt new technologies to enhance learning experiences.",
        url: "https://example.com/edtech",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Education Weekly", url: "https://educationweekly.com" },
      },
    ]

    console.log(`📰 [GNEWS SERVICE] Using ${fallbackArticles.length} fallback articles`)
    return fallbackArticles
  }
}

// Create singleton instance
const gnewsService = new GNewsService()

module.exports = gnewsService
