const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.client = null
    this.isHealthy = false
    this.lastHealthCheck = null
    this.init()
  }

  init() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.warn("⚠️ [GROQ] API key not found, service will be disabled")
        return
      }

      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      })

      console.log("✅ [GROQ] Service initialized successfully")
    } catch (error) {
      console.error("❌ [GROQ] Failed to initialize:", error)
    }
  }

  async healthCheck() {
    try {
      if (!this.client) {
        this.isHealthy = false
        return false
      }

      // Simple test to check if the service is working
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama3-8b-8192",
        max_tokens: 5,
      })

      this.isHealthy = !!response
      this.lastHealthCheck = new Date()
      return this.isHealthy
    } catch (error) {
      console.error("❌ [GROQ] Health check failed:", error)
      this.isHealthy = false
      return false
    }
  }

  getStatus() {
    return {
      isHealthy: this.isHealthy,
      hasApiKey: !!process.env.GROQ_API_KEY,
      lastHealthCheck: this.lastHealthCheck,
      clientInitialized: !!this.client,
    }
  }

  async generateArticleContent(title, category, trends = []) {
    try {
      if (!this.client) {
        throw new Error("Groq client not initialized")
      }

      console.log(`🤖 [GROQ] Generating article for: ${title}`)

      const trendContext = trends.length > 0 ? `Related trends: ${trends.join(", ")}` : ""

      const prompt = `Write a comprehensive news article about "${title}" in the ${category} category. 
      ${trendContext}
      
      Requirements:
      - Write in a professional journalistic style
      - Include relevant background information
      - Make it engaging and informative
      - Length: 800-1200 words
      - Include quotes or expert opinions where appropriate
      - Structure with clear paragraphs
      
      Format the response as a well-structured article with proper paragraphs.`

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional journalist writing high-quality news articles. Write engaging, informative, and well-structured content.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        max_tokens: 2000,
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content

      if (!content) {
        throw new Error("No content generated")
      }

      console.log(`✅ [GROQ] Article generated successfully (${content.length} characters)`)
      return content
    } catch (error) {
      console.error("❌ [GROQ] Failed to generate article:", error)

      // Return fallback content
      return this.getFallbackContent(title, category)
    }
  }

  async generateSummary(content, maxLength = 200) {
    try {
      if (!this.client) {
        throw new Error("Groq client not initialized")
      }

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional editor. Create concise, engaging summaries that capture the key points of articles.",
          },
          {
            role: "user",
            content: `Please create a compelling summary of this article in ${maxLength} characters or less:\n\n${content}`,
          },
        ],
        model: "llama3-8b-8192",
        max_tokens: 100,
        temperature: 0.5,
      })

      const summary = response.choices[0]?.message?.content?.trim()

      if (!summary) {
        throw new Error("No summary generated")
      }

      return summary.length > maxLength ? summary.substring(0, maxLength - 3) + "..." : summary
    } catch (error) {
      console.error("❌ [GROQ] Failed to generate summary:", error)

      // Return fallback summary
      return content.substring(0, maxLength - 3) + "..."
    }
  }

  getFallbackContent(title, category) {
    const fallbackContent = `
# ${title}

This is a developing story in the ${category} sector. Our team is working to bring you the latest updates and comprehensive coverage of this important topic.

## Key Points

- This story is currently developing
- More information will be available as it becomes available
- Our editorial team is investigating all aspects of this story

## Background

The ${category} industry continues to evolve rapidly, with new developments emerging regularly. This particular story represents an important development that our readers should be aware of.

## What This Means

As this story develops, we will continue to monitor the situation and provide updates as they become available. The implications of this development may have far-reaching effects in the ${category} space.

## Looking Forward

We will continue to follow this story closely and provide comprehensive coverage as more information becomes available. Stay tuned for updates and analysis from our expert team.

*This article will be updated as more information becomes available.*
    `

    return fallbackContent.trim()
  }
}

// Create singleton instance
const groqService = new GroqService()

module.exports = groqService
