const trendCrawler = require("./trendCrawler")
const groqService = require("./groqService")
const unsplashService = require("./unsplashService")
const Article = require("../models/Article")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.lastRun = null
    this.articlesGenerated = 0
    this.errors = []
    this.runInterval = 5 * 60 * 1000 // 5 minutes

    console.log("🤖 [TrendBot] Initialized")
  }

  async start() {
    try {
      if (this.isRunning) {
        console.log("⚠️ [TrendBot] Already running")
        return
      }

      console.log("🚀 [TrendBot] Starting...")
      this.isRunning = true

      // Run immediately
      setTimeout(() => {
        this.runCycle().catch((error) => {
          console.error("❌ [TrendBot] Initial run failed:", error.message)
        })
      }, 5000) // 5 second delay for initial run

      // Set up interval
      this.intervalId = setInterval(() => {
        this.runCycle().catch((error) => {
          console.error("❌ [TrendBot] Scheduled run failed:", error.message)
        })
      }, this.runInterval)

      console.log(`✅ [TrendBot] Started with ${this.runInterval / 1000}s interval`)
    } catch (error) {
      console.error("❌ [TrendBot] Failed to start:", error.message)
      this.isRunning = false
      throw error
    }
  }

  async stop() {
    try {
      console.log("🛑 [TrendBot] Stopping...")

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }

      this.isRunning = false
      console.log("✅ [TrendBot] Stopped")
    } catch (error) {
      console.error("❌ [TrendBot] Error stopping:", error.message)
    }
  }

  async runCycle() {
    try {
      console.log("🔄 [TrendBot] Starting cycle...")
      this.lastRun = new Date()

      // Crawl trends
      const trendsResult = await trendCrawler.crawlTrends()

      if (!trendsResult.success || trendsResult.trends.length === 0) {
        console.warn("⚠️ [TrendBot] No trends found, skipping cycle")
        return
      }

      console.log(`📊 [TrendBot] Found ${trendsResult.trends.length} trends`)

      // Process top trends (limit to avoid overwhelming the system)
      const topTrends = trendsResult.trends.slice(0, 3)

      for (const trend of topTrends) {
        try {
          await this.processTrend(trend)

          // Add delay between processing to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (error) {
          console.error(`❌ [TrendBot] Error processing trend "${trend.title}":`, error.message)
          this.errors.push({
            trend: trend.title,
            error: error.message,
            timestamp: new Date(),
          })
        }
      }

      console.log(`✅ [TrendBot] Cycle completed. Generated ${this.articlesGenerated} articles total`)
    } catch (error) {
      console.error("❌ [TrendBot] Cycle failed:", error.message)
      this.errors.push({
        error: error.message,
        timestamp: new Date(),
      })
    }
  }

  async processTrend(trend) {
    try {
      console.log(`🔄 [TrendBot] Processing trend: "${trend.title}"`)

      // Check if article already exists
      const existingArticle = await Article.findOne({
        $or: [{ sourceUrl: trend.url }, { title: trend.title }],
      })

      if (existingArticle) {
        console.log(`⚠️ [TrendBot] Article already exists: "${trend.title}"`)
        return
      }

      // Generate article content
      const articleResult = await groqService.generateArticle(trend)

      if (!articleResult.success) {
        throw new Error("Failed to generate article content")
      }

      const articleData = articleResult.article

      // Get image for the article
      let imageUrl = trend.image
      if (!imageUrl) {
        const imageResult = await unsplashService.searchImage(articleData.category || trend.category || "news")
        if (imageResult.success) {
          imageUrl = imageResult.image.url
        }
      }

      // Generate unique slug
      let slug = articleData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim("-")
        .substring(0, 60)

      let counter = 1
      while (await Article.findOne({ slug })) {
        slug = `${articleData.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 50)}-${counter}`
        counter++
      }

      // Create article
      const article = new Article({
        title: articleData.title,
        slug: slug,
        excerpt: articleData.excerpt,
        content: articleData.content,
        thumbnail: imageUrl || "/placeholder.svg?height=400&width=600",
        tags: articleData.tags || [],
        category: articleData.category || "General",
        readTime: articleData.readTime || 5,
        author: "TrendWise AI",
        status: "published",
        featured: Math.random() > 0.8, // 20% chance of being featured
        views: Math.floor(Math.random() * 100) + 50,
        likes: Math.floor(Math.random() * 25) + 5,
        shares: Math.floor(Math.random() * 10) + 1,
        sourceUrl: trend.url,
        originalSource: trend.source,
        trendData: {
          trendScore: trend.trendScore,
          type: trend.type,
          topic: trend.topic,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await article.save()
      this.articlesGenerated++

      console.log(`✅ [TrendBot] Created article: "${article.title}" (${article.slug})`)
    } catch (error) {
      console.error(`❌ [TrendBot] Error processing trend:`, error.message)
      throw error
    }
  }

  getHealthStatus() {
    return {
      isHealthy: this.isRunning,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      articlesGenerated: this.articlesGenerated,
      errors: this.errors.slice(-5), // Last 5 errors
      runInterval: this.runInterval,
      service: "TrendBot",
    }
  }

  getStatus() {
    return this.getHealthStatus()
  }
}

// Create singleton instance
const trendBot = new TrendBot()

module.exports = trendBot
