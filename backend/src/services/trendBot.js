const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const UnsplashService = require("./unsplashService")
const Article = require("../models/Article")
const slugify = require("slugify")
const gnewsService = require("./gnewsService")

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
      categories: ["Technology", "Business", "Health", "Science", "Sports", "Entertainment", "Politics", "World News"],
      sources: ["google-trends", "reddit-hot"],
    }

    console.log("🤖 [TrendBot] Initialized with 30-minute interval configuration")
    console.log(`🔧 [TrendBot] Config: ${JSON.stringify(this.config, null, 2)}`)
  }

  start() {
    if (this.isActive) {
      console.log("🤖 [TRENDBOT] Already running")
      return
    }

    console.log("🤖 [TRENDBOT] Starting TrendBot...")
    this.isActive = true

    // Run immediately on startup
    this.generateArticles().catch((error) => {
      console.error("❌ [TRENDBOT] Initial run failed:", error)
    })

    // Schedule to run every 30 minutes
    this.cronJob = cron.schedule("*/30 * * * *", async () => {
      console.log("🤖 [TRENDBOT] Scheduled run starting...")
      try {
        await this.generateArticles()
      } catch (error) {
        console.error("❌ [TRENDBOT] Scheduled run failed:", error)
      }
    })

    console.log("✅ [TRENDBOT] Started successfully - will run every 30 minutes")
  }

  stop() {
    if (!this.isActive) {
      console.log("🤖 [TRENDBOT] Already stopped")
      return
    }

    console.log("🤖 [TRENDBOT] Stopping...")
    this.isActive = false

    if (this.cronJob) {
      this.cronJob.destroy()
      this.cronJob = null
    }

    console.log("✅ [TRENDBOT] Stopped successfully")
  }

  async generateArticles() {
    if (!this.isActive) {
      console.log("🤖 [TRENDBOT] Bot is not active, skipping generation")
      return
    }

    console.log("🤖 [TRENDBOT] Starting article generation...")
    this.stats.lastRun = new Date()

    try {
      // Check if we have recent articles (less than 1 hour old)
      const recentArticles = await Article.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
      })

      if (recentArticles >= 5) {
        console.log(`🤖 [TRENDBOT] Found ${recentArticles} recent articles, skipping generation`)
        return
      }

      // Generate 3-5 articles
      const articlesToGenerate = Math.floor(Math.random() * 3) + 3
      console.log(`🤖 [TRENDBOT] Generating ${articlesToGenerate} articles...`)

      const promises = []
      for (let i = 0; i < articlesToGenerate; i++) {
        promises.push(this.generateSingleArticle())
      }

      const results = await Promise.allSettled(promises)
      const successful = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length

      this.stats.articlesGenerated += successful

      console.log(`✅ [TRENDBOT] Generation complete: ${successful} successful, ${failed} failed`)
      console.log(`📊 [TRENDBOT] Total articles generated: ${this.stats.articlesGenerated}`)
    } catch (error) {
      console.error("❌ [TRENDBOT] Article generation failed:", error)
    }
  }

  async generateSingleArticle() {
    try {
      // Get trending topics from GNews
      let trendingTopics = []
      try {
        trendingTopics = await gnewsService.getTrendingTopics()
      } catch (error) {
        console.warn("⚠️ [TRENDBOT] Failed to get trending topics, using fallback")
      }

      // Select a random category
      const category = this.config.categories[Math.floor(Math.random() * this.config.categories.length)]

      // Generate article title and content
      const title = this.generateTitle(category, trendingTopics)
      const slug = this.generateSlug(title)

      console.log(`🤖 [TRENDBOT] Generating article: "${title}"`)

      // Check if article with this slug already exists
      const existingArticle = await Article.findOne({ slug })
      if (existingArticle) {
        console.log(`⚠️ [TRENDBOT] Article with slug "${slug}" already exists, skipping`)
        return
      }

      // Generate content using Groq
      const content = await GroqService.generateArticleContent(title, category, trendingTopics.slice(0, 3))
      const summary = await GroqService.generateSummary(content, 200)

      // Get image from Unsplash
      let imageUrl = "/placeholder.svg?height=400&width=600"
      try {
        imageUrl = await UnsplashService.getImage(category.toLowerCase())
      } catch (error) {
        console.warn("⚠️ [TRENDBOT] Failed to get image, using placeholder")
      }

      // Create article
      const article = new Article({
        title,
        slug,
        content,
        summary,
        category,
        author: "TrendBot AI",
        imageUrl,
        tags: this.generateTags(category, trendingTopics),
        status: "published",
        publishedAt: new Date(),
        createdAt: new Date(),
        views: Math.floor(Math.random() * 1000) + 100,
        likes: Math.floor(Math.random() * 50) + 5,
        saves: Math.floor(Math.random() * 10) + 2,
        featured: Math.random() > 0.7, // 30% chance of being featured
        readTime: Math.ceil(content.length / 200), // Estimate read time
        seo: {
          metaTitle: title,
          metaDescription: summary,
          keywords: (this.generateTags(category, trendingTopics) || []).join(", "),
        },
        source: {
          type: "trend",
          originalCategory: category,
          generatedBy: "TrendBot",
          generatedAt: new Date(),
        },
      })

      await article.save()
      console.log(`✅ [TRENDBOT] Article created: "${title}"`)

      return article
    } catch (error) {
      console.error("❌ [TRENDBOT] Failed to generate single article:", error)
      throw error
    }
  }

  generateTitle(category, trends = []) {
    const titleTemplates = {
      Technology: [
        "Revolutionary AI Breakthrough Changes Everything",
        "New Tech Innovation Disrupts Industry",
        "Major Software Update Brings Exciting Features",
        "Cybersecurity Alert: New Threats Emerge",
        "Tech Giants Announce Major Partnership",
      ],
      Business: [
        "Market Analysis: Key Trends to Watch",
        "Major Corporate Merger Announced",
        "Economic Indicators Show Positive Growth",
        "Startup Raises Record-Breaking Funding",
        "Industry Leaders Share Future Predictions",
      ],
      Health: [
        "Medical Breakthrough Offers New Hope",
        "Health Study Reveals Surprising Results",
        "New Treatment Shows Promising Results",
        "Public Health Officials Issue Important Update",
        "Wellness Trends Gaining Global Attention",
      ],
      Science: [
        "Scientific Discovery Challenges Current Understanding",
        "Research Team Makes Groundbreaking Finding",
        "Climate Study Reveals Critical Data",
        "Space Exploration Reaches New Milestone",
        "Environmental Research Shows Promising Solutions",
      ],
      Sports: [
        "Championship Game Delivers Thrilling Finish",
        "Star Athlete Breaks Long-Standing Record",
        "Major Trade Shakes Up League Dynamics",
        "Underdog Team Surprises Everyone",
        "Sports Technology Revolutionizes Training",
      ],
      Entertainment: [
        "Blockbuster Film Breaks Box Office Records",
        "Celebrity News Captures Global Attention",
        "Streaming Platform Announces Major Content",
        "Music Industry Sees Surprising Trend",
        "Award Show Delivers Memorable Moments",
      ],
      Politics: [
        "Policy Changes Could Impact Millions",
        "Political Leaders Meet for Important Summit",
        "Election Results Bring Unexpected Outcomes",
        "New Legislation Sparks National Debate",
        "International Relations See Major Development",
      ],
      "World News": [
        "Global Event Captures International Attention",
        "International Cooperation Addresses Crisis",
        "Cultural Exchange Program Shows Success",
        "World Leaders Address Global Challenges",
        "International Study Reveals Important Findings",
      ],
    }

    const templates = titleTemplates[category] || titleTemplates["World News"]
    let title = templates[Math.floor(Math.random() * templates.length)]

    // Sometimes incorporate trending topics
    if (trends.length > 0 && Math.random() > 0.5) {
      const trend = trends[Math.floor(Math.random() * trends.length)]
      title = `${trend}: ${title}`
    }

    return title
  }

  generateSlug(title) {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    }).substring(0, 100)
  }

  generateTags(category, trends = []) {
    const baseTags = [category.toLowerCase().replace(" ", "-")]

    // Add some trending topics as tags
    const trendTags = trends.slice(0, 2).map((trend) =>
      trend
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-"),
    )

    // Add some random relevant tags
    const relevantTags = ["breaking-news", "analysis", "update", "trending", "featured"]
    const randomTags = relevantTags.slice(0, Math.floor(Math.random() * 3) + 1)

    return [...baseTags, ...trendTags, ...randomTags].filter(Boolean).slice(0, 5)
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

// Create singleton instance
const trendBotInstance = new TrendBot()
module.exports = trendBotInstance
