const gnewsService = require("./gnewsService")
const tweetScraper = require("./tweetScraper")
const unsplashService = require("./unsplashService")

class TrendCrawler {
  constructor() {
    this.isRunning = false
    this.lastRun = null
    this.dataSource = "unknown"
  }

  async crawlTrends() {
    if (this.isRunning) {
      console.log("🔄 [TREND CRAWLER] Already running, skipping...")
      return { success: false, message: "Crawler already running" }
    }

    this.isRunning = true
    console.log("🚀 [TREND CRAWLER] Starting trend crawling process...")

    try {
      // Get trending topics from GNews
      const trendResult = await gnewsService.getTrendingTopics()
      this.dataSource = trendResult.source

      if (!trendResult.success || !trendResult.articles || trendResult.articles.length === 0) {
        throw new Error("No trending articles found")
      }

      console.log(
        `📊 [TREND CRAWLER] Found ${trendResult.articles.length} trending articles from ${trendResult.source}`,
      )

      // Process each article
      const processedTrends = []
      for (let i = 0; i < Math.min(trendResult.articles.length, 10); i++) {
        const article = trendResult.articles[i]

        try {
          console.log(`🔍 [TREND CRAWLER] Processing article ${i + 1}: "${article.title}"`)

          // Get media content (AI tweets and additional images)
          const mediaContent = await this.getMediaContent(article.title, article.tags[0])

          // Merge media content
          const processedArticle = {
            ...article,
            media: {
              images: [...(article.media?.images || []), ...(mediaContent.images || [])].slice(0, 5), // Limit to 5 images
              videos: mediaContent.videos || [],
              tweets: mediaContent.tweets || [],
            },
            // Add Twitter search URL for real tweets
            twitterSearchUrl: mediaContent.twitterSearchUrl,
          }

          processedTrends.push(processedArticle)
          console.log(`✅ [TREND CRAWLER] Processed: "${article.title}"`)
        } catch (articleError) {
          console.error(`❌ [TREND CRAWLER] Error processing article "${article.title}":`, articleError.message)
          // Still add the article without enhanced media
          processedTrends.push(article)
        }
      }

      this.lastRun = new Date()
      console.log(`🎉 [TREND CRAWLER] Successfully processed ${processedTrends.length} trends`)

      return {
        success: true,
        trends: processedTrends,
        source: this.dataSource,
        timestamp: this.lastRun.toISOString(),
        count: processedTrends.length,
      }
    } catch (error) {
      console.error("❌ [TREND CRAWLER] Error during crawling:", error.message)
      this.dataSource = "error"

      return {
        success: false,
        error: error.message,
        source: this.dataSource,
        timestamp: new Date().toISOString(),
      }
    } finally {
      this.isRunning = false
      console.log("🏁 [TREND CRAWLER] Crawling process completed")
    }
  }

  async getMediaContent(query, category) {
    const mediaContent = {
      images: [],
      videos: [],
      tweets: [],
      twitterSearchUrl: null,
    }

    try {
      // Generate AI tweets for the topic
      console.log(`🐦 [TREND CRAWLER] Generating AI tweets for: "${query}"`)
      const tweetResult = await tweetScraper.scrapeTweets(query, 3)

      if (tweetResult.success && tweetResult.tweets) {
        mediaContent.tweets = tweetResult.tweets
        mediaContent.twitterSearchUrl = tweetResult.searchUrl
        console.log(`✅ [TREND CRAWLER] Generated ${tweetResult.tweets.length} AI tweets`)
      } else {
        console.log(`⚠️ [TREND CRAWLER] Using fallback tweets for: "${query}"`)
        mediaContent.tweets = tweetResult.tweets || []
        mediaContent.twitterSearchUrl = tweetResult.searchUrl
      }
    } catch (tweetError) {
      console.error(`❌ [TREND CRAWLER] Tweet generation failed for "${query}":`, tweetError.message)
    }

    try {
      // Get additional images from Unsplash
      console.log(`🖼️ [TREND CRAWLER] Fetching images for: "${query}"`)
      const images = await unsplashService.searchImages(query, 2)

      if (images && images.length > 0) {
        mediaContent.images = images
        console.log(`✅ [TREND CRAWLER] Found ${images.length} additional images`)
      }
    } catch (imageError) {
      console.error(`❌ [TREND CRAWLER] Image fetching failed for "${query}":`, imageError.message)
    }

    return mediaContent
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      dataSource: this.dataSource,
      uptime: process.uptime(),
    }
  }

  async cleanup() {
    try {
      await tweetScraper.cleanup()
      console.log("🧹 [TREND CRAWLER] Cleanup completed")
    } catch (error) {
      console.error("❌ [TREND CRAWLER] Cleanup error:", error.message)
    }
  }
}

module.exports = new TrendCrawler()
