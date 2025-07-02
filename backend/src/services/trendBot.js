const mongoose = require("mongoose")
const Article = require("../models/Article")
const gnewsService = require("./gnewsService")
const groqService = require("./groqService")
const slugify = require("slugify")

class TrendBot {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.cycleCount = 0
    this.lastRunTime = null
    this.stats = {
      totalArticles: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      lastError: null,
    }

    console.log("🤖 [TREND BOT] Initialized")
  }

  async start() {
    if (this.isRunning) {
      console.log("⚠️ [TREND BOT] Already running")
      return
    }

    console.log("🚀 [TREND BOT] Starting TrendBot...")
    this.isRunning = true

    // Run immediately on startup
    console.log("🔄 [TREND BOT] Running initial cycle...")
    await this.runCycle()

    // Then run every 5 minutes
    this.intervalId = setInterval(
      async () => {
        await this.runCycle()
      },
      5 * 60 * 1000,
    ) // 5 minutes

    console.log("✅ [TREND BOT] Started successfully - running every 5 minutes")
  }

  async stop() {
    if (!this.isRunning) {
      console.log("⚠️ [TREND BOT] Not running")
      return
    }

    console.log("🛑 [TREND BOT] Stopping TrendBot...")
    this.isRunning = false

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log("✅ [TREND BOT] Stopped successfully")
  }

  async runCycle() {
    if (!this.isRunning) {
      console.log("⚠️ [TREND BOT] Bot is stopped, skipping cycle")
      return
    }

    this.cycleCount++
    this.lastRunTime = new Date()

    console.log(`\n🔄 [TREND BOT] Starting cycle #${this.cycleCount} at ${this.lastRunTime.toISOString()}`)

    try {
      // Step 1: Fetch trending news
      console.log("📰 [TREND BOT] Fetching trending news...")
      const newsItems = await gnewsService.getTrendingNews()

      if (!newsItems || newsItems.length === 0) {
        console.log("⚠️ [TREND BOT] No news items found")
        return
      }

      console.log(`📊 [TREND BOT] Found ${newsItems.length} news items`)

      // Step 2: Process each news item
      const results = await this.generateArticles(newsItems)

      // Step 3: Update stats
      this.updateStats(results)

      console.log(`✅ [TREND BOT] Cycle #${this.cycleCount} completed successfully`)
      console.log(`📈 [TREND BOT] Generated ${results.successful} articles, ${results.failed} failed`)
    } catch (error) {
      console.error(`❌ [TREND BOT] Cycle #${this.cycleCount} failed:`, error.message)
      this.stats.lastError = error.message
    }
  }

  async generateArticles(newsItems) {
    console.log(`🤖 [TREND BOT] Processing ${newsItems.length} news items...`)

    let successful = 0
    let failed = 0

    for (let i = 0; i < newsItems.length; i++) {
      const newsItem = newsItems[i]
      console.log(`\n📝 Processing article ${i + 1}/${newsItems.length}: ${newsItem.title.substring(0, 50)}...`)

      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({
          $or: [{ title: newsItem.title }, { sourceUrl: newsItem.url }],
        })

        if (existingArticle) {
          console.log(`⏭️ Article already exists: ${newsItem.title.substring(0, 50)}...`)
          continue
        }

        // Generate slug
        const slug = this.generateSlug(newsItem.title)
        if (!slug) {
          console.log(`❌ Failed to generate slug for: ${newsItem.title}`)
          failed++
          continue
        }

        // Check if slug already exists
        const existingSlug = await Article.findOne({ slug })
        if (existingSlug) {
          console.log(`⏭️ Slug already exists: ${slug}`)
          continue
        }

        // Generate AI content
        console.log("🤖 Generating AI content...")
        let retryCount = 0
        let aiContent = null

        while (retryCount < 3 && !aiContent) {
          try {
            retryCount++
            console.log(`🤖 Generating AI content (attempt ${retryCount}/3)...`)
            aiContent = await groqService.generateArticleContent(newsItem)
            console.log("✅ AI content generated successfully")
            break
          } catch (error) {
            console.error(`❌ AI generation failed (attempt ${retryCount}):`, error.message)
            if (retryCount < 3) {
              console.log(`⏳ Waiting ${retryCount * 2}s before retry...`)
              await new Promise((resolve) => setTimeout(resolve, retryCount * 2000))
            }
          }
        }

        if (!aiContent) {
          console.log("⚠️ Using fallback content generation...")
          aiContent = this.generateFallbackContent(newsItem)
        }

        // Create article object
        const articleData = {
          title: aiContent.title || newsItem.title,
          slug: slug,
          content: aiContent.content || `<p>${newsItem.description}</p>`,
          excerpt: aiContent.excerpt || newsItem.description?.substring(0, 160) + "...",
          author: "TrendWise AI",
          category: this.categorizeArticle(newsItem.title, newsItem.description),
          tags: aiContent.tags || ["trending", "news"],
          featuredImage: newsItem.urlToImage || "/placeholder.svg?height=400&width=800",
          sourceUrl: newsItem.url,
          sourceName: newsItem.source?.name || "Unknown Source",
          publishedAt: new Date(newsItem.publishedAt) || new Date(),
          readTime: this.calculateReadTime(aiContent.content || newsItem.description),
          views: 0,
          likes: 0,
          saves: 0,
          status: "published",
          seo: aiContent.seo || {
            metaTitle: newsItem.title,
            metaDescription: newsItem.description?.substring(0, 160),
            keywords: "trending, news, current events",
          },
        }

        // Save to database
        const article = new Article(articleData)
        await article.save()

        console.log(`✅ Article saved: ${article.title.substring(0, 50)}...`)
        successful++
        this.stats.totalArticles++
      } catch (error) {
        console.error(`❌ Failed to process article: ${newsItem.title} ${error.message}`)
        failed++
        this.stats.failedGenerations++
      }

      // Add delay between articles to avoid rate limiting
      if (i < newsItems.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return { successful, failed }
  }

  generateSlug(title) {
    if (!title || typeof title !== "string") {
      console.log("⚠️ Invalid title for slug generation, using fallback")
      return `article-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    }

    try {
      let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens

      // Ensure slug is not empty
      if (!slug || slug.length === 0) {
        slug = `article-${Date.now()}`
      }

      // Limit slug length
      if (slug.length > 100) {
        slug = slug.substring(0, 100).replace(/-[^-]*$/, "")
      }

      // Add timestamp if slug is too short or generic
      if (slug.length < 3 || slug === "article") {
        slug = `${slug}-${Date.now()}`
      }

      console.log(`📝 Generated slug: ${slug}`)
      return slug
    } catch (error) {
      console.error("❌ Error generating slug:", error.message)
      return `article-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    }
  }

  generateFallbackContent(newsItem) {
    console.log("🎭 Generating fallback content...")

    const title = newsItem.title || "Breaking News Update"
    const description = newsItem.description || "Latest news and updates"

    return {
      title: title,
      content: `
        <h2>${title}</h2>
        <p>${description}</p>
        <p>This article is based on breaking news from ${newsItem.source?.name || "our news sources"}. 
        We are continuously updating our content to provide you with the most accurate and up-to-date information.</p>
        <h3>Key Points</h3>
        <ul>
          <li>Breaking news development</li>
          <li>Ongoing story coverage</li>
          <li>Regular updates available</li>
        </ul>
        <h3>Stay Informed</h3>
        <p>Follow TrendWise for the latest updates on this developing story and other trending topics.</p>
      `,
      excerpt: description.substring(0, 150) + "...",
      tags: ["Breaking News", "Current Events", "Trending"],
      seo: {
        metaTitle: title.substring(0, 60),
        metaDescription: description.substring(0, 160),
        keywords: "breaking news, current events, trending topics",
      },
    }
  }

  categorizeArticle(title, description) {
    const text = `${title} ${description}`.toLowerCase()

    const categories = {
      technology: ["tech", "ai", "artificial intelligence", "software", "app", "digital", "cyber", "data"],
      business: ["business", "economy", "market", "finance", "company", "startup", "investment"],
      health: ["health", "medical", "doctor", "hospital", "disease", "treatment", "medicine"],
      science: ["science", "research", "study", "discovery", "scientist", "experiment"],
      sports: ["sport", "game", "player", "team", "match", "championship", "olympic"],
      entertainment: ["movie", "music", "celebrity", "actor", "film", "show", "entertainment"],
      politics: ["politic", "government", "election", "president", "minister", "policy"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category.charAt(0).toUpperCase() + category.slice(1)
      }
    }

    return "General"
  }

  calculateReadTime(content) {
    if (!content) return 1

    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    const readTime = Math.ceil(wordCount / wordsPerMinute)

    return Math.max(1, readTime)
  }

  updateStats(results) {
    this.stats.successfulGenerations += results.successful
    this.stats.failedGenerations += results.failed
    this.stats.lastError = null
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      lastRunTime: this.lastRunTime,
      stats: this.stats,
      nextRunTime: this.isRunning && this.lastRunTime ? new Date(this.lastRunTime.getTime() + 5 * 60 * 1000) : null,
    }
  }

  async triggerManualRun() {
    if (!this.isRunning) {
      console.log("⚠️ [TREND BOT] Bot is not running, cannot trigger manual run")
      return { success: false, message: "Bot is not running" }
    }

    console.log("🔄 [TREND BOT] Manual run triggered")
    try {
      await this.runCycle()
      return { success: true, message: "Manual run completed successfully" }
    } catch (error) {
      console.error("❌ [TREND BOT] Manual run failed:", error.message)
      return { success: false, message: error.message }
    }
  }
}

module.exports = new TrendBot()
