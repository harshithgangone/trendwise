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

  async getTrendingNews(limit = 50) {
    console.log("🔍 [GNEWS SERVICE] Starting trending news fetch...")
    console.log(`📊 [GNEWS SERVICE] Limit: ${limit}, API Key: ${this.apiKey ? "Present" : "Missing"}`)

    // Try GNews API first if API key is available
    if (this.apiKey) {
      try {
        console.log("🌐 [GNEWS SERVICE] Attempting GNews API request...")
        const result = await this.fetchFromGNewsAPI(limit)
        if (result && result.length > 0) {
          console.log(`✅ [GNEWS SERVICE] Successfully fetched ${result.length} articles from GNews API`)
          return result
        }
      } catch (error) {
        console.error("❌ [GNEWS SERVICE] GNews API failed:", error.message)
      }
    }

    // Fallback to web scraping
    console.log("🔄 [GNEWS SERVICE] Falling back to web scraping...")
    const scrapedResult = await this.scrapeGoogleNews(limit)
    if (scrapedResult && scrapedResult.length > 0) {
      return scrapedResult
    }

    // Final fallback to hardcoded articles
    console.log("🎭 [GNEWS SERVICE] Using fallback articles...")
    return this.getFallbackArticles(limit)
  }

  async fetchFromGNewsAPI(limit = 50) {
    try {
      console.log("📡 [GNEWS SERVICE] Making API request to GNews...")

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params: {
          apikey: this.apiKey,
          lang: "en",
          country: "us",
          max: limit,
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

          return {
            title: article.title || "Untitled Article",
            description: article.description || "No description available",
            content: article.content || article.description || "No content available",
            url: article.url,
            urlToImage: article.image,
            publishedAt: article.publishedAt || new Date().toISOString(),
            source: {
              name: article.source?.name || "GNews",
              url: article.source?.url || "",
            },
            category: this.categorizeArticle(article.title + " " + (article.description || "")),
            tags: this.extractTags(article.title + " " + (article.description || "")),
            score: this.calculateTrendScore(article),
          }
        })

        console.log(`✅ [GNEWS SERVICE] Successfully processed ${processedArticles.length} articles from API`)
        return processedArticles
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
      return uniqueArticles
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Scraping failed:", error.message)
      return []
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
            content: this.cleanDescription(description),
            url: link,
            urlToImage: null,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: {
              name: source || "Google News",
              url: "",
            },
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

  getFallbackArticles(limit = 10) {
    console.log("🎭 [GNEWS SERVICE] Using fallback articles...")

    const fallbackArticles = [
      {
        title: "AI Revolution: How Machine Learning is Transforming Industries",
        description:
          "Artificial Intelligence continues to reshape various sectors, from healthcare to finance, creating new opportunities and challenges for businesses worldwide.",
        content:
          "Artificial Intelligence continues to reshape various sectors, from healthcare to finance, creating new opportunities and challenges for businesses worldwide. Machine learning algorithms are now being deployed across industries to automate processes, improve decision-making, and enhance customer experiences.",
        url: "https://example.com/ai-revolution",
        urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
        publishedAt: new Date().toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Technology",
        tags: ["AI", "Technology", "Innovation", "Business"],
        score: 95,
      },
      {
        title: "Sustainable Technology: Green Innovation Leading the Future",
        description:
          "Environmental technology solutions are gaining momentum as companies prioritize sustainability and carbon neutrality in their operations.",
        content:
          "Environmental technology solutions are gaining momentum as companies prioritize sustainability and carbon neutrality in their operations. From renewable energy systems to carbon capture technologies, green innovation is becoming a key driver of economic growth.",
        url: "https://example.com/sustainable-tech",
        urlToImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 3600000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Environment",
        tags: ["Sustainability", "Green Tech", "Environment", "Innovation"],
        score: 88,
      },
      {
        title: "Cybersecurity Trends: Protecting Digital Assets in 2024",
        description:
          "As cyber threats evolve, organizations are adopting advanced security measures to protect sensitive data and systems from malicious attacks.",
        content:
          "As cyber threats evolve, organizations are adopting advanced security measures to protect sensitive data and systems from malicious attacks. Zero-trust architecture, AI-powered threat detection, and quantum-resistant encryption are becoming essential components of modern cybersecurity strategies.",
        url: "https://example.com/cybersecurity-trends",
        urlToImage: "https://images.unsplash.com/photo-1550751827485-074b7f938ba0?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 7200000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Technology",
        tags: ["Cybersecurity", "Data Protection", "Technology", "Security"],
        score: 92,
      },
      {
        title: "Remote Work Evolution: The Future of Digital Collaboration",
        description:
          "Remote work technologies continue to evolve, enabling better collaboration and productivity across distributed teams worldwide.",
        content:
          "Remote work technologies continue to evolve, enabling better collaboration and productivity across distributed teams worldwide. Virtual reality meetings, AI-powered productivity tools, and advanced project management platforms are reshaping how we work.",
        url: "https://example.com/remote-work-evolution",
        urlToImage: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 10800000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Business",
        tags: ["Remote Work", "Collaboration", "Technology", "Business"],
        score: 85,
      },
      {
        title: "Blockchain Beyond Cryptocurrency: Real-World Applications",
        description:
          "Blockchain technology finds new applications in supply chain management, healthcare, and digital identity verification systems.",
        content:
          "Blockchain technology finds new applications in supply chain management, healthcare, and digital identity verification systems. Smart contracts, decentralized finance, and NFTs are just the beginning of blockchain's potential impact on various industries.",
        url: "https://example.com/blockchain-applications",
        urlToImage: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 14400000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Technology",
        tags: ["Blockchain", "Technology", "Innovation", "Digital"],
        score: 78,
      },
      {
        title: "Healthcare Innovation: Digital Health Solutions Transform Patient Care",
        description:
          "Digital health platforms are revolutionizing patient care and medical research, improving outcomes and accessibility worldwide.",
        content:
          "Digital health platforms are revolutionizing patient care and medical research, improving outcomes and accessibility worldwide. Telemedicine, AI diagnostics, and wearable health monitors are making healthcare more personalized and accessible than ever before.",
        url: "https://example.com/healthcare-innovation",
        urlToImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 18000000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Health",
        tags: ["Healthcare", "Digital Health", "Innovation", "Medicine"],
        score: 90,
      },
      {
        title: "Space Technology: Commercial Space Race Accelerates Innovation",
        description:
          "Private companies are driving unprecedented innovation in space exploration and satellite technology, opening new frontiers.",
        content:
          "Private companies are driving unprecedented innovation in space exploration and satellite technology, opening new frontiers. Reusable rockets, satellite constellations, and space tourism are making space more accessible and commercially viable.",
        url: "https://example.com/space-technology",
        urlToImage: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 21600000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Science",
        tags: ["Space", "Technology", "Innovation", "Science"],
        score: 87,
      },
      {
        title: "Electric Vehicle Revolution: Charging Towards a Sustainable Future",
        description:
          "Electric vehicle adoption accelerates as charging infrastructure expands and battery technology continues to improve rapidly.",
        content:
          "Electric vehicle adoption accelerates as charging infrastructure expands and battery technology continues to improve rapidly. Solid-state batteries, wireless charging, and autonomous driving features are making EVs more attractive to consumers worldwide.",
        url: "https://example.com/electric-vehicles",
        urlToImage: "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?w=800&h=400&fit=crop",
        publishedAt: new Date(Date.now() - 25200000).toISOString(),
        source: { name: "TrendWise Fallback", url: "" },
        category: "Technology",
        tags: ["Electric Vehicles", "Technology", "Environment", "Innovation"],
        score: 83,
      },
    ]

    // Return the requested number of articles
    const articles = fallbackArticles.slice(0, limit)
    console.log(`🎭 [GNEWS SERVICE] Generated ${articles.length} fallback articles`)
    return articles
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
    if (article.image || article.urlToImage) score += 10

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
      const { category = "general", country = "us", lang = "en", max = 50, q = null } = options

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
        delete params.category
      }

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params,
        timeout: 30000,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS] Successfully fetched ${response.data.articles.length} articles`)

        return {
          articles: response.data.articles.map((article) => ({
            ...article,
            image: article.image || null,
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

  async getDiverseNews(options = {}) {
    const categories = ["general", "technology", "business", "health", "science", "sports"]
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

  async fetchTrendingNews() {
    try {
      console.log("📰 [GNEWS] Fetching trending news...")

      if (!this.apiKey) {
        console.log("⚠️ [GNEWS] No API key, using fallback articles")
        return this.getFallbackArticles(50)
      }

      const categories = ["general", "business", "technology", "health", "science", "sports"]
      const allArticles = []

      for (const category of categories) {
        try {
          console.log(`📊 [GNEWS] Fetching ${category} news...`)

          const response = await axios.get(`${this.baseURL}/top-headlines`, {
            params: {
              apikey: this.apiKey,
              lang: "en",
              country: "us",
              category: category,
              max: 10,
              nullable: "image,content",
            },
            timeout: 10000,
          })

          if (response.data && response.data.articles) {
            const validArticles = response.data.articles
              .filter(
                (article) =>
                  article.title && article.description && article.title.length > 10 && article.description.length > 50,
              )
              .map((article) => ({
                title: article.title,
                description: article.description,
                content: article.content || article.description,
                url: article.url,
                urlToImage: article.image && article.image.startsWith("http") ? article.image : null,
                publishedAt: article.publishedAt,
                source: {
                  name: article.source?.name || "GNews",
                  url: article.source?.url || "",
                },
                category: category,
                tags: this.extractTags(article.title + " " + article.description),
                score: this.calculateTrendScore(article),
              }))

            allArticles.push(...validArticles)
            console.log(`✅ [GNEWS] Found ${validArticles.length} valid articles in ${category}`)
          }

          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (categoryError) {
          console.error(`❌ [GNEWS] Error fetching ${category} news:`, categoryError.message)
          continue
        }
      }

      if (allArticles.length === 0) {
        console.log("⚠️ [GNEWS] No articles from API, using fallback")
        return this.getFallbackArticles(50)
      }

      const uniqueArticles = this.removeDuplicates(allArticles)
      console.log(`🎉 [GNEWS] Successfully fetched ${uniqueArticles.length} unique articles`)

      return uniqueArticles
    } catch (error) {
      console.error("❌ [GNEWS] Error fetching news:", error.message)
      return this.getFallbackArticles(50)
    }
  }

  removeDuplicateArticles(articles) {
    const seen = new Set()
    const unique = []

    for (const article of articles) {
      const titleWords = article.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .sort()
        .slice(0, 5)
        .join(" ")

      if (!seen.has(titleWords)) {
        seen.add(titleWords)
        unique.push(article)
      }
    }

    return unique
  }
}

// Create singleton instance
const gnewsService = new GNewsService()

// Export the instance and specific functions
module.exports = gnewsService
module.exports.GNewsService = GNewsService

// Export specific functions for backward compatibility
async function fetchGNewsArticles(count = 10) {
  const apiKey = process.env.GNEWS_API_KEY

  if (!apiKey) {
    console.error("❌ GNews API key not found")
    return gnewsService.getFallbackArticles(count)
  }

  try {
    console.log(`📰 Fetching ${count} articles from GNews API...`)

    const queries = [
      "technology OR artificial intelligence OR AI",
      "business OR economy OR market",
      "science OR research OR innovation",
      "health OR medical OR healthcare",
      "climate OR environment OR sustainability",
    ]

    const allArticles = []
    const articlesPerQuery = Math.ceil(count / queries.length)

    for (const query of queries) {
      if (allArticles.length >= count) break

      try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${articlesPerQuery}&apikey=${apiKey}`

        console.log(`🔍 Searching GNews for: ${query}`)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "TrendWise/1.0",
          },
        })

        if (!response.ok) {
          console.error(`❌ GNews API error: ${response.status} ${response.statusText}`)
          continue
        }

        const data = await response.json()

        if (data.articles && Array.isArray(data.articles)) {
          const processedArticles = data.articles
            .filter(
              (article) =>
                article.title &&
                article.description &&
                article.url &&
                article.title.length > 10 &&
                article.description.length > 50,
            )
            .map((article) => ({
              title: article.title,
              description: article.description,
              content: article.content || article.description,
              url: article.url,
              urlToImage: article.image,
              publishedAt: article.publishedAt,
              source: {
                name: article.source?.name || "GNews",
                url: article.source?.url,
              },
            }))

          allArticles.push(...processedArticles)
          console.log(`✅ Found ${processedArticles.length} articles for query: ${query}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Error fetching articles for query "${query}":`, error.message)
        continue
      }
    }

    const uniqueArticles = allArticles
      .filter(
        (article, index, self) => index === self.findIndex((a) => a.title === article.title || a.url === article.url),
      )
      .slice(0, count)

    console.log(`✅ Successfully fetched ${uniqueArticles.length} unique articles from GNews`)
    return uniqueArticles
  } catch (error) {
    console.error("❌ GNews service error:", error)
    return gnewsService.getFallbackArticles(count)
  }
}

module.exports.fetchGNewsArticles = fetchGNewsArticles
