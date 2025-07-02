const cron = require("node-cron")
const Article = require("../models/Article")
const groqService = require("./groqService")
const gnewsService = require("./gnewsService")

class TrendBot {
  constructor(fastify) {
    this.fastify = fastify
    this.isActive = false
    this.interval = null
    this.lastRun = null
    this.nextRun = null
    this.articlesGenerated = 0
    this.errors = []
  }

  init() {
    // Start the bot immediately on initialization
    this.start()
    this.fastify.log.info("🤖 [TRENDBOT] Initializing TrendBot. Starting immediate content generation.")
  }

  start() {
    if (this.isActive) {
      this.fastify.log.info("🤖 [TRENDBOT] Already running")
      return
    }

    this.isActive = true
    this.fastify.log.info("🤖 [TRENDBOT] Starting...")

    // Generate articles immediately
    this.generateArticles()

    // Set up interval to run every 30 minutes
    this.interval = setInterval(
      () => {
        this.generateArticles()
      },
      30 * 60 * 1000,
    ) // 30 minutes

    this.updateNextRun()
    this.fastify.log.info("✅ [TRENDBOT] Started successfully")
  }

  stop() {
    if (!this.isActive) {
      this.fastify.log.info("🤖 [TRENDBOT] Already stopped")
      return
    }

    this.isActive = false
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.nextRun = null
    this.fastify.log.info("🛑 [TRENDBOT] Stopped")
  }

  async generateArticles() {
    try {
      this.fastify.log.info("🤖 [TRENDBOT] Starting article generation...")
      this.lastRun = new Date()

      // Get trending topics
      const topics = await this.getTrendingTopics()
      this.fastify.log.info(`🤖 [TRENDBOT] Found ${topics.length} trending topics`)

      // Generate articles for each topic
      const generatedArticles = []
      for (const topic of topics.slice(0, 5)) {
        // Limit to 5 articles per run
        try {
          const article = await groqService.generateArticle(topic.name, topic.category)
          const savedArticle = await this.saveArticle(article)
          generatedArticles.push(savedArticle)
          this.articlesGenerated++

          // Add delay between generations
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (error) {
          this.fastify.log.error(`❌ [TRENDBOT] Failed to generate article for ${topic.name}:`, error)
          this.errors.push({
            topic: topic.name,
            error: error.message,
            timestamp: new Date(),
          })
        }
      }

      this.fastify.log.info(`✅ [TRENDBOT] Generated ${generatedArticles.length} articles`)
      this.updateNextRun()
    } catch (error) {
      this.fastify.log.error("❌ [TRENDBOT] Error in article generation:", error)
      this.errors.push({
        error: error.message,
        timestamp: new Date(),
      })
    }
  }

  async getTrendingTopics() {
    // Fetch trending topics from GNews
    const newsArticles = await gnewsService.fetchNews("trending topics", "en", 10) // Fetch 10 top articles

    // Convert news articles to trending topics format
    return newsArticles.map((news) => ({
      name: news.title,
      category: news.category || "General",
    }))
  }

  async saveArticle(articleData) {
    try {
      // Check if article with similar title already exists
      const existingArticle = await Article.findOne({
        title: { $regex: articleData.title.substring(0, 20), $options: "i" },
      })

      if (existingArticle) {
        this.fastify.log.warn(`⚠️ [TRENDBOT] Similar article already exists: ${articleData.title}`)
        return existingArticle
      }

      const article = new Article({
        ...articleData,
        slug: articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
        excerpt: articleData.description,
        thumbnail: articleData.imageUrl || "/placeholder.svg?height=400&width=600",
        tags: articleData.keywords ? articleData.keywords.split(",").map((tag) => tag.trim()) : [],
        views: Math.floor(Math.random() * 1000) + 100, // Random initial views
        likes: Math.floor(Math.random() * 50) + 10, // Random initial likes
        saves: Math.floor(Math.random() * 20) + 5, // Random initial saves
        featured: Math.random() > 0.8, // Randomly feature some articles
        author: articleData.source?.name || "TrendBot AI",
        status: "published",
        trendData: {
          trendScore: Math.floor(Math.random() * 100), // Mock trend score
          searchVolume: "N/A", // Could integrate with real trend data APIs
          source: articleData.source?.name || "GNews",
          lastUpdated: new Date(),
        },
        publishedAt: new Date(),
        createdAt: new Date(),
      })

      const savedArticle = await article.save()
      this.fastify.log.info(`✅ [TRENDBOT] Saved article: ${savedArticle.title}`)
      return savedArticle
    } catch (error) {
      this.fastify.log.error("❌ [TRENDBOT] Error saving article:", error)
      throw error
    }
  }

  updateNextRun() {
    if (this.isActive) {
      this.nextRun = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      articlesGenerated: this.articlesGenerated,
      errors: this.errors.slice(-5), // Last 5 errors
    }
  }
}

module.exports = TrendBot
