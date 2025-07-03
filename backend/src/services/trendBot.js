const gnewsService = require("./gnewsService")
const groqService = require("./groqService")
const unsplashService = require("./unsplashService")
const Article = require("../models/Article")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.interval = null
    this.lastRun = null
    this.articlesGenerated = 0
    this.intervalTime = 5 * 60 * 1000 // 5 minutes

    console.log("🤖 [TrendBot] Initialized")
  }

  async start() {
    if (this.isRunning) {
      console.log("⚠️ [TrendBot] Already running")
      return
    }

    console.log("🚀 [TrendBot] Starting...")
    this.isRunning = true

    // Run immediately
    setTimeout(() => {
      this.generateArticles().catch((error) => {
        console.error("❌ [TrendBot] Initial run failed:", error.message)
      })
    }, 5000)

    // Set up interval
    this.interval = setInterval(async () => {
      await this.generateArticles()
    }, this.intervalTime)

    console.log(`✅ [TrendBot] Started - will run every ${this.intervalTime / 1000 / 60} minutes`)
  }

  async stop() {
    if (!this.isRunning) {
      console.log("⚠️ [TrendBot] Not running")
      return
    }

    console.log("🛑 [TrendBot] Stopping...")
    this.isRunning = false

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    console.log("✅ [TrendBot] Stopped")
  }

  async generateArticles() {
    try {
      console.log("🔄 [TrendBot] Starting article generation cycle...")
      this.lastRun = new Date()

      // Get trending news from GNews
      const newsItems = await this.getTrendingNews()

      if (!newsItems || newsItems.length === 0) {
        console.log("⚠️ [TrendBot] No news items found, skipping this cycle")
        return
      }

      console.log(`📰 [TrendBot] Processing ${newsItems.length} news items`)

      let articlesCreated = 0
      const maxArticles = Math.min(newsItems.length, 3) // Limit to 3 articles per cycle

      for (let i = 0; i < maxArticles; i++) {
        const newsItem = newsItems[i]

        try {
          // Check if article already exists
          const existingArticle = await Article.findOne({
            $or: [{ title: newsItem.title }, { sourceUrl: newsItem.url }],
          })

          if (existingArticle) {
            console.log(`⏭️ [TrendBot] Article already exists: ${newsItem.title}`)
            continue
          }

          // Generate article using Groq
          const generatedArticle = await groqService.generateArticle(newsItem)

          if (!generatedArticle) {
            console.log(`❌ [TrendBot] Failed to generate article for: ${newsItem.title}`)
            continue
          }

          // Get image from Unsplash
          let thumbnail = newsItem.image || "/placeholder.svg?height=400&width=600"
          try {
            const searchQuery = generatedArticle.tags?.[0] || generatedArticle.category || "news"
            const unsplashImage = await unsplashService.searchImage(searchQuery)
            if (unsplashImage) {
              thumbnail = unsplashImage
            }
          } catch (imageError) {
            console.log(`⚠️ [TrendBot] Failed to get image: ${imageError.message}`)
          }

          // Generate unique slug
          const baseSlug = generatedArticle.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")

          let slug = baseSlug
          let counter = 1

          while (await Article.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`
            counter++
          }

          // Create article
          const article = new Article({
            title: generatedArticle.title,
            slug: slug,
            content: generatedArticle.content,
            excerpt: generatedArticle.excerpt,
            thumbnail: thumbnail,
            tags: generatedArticle.tags || [],
            category: generatedArticle.category || "General",
            readTime: generatedArticle.readTime || 5,
            featured: Math.random() < 0.2, // 20% chance of being featured
            views: Math.floor(Math.random() * 100) + 50,
            likes: Math.floor(Math.random() * 20) + 5,
            saves: Math.floor(Math.random() * 10) + 2,
            author: "TrendWise AI",
            sourceUrl: newsItem.url,
            originalSource: newsItem.source?.name || "Unknown",
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          await article.save()
          articlesCreated++
          this.articlesGenerated++

          console.log(`✅ [TrendBot] Created article: ${article.title} (${article.slug})`)
        } catch (error) {
          console.error(`❌ [TrendBot] Error processing news item: ${error.message}`)
          continue
        }
      }

      console.log(`🎉 [TrendBot] Generation cycle complete - Created ${articlesCreated} articles`)

      return {
        success: true,
        articlesCreated,
        totalGenerated: this.articlesGenerated,
        lastRun: this.lastRun,
      }
    } catch (error) {
      console.error("❌ [TrendBot] Error in generation cycle:", error.message)
      return {
        success: false,
        error: error.message,
        lastRun: this.lastRun,
      }
    }
  }

  async getTrendingNews() {
    try {
      console.log("📡 [TrendBot] Fetching trending news...")

      // Try to get news from GNews
      const newsItems = await gnewsService.getTrendingNews()

      if (newsItems && newsItems.length > 0) {
        console.log(`✅ [TrendBot] Got ${newsItems.length} news items from GNews`)
        return newsItems
      }

      // Fallback to mock data if GNews fails
      console.log("⚠️ [TrendBot] GNews failed, using fallback news")
      return this.getFallbackNews()
    } catch (error) {
      console.error("❌ [TrendBot] Error fetching news:", error.message)
      return this.getFallbackNews()
    }
  }

  getFallbackNews() {
    const fallbackNews = [
      {
        title: "AI Technology Breakthrough Transforms Industry Standards",
        description:
          "Revolutionary artificial intelligence developments are reshaping how businesses operate across multiple sectors.",
        content:
          "The latest advancements in artificial intelligence are creating unprecedented opportunities for innovation across industries. Companies are leveraging AI to streamline operations, enhance customer experiences, and drive growth.",
        url: "https://example.com/ai-breakthrough",
        image: "/placeholder.svg?height=400&width=600",
        source: { name: "TechNews" },
      },
      {
        title: "Global Market Trends Show Promising Economic Recovery",
        description: "Economic indicators suggest a positive trajectory for global markets in the coming quarters.",
        content:
          "Financial analysts are optimistic about the current market trends, citing strong performance indicators and increased investor confidence. The recovery appears to be gaining momentum across various sectors.",
        url: "https://example.com/market-trends",
        image: "/placeholder.svg?height=400&width=600",
        source: { name: "Financial Times" },
      },
      {
        title: "Sustainable Energy Solutions Gain Widespread Adoption",
        description:
          "Renewable energy technologies are becoming more accessible and cost-effective for consumers worldwide.",
        content:
          "The shift towards sustainable energy is accelerating as new technologies make renewable sources more viable. Solar and wind power installations are reaching record levels globally.",
        url: "https://example.com/sustainable-energy",
        image: "/placeholder.svg?height=400&width=600",
        source: { name: "Green Energy Today" },
      },
    ]

    console.log(`📰 [TrendBot] Using ${fallbackNews.length} fallback news items`)
    return fallbackNews
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      articlesGenerated: this.articlesGenerated,
      intervalTime: this.intervalTime,
    }
  }
}

// Create singleton instance
const trendBot = new TrendBot()

// Export the instance directly
module.exports = trendBot
