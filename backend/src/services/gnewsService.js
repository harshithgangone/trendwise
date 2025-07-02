const axios = require("axios")
const cheerio = require("cheerio")
const fetch = require("node-fetch")

const GNEWS_API_KEY = process.env.GNEWS_API_KEY

class GNewsService {
  constructor() {
    this.apiKey = GNEWS_API_KEY
    this.baseURL = "https://gnews.io/api/v4"
    this.requestTimeout = 10000
    console.log("🔗 [GNEWS] Service initialized")
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 100)
  }

  extractTags(text) {
    const commonTags = [
      "Technology",
      "AI",
      "Innovation",
      "Business",
      "Startup",
      "Digital",
      "Science",
      "Health",
      "Environment",
      "Finance",
      "Security",
      "Mobile",
      "Cloud",
      "Data",
      "Analytics",
      "Blockchain",
      "IoT",
      "Automation",
    ]

    const foundTags = commonTags.filter((tag) => text.toLowerCase().includes(tag.toLowerCase()))

    return foundTags.length > 0 ? foundTags.slice(0, 5) : ["Technology", "News"]
  }

  categorizeArticle(text) {
    const categories = {
      Technology: ["tech", "ai", "software", "digital", "innovation", "startup"],
      Business: ["business", "finance", "economy", "market", "investment"],
      Health: ["health", "medical", "healthcare", "medicine", "wellness"],
      Science: ["science", "research", "study", "discovery", "breakthrough"],
      Environment: ["environment", "climate", "green", "sustainable", "energy"],
    }

    const lowerText = text.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        return category
      }
    }

    return "General"
  }

  async getTopHeadlines(category = "general", lang = "en", country = "us", max = 10) {
    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockHeadlines()
    }

    try {
      console.log(`📰 [GNEWS] Fetching ${category} headlines...`)

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params: {
          category,
          lang,
          country,
          max,
          apikey: this.apiKey,
        },
        timeout: this.requestTimeout,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS] Found ${response.data.articles.length} articles`)
        return response.data.articles
      }

      throw new Error("Invalid response structure from GNews API")
    } catch (error) {
      console.error(`❌ [GNEWS] Error:`, error.message)
      return this.getMockHeadlines()
    }
  }

  async searchNews(query, lang = "en", country = "us", limit = 10) {
    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockSearchResults(query)
    }

    try {
      console.log(`🔍 [GNEWS] Searching for "${query}"...`)

      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          q: query,
          lang,
          country,
          max: limit,
          apikey: this.apiKey,
          sortby: "relevance",
        },
        timeout: this.requestTimeout,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS] Found ${response.data.articles.length} articles`)
        return response.data.articles
      }

      return []
    } catch (error) {
      console.error(`❌ [GNEWS] Search failed:`, error.message)
      return this.getMockSearchResults(query)
    }
  }

  getMockHeadlines() {
    return [
      {
        title: "AI Technology Reaches New Milestone",
        description: "Breakthrough in artificial intelligence promises to revolutionize multiple industries.",
        url: "https://example.com/ai-breakthrough",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Tech News" },
      },
      {
        title: "Climate Change Solutions Show Promise",
        description: "New environmental technologies demonstrate significant potential for carbon reduction.",
        url: "https://example.com/climate-solutions",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Environmental Times" },
      },
      {
        title: "Remote Work Trends Continue to Evolve",
        description: "Companies adapt to new workplace models as remote work becomes mainstream.",
        url: "https://example.com/remote-work",
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "Business Weekly" },
      },
    ]
  }

  getMockSearchResults(query) {
    return [
      {
        title: `Latest Developments in ${query}`,
        description: `Comprehensive coverage of recent ${query} news and trends.`,
        url: `https://example.com/${query.toLowerCase().replace(/\s+/g, "-")}`,
        image: "/placeholder.svg?height=400&width=600",
        publishedAt: new Date().toISOString(),
        source: { name: "News Source" },
      },
    ]
  }

  getStatus() {
    return {
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseURL,
    }
  }
}

module.exports = new GNewsService()
