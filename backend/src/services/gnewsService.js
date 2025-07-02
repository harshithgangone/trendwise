const axios = require("axios")
const cheerio = require("cheerio")

class GNewsService {
  constructor() {
    this.apiKey = process.env.GNEWS_API_KEY
    this.baseURL = "https://gnews.io/api/v4"
    this.categories = ["technology", "business", "health", "science", "entertainment", "sports"]
    this.fallbackEnabled = true
    this.requestTimeout = 10000 // 10 seconds
    this.maxRetries = 2
    console.log("🔗 GNews Service initialized")

    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS] API key not found. Set GNEWS_API_KEY environment variable.")
    }
  }

  // Generate a proper slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim()
      .substring(0, 100)
  }

  // Extract tags from title and description
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

  // Calculate read time based on content length
  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.split(" ").length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
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

  extractKeywords(text) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3)

    const uniqueWords = [...new Set(words)]
    return uniqueWords.slice(0, 10).join(", ")
  }

  removeDuplicates(articles) {
    const seen = new Set()
    return articles.filter((article) => {
      const key = article.title.toLowerCase().replace(/[^\w]/g, "")
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  async getTrendingTopics(limit = 50) {
    console.log("🔍 [GNEWS SERVICE] Starting trending topics fetch...")
    console.log(`📊 [GNEWS SERVICE] Limit: ${limit}, API Key: ${this.apiKey ? "Present" : "Missing"}`)

    // Try GNews API first if API key is available
    if (this.apiKey) {
      try {
        console.log("🌐 [GNEWS SERVICE] Attempting GNews API request...")
        const result = await this.fetchFromGNewsAPI(limit)
        if (result.success) {
          console.log(`✅ [GNEWS SERVICE] Successfully fetched ${result.trends.length} articles from GNews API`)
          return result
        }
      } catch (error) {
        console.error("❌ [GNEWS SERVICE] GNews API failed:", error.message)
      }
    }

    // Fallback to web scraping
    console.log("🔄 [GNEWS SERVICE] Falling back to web scraping...")
    return await this.scrapeGoogleNews(limit)
  }

  async fetchFromGNewsAPI(limit = 50) {
    try {
      console.log("📡 [GNEWS SERVICE] Making API request to GNews...")

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params: {
          apikey: this.apiKey,
          lang: "en",
          country: "us",
          max: limit, // Get all available articles up to limit
        },
        timeout: this.requestTimeout,
        headers: {
          "User-Agent": "TrendWise-Bot/1.0",
        },
      })

      console.log(`📈 [GNEWS SERVICE] API Response Status: ${response.status}`)
      console.log(`📊 [GNEWS SERVICE] Articles received: ${response.data.articles?.length || 0}`)

      if (response.data && response.data.articles) {
        const processedArticles = response.data.articles.map((article, index) => {
          console.log(`🔄 [GNEWS SERVICE] Processing article ${index + 1}: "${article.title?.substring(0, 50)}..."`)
          console.log(`🖼️ [GNEWS SERVICE] Image URL: ${article.image || "No image"}`)

          return {
            title: article.title || "Untitled Article",
            description: article.description || "No description available",
            url: article.url,
            publishedAt: article.publishedAt || new Date().toISOString(),
            source: article.source?.name || "GNews",
            image: article.image, // Use the actual image URL from GNews API
            category: this.categorizeArticle(article.title + " " + (article.description || "")),
            tags: this.extractTags(article.title + " " + (article.description || "")),
            score: this.calculateTrendScore(article),
          }
        })

        console.log(`✅ [GNEWS SERVICE] Successfully processed ${processedArticles.length} articles from API`)
        return {
          success: true,
          trends: processedArticles,
          source: "gnews_api",
          timestamp: new Date().toISOString(),
        }
      }

      throw new Error("No articles found in API response")
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] API request failed:", error.message)
      if (error.response) {
        console.error("📊 [GNEWS SERVICE] API Error Status:", error.response.status)
        console.error("📊 [GNEWS SERVICE] API Error Data:", error.response.data)
      }
      throw error
    }
  }

  async scrapeGoogleNews(limit = 50) {
    console.log("🕷️ [GNEWS SERVICE] Starting Google News scraping...")

    try {
      const searchQueries = [
        "technology trends",
        "artificial intelligence news",
        "startup funding",
        "tech innovation",
        "digital transformation",
        "business news",
        "health technology",
        "science breakthrough",
        "climate change",
        "renewable energy",
      ]

      const allArticles = []

      for (let i = 0; i < searchQueries.length && allArticles.length < limit; i++) {
        const query = searchQueries[i]
        console.log(`🔍 [GNEWS SERVICE] Scraping query ${i + 1}/${searchQueries.length}: "${query}"`)

        try {
          const articlesPerQuery = Math.ceil(limit / searchQueries.length)
          const articles = await this.scrapeGoogleNewsQuery(query, articlesPerQuery)
          allArticles.push(...articles)
          console.log(`📊 [GNEWS SERVICE] Found ${articles.length} articles for "${query}"`)

          // Add delay between requests to avoid rate limiting
          if (i < searchQueries.length - 1) {
            console.log("⏳ [GNEWS SERVICE] Waiting 2 seconds before next query...")
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        } catch (queryError) {
          console.error(`❌ [GNEWS SERVICE] Failed to scrape "${query}":`, queryError.message)
        }
      }

      const uniqueArticles = this.removeDuplicates(allArticles).slice(0, limit)

      console.log(`✅ [GNEWS SERVICE] Scraping completed. Found ${uniqueArticles.length} unique articles`)

      return {
        success: true,
        trends: uniqueArticles,
        source: "google_news_scraping",
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Scraping failed:", error.message)
      return this.getFallbackArticles(limit)
    }
  }

  async scrapeGoogleNewsQuery(query, limit = 10) {
    try {
      const encodedQuery = encodeURIComponent(query)
      const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`

      console.log(`🌐 [GNEWS SERVICE] Fetching RSS feed: ${url}`)

      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      console.log(`📡 [GNEWS SERVICE] RSS Response Status: ${response.status}`)

      const $ = cheerio.load(response.data, { xmlMode: true })
      const articles = []

      $("item").each((index, element) => {
        if (index >= limit) return false

        const $item = $(element)
        const title = $item.find("title").text().trim()
        const link = $item.find("link").text().trim()
        const description = $item.find("description").text().trim()
        const pubDate = $item.find("pubDate").text().trim()
        const source = $item.find("source").text().trim()

        if (title && link) {
          console.log(`📰 [GNEWS SERVICE] Parsed article ${index + 1}: "${title.substring(0, 50)}..."`)

          articles.push({
            title: this.cleanTitle(title),
            description: this.cleanDescription(description),
            url: link,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: source || "Google News",
            image: null, // RSS doesn't provide images
            category: this.categorizeArticle(title + " " + description),
            tags: this.extractTags(title + " " + description),
            score: this.calculateTrendScore({ title, description, publishedAt: pubDate }),
          })
        }
      })

      console.log(`✅ [GNEWS SERVICE] Successfully parsed ${articles.length} articles from RSS`)
      return articles
    } catch (error) {
      console.error(`❌ [GNEWS SERVICE] RSS scraping failed for "${query}":`, error.message)
      return []
    }
  }

  getFallbackArticles(limit = 50) {
    console.log("🎭 [GNEWS SERVICE] Using fallback articles...")

    const fallbackArticles = [
      {
        title: "AI Revolution: How Machine Learning is Transforming Industries",
        description:
          "Artificial Intelligence continues to reshape various sectors, from healthcare to finance, creating new opportunities and challenges.",
        category: "Technology",
        tags: ["AI", "Machine Learning", "Technology", "Innovation"],
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
      },
      {
        title: "Sustainable Tech: Green Innovation Leading the Future",
        description:
          "Environmental technology solutions are gaining momentum as companies prioritize sustainability and carbon neutrality.",
        category: "Environment",
        tags: ["Sustainability", "Green Tech", "Environment", "Innovation"],
        image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=400&fit=crop",
      },
      {
        title: "Cybersecurity Trends: Protecting Digital Assets in 2024",
        description:
          "As cyber threats evolve, organizations are adopting advanced security measures to protect sensitive data and systems.",
        category: "Security",
        tags: ["Cybersecurity", "Data Protection", "Technology", "Security"],
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=400&fit=crop",
      },
      {
        title: "Remote Work Evolution: The Future of Digital Collaboration",
        description:
          "Remote work technologies continue to evolve, enabling better collaboration and productivity across distributed teams.",
        category: "Business",
        tags: ["Remote Work", "Collaboration", "Technology", "Business"],
        image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop",
      },
      {
        title: "Blockchain Beyond Crypto: Real-World Applications",
        description:
          "Blockchain technology finds new applications in supply chain, healthcare, and digital identity management.",
        category: "Technology",
        tags: ["Blockchain", "Technology", "Innovation", "Digital"],
        image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
      },
      {
        title: "Healthcare Innovation: Digital Health Solutions",
        description: "Digital health platforms are revolutionizing patient care and medical research worldwide.",
        category: "Health",
        tags: ["Healthcare", "Digital Health", "Innovation", "Medicine"],
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop",
      },
      {
        title: "Space Technology: Commercial Space Race Heats Up",
        description: "Private companies are driving innovation in space exploration and satellite technology.",
        category: "Science",
        tags: ["Space", "Technology", "Innovation", "Science"],
        image: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=400&fit=crop",
      },
      {
        title: "Electric Vehicle Market: Charging Towards the Future",
        description: "EV adoption accelerates as charging infrastructure expands and battery technology improves.",
        category: "Technology",
        tags: ["Electric Vehicles", "Technology", "Environment", "Innovation"],
        image: "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=800&h=400&fit=crop",
      },
    ]

    // Repeat articles to reach the limit
    const repeatedArticles = []
    while (repeatedArticles.length < limit) {
      const remaining = limit - repeatedArticles.length
      const articlesToAdd = fallbackArticles.slice(0, Math.min(remaining, fallbackArticles.length))
      repeatedArticles.push(...articlesToAdd)
    }

    const processedArticles = repeatedArticles.map((article, index) => ({
      ...article,
      url: `https://example.com/article-${index + 1}`,
      publishedAt: new Date(Date.now() - index * 3600000).toISOString(),
      source: "TrendWise Fallback",
      score: Math.floor(Math.random() * 50) + 50,
    }))

    console.log(`🎭 [GNEWS SERVICE] Generated ${processedArticles.length} fallback articles`)

    return {
      success: false,
      trends: processedArticles,
      source: "fallback_articles",
      timestamp: new Date().toISOString(),
      reason: "Using fallback articles due to API/scraping limitations",
    }
  }

  // Utility methods
  cleanTitle(title) {
    // Remove source attribution that often appears in Google News titles
    return title.replace(/ - [^-]+$/, "").trim()
  }

  cleanDescription(description) {
    // Remove HTML tags and clean up description
    return description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim()
      .substring(0, 300)
  }

  calculateTrendScore(article) {
    let score = 50 // Base score

    // Recent articles get higher scores
    const publishedDate = new Date(article.publishedAt || Date.now())
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 1) score += 30
    else if (hoursAgo < 6) score += 20
    else if (hoursAgo < 24) score += 10

    // Articles with images get bonus
    if (article.image) score += 10

    // Longer descriptions get bonus
    if (article.description && article.description.length > 100) score += 5

    return Math.min(100, score)
  }

  async testConnection() {
    console.log("🔧 [GNEWS SERVICE] Testing connection...")

    try {
      if (this.apiKey) {
        console.log("🔑 [GNEWS SERVICE] Testing GNews API...")
        const response = await axios.get(`${this.baseURL}/top-headlines`, {
          params: {
            apikey: this.apiKey,
            lang: "en",
            max: 1,
          },
          timeout: 5000,
        })

        console.log("✅ [GNEWS SERVICE] GNews API connection successful")
        return { api: true, scraping: true }
      } else {
        console.log("⚠️ [GNEWS SERVICE] No API key, testing scraping only...")

        const response = await axios.get("https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", {
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; TrendWise-Bot/1.0)",
          },
        })

        console.log("✅ [GNEWS SERVICE] Google News RSS connection successful")
        return { api: false, scraping: true }
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Connection test failed:", error.message)
      return { api: false, scraping: false, error: error.message }
    }
  }

  async getTopHeadlines(options = {}) {
    if (!this.apiKey) {
      console.error("❌ [GNEWS] API key not configured")
      return { articles: [] }
    }

    try {
      const {
        category = "general",
        country = "us",
        lang = "en",
        max = 50, // Increased from 3 to get more articles
        q = null,
      } = options

      console.log(`📰 [GNEWS] Fetching news - Category: ${category}, Max: ${max}`)

      const params = {
        apikey: this.apiKey,
        category,
        country,
        lang,
        max,
        sortby: "publishedAt",
      }

      if (q) {
        params.q = q
        delete params.category // Remove category when searching
      }

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params,
        timeout: 30000,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS] Successfully fetched ${response.data.articles.length} articles`)

        // Log image availability
        const articlesWithImages = response.data.articles.filter((article) => article.image)
        console.log(`🖼️ [GNEWS] ${articlesWithImages.length}/${response.data.articles.length} articles have images`)

        return {
          articles: response.data.articles.map((article) => ({
            ...article,
            // Ensure image URL is properly formatted
            image: article.image || null,
            // Add source information
            source: article.source || { name: "Unknown", url: "" },
          })),
          totalArticles: response.data.totalArticles || response.data.articles.length,
        }
      }

      console.warn("⚠️ [GNEWS] No articles in response")
      return { articles: [] }
    } catch (error) {
      console.error("❌ [GNEWS] Error fetching news:", error.message)

      if (error.response) {
        console.error("❌ [GNEWS] API Error:", error.response.status, error.response.data)
      }

      return { articles: [] }
    }
  }

  async searchNews(query, options = {}) {
    return this.getTopHeadlines({
      ...options,
      q: query,
      max: options.max || 20,
    })
  }

  async getNewsByCategory(category, options = {}) {
    const validCategories = [
      "general",
      "world",
      "nation",
      "business",
      "technology",
      "entertainment",
      "sports",
      "science",
      "health",
    ]

    if (!validCategories.includes(category)) {
      console.warn(`⚠️ [GNEWS] Invalid category: ${category}. Using 'general'`)
      category = "general"
    }

    return this.getTopHeadlines({
      ...options,
      category,
      max: options.max || 30,
    })
  }

  // Get diverse news from multiple categories
  async getDiverseNews(options = {}) {
    const categories = ["general", "technology", "business", "health", "science", "entertainment"]
    const articlesPerCategory = Math.ceil((options.max || 50) / categories.length)

    console.log(`🌐 [GNEWS] Fetching diverse news from ${categories.length} categories`)

    try {
      const promises = categories.map((category) =>
        this.getNewsByCategory(category, {
          ...options,
          max: articlesPerCategory,
        }),
      )

      const results = await Promise.allSettled(promises)
      const allArticles = []

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.articles) {
          console.log(`✅ [GNEWS] ${categories[index]}: ${result.value.articles.length} articles`)
          allArticles.push(...result.value.articles)
        } else {
          console.warn(`⚠️ [GNEWS] Failed to fetch ${categories[index]} news`)
        }
      })

      // Remove duplicates based on URL
      const uniqueArticles = allArticles.filter(
        (article, index, self) => index === self.findIndex((a) => a.url === article.url),
      )

      console.log(`🎯 [GNEWS] Total unique articles: ${uniqueArticles.length}`)

      return {
        articles: uniqueArticles.slice(0, options.max || 50),
        totalArticles: uniqueArticles.length,
      }
    } catch (error) {
      console.error("❌ [GNEWS] Error fetching diverse news:", error.message)
      return { articles: [] }
    }
  }
}

module.exports = new GNewsService()
