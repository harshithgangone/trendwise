const mongoose = require("mongoose")
const Article = require("../models/Article")
const { generateArticleContent } = require("./groqService")
const groqService = require("./groqService")
const { fetchGNewsArticles } = require("./gnewsService")
const { getUnsplashImage } = require("./unsplashService")
const slugify = require("slugify")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.enabled = true
    this.lastRun = null
    this.stats = {
      totalArticles: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastError: null,
      gnewsUsageToday: 0,
      lastGNewsReset: new Date().toDateString(),
    }
    this.runInterval = null
  }

  async start() {
    if (this.runInterval) {
      console.log("TrendBot is already running")
      return
    }

    console.log("🤖 Starting TrendBot...")
    this.enabled = true

    // Run immediately on start
    await this.runCycle()

    // Then run every 5 minutes
    this.runInterval = setInterval(
      async () => {
        if (this.enabled && !this.isRunning) {
          await this.runCycle()
        }
      },
      5 * 60 * 1000,
    ) // 5 minutes

    console.log("✅ TrendBot started successfully")
  }

  async stop() {
    console.log("🛑 Stopping TrendBot...")
    this.enabled = false

    if (this.runInterval) {
      clearInterval(this.runInterval)
      this.runInterval = null
    }

    console.log("✅ TrendBot stopped")
  }

  async runCycle() {
    if (this.isRunning) {
      console.log("⏳ TrendBot cycle already in progress, skipping...")
      return
    }

    this.isRunning = true
    this.lastRun = new Date()

    console.log("🚀 Starting TrendBot cycle...")

    try {
      // Reset daily GNews usage counter
      const today = new Date().toDateString()
      if (this.stats.lastGNewsReset !== today) {
        this.stats.gnewsUsageToday = 0
        this.stats.lastGNewsReset = today
        console.log("📅 Reset daily GNews usage counter")
      }

      // Health check
      if (!(await this.healthCheck())) {
        throw new Error("Health check failed")
      }

      const articlesGenerated = await this.generateArticles()

      this.stats.totalArticles += articlesGenerated
      this.stats.successfulRuns++
      this.stats.lastError = null

      console.log(`✅ TrendBot cycle completed successfully. Generated ${articlesGenerated} articles.`)
    } catch (error) {
      console.error("❌ TrendBot cycle failed:", error)
      this.stats.failedRuns++
      this.stats.lastError = error.message
    } finally {
      this.isRunning = false
    }
  }

  async healthCheck() {
    try {
      // Check database connection
      const articleCount = await Article.countDocuments()
      console.log(`📊 Database health check: ${articleCount} articles in database`)

      return true
    } catch (error) {
      console.error("❌ Health check failed:", error)
      return false
    }
  }

  async generateArticles() {
    console.log("📰 Fetching trending news...")

    try {
      // Fetch news from GNews
      const newsArticles = await fetchGNewsArticles(10)

      if (!newsArticles || newsArticles.length === 0) {
        console.warn("⚠️ No news articles fetched")
        return 0
      }

      console.log(`📊 Fetched ${newsArticles.length} news articles`)

      let articlesGenerated = 0

      for (const newsItem of newsArticles) {
        try {
          // Check if article already exists
          const existingArticle = await Article.findOne({
            $or: [{ title: newsItem.title }, { url: newsItem.url }],
          })

          if (existingArticle) {
            console.log(`⏭️ Article already exists: ${newsItem.title.substring(0, 50)}...`)
            continue
          }

          console.log(`🔄 Processing: ${newsItem.title.substring(0, 50)}...`)

          // Get featured image - prioritize GNews image, then Unsplash fallback
          let featuredImage = null

          // First try to use the image from GNews API
          if (newsItem.urlToImage && this.isValidImageUrl(newsItem.urlToImage)) {
            featuredImage = newsItem.urlToImage
            console.log(`🖼️ Using GNews image: ${newsItem.urlToImage.substring(0, 50)}...`)
          } else if (newsItem.image && this.isValidImageUrl(newsItem.image)) {
            featuredImage = newsItem.image
            console.log(`🖼️ Using GNews image: ${newsItem.image.substring(0, 50)}...`)
          } else {
            // Fallback to Unsplash
            const imageQuery = "technology" // Default value before enhancedContent is defined
            try {
              featuredImage = await getUnsplashImage(imageQuery)
              console.log(`🖼️ Using Unsplash image for query: ${imageQuery}`)
            } catch (imageError) {
              console.warn("⚠️ Failed to get Unsplash image:", imageError.message)
              featuredImage = `https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop`
            }
          }

          // Generate enhanced content using Groq
          const enhancedContent = await generateArticleContent(newsItem)

          // Generate AI tweets for this article
          console.log(`🐦 Generating tweets for: ${newsItem.title.substring(0, 30)}...`)
          const aiTweets = await groqService.generateTweetContent(newsItem.title, 5)

          // Generate slug with fallbacks
          let slug = this.generateSlug(enhancedContent.title || newsItem.title)

          // Ensure slug is unique
          let slugCounter = 1
          const originalSlug = slug
          while (await Article.findOne({ slug })) {
            slug = `${originalSlug}-${slugCounter}`
            slugCounter++
          }

          // Create article object
          const articleData = {
            title: enhancedContent.title || newsItem.title,
            slug: slug,
            content: enhancedContent.content || this.generateFallbackContent(newsItem),
            excerpt: enhancedContent.excerpt || newsItem.description?.substring(0, 200) + "...",
            featuredImage: featuredImage,
            thumbnail: featuredImage, // Store thumbnail separately
            category: this.categorizeArticle(newsItem.title + " " + (newsItem.description || "")),
            tags: enhancedContent.tags || this.extractTags(newsItem.title + " " + (newsItem.description || "")),
            author: "TrendBot AI",
            status: "published",
            publishedAt: new Date(),
            source: {
              name: newsItem.source?.name || "News Source",
              url: newsItem.url,
            },
            seo: {
              metaTitle: (enhancedContent.title || newsItem.title).substring(0, 60),
              metaDescription: (enhancedContent.excerpt || newsItem.description || "").substring(0, 160),
              keywords: (enhancedContent.tags || []).join(", "),
            },
            readTime:
              enhancedContent.readTime || this.calculateReadTime(enhancedContent.content || newsItem.description || ""),
            views: 0,
            likes: 0,
            shares: 0,
            comments: [],
            trending: true,
            trendScore: this.calculateTrendScore(newsItem),
            aiGenerated: true,
            // Store tweets in both places for compatibility
            tweets: aiTweets || [],
            media: {
              images: featuredImage ? [featuredImage] : [],
              videos: [],
              tweets: aiTweets || [],
            },
            // Add Twitter search URL
            twitterSearchUrl: `https://twitter.com/search?q=${encodeURIComponent(newsItem.title)}&src=typed_query&f=live`,
          }

          // Save to database
          const article = new Article(articleData)
          await article.save()

          console.log(`✅ Article created: ${article.title.substring(0, 50)}... (${article.slug})`)
          console.log(`🖼️ Image: ${featuredImage ? "Yes" : "No"}`)
          console.log(`🐦 Tweets: ${aiTweets.length}`)
          articlesGenerated++

          // Add delay between articles to avoid overwhelming the system
          await new Promise((resolve) => setTimeout(resolve, 2000))
        } catch (articleError) {
          console.error(`❌ Failed to process article "${newsItem.title.substring(0, 50)}...":`, articleError.message)
          continue
        }
      }

      return articlesGenerated
    } catch (error) {
      console.error("❌ Error generating articles:", error)
      return 0
    }
  }

  isValidImageUrl(url) {
    if (!url || typeof url !== "string") return false

    // Check if it's a valid URL
    try {
      new URL(url)
    } catch {
      return false
    }

    // Check if it's an image URL
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]
    const lowerUrl = url.toLowerCase()

    // Check for image extensions or common image hosting patterns
    return (
      imageExtensions.some((ext) => lowerUrl.includes(ext)) ||
      lowerUrl.includes("image") ||
      lowerUrl.includes("img") ||
      lowerUrl.includes("photo") ||
      url.startsWith("https://images.") ||
      url.includes("unsplash.com") ||
      url.includes("pexels.com")
    )
  }

  generateSlug(title) {
    if (!title) {
      return `article-${Date.now()}`
    }

    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    }).substring(0, 100)
  }

  generateFallbackContent(newsItem) {
    const title = newsItem.title || "Breaking News"
    const description = newsItem.description || "Latest news update"

    return `
      <div class="article-content">
        <h2>${title}</h2>
        <p class="lead">${description}</p>
        
        <h3>Key Points</h3>
        <ul>
          <li>Breaking news development in the industry</li>
          <li>Significant impact on current market trends</li>
          <li>Expert analysis and insights</li>
          <li>Future implications and predictions</li>
        </ul>
        
        <h3>Analysis</h3>
        <p>This development represents a significant shift in the current landscape. Industry experts are closely monitoring the situation as it continues to evolve.</p>
        
        <p>The implications of this news extend beyond immediate effects, potentially influencing long-term strategies and market dynamics across multiple sectors.</p>
        
        <h3>What This Means</h3>
        <p>For businesses and consumers alike, this news signals important changes ahead. Staying informed about these developments will be crucial for making informed decisions.</p>
        
        <p><em>This is a developing story. We will continue to update this article as more information becomes available.</em></p>
      </div>
    `
  }

  categorizeArticle(text) {
    const categories = {
      Technology: ["tech", "ai", "software", "digital", "innovation", "startup", "app", "platform"],
      Business: ["business", "finance", "economy", "market", "investment", "company", "corporate"],
      Health: ["health", "medical", "healthcare", "medicine", "wellness", "hospital", "doctor"],
      Science: ["science", "research", "study", "discovery", "breakthrough", "experiment"],
      Environment: ["environment", "climate", "green", "sustainable", "energy", "renewable"],
      Sports: ["sports", "game", "team", "player", "championship", "league"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "show", "film"],
    }

    const lowerText = text.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        return category
      }
    }

    return "General"
  }

  extractTags(text) {
    const commonTags = [
      "Technology",
      "AI",
      "Innovation",
      "Business",
      "Startup",
      "Digital",
      "Science",
      "Health",
      "Environment",
      "Finance",
      "Security",
      "Mobile",
      "Cloud",
      "Data",
      "Analytics",
      "Blockchain",
      "IoT",
      "Automation",
      "Sustainability",
      "Research",
    ]

    const foundTags = commonTags.filter((tag) => text.toLowerCase().includes(tag.toLowerCase()))

    return foundTags.length > 0 ? foundTags.slice(0, 5) : ["Technology", "News"]
  }

  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.split(" ").length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  calculateTrendScore(article) {
    let score = 50 // Base score

    // Recent articles get higher scores
    const publishedDate = new Date(article.publishedAt || Date.now())
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 1) score += 30
    else if (hoursAgo < 6) score += 20
    else if (hoursAgo < 24) score += 10

    // Articles with images get bonus
    if (article.urlToImage || article.image) score += 10

    // Longer descriptions get bonus
    if (article.description && article.description.length > 100) score += 5

    // Source reputation bonus
    if (article.source?.name && !article.source.name.includes("Unknown")) score += 5
    return Math.min(100, score)
  }

  async cleanupOldArticles() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const result = await Article.deleteMany({
        publishedAt: { $lt: thirtyDaysAgo },
        views: { $lt: 10 }, // Only delete articles with low engagement
      })

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} old articles`)
      }
    } catch (error) {
      console.error("❌ Error cleaning up old articles:", error)
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: this.enabled,
      lastRun: this.lastRun,
      stats: this.stats,
      nextRun: this.runInterval ? new Date(Date.now() + 5 * 60 * 1000) : null,
    }
  }

  getStats() {
    return this.stats
  }

  async toggle() {
    if (this.enabled) {
      await this.stop()
    } else {
      await this.start()
    }
    return this.enabled
  }

  async triggerManualRun() {
    if (this.isRunning) {
      throw new Error("Bot is already running")
    }

    console.log("🔄 Manual trigger requested")
    await this.runCycle()
    return this.getStatus()
  }
}

// Create singleton instance
const trendBot = new TrendBot()

// Auto-start the bot
trendBot.start().catch((error) => {
  console.error("❌ Failed to start TrendBot:", error)
})

module.exports = trendBot
