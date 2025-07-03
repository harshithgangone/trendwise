const axios = require("axios")
const cheerio = require("cheerio")
const GNewsService = require("./gnewsService")

class TrendCrawler {
  constructor() {
    this.sources = {
      gnews: GNewsService,
      googleTrends: this.scrapeGoogleTrends.bind(this),
      redditHot: this.scrapeRedditHot.bind(this),
      hackernews: this.scrapeHackerNews.bind(this),
    }
    console.log("🕷️ [TrendCrawler] Initialized with multiple sources")
  }

  async crawlTrends(limit = 10) {
    console.log(`🔍 [TrendCrawler] Starting trend crawling with limit: ${limit}`)

    try {
      // Try GNews first (most reliable)
      console.log("📡 [TrendCrawler] Fetching trends from GNews...")
      const gnewsResult = await GNewsService.getTrendingTopics(limit)

      if (gnewsResult.success && gnewsResult.trends && gnewsResult.trends.length > 0) {
        console.log(`✅ [TrendCrawler] Successfully got ${gnewsResult.trends.length} trends from GNews`)
        return {
          success: true,
          trends: gnewsResult.trends.map((trend) => ({
            ...trend,
            source: "gnews",
          })),
          source: "gnews_api",
          timestamp: new Date().toISOString(),
        }
      }

      console.log("⚠️ [TrendCrawler] GNews returned no valid trends, trying alternative sources...")
      throw new Error("GNews API returned no valid trends")
    } catch (error) {
      console.error("❌ [TrendCrawler] GNews crawling failed:", error.message)

      // Fallback to alternative sources
      return await this.scrapeAlternativeSources(limit)
    }
  }

  async scrapeAlternativeSources(limit = 10) {
    console.log(`🕷️ [TrendCrawler] Falling back to alternative sources for ${limit} articles`)

    const allTrends = []
    const sources = [
      { name: "hackernews", method: this.scrapeHackerNews, limit: Math.ceil(limit * 0.4) },
      { name: "reddit", method: this.scrapeRedditHot, limit: Math.ceil(limit * 0.3) },
      { name: "google-trends", method: this.scrapeGoogleTrends, limit: Math.ceil(limit * 0.3) },
    ]

    for (const source of sources) {
      try {
        console.log(`🔍 [TrendCrawler] Scraping ${source.name} for ${source.limit} articles...`)
        const trends = await source.method(source.limit)

        if (trends && trends.length > 0) {
          allTrends.push(
            ...trends.map((trend) => ({
              ...trend,
              source: source.name,
            })),
          )
          console.log(`✅ [TrendCrawler] Got ${trends.length} trends from ${source.name}`)
        }
      } catch (error) {
        console.error(`❌ [TrendCrawler] Failed to scrape ${source.name}:`, error.message)
      }

      // Add delay between sources
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    if (allTrends.length === 0) {
      console.log("⚠️ [TrendCrawler] No trends found from any source, using fallback")
      return {
        success: false,
        trends: this.getFallbackTrends(limit),
        source: "fallback",
        timestamp: new Date().toISOString(),
      }
    }

    // Remove duplicates and limit results
    const uniqueTrends = this.removeDuplicates(allTrends).slice(0, limit)

    console.log(`✅ [TrendCrawler] Successfully scraped ${uniqueTrends.length} unique trends`)
    return {
      success: true,
      trends: uniqueTrends,
      source: "alternative_scraping",
      timestamp: new Date().toISOString(),
    }
  }

  async scrapeHackerNews(limit = 5) {
    try {
      console.log(`📰 [TrendCrawler] Scraping Hacker News for ${limit} articles...`)

      const response = await axios.get("https://hacker-news.firebaseio.com/v0/topstories.json", {
        timeout: 10000,
        headers: {
          "User-Agent": "TrendWise-Bot/1.0",
        },
      })

      const topStoryIds = response.data.slice(0, limit * 2) // Get more IDs to filter
      const stories = []

      for (let i = 0; i < Math.min(topStoryIds.length, limit * 2); i++) {
        try {
          const storyResponse = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${topStoryIds[i]}.json`, {
            timeout: 5000,
          })

          const story = storyResponse.data
          if (story && story.title && story.url && !story.deleted) {
            stories.push({
              title: story.title,
              description: story.title, // HN doesn't have descriptions
              url: story.url,
              publishedAt: new Date(story.time * 1000).toISOString(),
              source: "Hacker News",
              image: null,
              category: this.categorizeByTitle(story.title),
              tags: this.extractTagsFromTitle(story.title),
              score: story.score || 0,
            })

            if (stories.length >= limit) break
          }
        } catch (storyError) {
          console.error(`❌ [TrendCrawler] Failed to fetch HN story ${topStoryIds[i]}:`, storyError.message)
        }

        // Small delay between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      console.log(`✅ [TrendCrawler] Scraped ${stories.length} stories from Hacker News`)
      return stories
    } catch (error) {
      console.error("❌ [TrendCrawler] Hacker News scraping failed:", error.message)
      return []
    }
  }

  async scrapeRedditHot(limit = 5) {
    try {
      console.log(`🔥 [TrendCrawler] Scraping Reddit hot posts for ${limit} articles...`)

      const subreddits = ["technology", "programming", "science", "business", "worldnews"]
      const posts = []

      for (const subreddit of subreddits) {
        try {
          const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`, {
            timeout: 10000,
            headers: {
              "User-Agent": "TrendWise-Bot/1.0",
            },
          })

          const redditPosts = response.data?.data?.children || []

          for (const post of redditPosts) {
            const data = post.data
            if (data && data.title && !data.is_self && data.url) {
              posts.push({
                title: data.title,
                description: data.selftext || data.title,
                url: data.url,
                publishedAt: new Date(data.created_utc * 1000).toISOString(),
                source: `Reddit r/${subreddit}`,
                image: data.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, "&") || null,
                category: this.categorizeByTitle(data.title),
                tags: this.extractTagsFromTitle(data.title),
                score: data.score || 0,
              })

              if (posts.length >= limit) break
            }
          }

          if (posts.length >= limit) break
        } catch (subredditError) {
          console.error(`❌ [TrendCrawler] Failed to scrape r/${subreddit}:`, subredditError.message)
        }

        // Delay between subreddits
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      console.log(`✅ [TrendCrawler] Scraped ${posts.length} posts from Reddit`)
      return posts
    } catch (error) {
      console.error("❌ [TrendCrawler] Reddit scraping failed:", error.message)
      return []
    }
  }

