const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const GNewsService = require("./gnewsService")
const UnsplashService = require("./unsplashService")
const Article = require("../models/Article")

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
    this.trendCrawler = new TrendCrawler()
    this.groqService = new GroqService()
    this.gnewsService = new GNewsService()
    this.unsplashService = new UnsplashService()

    // Configuration
    this.config = {
      interval: "*/5 * * * *", // Every 5 minutes
      maxArticlesPerRun: 3,
      minArticleLength: 800,
      maxArticleLength: 2000,
      categories: ["technology", "business", "health", "science"],
      retryAttempts: 3,
      retryDelay: 5000,
    }

    console.log("🤖 [TrendBot] Initialized with configuration:", this.config)
  }

  // Start the automated bot
  async start() {
    try {
      if (this.isActive) {
        console.log("⚠️ [TrendBot] Bot is already active")
        return { success: false, message: "Bot is already running" }
      }

      console.log("🚀 [TrendBot] Starting automated content generation...")

      // Schedule the cron job
      this.job = cron.schedule(
        this.config.interval,
        async () => {
          if (!this.isRunning) {
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

      console.log("✅ [TrendBot] Bot stopped successfully")
      return { success: true, message: "TrendBot stopped successfully" }
    } catch (error) {
      console.error("❌ [TrendBot] Failed to stop bot:", error.message)
      return { success: false, message: `Failed to stop bot: ${error.message}` }
    }
  }

  // Run content generation manually
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
      { name: "GNewsService", service: this.gnewsService },
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
      let trends = await this.trendCrawler.getEnhancedTrends()
      console.log(`📊 [TrendBot] Fetched ${trends.length} trends from TrendCrawler`)

      // Secondary source: GNews if primary fails or returns few results
      if (trends.length < 5) {
        console.log("🔄 [TrendBot] Fetching additional trends from GNews...")
        try {
          const gnewsTrends = await this.gnewsService.fetchTrendingNews()
          trends = [...trends, ...gnewsTrends]
          console.log(`📊 [TrendBot] Added ${gnewsTrends.length} trends from GNews`)
        } catch (error) {
          console.warn("⚠️ [TrendBot] GNews fetch failed:", error.message)
        }
      }

      // Remove duplicates
      const uniqueTrends = this.removeDuplicateTrends(trends)
      console.log(`🎯 [TrendBot] Final unique trends count: ${uniqueTrends.length}`)

      return uniqueTrends
    } catch (error) {
      console.error("❌ [TrendBot] Failed to fetch trending topics:", error.message)
      throw error
    }
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
      let featuredImage = null
      try {
        featuredImage = await this.unsplashService.searchImage(trend.keywords[0] || trend.title)
        console.log(`🖼️ [TrendBot] Featured image found: ${featuredImage?.url || "none"}`)
      } catch (error) {
        console.warn(`⚠️ [TrendBot] Failed to get featured image:`, error.message)
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
                  url: featuredImage.url,
                  alt: featuredImage.alt || articleContent.title,
                  caption: featuredImage.caption || "",
                },
              ]
            : [],
          videos: [],
          tweets: [],
        },
        seo: {
          metaTitle: articleContent.metaTitle || articleContent.title,
          metaDescription: articleContent.metaDescription || articleContent.excerpt,
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
          originalUrl: trend.link,
          originalTitle: trend.title,
          publishedAt: trend.publishedAt,
        },
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
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-")
      .substring(0, 60)
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

    // Calculate next run based on cron schedule (every 5 minutes)
    const now = new Date()
    const nextRun = new Date(now)
    nextRun.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0)

    return nextRun
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

module.exports = TrendBot
