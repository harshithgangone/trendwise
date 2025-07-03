const axios = require("axios")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.isHealthy = false
    this.lastError = null

    if (!this.apiKey) {
      console.warn("⚠️ [GROQ SERVICE] No API key found")
      this.lastError = "No API key configured"
    } else {
      console.log(`✅ [GROQ SERVICE] Loaded GROQ_API_KEY: ${this.apiKey.substring(0, 6)}****`)
    }
  }

  async testConnection() {
    try {
      console.log("🔍 [GROQ SERVICE] Testing connection...")

      if (!this.apiKey) {
        throw new Error("No API key configured")
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: "llama3-8b-8192",
          messages: [
            {
              role: "user",
              content: 'Hello, this is a test message. Please respond with "Connection successful".',
            },
          ],
          max_tokens: 10,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      )

      if (response.data && response.data.choices && response.data.choices[0]) {
        this.isHealthy = true
        this.lastError = null
        console.log("✅ [GROQ SERVICE] Connection test successful")
        return true
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      this.isHealthy = false
      this.lastError = error.message
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)
      return false
    }
  }

  async generateArticle(newsData, options = {}) {
    try {
      console.log(`🤖 [GROQ SERVICE] Generating article for: "${newsData.title}"`)

      if (!this.apiKey) {
        console.warn("⚠️ [GROQ SERVICE] No API key, using fallback content")
        return this.generateFallbackArticle(newsData)
      }

      const prompt = `
You are a professional news writer for TrendWise. Create a comprehensive, engaging article based on this news:

Title: ${newsData.title}
Description: ${newsData.description}
Source: ${newsData.source?.name || "Unknown"}
URL: ${newsData.url}

Requirements:
1. Write a compelling headline (different from the original)
2. Create an engaging excerpt (150-200 characters)
3. Write a full article (800-1200 words) with multiple paragraphs
4. Include relevant tags (5-7 tags)
5. Assign an appropriate category
6. Make it informative, engaging, and well-structured
7. Use markdown formatting for better readability

Format your response as JSON:
{
  "title": "Your compelling headline",
  "excerpt": "Engaging excerpt...",
  "content": "Full article content with markdown formatting...",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "appropriate category",
  "readTime": estimated_read_time_in_minutes
}
`

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: "llama3-70b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are a professional news writer who creates engaging, informative articles. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        },
      )

      if (response.data && response.data.choices && response.data.choices[0]) {
        const content = response.data.choices[0].message.content.trim()

        try {
          // Try to parse JSON response
          const articleData = JSON.parse(content)

          console.log(`✅ [GROQ SERVICE] Generated article: "${articleData.title}"`)

          return {
            success: true,
            article: {
              title: articleData.title || newsData.title,
              excerpt: articleData.excerpt || newsData.description?.substring(0, 200) + "...",
              content: articleData.content || this.generateFallbackContent(newsData),
              tags: articleData.tags || this.generateTags(newsData),
              category: articleData.category || "General",
              readTime: articleData.readTime || Math.ceil((articleData.content?.length || 1000) / 1000),
              sourceUrl: newsData.url,
              originalSource: newsData.source?.name || "Unknown",
            },
          }
        } catch (parseError) {
          console.warn("⚠️ [GROQ SERVICE] Failed to parse JSON, using fallback")
          return this.generateFallbackArticle(newsData)
        }
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Error generating article:", error.message)
      return this.generateFallbackArticle(newsData)
    }
  }

  generateFallbackArticle(newsData) {
    console.log("🔄 [GROQ SERVICE] Generating fallback article")

    const fallbackContent = this.generateFallbackContent(newsData)

    return {
      success: true,
      article: {
        title: newsData.title,
        excerpt: newsData.description?.substring(0, 200) + "..." || "Breaking news update from our editorial team.",
        content: fallbackContent,
        tags: this.generateTags(newsData),
        category: this.categorizeNews(newsData),
        readTime: Math.ceil(fallbackContent.length / 1000),
        sourceUrl: newsData.url,
        originalSource: newsData.source?.name || "Unknown",
      },
    }
  }

  generateFallbackContent(newsData) {
    const paragraphs = [
      `# ${newsData.title}`,
      "",
      newsData.description || "This is a developing story that continues to unfold.",
      "",
      "Our editorial team is closely monitoring this situation and will provide updates as more information becomes available.",
      "",
      "## Key Points",
      "",
      "- This story is currently developing",
      "- More details are expected to emerge",
      "- We will continue to follow this story",
      "",
      "## What This Means",
      "",
      "This development represents an important moment in current events. The implications of this news may have far-reaching effects across various sectors.",
      "",
      "## Looking Forward",
      "",
      "As this story continues to develop, we encourage our readers to stay informed through reliable news sources. We will update this article as new information becomes available.",
      "",
      `*Source: ${newsData.source?.name || "News Wire"}*`,
    ]

    return paragraphs.join("\n")
  }

  generateTags(newsData) {
    const title = (newsData.title || "").toLowerCase()
    const description = (newsData.description || "").toLowerCase()
    const content = title + " " + description

    const possibleTags = [
      "breaking news",
      "technology",
      "business",
      "politics",
      "health",
      "science",
      "entertainment",
      "sports",
      "world news",
      "economy",
      "innovation",
      "research",
      "development",
      "analysis",
      "trending",
    ]

    const tags = possibleTags
      .filter((tag) => content.includes(tag.toLowerCase()) || tag.split(" ").some((word) => content.includes(word)))
      .slice(0, 5)

    // Ensure we have at least 3 tags
    while (tags.length < 3) {
      const randomTag = possibleTags[Math.floor(Math.random() * possibleTags.length)]
      if (!tags.includes(randomTag)) {
        tags.push(randomTag)
      }
    }

    return tags
  }

  categorizeNews(newsData) {
    const title = (newsData.title || "").toLowerCase()
    const description = (newsData.description || "").toLowerCase()
    const content = title + " " + description

    const categories = {
      Technology: ["tech", "ai", "artificial intelligence", "software", "hardware", "digital", "cyber", "internet"],
      Business: ["business", "economy", "market", "finance", "company", "corporate", "trade", "investment"],
      Politics: ["politics", "government", "election", "policy", "congress", "senate", "president", "law"],
      Health: ["health", "medical", "doctor", "hospital", "disease", "treatment", "medicine", "wellness"],
      Science: ["science", "research", "study", "discovery", "experiment", "scientist", "laboratory"],
      Sports: ["sports", "game", "team", "player", "championship", "league", "match", "tournament"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "film", "show", "actor", "artist"],
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        return category
      }
    }

    return "General"
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastError: this.lastError,
      hasApiKey: !!this.apiKey,
      service: "Groq",
    }
  }
}

// Create singleton instance
const groqService = new GroqService()

module.exports = groqService
