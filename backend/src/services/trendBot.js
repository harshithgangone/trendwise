const cron = require("node-cron")
const trendCrawler = require("./trendCrawler")
const groqService = require("./groqService")
const unsplashService = require("./unsplashService")
const Article = require("../models/Article")
const slugify = require("slugify")

class TrendBot {
  constructor() {
    this.isActive = false
    this.job = null
    this.runInterval = "0 */6 * * *" // Run every 6 hours
    this.lastRun = null
    this.nextRun = null
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      articlesGenerated: 0,
      errors: 0,
    }
  }

  // Calculate next run time manually
  calculateNextRun() {
    const now = new Date()
    const nextRun = new Date(now)

    // For "0 */6 * * *" (every 6 hours at minute 0)
    // Find the next 6-hour interval
    const currentHour = now.getHours()
    const nextHour = Math.ceil((currentHour + 1) / 6) * 6

    if (nextHour >= 24) {
      nextRun.setDate(nextRun.getDate() + 1)
      nextRun.setHours(0, 0, 0, 0)
    } else {
      nextRun.setHours(nextHour, 0, 0, 0)
    }

    return nextRun
  }

  async start() {
    if (this.isActive) {
      console.log("🤖 TrendBot already active")
      return { success: false, message: "Bot is already running" }
    }

    console.log("🚀 Starting TrendBot...")
    this.isActive = true

    // Calculate next run time
    this.nextRun = this.calculateNextRun()

    // Schedule the job - but don't run immediately to let existing articles load first
    this.job = cron.schedule(
      this.runInterval,
      async () => {
        await this.runCycle()
        // Update next run time after each execution
        this.nextRun = this.calculateNextRun()
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      },
    )

    console.log(`✅ TrendBot scheduled to run ${this.runInterval}`)
    console.log(`⏰ Next scheduled run: ${this.nextRun.toISOString()}`)

    return {
      success: true,
      message: "TrendBot started successfully",
      nextRun: this.nextRun.toISOString(),
    }
  }

  async stop() {
    if (!this.isActive) {
      console.log("🤖 TrendBot already inactive")
      return { success: false, message: "Bot is not running" }
    }

    console.log("🛑 Stopping TrendBot...")
    this.isActive = false

    if (this.job) {
      this.job.stop()
      this.job = null
    }

    this.nextRun = null

    // Cleanup resources
    await trendCrawler.cleanup()

    console.log("✅ TrendBot stopped successfully")
    return { success: true, message: "TrendBot stopped successfully" }
  }

  async runCycle() {
    if (!this.isActive) {
      console.log("⚠️ Bot is inactive, skipping cycle.")
      return
    }

    console.log("🔄 Starting new cycle...")
    this.stats.totalRuns++
    this.lastRun = new Date()

    try {
      // Step 1: Crawl trends
      const trendResult = await trendCrawler.crawlTrends()

      if (!trendResult.success || !trendResult.trends || trendResult.trends.length === 0) {
        throw new Error(`Trend crawling failed: ${trendResult.error || "No trends found"}`)
      }

      console.log(`✅ Found ${trendResult.trends.length} trends from ${trendResult.source}`)

      // Step 2: Process each trend
      let articlesCreatedThisCycle = 0
      for (const trendData of trendResult.trends) {
        try {
          // Ensure slug is generated correctly and is unique
          const baseSlug = slugify(trendData.title, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          })
          let slug = baseSlug
          let counter = 1
          while (await Article.findOne({ slug })) {
            slug = `${baseSlug}-${counter}`
            counter++
          }

          // Check if article already exists by title (as a secondary check)
          const existingArticle = await Article.findOne({ title: trendData.title })
          if (existingArticle) {
            console.log(`⏭️ Article "${trendData.title}" already exists, skipping.`)
            continue
          }

          // Generate enhanced content using the correct method
          const articleResult = await groqService.generateArticle(trendData)

          // Get featured image (prioritize existing image)
          let thumbnail = trendData.thumbnail
          if (!thumbnail || thumbnail.includes("placeholder")) {
            try {
              thumbnail = await unsplashService.getFeaturedImage(trendData.title)
            } catch (imageError) {
              console.warn("⚠️ Image fetch failed, using placeholder")
              thumbnail = "/placeholder.svg?height=400&width=600"
            }
          }

          // Prepare media data with proper structure
          const mediaImages = new Set(trendData.media?.images || [])
          if (thumbnail && !mediaImages.has(thumbnail)) {
            mediaImages.add(thumbnail)
          }

          const mediaData = {
            images: Array.from(mediaImages),
            videos: trendData.media?.videos || [],
            tweets: (trendData.media?.tweets || []).map((tweet) => ({
              username: tweet.username || "Unknown",
              handle: tweet.handle || "@unknown",
              text: tweet.text || "",
              link: tweet.link || "#",
              timestamp: new Date(tweet.timestamp || Date.now()),
            })),
          }

          // Create article using the generated content
          const articleData = {
            title: articleResult.title || trendData.title,
            slug: slug,
            content: articleResult.content,
            excerpt: articleResult.excerpt || trendData.excerpt,
            thumbnail: thumbnail,
            tags: articleResult.tags || trendData.tags,
            meta: articleResult.meta || trendData.meta,
            media: mediaData,
            readTime: articleResult.readTime || trendData.readTime,
            views: trendData.views || 0,
            likes: 0,
            saves: 0,
            status: "published",
            trendData: trendData.trendData,
            featured: trendData.featured || false,
            author: trendData.author || "TrendWise AI",
            createdAt: trendData.createdAt || new Date(),
          }

          const article = new Article(articleData)
          await article.save()

          articlesCreatedThisCycle++
          this.stats.articlesGenerated++
          console.log(`✅ Created article: "${articleData.title}"`)
        } catch (articleError) {
          console.error(`❌ Failed to create article for "${trendData.title}":`, articleError.message)
          this.stats.errors++
        }
        // Small delay between processing articles to avoid overwhelming APIs
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      this.stats.successfulRuns++
      console.log(`🎉 Cycle completed successfully. Created ${articlesCreatedThisCycle} new articles`)
    } catch (error) {
      console.error("❌ Cycle failed:", error.message)
      this.stats.errors++
    }

    console.log(
      `📊 Stats: ${this.stats.successfulRuns}/${this.stats.totalRuns} successful runs, ${this.stats.articlesGenerated} articles generated`,
    )
  }

  async triggerManualRun() {
    console.log("🎯 Manual run triggered")
    await this.runCycle()
    return {
      success: true,
      message: "Manual run completed successfully",
      timestamp: new Date().toISOString(),
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      lastRun: this.lastRun,
      nextRun: this.nextRun ? this.nextRun.toISOString() : null,
      stats: this.stats,
      runInterval: this.runInterval,
      crawlerStatus: trendCrawler.getStatus(),
    }
  }

  getStats() {
    return this.stats
  }
}

const trendBotInstance = new TrendBot()

// Export the instance directly
module.exports = trendBotInstance
