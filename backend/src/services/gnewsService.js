const axios = require("axios")

class GNewsService {
  constructor() {
    this.apiKey = process.env.GNEWS_API_KEY || "d99356d6e3301a4baa601c68490f2048"
    this.baseURL = "https://gnews.io/api/v4"
    this.categories = ["technology", "business", "health", "science", "entertainment", "sports"]
  }

  // Generate a proper slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim("-") // Remove leading/trailing hyphens
      .substring(0, 100) // Limit length
  }

  // Extract tags from title and description
  extractTags(title, description) {
    const commonTags = [
      "AI",
      "Technology",
      "Business",
      "Health",
      "Science",
      "Entertainment",
      "Sports",
      "Innovation",
      "Research",
      "Development",
      "News",
      "Breaking",
      "Analysis",
      "Market",
      "Industry",
      "Global",
      "Digital",
      "Future",
      "Trends",
    ]

    const text = `${title} ${description}`.toLowerCase()
    const foundTags = commonTags.filter((tag) => text.includes(tag.toLowerCase()))

    // Add category-based tags
    if (text.includes("tech") || text.includes("ai") || text.includes("software")) {
      foundTags.push("Technology")
    }
    if (text.includes("business") || text.includes("market") || text.includes("economy")) {
      foundTags.push("Business")
    }
    if (text.includes("health") || text.includes("medical") || text.includes("doctor")) {
      foundTags.push("Health")
    }

    return [...new Set(foundTags)].slice(0, 5) // Remove duplicates and limit to 5
  }

  // Calculate read time based on content length
  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.split(" ").length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  async getTopHeadlines(category = "general", lang = "en", country = "us", max = 10) {
    try {
      console.log(`📰 [GNEWS] Fetching top headlines - Category: ${category}, Max: ${max}`)

      const response = await axios.get(`${this.baseURL}/top-headlines`, {
        params: {
          category,
          lang,
          country,
          max,
          apikey: this.apiKey,
        },
        timeout: 15000,
      })

      if (response.data && response.data.articles) {
        const processedArticles = response.data.articles.map((article) => ({
          query: article.title,
          searchVolume: this.estimateSearchVolume(article),
          relatedTopics: this.extractTopics(article.title, article.description),
          articles: [
            {
              title: article.title,
              url: article.url,
              source: article.source.name,
              description: article.description,
              image: article.image,
              publishedAt: article.publishedAt,
            },
          ],
          geo: country.toUpperCase(),
          source: "gnews",
          category: category,
          originalArticle: article,
        }))

        console.log(`✅ [GNEWS] Successfully fetched ${processedArticles.length} REAL news articles`)
        return processedArticles
      }

      throw new Error("Invalid response structure from GNews API")
    } catch (error) {
      console.error(`❌ [GNEWS] Error fetching headlines:`, error.message)
      throw error
    }
  }

  async searchNews(query, lang = "en", country = "us", limit = 10) {
    try {
      console.log(`🔍 [GNEWS] Searching news for: "${query}"`)

      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          q: query,
          lang,
          country,
          max: limit,
          apikey: this.apiKey,
          sortby: "relevance",
        },
        timeout: 15000,
      })

      if (response.data && response.data.articles) {
        console.log(`✅ [GNEWS] Found ${response.data.articles.length} articles for "${query}"`)
        return response.data.articles
      }

      return []
    } catch (error) {
      console.error(`❌ [GNEWS] Search error for "${query}":`, error.message)
      return []
    }
  }

  async getTrendingTopics() {
    try {
      console.log("🔥 [GNEWS] Fetching trending topics from GNews API...")

      const allArticles = []

      // Fetch from multiple categories
      for (const category of this.categories.slice(0, 3)) {
        // Limit to 3 categories to avoid rate limits
        try {
          const response = await axios.get(`${this.baseURL}/top-headlines`, {
            params: {
              token: this.apiKey,
              lang: "en",
              country: "us",
              category: category,
              max: 5, // Limit per category
            },
            timeout: 10000,
          })

          if (response.data && response.data.articles) {
            console.log(`✅ [GNEWS] Found ${response.data.articles.length} articles in ${category}`)
            allArticles.push(
              ...response.data.articles.map((article) => ({
                ...article,
                category: category,
              })),
            )
          }
        } catch (categoryError) {
          console.warn(`⚠️ [GNEWS] Failed to fetch ${category}:`, categoryError.message)
        }
      }

      if (allArticles.length === 0) {
        throw new Error("No articles found from any category")
      }

      // Transform articles to our format
      const transformedArticles = allArticles.map((article) => {
        const slug = this.generateSlug(article.title)
        const tags = this.extractTags(article.title, article.description || "")
        const readTime = this.calculateReadTime(article.content || article.description || "")

        return {
          title: article.title,
          slug: slug,
          content: this.formatContent(article),
          excerpt: article.description || article.title,
          thumbnail: article.image || "/placeholder.svg?height=400&width=600",
          tags: tags.length > 0 ? tags : [article.category || "News"],
          meta: {
            title: article.title,
            description: article.description || article.title,
            keywords: tags.join(", "),
          },
          media: {
            images: article.image ? [article.image] : [],
            videos: [],
            tweets: [],
          },
          readTime: readTime,
          views: Math.floor(Math.random() * 1000) + 100, // Random initial views
          status: "published",
          trendData: {
            source: "gnews",
            originalQuery: article.title,
            trendScore: Math.floor(Math.random() * 100) + 50,
            searchVolume: this.estimateSearchVolume(article),
            geo: "US",
            sourceUrl: article.url,
            publishedAt: article.publishedAt,
            sourceName: article.source?.name || "Unknown",
          },
          featured: Math.random() > 0.7, // 30% chance of being featured
          author: article.source?.name || "TrendWise AI",
        }
      })

      console.log(`🎉 [GNEWS] Successfully processed ${transformedArticles.length} trending articles`)

      return {
        success: true,
        source: "gnews",
        articles: transformedArticles,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("❌ [GNEWS] Error fetching trending topics:", error.message)

      // Return high-quality fallback data
      return {
        success: false,
        source: "fallback",
        articles: this.getFallbackArticles(),
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  formatContent(article) {
    const content = article.content || article.description || ""
    const title = article.title
    const sourceUrl = article.url
    const sourceName = article.source?.name || "Source"

    return `
      <div class="article-content">
        <h1>${title}</h1>
        
        <div class="article-meta">
          <p><strong>Source:</strong> <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceName}</a></p>
          <p><strong>Published:</strong> ${new Date(article.publishedAt).toLocaleDateString()}</p>
        </div>

        <div class="article-body">
          ${content
            .split("\n")
            .map((paragraph) => (paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ""))
            .join("")}
        </div>

        <div class="article-footer">
          <p><em>This article was sourced from ${sourceName} and enhanced by TrendWise AI for better readability and SEO optimization.</em></p>
          <p><a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">Read the original article →</a></p>
        </div>
      </div>
    `
  }

  estimateSearchVolume(article) {
    const publishedDate = new Date(article.publishedAt)
    const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60)

    // More recent articles get higher estimated search volume
    if (hoursAgo < 1) return "10K-100K"
    if (hoursAgo < 6) return "5K-50K"
    if (hoursAgo < 24) return "1K-10K"
    return "500-5K"
  }

  getFallbackArticles() {
    return [
      {
        title: "Breaking: Major Technology Breakthrough Announced",
        slug: "major-technology-breakthrough-announced",
        content:
          "<h1>Major Technology Breakthrough Announced</h1><p>A significant advancement in technology has been announced today, promising to revolutionize various industries.</p>",
        excerpt: "A significant advancement in technology has been announced today.",
        thumbnail: "/placeholder.svg?height=400&width=600",
        tags: ["Technology", "Innovation", "Breaking"],
        meta: {
          title: "Major Technology Breakthrough Announced",
          description: "A significant advancement in technology has been announced today.",
          keywords: "technology, innovation, breakthrough",
        },
        media: { images: [], videos: [], tweets: [] },
        readTime: 3,
        views: 1250,
        status: "published",
        trendData: {
          source: "fallback",
          originalQuery: "technology breakthrough",
          trendScore: 85,
          searchVolume: "10K-50K",
          geo: "Global",
        },
        featured: true,
        author: "TrendWise AI",
      },
    ]
  }

  extractTopics(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const commonTopics = [
      "artificial intelligence",
      "ai",
      "machine learning",
      "technology",
      "innovation",
      "climate change",
      "sustainability",
      "renewable energy",
      "electric vehicles",
      "cryptocurrency",
      "bitcoin",
      "blockchain",
      "finance",
      "economy",
      "health",
      "medicine",
      "covid",
      "vaccine",
      "research",
      "space",
      "nasa",
      "spacex",
      "mars",
      "satellite",
      "politics",
      "government",
      "election",
      "policy",
      "business",
      "startup",
      "investment",
      "market",
      "entertainment",
      "movie",
      "music",
      "celebrity",
      "sports",
      "football",
      "basketball",
      "olympics",
    ]

    const foundTopics = commonTopics.filter((topic) => text.includes(topic)).slice(0, 5)

    return foundTopics.length > 0 ? foundTopics : ["trending", "news", "current events"]
  }
}

module.exports = new GNewsService()
