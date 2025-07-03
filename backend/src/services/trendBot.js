const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const UnsplashService = require("./unsplashService")
const Article = require("../models/Article")
const slugify = require("slugify")
require("dotenv").config()

console.log(
  `[TREND BOT] Loaded GNEWS_API_KEY: ${process.env.GNEWS_API_KEY ? process.env.GNEWS_API_KEY.slice(0, 4) + "****" : "NOT FOUND"}`,
)

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
      // Changed from 10 minutes to 5 minutes
      interval: "*/5 * * * *", // Every 5 minutes
      maxArticlesPerRun: 5, // Reduced to 5 to avoid overwhelming
      retryAttempts: 3,
      retryDelay: 5000,
      categories: ["Technology", "Business", "Health", "Science", "Entertainment"],
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
      // Use the imported instance directly
      const crawlResult = await TrendCrawler.crawlTrends()
      console.log(`📊 [TrendBot] Crawl result: ${JSON.stringify(crawlResult)}`)

      // Extract trends array from the result object
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
      database: false,
    }

    try {
      // Check TrendCrawler - use the imported instance directly
      console.log("🏥 [TrendBot] Checking TrendCrawler health...")
      healthStatus.trendCrawler = await TrendCrawler.healthCheck()
      console.log(`🕷️ [TrendBot] TrendCrawler health: ${JSON.stringify(healthStatus.trendCrawler)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] TrendCrawler health check failed: ${error.message}`)
      healthStatus.trendCrawler = { status: "unhealthy", error: error.message, timestamp: new Date().toISOString() }
    }

    try {
      // Check GroqService - use the imported instance directly
      console.log("🏥 [TrendBot] Checking GroqService health...")
      healthStatus.groqService = await GroqService.testConnection()
      console.log(`🤖 [TrendBot] GroqService health: ${JSON.stringify(healthStatus.groqService)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] GroqService health check failed: ${error.message}`)
      healthStatus.groqService = { success: false, error: error.message }
    }

    try {
      // Check UnsplashService - use the imported instance directly
      console.log("🏥 [TrendBot] Checking UnsplashService health...")
      healthStatus.unsplashService = await UnsplashService.testConnection()
      console.log(`🖼️ [TrendBot] UnsplashService health: ${JSON.stringify(healthStatus.unsplashService)}`)
    } catch (error) {
      console.log(`❌ [TrendBot] UnsplashService health check failed: ${error.message}`)
      healthStatus.unsplashService = { success: false, error: error.message, fallbackAvailable: true }
    }

    try {
      // Check Database
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

    // Check for existing articles - FIXED: Less aggressive duplicate checking
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
      // Must have title
      if (!trend.title || trend.title.length < 10) return false

      // Must have some description or content
      if (!trend.description && !trend.content) return false

      // Filter out spam/low-quality content
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
        // FIXED: Less aggressive duplicate checking - only check exact URL matches
        const query =
          trend.url && trend.url !== "#"
            ? {
                $or: [{ "source.url": trend.url }, { "trendData.originalUrl": trend.url }],
              }
            : null

        let existingArticle = null
        if (query) {
          console.log(`🔍 [TrendBot] Checking for existing article with URL: ${trend.url}`)
          existingArticle = await Article.findOne(query)
        }

        if (!existingArticle) {
          console.log(`🆕 [TrendBot] No duplicate found. Will generate: "${trend.title}"`)
          newTrends.push(trend)
        } else {
          console.log(`⏭️ [TrendBot] Skipping existing topic: "${trend.title}" (matched by URL)`)
        }
      } catch (error) {
        console.error(`❌ [TrendBot] Error checking existing article for "${trend.title}":`, error)
        // Include the trend anyway if we can't check
        newTrends.push(trend)
      }
    }

    return newTrends
  }

  scoreTrends(trends) {
    return trends
      .map((trend) => {
        let score = 0

        // Score based on title length (sweet spot: 40-80 characters)
        const titleLength = trend.title.length
        if (titleLength >= 40 && titleLength <= 80) score += 10
        else if (titleLength >= 20 && titleLength <= 100) score += 5

        // Score based on description quality
        if (trend.description && trend.description.length > 50) score += 10

        // Score based on source reliability
        if (trend.source === "google-trends") score += 15
        else if (trend.source === "reddit-hot") score += 10

        // Score based on category relevance
        if (this.config.categories.some((cat) => trend.title.toLowerCase().includes(cat.toLowerCase()))) {
          score += 20
        }

        // Score based on engagement (if available)
        if (trend.engagement && trend.engagement > 100) score += 5
        if (trend.engagement && trend.engagement > 1000) score += 10

        return { ...trend, score }
      })
      .sort((a, b) => b.score - a.score)
  }

  async generateArticle(trend) {
    console.log(`📝 [TrendBot] Starting article generation for: "${trend.title}"`)

    try {
      // Step 1: Generate content using AI
      console.log("🤖 [TrendBot] Generating AI content...")
      // Use the imported instance directly
      const aiContent = await GroqService.generateArticleContent(trend)

      if (!aiContent || !aiContent.content) {
        throw new Error("AI service returned invalid content")
      }

      console.log(`✅ [TrendBot] AI content generated: ${aiContent.content.length} characters`)

      // Step 2: Fetch featured image
      console.log("🖼️ [TrendBot] Fetching featured image...")
      let thumbnail = "/placeholder.svg?height=400&width=600"

      try {
        // Use the imported instance directly
        const imageUrl = await UnsplashService.searchImage(trend.title)
        if (imageUrl) {
          thumbnail = imageUrl
          console.log("✅ [TrendBot] Featured image fetched from Unsplash")
        } else {
          console.log("⚠️ [TrendBot] No suitable image found, using placeholder")
        }
      } catch (imageError) {
        console.log("⚠️ [TrendBot] Image fetch failed, using placeholder:", imageError.message)
      }

      // Step 3: Create article object with realistic engagement numbers
      const articleData = {
        title: trend.title,
        slug: this.generateSlug(trend.title),
        content: aiContent.content,
        excerpt: trend.description || this.generateExcerpt(aiContent.content),
        thumbnail: thumbnail,
        category: this.categorizeContent(trend.title, trend.description || ""),
        tags: this.extractTags(trend.title, trend.description || ""),
        readTime: this.calculateReadTime(aiContent.content),
        views: Math.floor(Math.random() * 500) + 50, // Random views between 50-550
        likes: Math.floor(Math.random() * 100) + 10, // Random likes between 10-110
        saves: Math.floor(Math.random() * 50) + 5, // Random saves between 5-55
        featured: Math.random() > 0.7,
        status: "published",
        publishedAt: new Date(),
        source: {
          name: trend.source || "TrendWise AI",
          url: trend.url || "#",
        },
        trendData: {
          source: trend.source || "unknown",
          originalQuery: trend.title,
          originalUrl: trend.url || "#",
          trendScore: trend.score || 50,
          searchVolume: trend.searchVolume || "1K-10K",
          geo: "US",
          crawledAt: new Date(),
        },
      }

      // Step 4: Save to database
      console.log("💾 [TrendBot] Saving article to database...")
      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [TrendBot] Article saved successfully with ID: ${article._id}`)
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

  generateExcerpt(content) {
    // Remove HTML tags and get first 160 characters
    const plainText = content.replace(/<[^>]*>/g, "")
    return plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText
  }

  categorizeContent(title, content) {
    const text = (title + " " + content).toLowerCase()

    const categoryKeywords = {
      Technology: ["tech", "ai", "artificial intelligence", "software", "app", "digital", "innovation", "startup"],
      Business: ["business", "economy", "market", "finance", "investment", "company", "corporate", "entrepreneur"],
      Health: ["health", "medical", "medicine", "wellness", "fitness", "nutrition", "healthcare", "disease"],
      Science: ["science", "research", "study", "discovery", "experiment", "scientific", "breakthrough"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "film", "show", "gaming", "sports"],
      Politics: ["politics", "government", "election", "policy", "law", "congress", "president", "political"],
      Environment: ["environment", "climate", "green", "sustainability", "renewable", "carbon", "pollution"],
    }

    let bestCategory = "General"
    let maxScore = 0

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (text.match(new RegExp(keyword, "g")) || []).length
        return acc + matches
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestCategory = category
      }
    }

    return bestCategory
  }

  extractTags(title, content) {
    const text = (title + " " + content).toLowerCase()
    const commonTags = [
      "trending",
      "news",
      "technology",
      "business",
      "health",
      "science",
      "innovation",
      "analysis",
      "breaking",
      "update",
      "ai",
      "digital",
      "future",
      "market",
      "research",
    ]

    const foundTags = commonTags.filter((tag) => text.includes(tag))

    // Add some dynamic tags based on title words
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !["this", "that", "with", "from", "they", "have", "been"].includes(word))

    foundTags.push(...titleWords.slice(0, 3))

    // Remove duplicates and limit to 8 tags
    return [...new Set(foundTags)].slice(0, 8)
  }

  generateFallbackTrends() {
    const fallbackTopics = [
      {
        title: "Latest Developments in Artificial Intelligence Technology",
        description: "Exploring the newest breakthroughs in AI and machine learning",
        source: "fallback",
        category: "Technology",
        url: "#fallback-ai-" + Date.now(),
      },
      {
        title: "Sustainable Business Practices Gaining Momentum",
        description: "How companies are adopting eco-friendly strategies",
        source: "fallback",
        category: "Business",
        url: "#fallback-business-" + Date.now(),
      },
      {
        title: "Revolutionary Health Tech Innovations",
        description: "New medical technologies improving patient care",
        source: "fallback",
        category: "Health",
        url: "#fallback-health-" + Date.now(),
      },
    ]

    console.log(`🔄 [TrendBot] Generated ${fallbackTopics.length} fallback trends`)
    return fallbackTopics
  }

  calculateNextRun() {
    // For 5-minute intervals, add 5 minutes to current time
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
      // Run the cycle manually
      await this.runCycle()
      return { success: true, message: "Manual trigger completed successfully" }
    } catch (error) {
      console.error("❌ [TrendBot] Manual trigger failed:", error)
      return { success: false, message: error.message }
    }
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

  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.split(" ").length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }
}

// Create and export a singleton instance
const trendBotInstance = new TrendBot()
module.exports = trendBotInstance

// Expose a manual trigger for the refresh endpoint
module.exports.manualTrigger = async () => {
  const bot = new TrendBot()
  await bot.runCycle()
  return bot.stats
}
