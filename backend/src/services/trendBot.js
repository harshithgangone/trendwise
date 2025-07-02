const cron = require("node-cron")
const Article = require("../models/Article")
const groqService = require("./groqService")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.lastRun = null
  }

  async generateArticles() {
    if (this.isRunning) {
      console.log("🤖 [TRENDBOT] Already running, skipping...")
      return
    }

    try {
      this.isRunning = true
      console.log("🤖 [TRENDBOT] Starting article generation...")

      // Trending topics to generate articles about
      const trendingTopics = [
        "Artificial Intelligence in Healthcare",
        "Sustainable Energy Solutions",
        "Remote Work Technologies",
        "Blockchain Applications",
        "Climate Change Innovation",
        "Digital Transformation",
        "Cybersecurity Trends",
        "Space Technology",
        "Quantum Computing",
        "Green Technology",
        "Smart Cities",
        "Biotechnology Advances",
        "Renewable Energy",
        "Machine Learning Applications",
        "IoT Innovations",
      ]

      // Select 3-5 random topics
      const selectedTopics = trendingTopics.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3)

      console.log(`🎯 [TRENDBOT] Selected topics:`, selectedTopics)

      // Generate articles
      const articles = await groqService.generateMultipleArticles(selectedTopics)

      // Save articles to database
      let savedCount = 0
      for (const articleData of articles) {
        try {
          // Create slug from title
          const slug = articleData.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

          // Check if article with similar title already exists
          const existingArticle = await Article.findOne({
            $or: [{ slug: slug }, { title: { $regex: articleData.title.substring(0, 20), $options: "i" } }],
          })

          if (!existingArticle) {
            const article = new Article({
              ...articleData,
              slug: slug,
              createdAt: new Date(),
              updatedAt: new Date(),
            })

            await article.save()
            savedCount++
            console.log(`✅ [TRENDBOT] Saved article: ${article.title}`)
          } else {
            console.log(`⚠️ [TRENDBOT] Article already exists: ${articleData.title}`)
          }
        } catch (error) {
          console.error(`❌ [TRENDBOT] Error saving article:`, error.message)
        }
      }

      this.lastRun = new Date()
      console.log(`🎉 [TRENDBOT] Generation complete! Saved ${savedCount} new articles`)
    } catch (error) {
      console.error("❌ [TRENDBOT] Error in article generation:", error)
    } finally {
      this.isRunning = false
    }
  }

  start() {
    console.log("🤖 [TRENDBOT] Starting scheduled article generation...")

    // Run immediately on startup
    setTimeout(() => {
      this.generateArticles()
    }, 5000) // Wait 5 seconds after startup

    // Schedule to run every 30 minutes
    cron.schedule("*/30 * * * *", () => {
      console.log("⏰ [TRENDBOT] Scheduled run triggered")
      this.generateArticles()
    })

    console.log("✅ [TRENDBOT] Scheduler started - will run every 30 minutes")
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.lastRun ? new Date(this.lastRun.getTime() + 30 * 60 * 1000) : null,
    }
  }
}

const trendBot = new TrendBot()

module.exports = {
  startTrendBot: () => trendBot.start(),
  generateArticles: () => trendBot.generateArticles(),
  getTrendBotStatus: () => trendBot.getStatus(),
}
