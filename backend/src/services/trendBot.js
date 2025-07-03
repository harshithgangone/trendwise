const trendCrawler = require("./trendCrawler")
const groqService = require("./groqService")
const unsplashService = require("./unsplashService")
const Article = require("../models/Article")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.stats = {
      articlesGenerated: 0,
      lastRun: null,
      errors: 0,
      successRate: 0,
    }

    console.log("🤖 [TrendBot] Initialized")
  }

  async start() {
    try {
      if (this.isRunning) {
        console.log("⚠️ [TrendBot] Already running")
        return
      }

      console.log("🚀 [TrendBot] Starting automated content generation...")
      this.isRunning = true

      // Run immediately first
      await this.generateContent()

      // Then run every 5 minutes
      this.intervalId = setInterval(
        async () => {
          try {
            await this.generateContent()
          } catch (error) {
            console.error("❌ [TrendBot] Interval error:", error.message)
            this.stats.errors++
          }
        },
        5 * 60 * 1000,
      ) // 5 minutes

      console.log("✅ [TrendBot] Started successfully (5-minute intervals)")
    } catch (error) {
      console.error("❌ [TrendBot] Failed to start:", error.message)
      this.isRunning = false
      throw error
    }
  }

  async stop() {
    console.log("🛑 [TrendBot] Stopping...")

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    console.log("✅ [TrendBot] Stopped successfully")
  }

  async generateContent() {
    try {
      console.log("🔄 [TrendBot] Starting content generation cycle...")
      this.stats.lastRun = new Date()

      // Get trending topics
      const trendData = await trendCrawler.crawlTrends()

      if (!trendData.success || !trendData.trends || trendData.trends.length === 0) {
        console.warn("⚠️ [TrendBot] No trends found, trying headlines...")
        const headlineData = await trendCrawler.getTopHeadlines()

        if (!headlineData.success || !headlineData.trends) {
          console.warn("⚠️ [TrendBot] No headlines found, trying multiple sources...")
          const multiData = await trendCrawler.getMultipleTrendSources()

          if (!multiData.success) {
            console.error("❌ [TrendBot] All trend sources failed")
            return
          }

          trendData.trends = multiData.trends
        } else {
          trendData.trends = headlineData.trends
        }
      }

      console.log(`📊 [TrendBot] Processing ${trendData.trends.length} trending topics`)

      // Process trends in batches to avoid overwhelming the APIs
      const batchSize = 3
      const batches = []

      for (let i = 0; i < trendData.trends.length; i += batchSize) {
        batches.push(trendData.trends.slice(i, i + batchSize))
      }

      let processedCount = 0

      for (const batch of batches) {
        const batchPromises = batch.map(async (trend) => {
          try {
            return await this.processTrend(trend)
          } catch (error) {
            console.error(`❌ [TrendBot] Failed to process trend "${trend.title}":`, error.message)
            this.stats.errors++
            return null
          }
        })

        const results = await Promise.all(batchPromises)
        const successful = results.filter((result) => result !== null)
        processedCount += successful.length

        // Small delay between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      this.stats.articlesGenerated += processedCount
      this.stats.successRate = (this.stats.articlesGenerated / (this.stats.articlesGenerated + this.stats.errors)) * 100

      console.log(`✅ [TrendBot] Content generation completed: ${processedCount} articles created`)
      console.log(
        `📈 [TrendBot] Total stats: ${this.stats.articlesGenerated} articles, ${this.stats.successRate.toFixed(1)}% success rate`,
      )
    } catch (error) {
      console.error("❌ [TrendBot] Content generation failed:", error.message)
      this.stats.errors++
    }
  }

  async processTrend(trend) {
    try {
      console.log(`🔄 [TrendBot] Processing: "${trend.title}"`)

      // Check if article already exists
      const existingArticle = await Article.findOne({
        $or: [{ "trendData.sourceUrl": trend.url }, { title: trend.title }],
      })

      if (existingArticle) {
        console.log(`⚠️ [TrendBot] Article already exists: "${trend.title}"`)
        return null
      }

      // Generate article content with AI
      const generatedContent = await groqService.generateArticle(trend, {
        style: "informative",
        length: "medium",
        maxTokens: 1500,
      })

      // Get relevant image
      const imageData = await unsplashService.getImageForCategory(generatedContent.category || "news")

      // Generate unique slug
      const baseSlug = this.generateSlug(generatedContent.title)
      const uniqueSlug = await this.generateUniqueSlug(baseSlug)

      // Create article
      const articleData = {
        title: generatedContent.title,
        slug: uniqueSlug,
        excerpt: generatedContent.excerpt,
        content: generatedContent.content,
        thumbnail: imageData.url,
        author: "TrendWise AI",
        tags: generatedContent.tags || [],
        category: generatedContent.category || "general",
        readTime: generatedContent.readTime || 5,
        views: Math.floor(Math.random() * 1000) + 100,
        likes: Math.floor(Math.random() * 50) + 10,
        saves: Math.floor(Math.random() * 25) + 5,
        featured: Math.random() < 0.2, // 20% chance of being featured
        trendData: {
          sourceName: trend.source?.name || "Unknown",
          sourceUrl: trend.url,
          publishedAt: trend.publishedAt,
          crawledAt: new Date(),
        },
        media: {
          images: [imageData.url],
          photographer: imageData.photographer,
          photographerUrl: imageData.photographerUrl,
        },
      }

      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [TrendBot] Created article: "${article.title}" (${article.slug})`)
      return article
    } catch (error) {
      console.error(`❌ [TrendBot] Failed to process trend:`, error.message)
      throw error
    }
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-")
      .substring(0, 60)
  }

  async generateUniqueSlug(baseSlug) {
    let slug = baseSlug
    let counter = 1

    while (await Article.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      stats: this.stats,
      nextRun: this.intervalId ? new Date(Date.now() + 5 * 60 * 1000) : null,
    }
  }

  getHealthStatus() {
    return {
      isHealthy: this.isRunning,
      isRunning: this.isRunning,
      stats: this.stats,
      service: "TrendBot",
    }
  }
}

// Create singleton instance
const trendBot = new TrendBot()

module.exports = trendBot
