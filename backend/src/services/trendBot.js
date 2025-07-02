const Article = require("../models/Article")
const GroqService = require("./groqService")
const { fetchGNewsArticles } = require("./gnewsService")
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

      // Check if we have required environment variables
      const requiredEnvVars = ["GNEWS_API_KEY"]
      const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

      if (missingVars.length > 0) {
        console.log(`⚠️ Missing environment variables: ${missingVars.join(", ")} - continuing with available services`)
      }

      return true
    } catch (error) {
      console.error("❌ Health check failed:", error)
      return false
    }
  }

  async generateArticles() {
    const targetArticles = 10 // 10 articles per cycle to reach ~100 per day
    let articlesGenerated = 0
    const sources = []

    try {
      // Primary source: GNews API (if within daily limit)
      if (this.stats.gnewsUsageToday < 100) {
        console.log("📰 Fetching from GNews API...")
        const gnewsArticles = await fetchGNewsArticles(targetArticles)
        if (gnewsArticles && gnewsArticles.length > 0) {
          sources.push(
            ...gnewsArticles.map((article) => ({
              ...article,
              source: "gnews",
            })),
          )
          this.stats.gnewsUsageToday += gnewsArticles.length
          console.log(`✅ Fetched ${gnewsArticles.length} articles from GNews`)
        }
      }

      // Secondary sources: Web scraping and RSS feeds
      if (sources.length < targetArticles) {
        console.log("🕷️ Fetching from secondary sources...")
        const additionalSources = await this.getAdditionalSources(targetArticles - sources.length)
        sources.push(...additionalSources)
      }

      // Process articles sequentially to avoid API rate limits
      console.log(`🔄 Processing ${sources.length} articles sequentially...`)

      for (let i = 0; i < Math.min(sources.length, targetArticles); i++) {
        const sourceArticle = sources[i]

        try {
          console.log(
            `📝 Processing article ${i + 1}/${Math.min(sources.length, targetArticles)}: ${sourceArticle.title}`,
          )

          // Check for duplicates
          const existingArticle = await Article.findOne({
            $or: [{ title: sourceArticle.title }, { "trendData.sourceUrl": sourceArticle.url }],
          })

          if (existingArticle) {
            console.log(`⏭️ Skipping duplicate article: ${sourceArticle.title}`)
            continue
          }

          // Generate AI content with retry logic
          let aiContent = null
          let retryCount = 0
          const maxRetries = 3

          while (!aiContent && retryCount < maxRetries) {
            try {
              console.log(`🤖 Generating AI content (attempt ${retryCount + 1}/${maxRetries})...`)
              aiContent = await GroqService.generateArticleContent(sourceArticle)

              if (aiContent) {
                console.log("✅ AI content generated successfully")
              }
            } catch (error) {
              retryCount++
              console.error(`❌ AI generation failed (attempt ${retryCount}):`, error.message)

              if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
                console.log(`⏳ Waiting ${delay}ms before retry...`)
                await new Promise((resolve) => setTimeout(resolve, delay))
              }
            }
          }

          // Fallback content if AI fails
          if (!aiContent) {
            console.log("⚠️ Using fallback content generation...")
            aiContent = this.generateFallbackContent(sourceArticle)
          }

          // Get image
          let thumbnail = sourceArticle.image || sourceArticle.urlToImage
          if (!thumbnail) {
            thumbnail = "/placeholder.svg?height=400&width=800"
          }

          // Create article with proper slug generation
          const articleTitle = aiContent.title || sourceArticle.title
          const articleSlug = this.generateSlug(articleTitle)

          const article = new Article({
            title: articleTitle,
            slug: articleSlug, // Ensure slug is set
            content: aiContent.content || this.generateBasicContent(sourceArticle),
            excerpt: aiContent.excerpt || sourceArticle.description || sourceArticle.content?.substring(0, 200) + "...",
            thumbnail: thumbnail,
            category: aiContent.category || this.categorizeArticle(sourceArticle.title),
            tags: aiContent.tags || this.generateTags(sourceArticle.title),
            readTime: aiContent.readTime || Math.ceil((aiContent.content || sourceArticle.content || "").length / 1000),
            author: "TrendWise AI",
            views: 0,
            likes: 0,
            saves: 0,
            trendData: {
              sourceName: sourceArticle.source?.name || sourceArticle.source || "Unknown",
              sourceUrl: sourceArticle.url,
              publishedAt:
                sourceArticle.publishedAt || sourceArticle.published_datetime_utc || new Date().toISOString(),
            },
            meta: {
              description: aiContent.metaDescription || aiContent.excerpt,
              keywords: aiContent.keywords || aiContent.tags?.join(", "),
            },
          })

          await article.save()
          articlesGenerated++

          console.log(`✅ Article saved: ${article.title} (Slug: ${article.slug})`)

          // Add delay between articles to respect API limits
          if (i < Math.min(sources.length, targetArticles) - 1) {
            console.log("⏳ Waiting 3 seconds before next article...")
            await new Promise((resolve) => setTimeout(resolve, 3000))
          }
        } catch (error) {
          console.error(`❌ Failed to process article: ${sourceArticle.title}`, error.message)
          continue
        }
      }

      return articlesGenerated
    } catch (error) {
      console.error("❌ Error in generateArticles:", error)
      return articlesGenerated
    }
  }

  async getAdditionalSources(count) {
    const sources = []

    try {
      // Hacker News
      const hackerNewsArticles = await this.fetchHackerNews(Math.ceil(count / 3))
      sources.push(...hackerNewsArticles)

      // Reddit
      const redditArticles = await this.fetchReddit(Math.ceil(count / 3))
      sources.push(...redditArticles)

      // Google News RSS
      const googleNewsArticles = await this.fetchGoogleNewsRSS(Math.ceil(count / 3))
      sources.push(...googleNewsArticles)
    } catch (error) {
      console.error("Error fetching additional sources:", error)
    }

    return sources.slice(0, count)
  }

  async fetchHackerNews(count = 5) {
    try {
      const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json")
      const storyIds = await response.json()
      const articles = []

      for (let i = 0; i < Math.min(count, storyIds.length); i++) {
        try {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyIds[i]}.json`)
          const story = await storyResponse.json()

          if (story && story.title && story.url) {
            articles.push({
              title: story.title,
              url: story.url,
              description: `Trending on Hacker News with ${story.score || 0} points`,
              source: "Hacker News",
              publishedAt: new Date(story.time * 1000).toISOString(),
            })
          }
        } catch (error) {
          console.error("Error fetching HN story:", error)
        }
      }

      return articles
    } catch (error) {
      console.error("Error fetching Hacker News:", error)
      return []
    }
  }

  async fetchReddit(count = 5) {
    try {
      const subreddits = ["technology", "worldnews", "science", "business"]
      const articles = []

      for (const subreddit of subreddits) {
        if (articles.length >= count) break

        try {
          const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=5`)
          const data = await response.json()

          if (data.data && data.data.children) {
            for (const post of data.data.children) {
              if (articles.length >= count) break

              const postData = post.data
              if (postData.title && !postData.is_self) {
                articles.push({
                  title: postData.title,
                  url: postData.url,
                  description: postData.selftext || `Trending on r/${subreddit}`,
                  source: `Reddit - r/${subreddit}`,
                  publishedAt: new Date(postData.created_utc * 1000).toISOString(),
                })
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching Reddit r/${subreddit}:`, error)
        }
      }

      return articles
    } catch (error) {
      console.error("Error fetching Reddit:", error)
      return []
    }
  }

  async fetchGoogleNewsRSS(count = 5) {
    try {
      const topics = [
        "artificial intelligence",
        "cryptocurrency",
        "climate change",
        "space exploration",
        "cybersecurity",
      ]

      const articles = []

      for (let i = 0; i < Math.min(count, topics.length); i++) {
        articles.push({
          title: `Latest developments in ${topics[i]}`,
          url: `https://news.google.com/search?q=${encodeURIComponent(topics[i])}`,
          description: `Recent news and updates about ${topics[i]}`,
          source: "Google News",
          publishedAt: new Date().toISOString(),
        })
      }

      return articles
    } catch (error) {
      console.error("Error fetching Google News RSS:", error)
      return []
    }
  }

  generateFallbackContent(sourceArticle) {
    const title = sourceArticle.title
    const description = sourceArticle.description || sourceArticle.content || ""

    return {
      title: title,
      content: this.generateBasicContent(sourceArticle),
      excerpt: description.substring(0, 200) + "...",
      category: this.categorizeArticle(title),
      tags: this.generateTags(title),
      readTime: Math.ceil(description.length / 1000) || 3,
      metaDescription: description.substring(0, 160),
      keywords: this.generateTags(title).join(", "),
    }
  }

  generateBasicContent(sourceArticle) {
    const title = sourceArticle.title
    const description = sourceArticle.description || sourceArticle.content || ""

    return `
      <div class="article-content">
        <h2>Overview</h2>
        <p>${description}</p>
        
        <h2>Key Points</h2>
        <ul>
          <li>This story is currently trending across multiple platforms</li>
          <li>The topic has generated significant discussion and interest</li>
          <li>Stay tuned for more updates as the story develops</li>
        </ul>
        
        <h2>What This Means</h2>
        <p>This development represents an important trend in the current news landscape. Our AI analysis suggests this topic will continue to be relevant in the coming days.</p>
        
        <h2>Stay Informed</h2>
        <p>For the latest updates on this and other trending topics, continue following TrendWise for AI-powered news analysis and insights.</p>
      </div>
    `
  }

  categorizeArticle(title) {
    const titleLower = title.toLowerCase()

    if (titleLower.includes("tech") || titleLower.includes("ai") || titleLower.includes("software")) {
      return "Technology"
    } else if (titleLower.includes("business") || titleLower.includes("market") || titleLower.includes("economy")) {
      return "Business"
    } else if (titleLower.includes("health") || titleLower.includes("medical")) {
      return "Health"
    } else if (titleLower.includes("science") || titleLower.includes("research")) {
      return "Science"
    } else if (titleLower.includes("sport") || titleLower.includes("game")) {
      return "Sports"
    } else {
      return "General"
    }
  }

  generateTags(title) {
    const words = title.toLowerCase().split(" ")
    const commonWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "is",
      "are",
      "was",
      "were",
    ]

    return words
      .filter((word) => word.length > 3 && !commonWords.includes(word))
      .slice(0, 5)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  }

  // Generate slug function
  generateSlug(title) {
    if (!title) {
      return `article-${Date.now()}`
    }

    return (
      slugify(title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
      }).substring(0, 100) || `article-${Date.now()}`
    )
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      enabled: this.enabled,
      lastRun: this.lastRun,
      stats: this.stats,
    }
  }

  async triggerManualRun() {
    if (this.isRunning) {
      throw new Error("Bot is already running")
    }

    console.log("🔄 Manual trigger initiated...")
    await this.runCycle()
    return this.getStatus()
  }
}

module.exports = new TrendBot()
