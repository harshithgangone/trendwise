const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const UnsplashService = require("./unsplashService")
const TweetScraper = require("./tweetScraper")
const Article = require("../models/Article")
const slugify = require("slugify")

class TrendBot {
  constructor() {
    this.isActive = false
    this.isRunning = false
    this.cronJob = null
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      articlesGenerated: 0,
      lastRun: null,
      nextRun: null,
      errors: [],
    }
    this.config = {
      interval: "*/5 * * * *", // Every 5 minutes
      maxArticlesPerRun: 20, // Process up to 20 articles per cycle
      retryAttempts: 3,
      retryDelay: 5000,
      categories: ["Technology", "Business", "Health", "Science", "Entertainment", "Politics", "Environment"],
      sources: ["google-trends", "reddit-hot"],
    }

    console.log("🤖 [TrendBot] Initialized with 5-minute interval configuration")
    console.log(`🔧 [TrendBot] Config: ${JSON.stringify(this.config, null, 2)}`)
  }

  start() {
    if (this.isActive) {
      console.log("⚠️ [TrendBot] Already active, skipping start")
      return
    }

    try {
      console.log("🚀 [TrendBot] Starting automated content generation bot...")
      console.log(`⏰ [TrendBot] Schedule: Every 5 minutes (${this.config.interval})`)
      console.log(`📊 [TrendBot] Max articles per run: ${this.config.maxArticlesPerRun}`)

      this.isActive = true
      this.stats.nextRun = this.calculateNextRun()

      // Schedule the cron job
      this.cronJob = cron.schedule(
        this.config.interval,
        async () => {
          await this.runCycle()
        },
        {
          scheduled: true,
          timezone: "UTC",
        },
      )

      console.log("✅ [TrendBot] Successfully started and scheduled")
      console.log(`⏰ [TrendBot] Next run scheduled for: ${this.stats.nextRun}`)

      // Run immediately on start
      setTimeout(() => this.runCycle(), 5000)
    } catch (error) {
      console.error("❌ [TrendBot] Failed to start:", error)
      this.isActive = false
      throw error
    }
  }

  stop() {
    if (!this.isActive) {
      console.log("⚠️ [TrendBot] Already inactive, skipping stop")
      return
    }

    try {
      console.log("🛑 [TrendBot] Stopping automated content generation bot...")

      this.isActive = false
      if (this.cronJob) {
        this.cronJob.destroy()
        this.cronJob = null
      }

      console.log("✅ [TrendBot] Successfully stopped")
    } catch (error) {
      console.error("❌ [TrendBot] Error stopping bot:", error)
      throw error
    }
  }

  async runCycle() {
    if (this.isRunning) {
      console.log("⚠️ [TrendBot] Cycle already running, skipping...")
      return
    }

    const startTime = Date.now()
    this.isRunning = true
    this.stats.totalRuns++
    this.stats.lastRun = new Date().toISOString()
    this.stats.nextRun = this.calculateNextRun()

    console.log(`🔄 [TrendBot] Starting cycle #${this.stats.totalRuns}`)
    console.log(`⏰ [TrendBot] Started at: ${new Date().toISOString()}`)

    try {
      // Step 1: Health check all services
      console.log("🏥 [TrendBot] Performing health checks...")
      const healthStatus = await this.performHealthChecks()
      console.log(`✅ [TrendBot] Health check completed: ${JSON.stringify(healthStatus)}`)

      // Step 2: Crawl for trending topics
      console.log("🕷️ [TrendBot] Crawling for trending topics...")
      const crawlResult = await TrendCrawler.crawlTrends()
      console.log(`📊 [TrendBot] Crawl result: ${JSON.stringify(crawlResult)}`)

      let trends = []
      if (crawlResult && crawlResult.success && Array.isArray(crawlResult.trends)) {
        trends = crawlResult.trends
        console.log(`📊 [TrendBot] Found ${trends.length} trending topics`)
      } else {
        console.log(`⚠️ [TrendBot] No valid trends found in crawl result`)
      }

      if (trends.length === 0) {
        console.log("⚠️ [TrendBot] No trends found, generating fallback content...")
        const fallbackTrends = this.generateFallbackTrends()
        console.log(`📊 [TrendBot] Generated ${fallbackTrends.length} fallback trends`)
        trends = fallbackTrends // Replace empty array instead of pushing
      }

      // Step 3: Process and filter trends
      console.log(`🔍 [TrendBot] Processing and filtering ${trends.length} trends...`)
      const processedTrends = await this.processTrends(trends)
      console.log(`✅ [TrendBot] Processed ${processedTrends.length} high-quality trends`)

      // Step 4: Select top trends for article generation
      const selectedTrends = processedTrends.slice(0, this.config.maxArticlesPerRun)
      console.log(`🎯 [TrendBot] Selected ${selectedTrends.length} trends for article generation`)

      // Step 5: Generate articles
      let articlesGenerated = 0
      for (let i = 0; i < selectedTrends.length; i++) {
        const trend = selectedTrends[i]
        console.log(`📝 [TrendBot] Generating article ${i + 1}/${selectedTrends.length} for: "${trend.title}"`)

        try {
          const article = await this.generateArticle(trend)
          if (article) {
            articlesGenerated++
            console.log(`✅ [TrendBot] Successfully created article: "${article.title}"`)
          }
        } catch (error) {
          console.error(`❌ [TrendBot] Failed to generate article for "${trend.title}":`, error)
          this.stats.errors.push({
            timestamp: new Date().toISOString(),
            trend: trend.title,
            error: error.message,
          })
        }
      }

      // Step 6: Update statistics
      this.stats.articlesGenerated += articlesGenerated
      this.stats.successfulRuns++

      const duration = Date.now() - startTime
      console.log(`🎉 [TrendBot] Cycle completed successfully in ${duration}ms`)
      console.log(`📊 [TrendBot] Generated ${articlesGenerated}/${selectedTrends.length} articles`)
      console.log(`📈 [TrendBot] Total articles generated: ${this.stats.articlesGenerated}`)
      console.log(`⏰ [TrendBot] Next run: ${this.stats.nextRun}`)
    } catch (error) {
      this.stats.failedRuns++
      this.stats.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
      })

      const duration = Date.now() - startTime
      console.error(`❌ [TrendBot] Cycle failed after ${duration}ms:`, error)
      console.log(
        `📊 [TrendBot] Success rate: ${((this.stats.successfulRuns / this.stats.totalRuns) * 100).toFixed(1)}%`,
      )
    } finally {
      this.isRunning = false
      console.log(`🔄 [TrendBot] Cycle #${this.stats.totalRuns} finished`)
    }
  }

  async performHealthChecks() {
    const healthStatus = {
      trendCrawler: false,
      groqService: false,
      unsplashService: false,
      tweetScraper: false,
      database: false,
    }

    try {
      console.log("🏥 [TrendBot] Checking TrendCrawler health...")
      healthStatus.trendCrawler = await TrendCrawler.healthCheck()
      console.log(`🕷️ [TrendBot] TrendCrawler health: ${JSON.stringify(healthStatus.trendCrawler)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] TrendCrawler health check failed: ${error.message}`)
      healthStatus.trendCrawler = { status: "unhealthy", error: error.message, timestamp: new Date().toISOString() }
    }

    try {
      console.log("🏥 [TrendBot] Checking GroqService health...")
      healthStatus.groqService = await GroqService.testConnection()
      console.log(`🤖 [TrendBot] GroqService health: ${JSON.stringify(healthStatus.groqService)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] GroqService health check failed: ${error.message}`)
      healthStatus.groqService = { success: false, error: error.message }
    }

    try {
      console.log("🏥 [TrendBot] Checking UnsplashService health...")
      healthStatus.unsplashService = await UnsplashService.testConnection()
      console.log(`🖼️ [TrendBot] UnsplashService health: ${JSON.stringify(healthStatus.unsplashService)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] UnsplashService health check failed: ${error.message}`)
      healthStatus.unsplashService = { success: false, error: error.message, fallbackAvailable: true }
    }

    try {
      console.log("🏥 [TrendBot] Checking TweetScraper health...")
      healthStatus.tweetScraper = await TweetScraper.healthCheck()
      console.log(`🐦 [TrendBot] TweetScraper health: ${JSON.stringify(healthStatus.tweetScraper)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] TweetScraper health check failed: ${error.message}`)
      healthStatus.tweetScraper = { status: "unhealthy", error: error.message, timestamp: new Date().toISOString() }
    }

    try {
      console.log("🏥 [TrendBot] Checking Database health...")
      const articleCount = await Article.countDocuments()
      healthStatus.database = true
      console.log(`🗄️ [TrendBot] Database health: ✅ Healthy (${articleCount} articles)`)
    } catch (error) {
      console.log("❌ [TrendBot] Database health check failed:", error.message)
    }

    return healthStatus
  }

  async processTrends(rawTrends) {
    console.log(`🔍 [TrendBot] Processing ${rawTrends ? rawTrends.length : 0} raw trends...`)

    if (!rawTrends || !Array.isArray(rawTrends) || rawTrends.length === 0) {
      console.log("⚠️ [TrendBot] No valid trends to process, returning empty array")
      return []
    }

    // Remove duplicates
    const uniqueTrends = this.removeDuplicateTrends(rawTrends)
    console.log(`🔄 [TrendBot] Removed duplicates: ${rawTrends.length} → ${uniqueTrends.length}`)

    // Filter by quality
    const qualityTrends = this.filterTrendsByQuality(uniqueTrends)
    console.log(`✨ [TrendBot] Quality filtered: ${uniqueTrends.length} → ${qualityTrends.length}`)

    // Check for existing articles
    const newTrends = await this.filterExistingArticles(qualityTrends)
    console.log(`🆕 [TrendBot] New trends (not already covered): ${qualityTrends.length} → ${newTrends.length}`)

    // Score and sort trends
    const scoredTrends = this.scoreTrends(newTrends)
    console.log(`📊 [TrendBot] Trends scored and sorted by relevance`)

    return scoredTrends
  }

  removeDuplicateTrends(trends) {
    const seen = new Set()
    return trends.filter((trend) => {
      const key = trend.title.toLowerCase().trim()
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  filterTrendsByQuality(trends) {
    return trends.filter((trend) => {
      if (!trend.title || trend.title.length < 10) return false
      if (!trend.description && !trend.content) return false
      const spamKeywords = ["click here", "buy now", "free download", "limited time"]
      const titleLower = trend.title.toLowerCase()
      if (spamKeywords.some((keyword) => titleLower.includes(keyword))) return false
      return true
    })
  }

  async filterExistingArticles(trends) {
    const newTrends = []

    for (const trend of trends) {
      try {
        const existingArticle = await Article.findOne({
          $or: [
            { title: new RegExp(trend.title.substring(0, 20), "i") },
            { slug: trend.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
          ],
        })

        if (!existingArticle) {
          newTrends.push(trend)
        } else {
          console.log(`⏭️ [TrendBot] Skipping existing topic: "${trend.title}"`)
        }
      } catch (error) {
        console.error(`❌ [TrendBot] Error checking existing article for "${trend.title}":`, error)
        newTrends.push(trend)
      }
    }

    return newTrends
  }

  scoreTrends(trends) {
    return trends
      .map((trend) => {
        let score = 0

        const titleLength = trend.title.length
        if (titleLength >= 40 && titleLength <= 80) score += 10
        else if (titleLength >= 20 && titleLength <= 100) score += 5

        if (trend.description && trend.description.length > 50) score += 10

        if (trend.source === "google-trends") score += 15
        else if (trend.source === "reddit-hot") score += 10

        if (this.config.categories.some((cat) => trend.title.toLowerCase().includes(cat.toLowerCase()))) {
          score += 20
        }

        if (trend.engagement && trend.engagement > 100) score += 5
        if (trend.engagement && trend.engagement > 1000) score += 10

        return { ...trend, score }
      })
      .sort((a, b) => b.score - a.score)
  }

  async generateArticle(trend) {
    console.log(`📝 [TrendBot] Starting article generation for: "${trend.title}"`)

    try {
      console.log("🤖 [TrendBot] Generating AI content...")
      const aiContent = await GroqService.generateArticleContent(trend)

      if (!aiContent || !aiContent.content) {
        throw new Error("AI service returned invalid content")
      }

      console.log(`✅ [TrendBot] AI content generated: ${aiContent.content.length} characters`)

      // Use GNews image first, then fallback to Unsplash, then placeholder
      let thumbnail = null

      if (trend.image) {
        thumbnail = trend.image
        console.log(`✅ [TrendBot] Using GNews image: ${thumbnail}`)
      } else {
        console.log(`🖼️ [TrendBot] No GNews image, fetching from Unsplash for: "${trend.title?.substring(0, 30)}..."`)
        try {
          const imageResult = await UnsplashService.searchImages(trend.title, 1)
          if (imageResult.success && imageResult.images.length > 0) {
            thumbnail = imageResult.images[0].url
            console.log(`✅ [TrendBot] Found Unsplash image: ${thumbnail}`)
          }
        } catch (imageError) {
          console.log(`⚠️ [TrendBot] Image fetch failed: ${imageError.message}`)
        }
      }

      // If no image found, use placeholder
      if (!thumbnail) {
        thumbnail = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(trend.title)}`
        console.log(`📷 [TrendBot] Using placeholder image`)
      }

      console.log(`🐦 [TrendBot] Generating tweets for: "${trend.title?.substring(0, 30)}..."`)
      const tweets = await GroqService.generateTweetContent(trend.title, 5)

      const articleData = {
        title: trend.title,
        slug: this.generateSlug(trend.title),
        excerpt: trend.description || aiContent.excerpt || "Latest trending news and updates",
        content: aiContent.content,
        thumbnail: thumbnail,
        tags: trend.tags || aiContent.tags || ["trending", "news"],
        category: trend.category || "General",
        readTime: this.calculateReadTime(aiContent.content),
        featured: Math.random() < 0.2, // 20% chance of being featured
        trendScore: trend.score || Math.floor(Math.random() * 50) + 50,
        // Start with zero engagement - only real user interactions count
        views: 0,
        likes: 0,
        saves: 0,
        source: {
          name: trend.source || "TrendWise AI",
          url: trend.url || "https://trendwise.com",
        },
        media: {
          images: thumbnail && !thumbnail.includes("placeholder.svg") ? [{ url: thumbnail, alt: trend.title }] : [],
          videos: [],
          tweets: tweets || [],
        },
        seo: aiContent.seo || {
          metaTitle: trend.title.substring(0, 60),
          metaDescription: (trend.description || "").substring(0, 160),
          keywords: (trend.tags || ["trending", "news"]).join(", "),
        },
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      console.log("💾 [TrendBot] Saving article to database...")
      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [TrendBot] Article saved successfully with ID: ${article._id}`)
      console.log(`🖼️ [TrendBot] Article thumbnail: ${article.thumbnail}`)
      console.log(
        `📊 [TrendBot] Initial engagement: ${article.views} views, ${article.likes} likes, ${article.saves} saves`,
      )
      return article
    } catch (error) {
      console.error(`❌ [TrendBot] Failed to generate article for "${trend.title}":`, error)
      throw error
    }
  }

  generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    }).substring(0, 100)
  }

  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  getStatus() {
    return {
      isActive: this.isActive,
      isRunning: this.isRunning,
      stats: this.stats,
      config: this.config,
      health: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastError: this.stats.errors.length > 0 ? this.stats.errors[this.stats.errors.length - 1] : null,
      },
    }
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalRuns > 0 ? (this.stats.successfulRuns / this.stats.totalRuns) * 100 : 0,
      averageArticlesPerRun:
        this.stats.successfulRuns > 0 ? this.stats.articlesGenerated / this.stats.successfulRuns : 0,
    }
  }

  generateFallbackTrends() {
    const fallbackTopics = [
      {
        title: "Latest Developments in Artificial Intelligence Technology",
        description: "Exploring the newest breakthroughs in AI and machine learning",
        source: "fallback",
        category: "Technology",
      },
      {
        title: "Sustainable Business Practices Gaining Momentum",
        description: "How companies are adopting eco-friendly strategies",
        source: "fallback",
        category: "Business",
      },
      {
        title: "Revolutionary Health Tech Innovations",
        description: "New medical technologies improving patient care",
        source: "fallback",
        category: "Health",
      },
    ]

    console.log(`🔄 [TrendBot] Generated ${fallbackTopics.length} fallback trends`)
    return fallbackTopics
  }

  calculateNextRun() {
    const nextRun = new Date(Date.now() + 5 * 60 * 1000)
    return nextRun.toISOString()
  }

  async manualTrigger() {
    console.log("🚀 [TrendBot] Manual trigger requested")

    if (this.isRunning) {
      console.log("⚠️ [TrendBot] Bot is already running, cannot trigger manually")
      return { success: false, message: "Bot is already running" }
    }

    try {
      await this.runCycle()
      return { success: true, message: "Manual trigger completed successfully" }
    } catch (error) {
      console.error("❌ [TrendBot] Manual trigger failed:", error)
      return { success: false, message: error.message }
    }
  }

  triggerManualRun() {
    console.log("🔧 [TREND BOT] Manual content generation triggered")
    this.generateContent()
  }

  async generateContent() {
    if (!this.isActive) {
      console.log("⚠️ [TREND BOT] Bot is stopped, skipping content generation")
      return
    }

    console.log("🎯 [TREND BOT] Starting content generation cycle...")
    const startTime = Date.now()
    this.stats.lastRun = new Date()

    try {
      console.log("📊 [TREND BOT] Step 1: Fetching trending topics...")
      const trendsResult = await TrendCrawler.getTrendingTopics()

      if (!trendsResult.success || !trendsResult.trends || trendsResult.trends.length === 0) {
        throw new Error("No trending topics found")
      }

      console.log(`✅ [TREND BOT] Found ${trendsResult.trends.length} trending topics`)

      const processedArticles = []
      const maxArticlesToProcess = Math.min(trendsResult.trends.length, this.config.maxArticlesPerRun)

      for (let i = 0; i < maxArticlesToProcess; i++) {
        const trend = trendsResult.trends[i]
        console.log(
          `🔄 [TREND BOT] Processing trend ${i + 1}/${maxArticlesToProcess}: "${trend.title?.substring(0, 50)}..."`,
        )

        try {
          const existingArticle = await Article.findOne({
            $or: [{ title: trend.title }, { slug: this.generateSlug(trend.title) }],
          })

          if (existingArticle) {
            console.log(`⏭️ [TREND BOT] Article already exists: "${trend.title?.substring(0, 50)}..."`)
            continue
          }

          console.log(`🤖 [TREND BOT] Generating AI content for: "${trend.title?.substring(0, 50)}..."`)
          const aiContent = await GroqService.generateArticleContent(trend)

          console.log(`🖼️ [TREND BOT] Processing image for: "${trend.title?.substring(0, 30)}..."`)
          let thumbnail = null

          if (trend.image) {
            thumbnail = trend.image
            console.log(`✅ [TREND BOT] Using GNews image: ${thumbnail}`)
          } else {
            console.log(`🖼️ [TREND BOT] No GNews image, fetching from Unsplash...`)
            try {
              const imageResult = await UnsplashService.searchImages(trend.title, 1)
              if (imageResult.success && imageResult.images.length > 0) {
                thumbnail = imageResult.images[0].url
                console.log(`✅ [TREND BOT] Found Unsplash image: ${thumbnail}`)
              }
            } catch (imageError) {
              console.log(`⚠️ [TREND BOT] Image fetch failed: ${imageError.message}`)
            }
          }

          if (!thumbnail) {
            thumbnail = `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(trend.title)}`
            console.log(`📷 [TREND BOT] Using placeholder image`)
          }

          const articleData = {
            title: trend.title,
            slug: this.generateSlug(trend.title),
            excerpt: trend.description || aiContent.excerpt || "Latest trending news and updates",
            content: aiContent.content,
            thumbnail: thumbnail,
            tags: trend.tags || aiContent.tags || ["trending", "news"],
            category: trend.category || "General",
            readTime: this.calculateReadTime(aiContent.content),
            featured: Math.random() < 0.2,
            trendScore: trend.score || Math.floor(Math.random() * 50) + 50,
            // Real engagement starts at zero
            views: 0,
            likes: 0,
            saves: 0,
            source: {
              name: trend.source || "TrendWise AI",
              url: trend.url || "https://trendwise.com",
            },
            media: {
              images: thumbnail && !thumbnail.includes("placeholder.svg") ? [{ url: thumbnail, alt: trend.title }] : [],
              videos: [],
              tweets: [],
            },
            seo: aiContent.seo || {
              metaTitle: trend.title.substring(0, 60),
              metaDescription: (trend.description || "").substring(0, 160),
              keywords: (trend.tags || ["trending", "news"]).join(", "),
            },
            publishedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          console.log("💾 [TREND BOT] Saving article to database...")
          const article = new Article(articleData)
          await article.save()

          processedArticles.push(article)
          this.stats.articlesGenerated++

          console.log(`✅ [TREND BOT] Created article: "${article.title}" (ID: ${article._id})`)
          console.log(
            `📊 [TREND BOT] Article stats: ${article.readTime}min read, ${article.tags.length} tags, Featured: ${article.featured}`,
          )
        } catch (articleError) {
          console.error(`❌ [TREND BOT] Failed to process trend "${trend.title}":`, articleError.message)
          this.stats.errors.push({
            trend: trend.title,
            error: articleError.message,
            timestamp: new Date(),
          })
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      console.log(`🎉 [TREND BOT] Content generation completed!`)
      console.log(`📊 [TREND BOT] Summary:`)
      console.log(`   • Articles created: ${processedArticles.length}`)
      console.log(`   • Total articles generated: ${this.stats.articlesGenerated}`)
      console.log(`   • Duration: ${duration.toFixed(2)} seconds`)
      console.log(`   • Next run in: ${this.config.interval} minutes`)
    } catch (error) {
      console.error("❌ [TREND BOT] Content generation failed:", error.message)
      this.stats.errors.push({
        error: error.message,
        timestamp: new Date(),
      })
    }
  }
}

const trendBotInstance = new TrendBot()
module.exports = trendBotInstance
