const cron = require("node-cron")
const trendCrawler = require("./trendCrawler")
const groqService = require("./groqService")
const unsplashService = require("./unsplashService")
const Article = require("../models/Article")
const slugify = require("slugify")

class TrendBot {
  constructor() {
    this.isActive = false
    this.isRunning = false
    this.job = null
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      articlesGenerated: 0,
      lastRun: null,
      lastError: null,
      averageRunTime: 0,
    }

    // Initialize services
    this.trendCrawler = trendCrawler
    this.groqService = groqService
    this.unsplashService = unsplashService

    // Configuration - CHANGED TO 5 MINUTES
    this.config = {
      interval: "*/5 * * * *", // Every 5 minutes (changed from 6 hours)
      maxArticlesPerRun: 3, // Reduced since running more frequently
      minArticleLength: 800,
      maxArticleLength: 2000,
      categories: ["technology", "business", "health", "science", "entertainment"],
      retryAttempts: 3,
      retryDelay: 5000,
      sources: ["gnews", "reddit", "trends"],
    }

    console.log("🤖 [TrendBot] Initialized with configuration:", this.config)
  }

  // Calculate next run time manually (every 5 minutes)
  calculateNextRun() {
    const now = new Date()
    const nextRun = new Date(now)

    // Add 5 minutes to current time
    nextRun.setMinutes(now.getMinutes() + 5)
    nextRun.setSeconds(0)
    nextRun.setMilliseconds(0)

    return nextRun
  }

  // Start the automated bot
  async start() {
    try {
      if (this.isActive) {
        console.log("⚠️ [TrendBot] Bot is already active")
        return { success: false, message: "Bot is already running" }
      }

      console.log("🚀 [TrendBot] Starting automated content generation...")

      // Calculate next run time
      this.nextRun = this.calculateNextRun()

      // Schedule the cron job - EVERY 5 MINUTES
      this.job = cron.schedule(
        this.config.interval,
        async () => {
          if (!this.isRunning) {
            console.log("⏰ [TrendBot] Scheduled run triggered (every 5 minutes)")
            await this.runContentGeneration()
          } else {
            console.log("⏳ [TrendBot] Previous run still in progress, skipping...")
          }
        },
        {
          scheduled: false,
          timezone: "UTC",
        },
      )

      this.job.start()
      this.isActive = true

      console.log("✅ [TrendBot] Bot started successfully")
      console.log(`⏰ [TrendBot] Scheduled to run every 5 minutes`)
      console.log(`📊 [TrendBot] Will generate up to ${this.config.maxArticlesPerRun} articles per run`)
      console.log(`⏰ [TrendBot] Next scheduled run: ${this.nextRun.toISOString()}`)

      return {
        success: true,
        message: "TrendBot started successfully",
        config: this.config,
        nextRun: this.getNextRunTime(),
      }
    } catch (error) {
      console.error("❌ [TrendBot] Failed to start bot:", error.message)
      return { success: false, message: `Failed to start bot: ${error.message}` }
    }
  }

  // Stop the automated bot
  async stop() {
    try {
      if (!this.isActive) {
        console.log("⚠️ [TrendBot] Bot is not currently active")
        return { success: false, message: "Bot is not running" }
      }

      console.log("🛑 [TrendBot] Stopping automated content generation...")

      if (this.job) {
        this.job.stop()
        this.job.destroy()
        this.job = null
      }

      this.isActive = false
      this.nextRun = null

      // Cleanup resources
      try {
        await this.trendCrawler.cleanup()
        console.log("🧹 [TrendBot] Resources cleaned up")
      } catch (error) {
        console.warn("⚠️ [TrendBot] Cleanup warning:", error.message)
      }

      console.log("✅ [TrendBot] Bot stopped successfully")
      return { success: true, message: "TrendBot stopped successfully" }
    } catch (error) {
      console.error("❌ [TrendBot] Failed to stop bot:", error.message)
      return { success: false, message: `Failed to stop bot: ${error.message}` }
    }
  }

  // Run content generation manually or scheduled
  async runContentGeneration() {
    const startTime = Date.now()
    this.isRunning = true
    this.stats.totalRuns++
    this.stats.lastRun = new Date()

    try {
      console.log("🔄 [TrendBot] Starting content generation cycle...")
      console.log(`📅 [TrendBot] Run #${this.stats.totalRuns} at ${new Date().toISOString()}`)

      // Step 1: Health check services
      await this.performHealthChecks()

      // Step 2: Fetch trending topics
      const trends = await this.fetchTrendingTopics()
      if (trends.length === 0) {
        throw new Error("No trending topics found")
      }

      // Step 3: Filter and select best trends
      const selectedTrends = await this.selectBestTrends(trends)
      console.log(`🎯 [TrendBot] Selected ${selectedTrends.length} trends for article generation`)

      // Step 4: Generate articles
      const generatedArticles = []
      for (let i = 0; i < Math.min(selectedTrends.length, this.config.maxArticlesPerRun); i++) {
        try {
          const trend = selectedTrends[i]
          console.log(`📝 [TrendBot] Generating article ${i + 1}/${this.config.maxArticlesPerRun}: "${trend.title}"`)

          const article = await this.generateSingleArticle(trend)
          if (article) {
            generatedArticles.push(article)
            this.stats.articlesGenerated++
            console.log(`✅ [TrendBot] Article generated successfully: "${article.title}"`)
          }

          // Add delay between generations to avoid rate limits
          if (i < selectedTrends.length - 1) {
            await this.delay(2000)
          }
        } catch (error) {
          console.error(
            `❌ [TrendBot] Failed to generate article for trend "${selectedTrends[i]?.title}":`,
            error.message,
          )
        }
      }

      // Step 5: Update statistics
      const runTime = Date.now() - startTime
      this.updateRunStatistics(runTime, true)

      // Update next run time
      this.nextRun = this.calculateNextRun()

      console.log(`🎉 [TrendBot] Content generation completed successfully!`)
      console.log(`📊 [TrendBot] Generated ${generatedArticles.length} articles in ${runTime}ms`)
      console.log(`📈 [TrendBot] Total articles generated: ${this.stats.articlesGenerated}`)

      return {
        success: true,
        articlesGenerated: generatedArticles.length,
        runTime,
        articles: generatedArticles.map((a) => ({ title: a.title, slug: a.slug })),
      }
    } catch (error) {
      const runTime = Date.now() - startTime
      this.updateRunStatistics(runTime, false, error)

      console.error("❌ [TrendBot] Content generation failed:", error.message)
      console.error("🔍 [TrendBot] Error stack:", error.stack)

      return {
        success: false,
        error: error.message,
        runTime,
      }
    } finally {
      this.isRunning = false
      console.log(`⏱️ [TrendBot] Content generation cycle completed in ${Date.now() - startTime}ms`)
    }
  }

  // Perform health checks on all services
  async performHealthChecks() {
    console.log("🏥 [TrendBot] Performing service health checks...")

    const checks = [
      { name: "TrendCrawler", service: this.trendCrawler },
      { name: "GroqService", service: this.groqService },
      { name: "UnsplashService", service: this.unsplashService },
    ]

    for (const check of checks) {
      try {
        if (check.service.healthCheck) {
          const health = await check.service.healthCheck()
          console.log(`${health.status === "healthy" ? "✅" : "⚠️"} [TrendBot] ${check.name}: ${health.status}`)
        } else {
          console.log(`✅ [TrendBot] ${check.name}: Available`)
        }
      } catch (error) {
        console.warn(`⚠️ [TrendBot] ${check.name} health check failed:`, error.message)
      }
    }
  }

  // Fetch trending topics from multiple sources
  async fetchTrendingTopics() {
    console.log("📡 [TrendBot] Fetching trending topics from multiple sources...")

    try {
      // Primary source: Enhanced trends from crawler
      const trends = await this.trendCrawler.crawlTrends()
      console.log(`📊 [TrendBot] Fetched ${trends.trends?.length || 0} trends from TrendCrawler`)

      if (trends.success && trends.trends) {
        const uniqueTrends = this.removeDuplicateTrends(trends.trends)
        console.log(`🎯 [TrendBot] Final unique trends count: ${uniqueTrends.length}`)
        return uniqueTrends
      } else {
        console.warn("⚠️ [TrendBot] TrendCrawler failed, using fallback trends")
        return this.generateFallbackTrends()
      }
    } catch (error) {
      console.error("❌ [TrendBot] Failed to fetch trending topics:", error.message)
      return this.generateFallbackTrends()
    }
  }

  // Generate fallback trends when primary sources fail
  generateFallbackTrends() {
    console.log("🔄 [TrendBot] Generating fallback trends...")

    const fallbackTrends = [
      {
        title: "Latest Technology Innovations Transforming Industries",
        description:
          "Exploring the cutting-edge technologies that are reshaping various industries and creating new opportunities for businesses and consumers alike.",
        category: "technology",
        keywords: ["technology", "innovation", "digital transformation", "AI", "automation"],
        source: "Fallback",
        publishedAt: new Date(),
        thumbnail: "/placeholder.svg?height=400&width=600",
        excerpt:
          "Technology continues to evolve at an unprecedented pace, bringing revolutionary changes across industries.",
        tags: ["technology", "innovation", "business", "digital"],
        readTime: 5,
      },
      {
        title: "Sustainable Business Practices Gaining Momentum",
        description:
          "Companies worldwide are adopting sustainable practices to reduce environmental impact while maintaining profitability and growth.",
        category: "business",
        keywords: ["sustainability", "business", "environment", "green technology", "ESG"],
        source: "Fallback",
        publishedAt: new Date(),
        thumbnail: "/placeholder.svg?height=400&width=600",
        excerpt:
          "Sustainability is becoming a core business strategy for companies looking to future-proof their operations.",
        tags: ["business", "sustainability", "environment", "strategy"],
        readTime: 4,
      },
      {
        title: "Health and Wellness Trends Shaping Consumer Behavior",
        description:
          "The growing focus on health and wellness is influencing consumer choices and creating new market opportunities across various sectors.",
        category: "health",
        keywords: ["health", "wellness", "lifestyle", "consumer behavior", "trends"],
        source: "Fallback",
        publishedAt: new Date(),
        thumbnail: "/placeholder.svg?height=400&width=600",
        excerpt: "Health consciousness is driving significant changes in how consumers make purchasing decisions.",
        tags: ["health", "wellness", "lifestyle", "consumer"],
        readTime: 4,
      },
    ]

    console.log(`✅ [TrendBot] Generated ${fallbackTrends.length} fallback trends`)
    return fallbackTrends
  }

  // Remove duplicate trends based on title similarity
  removeDuplicateTrends(trends) {
    const unique = []
    const seenTitles = new Set()

    for (const trend of trends) {
      const normalizedTitle = trend.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
      const titleWords = normalizedTitle.split(/\s+/).slice(0, 5).join(" ")

      if (!seenTitles.has(titleWords)) {
        seenTitles.add(titleWords)
        unique.push(trend)
      }
    }

    console.log(`🔄 [TrendBot] Removed ${trends.length - unique.length} duplicate trends`)
    return unique
  }

  // Select best trends for article generation
  async selectBestTrends(trends) {
    console.log("🎯 [TrendBot] Selecting best trends for article generation...")

    // Filter trends based on quality criteria
    const qualityTrends = trends.filter((trend) => {
      const hasGoodTitle = trend.title && trend.title.length >= 20 && trend.title.length <= 150
      const hasDescription = trend.description && trend.description.length >= 50
      const isRecent = trend.publishedAt && Date.now() - new Date(trend.publishedAt) < 24 * 60 * 60 * 1000 // 24 hours
      const hasKeywords = trend.keywords && trend.keywords.length >= 2

      return hasGoodTitle && hasDescription && isRecent && hasKeywords
    })

    console.log(`✅ [TrendBot] Filtered to ${qualityTrends.length} quality trends`)

    // Check for existing articles to avoid duplicates
    const newTrends = []
    for (const trend of qualityTrends) {
      const slug = this.generateSlug(trend.title)
      const existingArticle = await Article.findOne({ slug })

      if (!existingArticle) {
        newTrends.push(trend)
      } else {
        console.log(`⏭️ [TrendBot] Skipping duplicate: "${trend.title}"`)
      }
    }

    console.log(`🆕 [TrendBot] Found ${newTrends.length} new trends (no existing articles)`)

    // Sort by trend score and select top trends
    const sortedTrends = newTrends
      .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
      .slice(0, this.config.maxArticlesPerRun * 2) // Get extra in case some fail

    console.log(`🏆 [TrendBot] Selected top ${sortedTrends.length} trends for generation`)
    return sortedTrends
  }

  // Generate a single article from trend data
  async generateSingleArticle(trend) {
    try {
      console.log(`🔨 [TrendBot] Starting article generation for: "${trend.title}"`)

      // Step 1: Generate article content with AI
      const articleContent = await this.groqService.generateArticle({
        title: trend.title,
        description: trend.description,
        category: trend.category,
        keywords: trend.keywords,
        source: trend.source,
      })

      if (!articleContent || !articleContent.title || !articleContent.content) {
        throw new Error("AI generated incomplete article content")
      }

      console.log(`✅ [TrendBot] AI content generated: ${articleContent.content.length} characters`)

      // Step 2: Get featured image
      let featuredImage = trend.thumbnail
      if (!featuredImage || featuredImage.includes("placeholder")) {
        try {
          featuredImage = await this.unsplashService.getFeaturedImage(trend.keywords[0] || trend.title)
          console.log(`🖼️ [TrendBot] Featured image found: ${featuredImage}`)
        } catch (error) {
          console.warn(`⚠️ [TrendBot] Failed to get featured image:`, error.message)
          featuredImage = "/placeholder.svg?height=400&width=600"
        }
      }

      // Step 3: Create article object
      const slug = this.generateSlug(articleContent.title)
      const articleData = {
        title: articleContent.title,
        slug,
        excerpt: articleContent.excerpt || trend.description.substring(0, 200),
        content: articleContent.content,
        author: {
          name: "TrendWise AI",
          email: "ai@trendwise.com",
        },
        category: trend.category || "general",
        tags: [...new Set([...trend.keywords, ...(articleContent.tags || [])])].slice(0, 10),
        media: {
          images: featuredImage
            ? [
                {
                  url: featuredImage,
                  alt: articleContent.title,
                  caption: "",
                },
              ]
            : [],
          videos: [],
          tweets: [],
        },
        seo: {
          metaTitle: articleContent.meta?.title || articleContent.title,
          metaDescription: articleContent.meta?.description || articleContent.excerpt,
          keywords: trend.keywords.join(", "),
          ogTitle: articleContent.title,
          ogDescription: articleContent.excerpt || trend.description.substring(0, 160),
        },
        stats: {
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
        },
        status: "published",
        publishedAt: new Date(),
        source: {
          originalUrl: trend.link || "#",
          originalTitle: trend.title,
          publishedAt: trend.publishedAt,
        },
        thumbnail: featuredImage,
        readTime: articleContent.readTime || Math.ceil(articleContent.content.length / 200),
        featured: false,
        views: 0,
        likes: 0,
        saves: 0,
      }

      // Step 4: Save to database
      const savedArticle = await Article.create(articleData)
      console.log(`💾 [TrendBot] Article saved to database with ID: ${savedArticle._id}`)

      return savedArticle
    } catch (error) {
      console.error(`❌ [TrendBot] Article generation failed for "${trend.title}":`, error.message)
      throw error
    }
  }

  // Generate URL-friendly slug
  generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    }).substring(0, 60)
  }

  // Update run statistics
  updateRunStatistics(runTime, success, error = null) {
    if (success) {
      this.stats.successfulRuns++
    } else {
      this.stats.failedRuns++
      this.stats.lastError = {
        message: error?.message || "Unknown error",
        timestamp: new Date(),
      }
    }

    // Update average run time
    this.stats.averageRunTime = Math.round(
      (this.stats.averageRunTime * (this.stats.totalRuns - 1) + runTime) / this.stats.totalRuns,
    )

    console.log(`📊 [TrendBot] Updated statistics:`, {
      totalRuns: this.stats.totalRuns,
      successRate: `${Math.round((this.stats.successfulRuns / this.stats.totalRuns) * 100)}%`,
      averageRunTime: `${this.stats.averageRunTime}ms`,
      articlesGenerated: this.stats.articlesGenerated,
    })
  }

  // Get next scheduled run time
  getNextRunTime() {
    if (!this.isActive || !this.job) return null
    return this.nextRun
  }

  // Trigger manual run
  async triggerManualRun() {
    console.log("🎯 [TrendBot] Manual run triggered")
    const result = await this.runContentGeneration()
    return {
      success: result.success,
      message: result.success ? "Manual run completed successfully" : `Manual run failed: ${result.error}`,
      timestamp: new Date().toISOString(),
      ...result,
    }
  }

  // Get bot status and statistics
  getStatus() {
    return {
      isActive: this.isActive,
      isRunning: this.isRunning,
      stats: this.stats,
      config: this.config,
      nextRun: this.getNextRunTime(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      crawlerStatus: this.trendCrawler.getStatus(),
    }
  }

  // Get detailed statistics
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRuns > 0 ? (this.stats.successfulRuns / this.stats.totalRuns) * 100 : 0,
      failureRate: this.stats.totalRuns > 0 ? (this.stats.failedRuns / this.stats.totalRuns) * 100 : 0,
      articlesPerRun: this.stats.totalRuns > 0 ? this.stats.articlesGenerated / this.stats.totalRuns : 0,
    }
  }

  // Add delay utility
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Cleanup resources
  async cleanup() {
    console.log("🧹 [TrendBot] Cleaning up resources...")

    if (this.isActive) {
      await this.stop()
    }

    console.log("✅ [TrendBot] Cleanup completed")
  }
}

// Create and export a single instance
const trendBotInstance = new TrendBot()

// Export the instance directly
module.exports = trendBotInstance
