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
    const titleLower = title.toLowerCase()

    if (
      titleLower.includes("ai") ||
      titleLower.includes("artificial intelligence") ||
      titleLower.includes("machine learning")
    ) {
      return "Technology"
    }
    if (titleLower.includes("startup") || titleLower.includes("business") || titleLower.includes("finance")) {
      return "Business"
    }
    if (titleLower.includes("health") || titleLower.includes("medical") || titleLower.includes("medicine")) {
      return "Health"
    }
    if (titleLower.includes("science") || titleLower.includes("research") || titleLower.includes("study")) {
      return "Science"
    }
    if (titleLower.includes("climate") || titleLower.includes("environment") || titleLower.includes("green")) {
      return "Environment"
    }

    return "General"
  }

  extractTagsFromTitle(title) {
    const commonTags = [
      "AI",
      "Technology",
      "Business",
      "Science",
      "Health",
      "Innovation",
      "Startup",
      "Research",
      "Digital",
      "Software",
      "Data",
      "Security",
    ]

    const titleLower = title.toLowerCase()
    const foundTags = commonTags.filter((tag) => titleLower.includes(tag.toLowerCase()))

    return foundTags.length > 0 ? foundTags.slice(0, 5) : ["News", "Trending"]
  }

  cleanTitle(title) {
    return title.replace(/ - [^-]+$/, "").trim()
  }

  cleanDescription(description) {
    return description
      .replace(/<[^>]*>/g, "")
      .replace(/&[^;]+;/g, " ")
      .trim()
      .substring(0, 300)
  }

  removeDuplicates(trends) {
    const seen = new Set()
    return trends.filter((trend) => {
      const key = trend.title.toLowerCase().replace(/[^\w]/g, "")
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  getFallbackTrends(limit = 10) {
    const fallbackTrends = [
      {
        title: "Artificial Intelligence Breakthrough in Healthcare Diagnostics",
        description: "New AI system shows 95% accuracy in early disease detection",
        category: "Technology",
        tags: ["AI", "Healthcare", "Technology", "Innovation"],
        source: "fallback",
        publishedAt: new Date().toISOString(),
        score: 85,
      },
      {
        title: "Sustainable Energy Solutions Gain Global Momentum",
        description: "Renewable energy adoption accelerates worldwide with new government initiatives",
        category: "Environment",
        tags: ["Renewable Energy", "Environment", "Sustainability", "Climate"],
        source: "fallback",
        publishedAt: new Date().toISOString(),
        score: 80,
      },
      {
        title: "Quantum Computing Milestone Achieved by Tech Giants",
        description: "Major breakthrough in quantum error correction brings practical applications closer",
        category: "Technology",
        tags: ["Quantum Computing", "Technology", "Innovation", "Science"],
        source: "fallback",
        publishedAt: new Date().toISOString(),
        score: 90,
      },
      {
        title: "Digital Banking Revolution Transforms Financial Services",
        description: "Fintech innovations reshape traditional banking with AI-powered solutions",
        category: "Business",
        tags: ["Fintech", "Banking", "Digital", "Finance"],
        source: "fallback",
        publishedAt: new Date().toISOString(),
        score: 75,
      },
      {
        title: "Space Technology Advances Enable Mars Mission Planning",
        description: "New propulsion systems and life support technologies pave way for Mars exploration",
        category: "Science",
        tags: ["Space", "Mars", "Technology", "Exploration"],
        source: "fallback",
        publishedAt: new Date().toISOString(),
        score: 85,
      },
    ]

    return fallbackTrends.slice(0, limit)
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
