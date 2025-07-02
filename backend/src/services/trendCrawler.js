const axios = require("axios")
const cheerio = require("cheerio")

class TrendCrawler {
  constructor() {
    this.isActive = false
    this.sources = [
      {
        name: "Google Trends RSS",
        url: "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US",
        type: "rss",
      },
      {
        name: "Reddit Hot",
        url: "https://www.reddit.com/hot.json?limit=10",
        type: "reddit",
      },
    ]
    this.stats = {
      totalCrawls: 0,
      successfulCrawls: 0,
      trendsFound: 0,
      errors: 0,
      lastCrawl: null,
    }

    console.log(
      "🕷️ [TrendCrawler] Initialized with sources:",
      this.sources.map((s) => s.name),
    )
  }

  async crawlTrends() {
    console.log("🔍 [TrendCrawler] Starting trend crawling...")
    this.stats.totalCrawls++
    this.stats.lastCrawl = new Date()

    const allTrends = []

    for (const source of this.sources) {
      try {
        console.log(`📡 [TrendCrawler] Crawling ${source.name}...`)

        let trends = []
        if (source.type === "rss") {
          trends = await this.crawlRSSFeed(source)
        } else if (source.type === "reddit") {
          trends = await this.crawlReddit(source)
        }

        if (trends.length > 0) {
          allTrends.push(...trends)
          console.log(`✅ [TrendCrawler] Found ${trends.length} trends from ${source.name}`)
        } else {
          console.log(`⚠️ [TrendCrawler] No trends found from ${source.name}`)
        }
      } catch (error) {
        console.error(`❌ [TrendCrawler] Failed to crawl ${source.name}:`, error.message)
        this.stats.errors++
      }
    }

    if (allTrends.length > 0) {
      this.stats.successfulCrawls++
      this.stats.trendsFound += allTrends.length

      console.log(`🎉 [TrendCrawler] Crawling completed: ${allTrends.length} total trends found`)

      return {
        success: true,
        trends: allTrends,
        source: "Multiple Sources",
        timestamp: new Date().toISOString(),
      }
    } else {
      console.log("⚠️ [TrendCrawler] No trends found from any source")
      return {
        success: false,
        error: "No trends found from any source",
        trends: [],
      }
    }
  }

