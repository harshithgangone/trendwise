const Article = require("../models/Article")
const groqService = require("./groqService")
const gnewsService = require("./gnewsService")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.lastGenerationTime = null
    this.generationInterval = 30 * 60 * 1000 // 30 minutes
    this.topics = [
      "Artificial Intelligence",
      "Machine Learning",
      "Climate Change",
      "Renewable Energy",
      "Cryptocurrency",
      "Blockchain Technology",
      "Remote Work",
      "Digital Transformation",
      "Cybersecurity",
      "Space Technology",
      "Electric Vehicles",
      "Quantum Computing",
      "Biotechnology",
      "5G Technology",
      "Internet of Things",
    ]
    this.categories = ["Technology", "Business", "Science", "Environment", "Health"]
  }

  start() {
    if (this.isRunning) {
      console.log("🤖 [TRENDBOT] Already running")
      return
    }

    console.log("🚀 [TRENDBOT] Starting TrendBot...")
    this.isRunning = true

    // Generate initial articles
    this.generateArticles(3)

    // Set up interval for regular generation
    this.intervalId = setInterval(() => {
      this.generateArticles(2)
    }, this.generationInterval)

    console.log(`✅ [TRENDBOT] Started with ${this.generationInterval / 60000} minute intervals`)
  }

  stop() {
    if (!this.isRunning) {
      console.log("🤖 [TRENDBOT] Already stopped")
      return
    }

    console.log("🛑 [TRENDBOT] Stopping TrendBot...")
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log("✅ [TRENDBOT] Stopped")
  }

  async generateArticles(count = 1) {
    if (!this.isRunning) {
      console.log("⚠️ [TRENDBOT] Not running, skipping generation")
      return
    }

    console.log(`🎯 [TRENDBOT] Generating ${count} articles...`)

    try {
      const promises = []
      for (let i = 0; i < count; i++) {
        promises.push(this.generateSingleArticle())
      }

      const results = await Promise.allSettled(promises)
      const successful = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length

      console.log(`✅ [TRENDBOT] Generation complete: ${successful} successful, ${failed} failed`)
      this.lastGenerationTime = new Date()

      return { successful, failed, total: count }
    } catch (error) {
      console.error("❌ [TRENDBOT] Error in batch generation:", error)
      return { successful: 0, failed: count, total: count }
    }
  }

  async generateSingleArticle() {
    try {
      // Select random topic and category
      const topic = this.topics[Math.floor(Math.random() * this.topics.length)]
      const category = this.categories[Math.floor(Math.random() * this.categories.length)]

      console.log(`📝 [TRENDBOT] Generating article: "${topic}" in ${category}`)

      // Check if similar article already exists
      const existingArticle = await Article.findOne({
        title: new RegExp(topic, "i"),
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })

      if (existingArticle) {
        console.log(`⚠️ [TRENDBOT] Similar article exists, skipping: ${topic}`)
        return null
      }

      // Generate article content
      const articleData = await groqService.generateArticle(topic, category)

      // Ensure unique slug
      let slug = articleData.slug
      let counter = 1
      while (await Article.findOne({ slug })) {
        slug = `${articleData.slug}-${counter}`
        counter++
      }
      articleData.slug = slug

      // Save to database
      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [TRENDBOT] Article created: "${article.title}" (ID: ${article._id})`)
      return article
    } catch (error) {
      console.error("❌ [TRENDBOT] Error generating single article:", error)
      throw error
    }
  }

  async getStats() {
    try {
      const totalArticles = await Article.countDocuments({ author: "TrendBot AI" })
      const todayArticles = await Article.countDocuments({
        author: "TrendBot AI",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })

      return {
        isRunning: this.isRunning,
        lastGenerationTime: this.lastGenerationTime,
        nextGenerationTime: this.isRunning ? new Date(Date.now() + this.generationInterval) : null,
        totalArticles,
        todayArticles,
        generationInterval: this.generationInterval / 60000, // in minutes
      }
    } catch (error) {
      console.error("❌ [TRENDBOT] Error getting stats:", error)
      return {
        isRunning: this.isRunning,
        lastGenerationTime: this.lastGenerationTime,
        nextGenerationTime: null,
        totalArticles: 0,
        todayArticles: 0,
        generationInterval: this.generationInterval / 60000,
      }
    }
  }

  isRunning() {
    return this.isRunning
  }
}

module.exports = TrendBot
