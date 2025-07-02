const cron = require("node-cron")
const TrendCrawler = require("./trendCrawler")
const GroqService = require("./groqService")
const UnsplashService = require("./unsplashService")
const Article = require("../models/Article")
const slugify = require("slugify")
const gnewsService = require("./gnewsService")
const unsplashService = require("./unsplashService")

class TrendBot {
  constructor() {
    this.isActive = false
    this.intervalId = null
    this.lastRun = null
    this.articlesGenerated = 0
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

  getStatus() {
    return {
      active: this.isActive,
      lastRun: this.lastRun,
      articlesGenerated: this.articlesGenerated,
      nextRun: this.intervalId ? new Date(Date.now() + 30 * 60 * 1000) : null,
    }
  }

  async start() {
    if (this.isActive) {
      console.log("🤖 [TRENDBOT] Already running")
      return
    }

    console.log("🤖 [TRENDBOT] Starting TrendBot...")
    this.isActive = true

    // Generate articles immediately on startup
    await this.generateArticles()

    // Set up interval to run every 30 minutes
    this.intervalId = setInterval(
      async () => {
        await this.generateArticles()
      },
      30 * 60 * 1000,
    ) // 30 minutes

    console.log("✅ [TRENDBOT] TrendBot started successfully")
  }

  stop() {
    if (!this.isActive) {
      console.log("🤖 [TRENDBOT] Already stopped")
      return
    }

    console.log("🤖 [TRENDBOT] Stopping TrendBot...")
    this.isActive = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log("✅ [TRENDBOT] TrendBot stopped")
  }

  async generateArticles() {
    try {
      console.log("🤖 [TRENDBOT] Starting article generation cycle...")
      this.lastRun = new Date()

      // Define trending topics for different categories
      const trendingTopics = {
        technology: [
          "Artificial Intelligence Breakthrough",
          "Quantum Computing Advances",
          "Cybersecurity Threats 2024",
          "Electric Vehicle Innovation",
          "5G Network Expansion",
        ],
        business: [
          "Global Market Trends",
          "Cryptocurrency Regulation",
          "Remote Work Evolution",
          "Sustainable Business Practices",
          "Supply Chain Innovations",
        ],
        health: [
          "Medical Research Breakthrough",
          "Mental Health Awareness",
          "Fitness Technology Trends",
          "Nutrition Science Updates",
          "Healthcare Innovation",
        ],
        science: [
          "Climate Change Research",
          "Space Exploration Mission",
          "Renewable Energy Development",
          "Ocean Conservation Efforts",
          "Scientific Discovery",
        ],
        entertainment: [
          "Streaming Platform Updates",
          "Celebrity News",
          "Movie Industry Trends",
          "Music Technology",
          "Gaming Innovation",
        ],
      }

      let totalGenerated = 0

      // Generate articles for each category
      for (const [category, topics] of Object.entries(trendingTopics)) {
        try {
          console.log(`🤖 [TRENDBOT] Generating articles for ${category}...`)

          // Select 2-3 random topics from each category
          const selectedTopics = topics.sort(() => 0.5 - Math.random()).slice(0, 2)

          for (const topic of selectedTopics) {
            try {
              // Generate article content using Groq
              const articleData = await GroqService.generateArticle(topic, category)

              // Get image from Unsplash
              let imageUrl = "/placeholder.svg?height=400&width=600"
              try {
                const unsplashImage = await UnsplashService.searchImage(topic)
                if (unsplashImage) {
                  imageUrl = unsplashImage
                }
              } catch (imageError) {
                console.log(`⚠️ [TRENDBOT] Could not fetch image for ${topic}, using placeholder`)
              }

              // Create article object
              const articleSlug = topic
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .replace(/\s+/g, "-")
                .substring(0, 50)

              const newArticle = new Article({
                title: articleData.title,
                content: articleData.content,
                summary: articleData.summary,
                category: category,
                slug: `${articleSlug}-${Date.now()}`,
                author: "TrendBot AI",
                imageUrl: imageUrl,
                tags: [category, "trending", "ai-generated"],
                isPublished: true,
                publishedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                views: Math.floor(Math.random() * 100) + 10,
                likes: Math.floor(Math.random() * 50) + 5,
                trending: Math.random() > 0.5,
                featured: Math.random() > 0.7,
              })

              // Save to database
              await newArticle.save()
              totalGenerated++
              this.articlesGenerated++

              console.log(`✅ [TRENDBOT] Created article: ${articleData.title}`)

              // Add delay between articles to avoid overwhelming the system
              await new Promise((resolve) => setTimeout(resolve, 2000))
            } catch (articleError) {
              console.error(`❌ [TRENDBOT] Failed to create article for ${topic}:`, articleError.message)
            }
          }

          // Add delay between categories
          await new Promise((resolve) => setTimeout(resolve, 3000))
        } catch (categoryError) {
          console.error(`❌ [TRENDBOT] Failed to process category ${category}:`, categoryError.message)
        }
      }

      console.log(`🎉 [TRENDBOT] Article generation completed! Generated ${totalGenerated} new articles`)

      // Update article stats
      await this.updateArticleStats()
    } catch (error) {
      console.error("❌ [TRENDBOT] Article generation failed:", error.message)
    }
  }

  async updateArticleStats() {
    try {
      // Update trending status based on views and recency
      const recentArticles = await Article.find({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      })
        .sort({ views: -1, likes: -1 })
        .limit(10)

      // Mark top articles as trending
      for (const article of recentArticles) {
        article.trending = true
        await article.save()
      }

      console.log(`📊 [TRENDBOT] Updated trending status for ${recentArticles.length} articles`)
    } catch (error) {
      console.error("❌ [TRENDBOT] Failed to update article stats:", error.message)
    }
  }

  async getGeneratedArticles(limit = 10) {
    try {
      return await Article.find({ author: "TrendBot AI" }).sort({ createdAt: -1 }).limit(limit)
    } catch (error) {
      console.error("❌ [TRENDBOT] Failed to fetch generated articles:", error.message)
      return []
    }
  }
}

module.exports = new TrendBot()
