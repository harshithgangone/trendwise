const Article = require("../models/Article")
const groqService = require("./groqService")
const gnewsService = require("./gnewsService")

class TrendBot {
  constructor() {
    this.isActive = false
    this.intervalId = null
    this.lastRun = null
    this.articlesGenerated = 0
  }

  async start() {
    try {
      console.log("🤖 [TRENDBOT] Starting TrendBot...")
      this.isActive = true

      // Generate initial articles immediately
      await this.generateArticles()

      // Set up interval to run every 30 minutes
      this.intervalId = setInterval(
        async () => {
          try {
            await this.generateArticles()
          } catch (error) {
            console.error("❌ [TRENDBOT] Error in scheduled run:", error)
          }
        },
        30 * 60 * 1000,
      ) // 30 minutes

      console.log("✅ [TRENDBOT] Started successfully - will run every 30 minutes")
    } catch (error) {
      console.error("❌ [TRENDBOT] Failed to start:", error)
      this.isActive = false
    }
  }

  stop() {
    console.log("🛑 [TRENDBOT] Stopping TrendBot...")
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    console.log("✅ [TRENDBOT] Stopped successfully")
  }

  async generateArticles() {
    try {
      console.log("🤖 [TRENDBOT] Starting article generation...")
      this.lastRun = new Date()

      const topics = [
        { topic: "Artificial Intelligence Breakthrough", category: "technology" },
        { topic: "Climate Change Solutions", category: "environment" },
        { topic: "Global Economic Trends", category: "business" },
        { topic: "Space Exploration Updates", category: "science" },
        { topic: "Renewable Energy Innovation", category: "technology" },
        { topic: "Healthcare Technology Advances", category: "health" },
        { topic: "Cryptocurrency Market Analysis", category: "business" },
        { topic: "Social Media Platform Changes", category: "technology" },
      ]

      // Generate 2-3 articles per run
      const selectedTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 3)

      for (const { topic, category } of selectedTopics) {
        try {
          console.log(`📝 [TRENDBOT] Generating article: ${topic}`)

          // Check if article with similar title already exists
          const existingArticle = await Article.findOne({
            title: { $regex: topic, $options: "i" },
          })

          if (existingArticle) {
            console.log(`⏭️ [TRENDBOT] Article about "${topic}" already exists, skipping`)
            continue
          }

          // Generate article using Groq
          const articleData = await groqService.generateArticle(topic, category)

          // Create article in database
          const article = new Article({
            title: articleData.title,
            excerpt: articleData.excerpt,
            content: articleData.content,
            category: articleData.category,
            tags: articleData.tags,
            author: "TrendBot AI",
            source: articleData.source,
            publishedAt: new Date(),
            imageUrl: `/placeholder.svg?height=400&width=600&text=${encodeURIComponent(topic)}`,
            slug: this.generateSlug(articleData.title),
            views: Math.floor(Math.random() * 100),
            likes: Math.floor(Math.random() * 50),
            trending: Math.random() > 0.7, // 30% chance of being trending
          })

          await article.save()
          this.articlesGenerated++

          console.log(`✅ [TRENDBOT] Created article: "${articleData.title}"`)
        } catch (error) {
          console.error(`❌ [TRENDBOT] Failed to generate article for "${topic}":`, error)
        }
      }

      console.log(`🎉 [TRENDBOT] Generation complete. Total articles generated: ${this.articlesGenerated}`)
    } catch (error) {
      console.error("❌ [TRENDBOT] Error in generateArticles:", error)
    }
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-")
  }

  getStatus() {
    return {
      active: this.isActive,
      lastRun: this.lastRun,
      articlesGenerated: this.articlesGenerated,
      nextRun: this.intervalId ? new Date(Date.now() + 30 * 60 * 1000) : null,
    }
  }
}

module.exports = new TrendBot()
