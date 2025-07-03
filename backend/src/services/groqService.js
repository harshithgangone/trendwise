const axios = require("axios")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.isHealthy = false
    this.lastHealthCheck = null

    if (!this.apiKey) {
      console.warn("⚠️ [GROQ SERVICE] No API key found, using fallback content generation")
    } else {
      console.log(`🔑 [GROQ SERVICE] Loaded GROQ_API_KEY: ${this.apiKey.substring(0, 8)}****`)
    }
  }

  async testConnection() {
    try {
      if (!this.apiKey) {
        console.log("🔧 [GROQ SERVICE] No API key - using fallback mode")
        this.isHealthy = true
        this.lastHealthCheck = new Date()
        return { status: "healthy", mode: "fallback" }
      }

      console.log("🔍 [GROQ SERVICE] Testing connection...")

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: "llama3-8b-8192",
          messages: [
            {
              role: "user",
              content: 'Hello, this is a connection test. Please respond with "Connection successful".',
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

      if (response.status === 200 && response.data.choices) {
        this.isHealthy = true
        this.lastHealthCheck = new Date()
        console.log("✅ [GROQ SERVICE] Connection test successful")
        return { status: "healthy", mode: "live" }
      } else {
        throw new Error(`Invalid response: ${response.status}`)
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)
      this.isHealthy = false
      this.lastHealthCheck = new Date()
      return { status: "unhealthy", error: error.message }
    }
  }

  async generateArticle(newsData, options = {}) {
    try {
      if (!this.apiKey) {
        console.log("🔧 [GROQ SERVICE] Using fallback content generation")
        return this.generateFallbackArticle(newsData)
      }

      const prompt = this.buildPrompt(newsData, options)

      console.log(`🤖 [GROQ SERVICE] Generating article for: "${newsData.title}"`)

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model || "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content:
                "You are a professional journalist and content writer. Create engaging, informative, and well-structured articles based on the provided news data. Always maintain journalistic integrity and provide balanced perspectives.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
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
        const generatedContent = response.data.choices[0].message.content
        console.log(`✅ [GROQ SERVICE] Successfully generated article (${generatedContent.length} chars)`)

        return this.processGeneratedContent(generatedContent, newsData)
      } else {
        throw new Error("Invalid response format from Groq API")
      }
    } catch (error) {
      console.error(`❌ [GROQ SERVICE] Article generation failed:`, error.message)

      if (error.response?.status === 401) {
        console.error("🔑 [GROQ SERVICE] API key invalid")
      } else if (error.response?.status === 429) {
        console.error("⏱️ [GROQ SERVICE] Rate limit exceeded")
      }

      // Return fallback content
      return this.generateFallbackArticle(newsData)
    }
  }

  buildPrompt(newsData, options) {
    const style = options.style || "informative"
    const length = options.length || "medium"

    return `
Please create a comprehensive article based on the following news information:

Title: ${newsData.title}
Description: ${newsData.description}
Source: ${newsData.source?.name || "Unknown"}
Published: ${newsData.publishedAt}

Requirements:
- Style: ${style} and engaging
- Length: ${length} (aim for 800-1200 words)
- Include relevant context and background information
- Structure with clear paragraphs and logical flow
- Maintain journalistic objectivity
- Add insights and analysis where appropriate
- Use HTML formatting for better readability

Please provide:
1. An engaging headline (if different from original)
2. A compelling excerpt/summary (2-3 sentences)
3. The full article content with proper HTML formatting
4. 3-5 relevant tags
5. Estimated reading time

Format your response as a JSON object with these fields:
{
  "title": "Article title",
  "excerpt": "Brief summary",
  "content": "Full HTML formatted article content",
  "tags": ["tag1", "tag2", "tag3"],
  "readTime": 5,
  "category": "appropriate category"
}
`
  }

  processGeneratedContent(content, originalNews) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content)

      return {
        title: parsed.title || originalNews.title,
        excerpt: parsed.excerpt || originalNews.description,
        content: parsed.content || content,
        tags: parsed.tags || this.extractTags(originalNews.title + " " + originalNews.description),
        readTime: parsed.readTime || this.calculateReadTime(parsed.content || content),
        category: parsed.category || this.determineCategory(originalNews.title),
        source: originalNews.source,
        originalUrl: originalNews.url,
        publishedAt: originalNews.publishedAt,
      }
    } catch (error) {
      // If not JSON, treat as plain text
      console.log("📝 [GROQ SERVICE] Processing as plain text content")

      return {
        title: originalNews.title,
        excerpt: originalNews.description,
        content: this.formatPlainTextAsHTML(content),
        tags: this.extractTags(originalNews.title + " " + originalNews.description),
        readTime: this.calculateReadTime(content),
        category: this.determineCategory(originalNews.title),
        source: originalNews.source,
        originalUrl: originalNews.url,
        publishedAt: originalNews.publishedAt,
      }
    }
  }

  generateFallbackArticle(newsData) {
    console.log("🎭 [GROQ SERVICE] Generating fallback article")

    const fallbackContent = `
      <div class="article-content">
        <p><strong>Breaking News:</strong> ${newsData.description}</p>
        
        <p>This developing story continues to unfold as more information becomes available. Our team is monitoring the situation closely and will provide updates as they develop.</p>
        
        <p>The implications of this news could have far-reaching effects across multiple sectors. Industry experts are weighing in with their analysis and predictions for what this might mean moving forward.</p>
        
        <p>Key points to consider:</p>
        <ul>
          <li>The immediate impact on stakeholders and affected parties</li>
          <li>Potential long-term consequences and implications</li>
          <li>Expert opinions and analysis from industry leaders</li>
          <li>What to watch for in upcoming developments</li>
        </ul>
        
        <p>We will continue to monitor this story and provide comprehensive coverage as more details emerge. Stay tuned for the latest updates and in-depth analysis.</p>
        
        <p><em>This is a developing story. More information will be added as it becomes available.</em></p>
      </div>
    `

    return {
      title: newsData.title,
      excerpt: newsData.description,
      content: fallbackContent,
      tags: this.extractTags(newsData.title + " " + newsData.description),
      readTime: this.calculateReadTime(fallbackContent),
      category: this.determineCategory(newsData.title),
      source: newsData.source,
      originalUrl: newsData.url,
      publishedAt: newsData.publishedAt,
    }
  }

  extractTags(text) {
    const commonWords = [
      "the",
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
      "be",
      "been",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "must",
      "can",
      "this",
      "that",
      "these",
      "those",
      "a",
      "an",
    ]

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.includes(word))

    const wordCount = {}
    words.forEach((word) => {
      wordCount[word] = (wordCount[word] || 0) + 1
    })

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  }

  determineCategory(title) {
    const categories = {
      technology: ["tech", "ai", "software", "computer", "digital", "internet", "cyber"],
      business: ["business", "economy", "market", "finance", "company", "corporate"],
      health: ["health", "medical", "medicine", "hospital", "doctor", "treatment"],
      science: ["science", "research", "study", "discovery", "experiment"],
      politics: ["politics", "government", "election", "policy", "congress"],
      sports: ["sports", "game", "team", "player", "championship", "league"],
      entertainment: ["movie", "music", "celebrity", "entertainment", "show"],
    }

    const titleLower = title.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => titleLower.includes(keyword))) {
        return category
      }
    }

    return "general"
  }

  calculateReadTime(content) {
    const wordsPerMinute = 200
    const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
  }

  formatPlainTextAsHTML(text) {
    return text
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph.trim()}</p>`)
      .join("\n")
  }

  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      hasApiKey: !!this.apiKey,
      service: "Groq",
    }
  }
}

// Create singleton instance
const groqService = new GroqService()

module.exports = groqService