  async crawlRSSFeed(source) {
    try {
      console.log(`🔗 [TrendCrawler] Fetching RSS feed: ${source.url}`)

      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          "User-Agent": "TrendWise-Bot/1.0 (https://trendwise.com)",
        },
      })

      console.log(`📄 [TrendCrawler] RSS response received: ${response.data.length} characters`)

      const $ = cheerio.load(response.data, { xmlMode: true })
      const trends = []

      $("item").each((index, element) => {
        try {
          const $item = $(element)
          const title = $item.find("title").text().trim()
          const description = $item.find("description").text().trim()
          const link = $item.find("link").text().trim()
          const pubDate = $item.find("pubDate").text().trim()

          if (title && description) {
            const trend = {
              title: title,
              description: description.substring(0, 500), // Limit description length
              link: link || "#",
              publishedAt: pubDate ? new Date(pubDate) : new Date(),
              source: source.name,
              category: this.extractCategory(title, description),
              keywords: this.extractKeywords(title, description),
              thumbnail: "/placeholder.svg?height=400&width=600",
              excerpt: description.substring(0, 200),
              tags: this.generateTags(title, description),
              readTime: Math.ceil(description.length / 200), // Rough estimate
              trendData: {
                source: source.name,
                originalUrl: link,
                crawledAt: new Date(),
              },
            }

            trends.push(trend)
            console.log(`📝 [TrendCrawler] Parsed trend: "${title.substring(0, 50)}..."`)
          }
        } catch (itemError) {
          console.warn(`⚠️ [TrendCrawler] Failed to parse RSS item:`, itemError.message)
        }
      })

      console.log(`✅ [TrendCrawler] RSS parsing completed: ${trends.length} trends extracted`)
      return trends
    } catch (error) {
      console.error(`❌ [TrendCrawler] RSS crawling failed:`, error.message)
      throw error
    }
  }

  async crawlReddit(source) {
    try {
      console.log(`🔗 [TrendCrawler] Fetching Reddit data: ${source.url}`)

      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          "User-Agent": "TrendWise-Bot/1.0 (https://trendwise.com)",
        },
      })

      console.log(`📄 [TrendCrawler] Reddit response received`)

      const data = response.data
      const trends = []

      if (data.data && data.data.children) {
        data.data.children.forEach((post, index) => {
          try {
            const postData = post.data

            if (postData.title && postData.selftext) {
              const trend = {
                title: postData.title,
                description: postData.selftext.substring(0, 500),
                link: `https://reddit.com${postData.permalink}`,
                publishedAt: new Date(postData.created_utc * 1000),
                source: "Reddit",
                category: postData.subreddit || "general",
                keywords: this.extractKeywords(postData.title, postData.selftext),
                thumbnail:
                  postData.thumbnail && postData.thumbnail.startsWith("http")
                    ? postData.thumbnail
                    : "/placeholder.svg?height=400&width=600",
                excerpt: postData.selftext.substring(0, 200),
                tags: this.generateTags(postData.title, postData.selftext),
                readTime: Math.ceil(postData.selftext.length / 200),
                views: postData.ups || 0,
                trendData: {
                  source: "Reddit",
                  subreddit: postData.subreddit,
                  upvotes: postData.ups,
                  comments: postData.num_comments,
                  originalUrl: `https://reddit.com${postData.permalink}`,
                  crawledAt: new Date(),
                },
              }

              trends.push(trend)
              console.log(`📝 [TrendCrawler] Parsed Reddit post: "${postData.title.substring(0, 50)}..."`)
            }
          } catch (itemError) {
            console.warn(`⚠️ [TrendCrawler] Failed to parse Reddit post:`, itemError.message)
          }
        })
      }

      console.log(`✅ [TrendCrawler] Reddit parsing completed: ${trends.length} trends extracted`)
      return trends
    } catch (error) {
      console.error(`❌ [TrendCrawler] Reddit crawling failed:`, error.message)
      throw error
    }
  }

  extractCategory(title, description) {
    const text = `${title} ${description}`.toLowerCase()

    const categories = {
      technology: ["tech", "ai", "software", "app", "digital", "computer", "internet"],
      business: ["business", "economy", "market", "finance", "money", "company"],
      health: ["health", "medical", "doctor", "hospital", "medicine", "wellness"],
      science: ["science", "research", "study", "discovery", "scientist"],
      entertainment: ["movie", "music", "celebrity", "entertainment", "show"],
      sports: ["sport", "game", "player", "team", "match", "championship"],
      politics: ["politics", "government", "election", "policy", "law"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category
      }
    }

    return "general"
  }

  extractKeywords(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const words = text.match(/\b\w{4,}\b/g) || []

    // Remove common words
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
      "about",
    ]
    const keywords = words.filter((word) => !stopWords.includes(word))

    // Get unique keywords and limit to top 10
    return [...new Set(keywords)].slice(0, 10)
  }

  generateTags(title, description) {
    const keywords = this.extractKeywords(title, description)
    return keywords.slice(0, 5) // Limit to 5 tags
  }

  getStatus() {
    return {
      isActive: this.isActive,
      stats: this.stats,
      sources: this.sources.map((s) => ({ name: s.name, type: s.type })),
    }
  }

  async cleanup() {
    console.log("🧹 [TrendCrawler] Cleaning up resources...")
    this.isActive = false
    // No browser to close since we're using Cheerio
    console.log("✅ [TrendCrawler] Cleanup completed")
  }

  async healthCheck() {
    try {
      console.log(`🏥 [TrendCrawler] Running health check...`)

      const testUrl = this.sources[0].url
      const response = await axios.get(testUrl, {
        timeout: 5000,
        headers: {
          "User-Agent": "TrendWise-Bot/1.0 (https://trendwise.com)",
        },
      })

      const isHealthy = response.status === 200

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

module.exports = new TrendCrawler()
