const axios = require("axios")
const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.client = null
    this.isInitialized = false
    this.lastError = null
    this.requestCount = 0
    this.successCount = 0
    this.errorCount = 0

    this.init()
  }

  init() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.log("⚠️ [GROQ] API key not found in environment variables")
        this.lastError = "GROQ_API_KEY not found"
        return
      }

      this.client = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      })

      this.isInitialized = true
      console.log("✅ [GROQ] Service initialized successfully")
    } catch (error) {
      console.error("❌ [GROQ] Failed to initialize:", error.message)
      this.lastError = error.message
      this.isInitialized = false
    }
  }

  async healthCheck() {
    try {
      if (!this.isInitialized) {
        console.log("❌ [GROQ] Health check failed - service not initialized")
        return false
      }

      console.log("🏥 [GROQ] Performing health check...")

      // Simple test request
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama3-8b-8192",
        max_tokens: 10,
      })

      if (response && response.choices && response.choices.length > 0) {
        console.log("✅ [GROQ] Health check passed")
        return true
      } else {
        console.log("❌ [GROQ] Health check failed - invalid response")
        return false
      }
    } catch (error) {
      console.error("❌ [GROQ] Health check failed:", error.message)
      this.lastError = error.message
      return false
    }
  }

  async generateArticle(trend) {
    if (!this.isInitialized) {
      throw new Error("Groq service not initialized")
    }

    this.requestCount++
    console.log(`🤖 [GROQ] Generating article for trend: "${trend.title}" (Request #${this.requestCount})`)

    try {
      const prompt = `Write a comprehensive, engaging news article about: "${trend.title}"

${trend.description ? `Context: ${trend.description}` : ""}

Requirements:
- Write a compelling headline
- Create an engaging excerpt (150-200 characters)
- Write a full article (800-1200 words) in markdown format
- Include relevant tags (5-8 tags)
- Make it informative, well-structured, and engaging
- Use proper markdown formatting with headers, lists, and emphasis
- Focus on current trends and implications

Format your response as JSON:
{
  "title": "Article headline",
  "excerpt": "Brief description",
  "content": "Full article in markdown",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`

      console.log("📝 [GROQ] Sending request to Groq API...")

      const response = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional journalist and content writer. Create high-quality, engaging articles that are informative and well-structured. Always respond with valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192", // Using the more powerful model
        max_tokens: 2000,
        temperature: 0.7,
      })

      console.log("📨 [GROQ] Received response from Groq API")

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response from Groq API")
      }

      const content = response.choices[0].message.content.trim()
      console.log(`📄 [GROQ] Generated content length: ${content.length} characters`)

      // Try to parse JSON response
      let articleData
      try {
        // Clean up the response to extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          articleData = JSON.parse(jsonMatch[0])
        } else {
          throw new Error("No JSON found in response")
        }
      } catch (parseError) {
        console.log("⚠️ [GROQ] Failed to parse JSON, creating structured response...")

        // Fallback: create structured response from raw content
        const lines = content.split("\n").filter((line) => line.trim())
        articleData = {
          title: trend.title,
          excerpt: lines[0] || trend.description || "An interesting article about current trends.",
          content: content,
          tags: this.extractTagsFromContent(trend.title + " " + content),
        }
      }

      // Validate and enhance the article data
      articleData = this.validateAndEnhanceArticle(articleData, trend)

      this.successCount++
      console.log(`✅ [GROQ] Successfully generated article: "${articleData.title}"`)
      console.log(`📊 [GROQ] Success rate: ${((this.successCount / this.requestCount) * 100).toFixed(1)}%`)

      return articleData
    } catch (error) {
      this.errorCount++
      this.lastError = error.message
      console.error(`❌ [GROQ] Error generating article:`, error.message)
      console.log(`📊 [GROQ] Error rate: ${((this.errorCount / this.requestCount) * 100).toFixed(1)}%`)

      // Return a fallback article
      return this.createFallbackArticle(trend)
    }
  }

  validateAndEnhanceArticle(articleData, trend) {
    // Ensure all required fields exist
    if (!articleData.title || articleData.title.length < 10) {
      articleData.title = trend.title
    }

    if (!articleData.excerpt || articleData.excerpt.length < 50) {
      articleData.excerpt = trend.description || `An in-depth look at ${trend.title} and its implications.`
    }

    if (!articleData.content || articleData.content.length < 200) {
      articleData.content = this.generateFallbackContent(trend)
    }

    if (!articleData.tags || !Array.isArray(articleData.tags) || articleData.tags.length === 0) {
      articleData.tags = this.extractTagsFromContent(trend.title + " " + articleData.content)
    }

    // Ensure excerpt is not too long
    if (articleData.excerpt.length > 200) {
      articleData.excerpt = articleData.excerpt.substring(0, 197) + "..."
    }

    // Ensure we have at least 3 tags
    if (articleData.tags.length < 3) {
      const additionalTags = ["News", "Trending", "Analysis"]
      articleData.tags = [...articleData.tags, ...additionalTags].slice(0, 8)
    }

    return articleData
  }

  extractTagsFromContent(text) {
    const commonTags = [
      "Technology",
      "AI",
      "Business",
      "Health",
      "Science",
      "Innovation",
      "News",
      "Trending",
      "Analysis",
      "Future",
      "Digital",
      "Research",
      "Development",
      "Industry",
      "Market",
    ]

    const textLower = text.toLowerCase()
    const foundTags = commonTags.filter((tag) => textLower.includes(tag.toLowerCase()))

    // Add some dynamic tags from the text
    const words =
      text
        .toLowerCase()
        .match(/\b[a-z]{4,}\b/g)
        ?.filter((word) => !["this", "that", "with", "from", "they", "have", "been", "will", "would"].includes(word))
        ?.slice(0, 3) || []

    const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1))

    return [...new Set([...foundTags, ...capitalizedWords])].slice(0, 8)
  }

  generateFallbackContent(trend) {
    return `# ${trend.title}

${trend.description || "This is an important development that deserves attention."}

## Overview

Recent developments in this area have shown significant progress and potential impact across various sectors. This trend represents a shift in how we approach and understand these challenges.

## Key Points

- **Innovation**: New approaches are being developed and implemented
- **Impact**: The effects are being felt across multiple industries
- **Future Outlook**: Continued growth and development expected

## Analysis

The implications of this trend extend beyond immediate applications, suggesting broader changes in how we think about and approach related challenges.

## Conclusion

As this trend continues to evolve, it will be important to monitor its development and understand its broader implications for the future.

*This article was generated by TrendBot AI to keep you informed about the latest developments.*`
  }

  createFallbackArticle(trend) {
    console.log("🔄 [GROQ] Creating fallback article...")

    return {
      title: trend.title,
      excerpt: trend.description || `Exploring the latest developments in ${trend.title} and their implications.`,
      content: this.generateFallbackContent(trend),
      tags: this.extractTagsFromContent(trend.title),
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasApiKey: !!process.env.GROQ_API_KEY,
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0,
      lastError: this.lastError,
    }
  }

  getStats() {
    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.errorCount,
      successRate: this.requestCount > 0 ? (this.successCount / this.requestCount) * 100 : 0,
      lastError: this.lastError,
      isHealthy: this.isInitialized && this.lastError === null,
    }
  }
}

module.exports = new GroqService()
