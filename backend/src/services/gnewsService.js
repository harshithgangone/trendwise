const axios = require("axios")
const cheerio = require("cheerio")
const fetch = require("node-fetch")

const GNEWS_API_KEY = process.env.GNEWS_API_KEY

class GNewsService {
  constructor() {
    this.apiKey = GNEWS_API_KEY
    this.baseURL = "https://gnews.io/api/v4"
    this.categories = ["technology", "business", "health", "science", "entertainment", "sports"]
    this.fallbackEnabled = true
    this.requestTimeout = 10000 // 10 seconds
    this.maxRetries = 2
    this.baseUrl = "https://gnews.io/api/v4"
    console.log("🔗 GNews Service initialized")
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

  async getTopHeadlines(category = "general", lang = "en", country = "us", max = 10) {
    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockHeadlines()
    }

    try {
      console.log(`📰 GNews: Connecting to API for ${category} headlines...`)

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
        console.log(`✅ GNews: Successfully connected! Found ${response.data.articles.length} articles`)

        const processedArticles = response.data.articles.map((article) => ({
          query: article.title,
          searchVolume: this.estimateSearchVolume(article),
          relatedTopics: this.extractTopics(article.title, article.description),
          articles: [
            {
              title: article.title,
              url: article.url,
              source: article.source.name,
              description: article.description,
              image: article.image,
              publishedAt: article.publishedAt,
            },
          ],
          geo: country.toUpperCase(),
          source: "gnews",
          category: category,
          originalArticle: article,
        }))

        console.log(`🎯 GNews: Processed ${processedArticles.length} articles for content generation`)
        return processedArticles
      }

      throw new Error("Invalid response structure from GNews API")
    } catch (error) {
      console.error(`❌ GNews: Connection failed -`, error.message)
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockHeadlines()
    }
  }

  async searchNews(query, lang = "en", country = "us", limit = 10) {
    if (!this.apiKey) {
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockSearchResults(query)
    }

    try {
      console.log(`🔍 GNews: Searching for "${query}"...`)

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
        console.log(`✅ GNews: Search successful! Found ${response.data.articles.length} articles`)
        return response.data.articles
      }

      return []
    } catch (error) {
      console.error(`❌ GNews: Search failed for "${query}":`, error.message)
      console.warn("⚠️ [GNEWS] API key not found, returning mock data")
      return this.getMockSearchResults(query)
    }
  }

  async getTrendingTopics(limit = 10) {
    console.log("🔍 [GNEWS SERVICE] Starting trending topics fetch...")
    console.log(`📊 [GNEWS SERVICE] Limit: ${limit}, API Key: ${this.apiKey ? "Present" : "Missing"}`)

    // Try GNews API first if API key is available
    if (this.apiKey) {
      try {
        console.log("🌐 [GNEWS SERVICE] Attempting GNews API request...")
        const result = await this.fetchFromGNewsAPI(limit)
        if (result.success) {
          console.log(`✅ [GNEWS SERVICE] Successfully fetched ${result.articles.length} articles from GNews API`)
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

  async fetchFromGNewsAPI(limit = 10) {
    try {
      console.log("📡 [GNEWS SERVICE] Making API request to GNews...")

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params: {
          token: this.apiKey,
          lang: "en",
          country: "us",
          max: limit,
          in: "title,description",
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
            slug: this.generateSlug(article.title || `article-${Date.now()}-${index}`),
            excerpt: article.description || "No description available",
            content: this.generateInitialContent(article),
            url: article.url,
            publishedAt: article.publishedAt || new Date().toISOString(),
            source: {
              name: article.source?.name || "Unknown Source",
              url: article.source?.url || "",
            },
            media: {
              images: article.image ? [{ url: article.image, alt: article.title }] : [],
              videos: [],
              tweets: [],
            },
            tags: this.extractTags(article.title + " " + (article.description || "")),
            category: this.categorizeArticle(article.title + " " + (article.description || "")),
            seo: {
              metaTitle: article.title?.substring(0, 60) || "Trending News",
              metaDescription: article.description?.substring(0, 160) || "Latest trending news and updates",
              keywords: this.extractKeywords(article.title + " " + (article.description || "")),
            },
          }
        })

        console.log(`✅ [GNEWS SERVICE] Successfully processed ${processedArticles.length} articles from API`)
        return {
          success: true,
          articles: processedArticles,
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

  async scrapeGoogleNews(limit = 10) {
    console.log("🕷️ [GNEWS SERVICE] Starting Google News scraping...")

    try {
      const searchQueries = [
        "technology trends",
        "artificial intelligence news",
        "startup funding",
        "tech innovation",
        "digital transformation",
      ]

      const allArticles = []

      for (let i = 0; i < searchQueries.length && allArticles.length < limit; i++) {
        const query = searchQueries[i]
        console.log(`🔍 [GNEWS SERVICE] Scraping query ${i + 1}/${searchQueries.length}: "${query}"`)

        try {
          const articles = await this.scrapeGoogleNewsQuery(query, Math.ceil(limit / searchQueries.length))
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
        articles: uniqueArticles,
        source: "google_news_scraping",
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("❌ [GNEWS SERVICE] Scraping failed:", error.message)
      return this.getFallbackArticles(limit)
    }
  }

  async scrapeGoogleNewsQuery(query, limit = 5) {
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
      console.log(`📊 [GNEWS SERVICE] RSS Content Length: ${response.data.length}`)

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
            slug: this.generateSlug(title),
            excerpt: this.cleanDescription(description),
            content: this.generateInitialContent({ title, description }),
            url: link,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: {
              name: source || "Google News",
              url: link,
            },
            media: {
              images: [],
              videos: [],
              tweets: [],
            },
            tags: this.extractTags(title + " " + description),
            category: this.categorizeArticle(title + " " + description),
            seo: {
              metaTitle: title.substring(0, 60),
              metaDescription: description.substring(0, 160),
              keywords: this.extractKeywords(title + " " + description),
            },
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
        excerpt:
          "Artificial Intelligence continues to reshape various sectors, from healthcare to finance, creating new opportunities and challenges.",
        category: "Technology",
        tags: ["AI", "Machine Learning", "Technology", "Innovation"],
      },
      {
        title: "Sustainable Tech: Green Innovation Leading the Future",
        excerpt:
          "Environmental technology solutions are gaining momentum as companies prioritize sustainability and carbon neutrality.",
        category: "Environment",
        tags: ["Sustainability", "Green Tech", "Environment", "Innovation"],
      },
      {
        title: "Cybersecurity Trends: Protecting Digital Assets in 2024",
        excerpt:
          "As cyber threats evolve, organizations are adopting advanced security measures to protect sensitive data and systems.",
        category: "Security",
        tags: ["Cybersecurity", "Data Protection", "Technology", "Security"],
      },
      {
        title: "Remote Work Evolution: The Future of Digital Collaboration",
        excerpt:
          "Remote work technologies continue to evolve, enabling better collaboration and productivity across distributed teams.",
        category: "Business",
        tags: ["Remote Work", "Collaboration", "Technology", "Business"],
      },
      {
        title: "Blockchain Beyond Crypto: Real-World Applications",
        excerpt:
          "Blockchain technology finds new applications in supply chain, healthcare, and digital identity management.",
        category: "Technology",
        tags: ["Blockchain", "Technology", "Innovation", "Digital"],
      },
    ]

    const processedArticles = fallbackArticles.slice(0, limit).map((article, index) => ({
      ...article,
      slug: this.generateSlug(article.title),
      content: this.generateInitialContent(article),
      url: `https://example.com/article-${index + 1}`,
      publishedAt: new Date(Date.now() - index * 3600000).toISOString(),
      source: {
        name: "TrendWise Fallback",
        url: "https://trendwise.com",
      },
      media: {
        images: [
          {
            url: `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(article.title)}`,
            alt: article.title,
          },
        ],
        videos: [],
        tweets: [],
      },
      seo: {
        metaTitle: article.title.substring(0, 60),
        metaDescription: article.excerpt.substring(0, 160),
        keywords: article.tags.join(", "),
      },
    }))

    console.log(`🎭 [GNEWS SERVICE] Generated ${processedArticles.length} fallback articles`)

    return {
      success: false,
      articles: processedArticles,
      source: "fallback_articles",
      timestamp: new Date().toISOString(),
      reason: "Using fallback articles due to API/scraping limitations",
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

  generateInitialContent(article) {
    const title = article.title || "Untitled Article"
    const description = article.excerpt || article.description || "No description available"

    return `# ${title}

${description}

This article covers the latest developments and insights on this trending topic. Stay tuned for more detailed analysis and updates.

## Key Points

- Breaking news and latest updates
- Industry impact and analysis  
- Expert opinions and insights
- Future implications and trends

*This content will be enhanced with AI-generated analysis and additional research.*`
  }

  estimateSearchVolume(article) {
    const publishedDate = new Date(article.publishedAt)
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)

    // More recent articles get higher estimated search volume
    if (hoursAgo < 1) return "10K-100K"
    if (hoursAgo < 6) return "5K-50K"
    if (hoursAgo < 24) return "1K-10K"
    return "500-5K"
  }

  extractTopics(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const commonTopics = [
      "artificial intelligence",
      "ai",
      "machine learning",
      "technology",
      "innovation",
      "climate change",
      "sustainability",
      "renewable energy",
      "electric vehicles",
      "cryptocurrency",
      "bitcoin",
      "blockchain",
      "finance",
      "economy",
      "health",
      "medicine",
      "covid",
      "vaccine",
      "research",
      "space",
      "nasa",
      "spacex",
      "mars",
      "satellite",
      "politics",
      "government",
      "election",
      "policy",
      "business",
      "startup",
      "investment",
      "market",
      "entertainment",
      "movie",
      "music",
      "celebrity",
      "sports",
      "football",
      "basketball",
      "olympics",
    ]

    const foundTopics = commonTopics.filter((topic) => text.includes(topic)).slice(0, 5)

    return foundTopics.length > 0 ? foundTopics : ["trending", "news", "current events"]
  }

  async testConnection() {
    console.log("🔧 [GNEWS SERVICE] Testing connection...")

    try {
      if (this.apiKey) {
        console.log("🔑 [GNEWS SERVICE] Testing GNews API...")
        const response = await axios.get(`${this.baseURL}/top-headlines`, {
          params: {
            token: this.apiKey,
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
}

const fetchNews = async (query, lang = "en", max = 10) => {
  if (!GNEWS_API_KEY) {
    console.warn("⚠️ [GNEWS] GNEWS_API_KEY is not set. Skipping real news fetch.")
    return []
  }

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&max=${max}&token=${GNEWS_API_KEY}`

  try {
    console.log(`🔍 [GNEWS] Fetching news for query: "${query}"`)
    const response = await fetch(url)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GNews API responded with status ${response.status}: ${errorText}`)
    }
    const data = await response.json()
    console.log(`✅ [GNEWS] Fetched ${data.articles.length} articles for query: "${query}"`)
    return data.articles
  } catch (error) {
    console.error("❌ [GNEWS] Error fetching news:", error.message)
    return []
  }
}

module.exports = new GNewsService()
