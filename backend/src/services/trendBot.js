const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const UnsplashService = require("./unsplashService")
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
      // Run every 30 minutes for more frequent content generation
      interval: "*/30 * * * *",
      maxArticlesPerRun: 2,
      retryAttempts: 3,
      retryDelay: 5000,
      categories: ["Technology", "Business", "Health", "Science", "Entertainment"],
      sources: ["google-trends", "reddit-hot"],
    }

    console.log("🤖 [TrendBot] Initialized with 30-minute interval configuration")
    console.log(`🔧 [TrendBot] Config: ${JSON.stringify(this.config, null, 2)}`)
  }

  start() {
    if (this.isActive) {
      console.log("⚠️ [TrendBot] Already active, skipping start")
      return
    }

    try {
      console.log("🚀 [TrendBot] Starting automated content generation bot...")
      console.log(`⏰ [TrendBot] Schedule: Every 30 minutes (${this.config.interval})`)
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

      // Run immediately on start to generate initial content
      setTimeout(() => this.runCycle(), 10000) // Wait 10 seconds then run
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

      // Step 2: Generate articles using Groq
      console.log("🤖 [TrendBot] Starting article generation with Groq...")
      const groqService = new GroqService()

      // Generate trending topics
      const trendingTopics = this.generateTrendingTopics()
      console.log(`📊 [TrendBot] Generated ${trendingTopics.length} trending topics`)

      // Step 3: Generate articles
      let articlesGenerated = 0
      for (let i = 0; i < Math.min(trendingTopics.length, this.config.maxArticlesPerRun); i++) {
        const topic = trendingTopics[i]
        console.log(`📝 [TrendBot] Generating article ${i + 1}/${this.config.maxArticlesPerRun} for: "${topic.title}"`)

        try {
          const article = await this.generateArticle(topic, groqService)
          if (article) {
            articlesGenerated++
            console.log(`✅ [TrendBot] Successfully created article: "${article.title}"`)
          }
        } catch (error) {
          console.error(`❌ [TrendBot] Failed to generate article for "${topic.title}":`, error)
          this.stats.errors.push({
            timestamp: new Date().toISOString(),
            topic: topic.title,
            error: error.message,
          })
        }
      }

      // Step 4: Update statistics
      this.stats.articlesGenerated += articlesGenerated
      this.stats.successfulRuns++

      const duration = Date.now() - startTime
      console.log(`🎉 [TrendBot] Cycle completed successfully in ${duration}ms`)
      console.log(`📊 [TrendBot] Generated ${articlesGenerated}/${this.config.maxArticlesPerRun} articles`)
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
      groqService: false,
      database: false,
    }

    try {
      // Check GroqService
      const groqService = new GroqService()
      healthStatus.groqService = await groqService.healthCheck()
      console.log(`🤖 [TrendBot] GroqService health: ${healthStatus.groqService ? "✅ Healthy" : "❌ Unhealthy"}`)
    } catch (error) {
      console.log("❌ [TrendBot] GroqService health check failed:", error.message)
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

  generateTrendingTopics() {
    const topics = [
      {
        title: "Latest Breakthroughs in Artificial Intelligence and Machine Learning",
        description: "Exploring the newest developments in AI technology and their real-world applications",
        category: "Technology",
        source: "trending",
      },
      {
        title: "Sustainable Energy Solutions Transforming Global Markets",
        description: "How renewable energy innovations are reshaping the global energy landscape",
        category: "Environment",
        source: "trending",
      },
      {
        title: "Revolutionary Healthcare Technologies Improving Patient Outcomes",
        description: "New medical technologies and treatments that are changing healthcare delivery",
        category: "Health",
        source: "trending",
      },
      {
        title: "The Future of Remote Work and Digital Collaboration",
        description: "How remote work technologies are evolving and shaping the future of business",
        category: "Business",
        source: "trending",
      },
      {
        title: "Quantum Computing Advances and Their Practical Applications",
        description: "Recent breakthroughs in quantum computing and their potential impact on various industries",
        category: "Technology",
        source: "trending",
      },
      {
        title: "Climate Change Adaptation Strategies for Modern Cities",
        description: "How urban areas are adapting to climate change through innovative planning and technology",
        category: "Environment",
        source: "trending",
      },
      {
        title: "Breakthrough Treatments in Personalized Medicine",
        description: "How genetic research is enabling personalized treatment approaches",
        category: "Health",
        source: "trending",
      },
      {
        title: "The Rise of Sustainable Fashion and Circular Economy",
        description: "How the fashion industry is embracing sustainability and circular business models",
        category: "Business",
        source: "trending",
      },
    ]

    // Shuffle and return a subset
    const shuffled = topics.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 4)
  }

  async generateArticle(topic, groqService) {
    console.log(`📝 [TrendBot] Starting article generation for: "${topic.title}"`)

    try {
      // Step 1: Generate content using Groq AI
      console.log("🤖 [TrendBot] Generating AI content with Groq...")
      const aiContent = await groqService.generateArticle(topic)

      if (!aiContent || !aiContent.title || !aiContent.content) {
        throw new Error("Groq service returned invalid content")
      }

      console.log(`✅ [TrendBot] AI content generated: ${aiContent.content.length} characters`)

      // Step 2: Fetch featured image
      console.log("🖼️ [TrendBot] Fetching featured image...")
      let thumbnail = "/placeholder.svg?height=400&width=600"

      try {
        const unsplashService = new UnsplashService()
        const imageUrl = await unsplashService.searchImage(topic.title)
        if (imageUrl) {
          thumbnail = imageUrl
          console.log("✅ [TrendBot] Featured image fetched from Unsplash")
        } else {
          console.log("⚠️ [TrendBot] No suitable image found, using placeholder")
        }
      } catch (imageError) {
        console.log("⚠️ [TrendBot] Image fetch failed, using placeholder:", imageError.message)
      }

      // Step 3: Create article object
      const articleData = {
        title: aiContent.title,
        slug: this.generateSlug(aiContent.title),
        content: aiContent.content,
        excerpt: aiContent.excerpt || this.generateExcerpt(aiContent.content),
        thumbnail: thumbnail,
        author: "TrendBot AI",
        category: topic.category || this.categorizeContent(aiContent.title, aiContent.content),
        tags: aiContent.tags || this.extractTags(aiContent.title, aiContent.content),
        status: "published",
        publishedAt: new Date(),
        createdAt: new Date(),
        views: Math.floor(Math.random() * 100) + 50, // Random initial views
        likes: Math.floor(Math.random() * 20) + 5, // Random initial likes
        saves: Math.floor(Math.random() * 10) + 2, // Random initial saves
        featured: Math.random() > 0.7, // 30% chance of being featured
        readTime: Math.ceil(aiContent.content.length / 200), // Estimate read time
        seo: {
          metaTitle: aiContent.title,
          metaDescription: aiContent.excerpt || this.generateExcerpt(aiContent.content),
          keywords: (aiContent.tags || []).join(", "),
        },
        source: {
          type: "trend",
          originalTopic: topic,
          generatedBy: "TrendBot",
          generatedAt: new Date(),
        },
      }

      // Step 4: Save to database
      console.log("💾 [TrendBot] Saving article to database...")
      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [TrendBot] Article saved successfully with ID: ${article._id}`)
      return article
    } catch (error) {
      console.error(`❌ [TrendBot] Failed to generate article for "${topic.title}":`, error)
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
    const plainText = content.replace(/<[^>]*>/g, "").replace(/#+\s*/g, "")
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

  calculateNextRun() {
    // For 30-minute intervals, add 30 minutes to current time
    const nextRun = new Date(Date.now() + 30 * 60 * 1000)
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
}

// Create and export a singleton instance
const trendBotInstance = new TrendBot()
module.exports = trendBotInstance