  async scrapeGoogleTrends(limit = 5) {
    try {
      console.log(`📈 [TrendCrawler] Scraping Google News RSS for ${limit} articles...`)

      const queries = [
        "technology news",
        "artificial intelligence",
        "startup news",
        "business innovation",
        "science breakthrough",
      ]

      const articles = []

      for (const query of queries) {
        try {
          const encodedQuery = encodeURIComponent(query)
          const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`

          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          })

          const $ = cheerio.load(response.data, { xmlMode: true })

          $("item").each((index, element) => {
            if (articles.length >= limit) return false

            const $item = $(element)
            const title = $item.find("title").text().trim()
            const link = $item.find("link").text().trim()
            const description = $item.find("description").text().trim()
            const pubDate = $item.find("pubDate").text().trim()

            if (title && link) {
              articles.push({
                title: this.cleanTitle(title),
                description: this.cleanDescription(description) || title,
                url: link,
                publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                source: "Google News",
                image: null,
                category: this.categorizeByTitle(title),
                tags: this.extractTagsFromTitle(title),
                score: Math.floor(Math.random() * 50) + 50,
              })
            }
          })

          if (articles.length >= limit) break
        } catch (queryError) {
          console.error(`❌ [TrendCrawler] Failed to scrape Google News for "${query}":`, queryError.message)
        }

        // Delay between queries
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      console.log(`✅ [TrendCrawler] Scraped ${articles.length} articles from Google News RSS`)
      return articles
    } catch (error) {
      console.error("❌ [TrendCrawler] Google News scraping failed:", error.message)
      return []
    }
  }

  categorizeByTitle(title) {
    const lowerTitle = title.toLowerCase()
    if (
      lowerTitle.includes("ai") ||
      lowerTitle.includes("artificial intelligence") ||
      lowerTitle.includes("machine learning")
    )
      return "Technology"
    if (
      lowerTitle.includes("business") ||
      lowerTitle.includes("economy") ||
      lowerTitle.includes("finance") ||
      lowerTitle.includes("market")
    )
      return "Business"
    if (lowerTitle.includes("health") || lowerTitle.includes("medical") || lowerTitle.includes("disease"))
      return "Health"
    if (lowerTitle.includes("science") || lowerTitle.includes("discovery") || lowerTitle.includes("research"))
      return "Science"
    if (lowerTitle.includes("entertainment") || lowerTitle.includes("movie") || lowerTitle.includes("music"))
      return "Entertainment"
    if (lowerTitle.includes("sport") || lowerTitle.includes("game") || lowerTitle.includes("team")) return "Sports"
    if (lowerTitle.includes("environment") || lowerTitle.includes("climate") || lowerTitle.includes("sustainability"))
      return "Environment"
    if (lowerTitle.includes("politics") || lowerTitle.includes("government") || lowerTitle.includes("election"))
      return "Politics"
    return "General"
  }

  extractTagsFromTitle(title) {
    const tags = new Set()
    const words = title.toLowerCase().split(/\s|\W+/)
    const commonKeywords = [
      "ai",
      "tech",
      "startup",
      "innovation",
      "future",
      "health",
      "science",
      "business",
      "market",
      "economy",
      "environment",
      "climate",
      "digital",
    ]
    words.forEach((word) => {
      if (commonKeywords.includes(word)) tags.add(word)
    })
    return Array.from(tags)
  }

  cleanTitle(title) {
    // Remove unwanted prefixes/suffixes often found in RSS feeds
    return title.replace(/^(<!\[CDATA\[)?(.*?)(]\]>)?$/, "$2").trim()
  }

  cleanDescription(description) {
    // Remove HTML tags and common RSS artifacts
    return description
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .trim()
  }

  removeDuplicates(trends) {
    const uniqueUrls = new Set()
    const uniqueTrends = []
    for (const trend of trends) {
      if (!uniqueUrls.has(trend.url)) {
        uniqueUrls.add(trend.url)
        uniqueTrends.push(trend)
      }
    }
    return uniqueTrends
  }

  getFallbackTrends(limit = 5) {
    const fallbackData = [
      {
        title: "Latest Developments in Artificial Intelligence Technology",
        description:
          "Researchers at leading universities have made significant strides in developing more efficient AI algorithms, promising breakthroughs in various industries.",
        category: "Technology",
        tags: ["AI", "Technology", "Innovation"],
        source: "fallback",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        score: 85,
        url: "#fallback-ai-" + Date.now(),
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Sustainable Business Practices Gaining Momentum",
        description:
          "More companies are adopting eco-friendly strategies and renewable energy sources, driven by consumer demand and regulatory changes.",
        category: "Business",
        tags: ["Sustainability", "Business", "Environment"],
        source: "fallback",
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        score: 80,
        url: "#fallback-business-" + Date.now(),
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Revolutionary Health Tech Innovations",
        description:
          "New wearable devices and AI-powered diagnostic tools are transforming healthcare, offering personalized treatment and early detection.",
        category: "Health",
        tags: ["Health", "Technology", "Innovation"],
        source: "fallback",
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        score: 90,
        url: "#fallback-health-" + Date.now(),
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "Exploring the Depths of Space: New Discoveries",
        description:
          "Astronomers have announced the discovery of several exoplanets with potential for life, expanding our understanding of the universe.",
        category: "Science",
        tags: ["Space", "Science", "Astronomy"],
        source: "fallback",
        publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        score: 88,
        url: "#fallback-space-" + Date.now(),
        image: "/placeholder.svg?height=400&width=600",
      },
      {
        title: "The Rise of Quantum Computing: What it Means for the Future",
        description:
          "Experts predict quantum computing will revolutionize industries from medicine to finance, offering unprecedented processing power.",
        category: "Technology",
        tags: ["Quantum Computing", "Technology", "Future"],
        source: "fallback",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        score: 92,
        url: "#fallback-quantum-" + Date.now(),
        image: "/placeholder.svg?height=400&width=600",
      },
    ]
    return fallbackData.slice(0, limit)
  }

  async healthCheck() {
    try {
      // Test GNews service
      const gnewsHealth = await GNewsService.testConnection()

      // Test basic HTTP connectivity
      const testResponse = await axios.get("https://httpbin.org/status/200", {
        timeout: 5000,
      })

      return {
        status: "healthy",
        gnews: gnewsHealth,
        connectivity: testResponse.status === 200,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  async getTrendingTopics(limit = 10) {
    return await this.crawlTrends(limit)
  }
}

module.exports = new TrendCrawler()
