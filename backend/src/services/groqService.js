const axios = require("axios")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.model = "llama3-8b-8192" // Fast and efficient model
    this.requestTimeout = 30000 // 30 seconds
    this.maxRetries = 2
  }

  async generateArticleContent(article) {
    console.log("🤖 [GROQ SERVICE] Starting article content generation...")
    console.log(`📝 [GROQ SERVICE] Article: "${article.title?.substring(0, 50)}..."`)
    console.log(`🔑 [GROQ SERVICE] API Key: ${this.apiKey ? "Present" : "Missing"}`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key found, using fallback content")
      return this.generateFallbackContent(article)
    }

    try {
      const prompt = this.createArticlePrompt(article)
      console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

      const response = await this.makeGroqRequest(prompt)

      if (response && response.content) {
        console.log(`✅ [GROQ SERVICE] Successfully generated ${response.content.length} characters of content`)
        return {
          success: true,
          title: article.title,
          content: response.content,
          excerpt: article.description || this.generateExcerpt(response.content),
          tags: this.extractTags(article.title, article.description || ""),
          seo: this.generateSEOData(article),
          source: "groq_ai",
        }
      }

      throw new Error("No content received from Groq API")
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Content generation failed:", error.message)
      console.log("🔄 [GROQ SERVICE] Falling back to template content...")
      return this.generateFallbackContent(article)
    }
  }

  async generateTweetContent(prompt) {
    console.log("🐦 [GROQ SERVICE] Generating tweet content...")
    console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key, returning null for tweets")
      return null
    }

    try {
      const response = await this.makeGroqRequest(prompt, "json")

      if (response) {
        console.log("✅ [GROQ SERVICE] Tweet content generated successfully")
        return response
      }

      return null
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Tweet generation failed:", error.message)
      return null
    }
  }

  async makeGroqRequest(prompt, responseFormat = "text") {
    console.log("📡 [GROQ SERVICE] Making API request to Groq...")
    console.log(`📝 [GROQ SERVICE] Prompt summary: ${prompt.substring(0, 100)}...`)
    console.log(`📊 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

    const requestData = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: responseFormat === "json" ? 1000 : 4000, // Increased max tokens for better content
      temperature: 0.7,
      top_p: 0.9,
    }

    if (responseFormat === "json") {
      requestData.response_format = { type: "json_object" }
    }

    console.log(
      `🔧 [GROQ SERVICE] Request config: Model=${this.model}, MaxTokens=${requestData.max_tokens}, Format=${responseFormat}`,
    )
    console.log(`🔑 [GROQ SERVICE] API Key status: ${this.apiKey ? "Present (valid)" : "Missing"}`)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [GROQ SERVICE] Attempt ${attempt}/${this.maxRetries}`)
        console.log(`⏳ [GROQ SERVICE] Sending request to Groq API...`)

        const startTime = Date.now()
        const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.requestTimeout,
        })
        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(`📈 [GROQ SERVICE] API Response Status: ${response.status}`)
        console.log(`⏱️ [GROQ SERVICE] Request duration: ${duration}ms`)
        console.log(`📊 [GROQ SERVICE] Usage: ${JSON.stringify(response.data.usage || {})}`)
        console.log(
          `📊 [GROQ SERVICE] Tokens: Input=${response.data.usage?.prompt_tokens || "unknown"}, Output=${response.data.usage?.completion_tokens || "unknown"}, Total=${response.data.usage?.total_tokens || "unknown"}`,
        )

        if (response.data && response.data.choices && response.data.choices[0]) {
          const content = response.data.choices[0].message.content
          console.log(`📄 [GROQ SERVICE] Response content length: ${content.length} characters`)
          console.log(`📄 [GROQ SERVICE] Response preview: ${content.substring(0, 100)}...`)

          if (responseFormat === "json") {
            try {
              const parsed = JSON.parse(content)
              console.log("✅ [GROQ SERVICE] JSON response parsed successfully")
              console.log(`📊 [GROQ SERVICE] JSON keys: ${Object.keys(parsed).join(", ")}`)
              return parsed
            } catch (parseError) {
              console.error("❌ [GROQ SERVICE] JSON parsing failed:", parseError.message)
              console.error(`📄 [GROQ SERVICE] Invalid JSON content: ${content.substring(0, 200)}...`)
              throw new Error("Invalid JSON response from API")
            }
          } else {
            return { content }
          }
        }

        throw new Error("No content in API response")
      } catch (error) {
        console.error(`❌ [GROQ SERVICE] Attempt ${attempt} failed:`, error.message)

        if (error.response) {
          console.error(`📊 [GROQ SERVICE] API Error Status: ${error.response.status}`)
          console.error(`📊 [GROQ SERVICE] API Error Data: ${JSON.stringify(error.response.data || {})}`)

          // Don't retry on certain errors
          if (error.response.status === 401 || error.response.status === 403) {
            console.error(
              `🔑 [GROQ SERVICE] Authentication error: ${error.response.status} - ${error.response.statusText}`,
            )
            throw new Error("Authentication failed - check API key")
          }
        } else if (error.request) {
          console.error(`📡 [GROQ SERVICE] Network error: No response received`)
          console.error(`📡 [GROQ SERVICE] Request details: ${JSON.stringify(error.request._currentUrl || {})}`)
        } else {
          console.error(`⚠️ [GROQ SERVICE] Error before request: ${error.message}`)
        }

        if (attempt === this.maxRetries) {
          throw error
        }

        // Wait before retry
        const waitTime = attempt * 2000
        console.log(`⏳ [GROQ SERVICE] Waiting ${waitTime}ms before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  createArticlePrompt(article) {
    const title = article.title || "Untitled Article"
    const excerpt = article.excerpt || article.description || "No description available"
    const category = article.category || "General"
    const tags = Array.isArray(article.tags) ? article.tags.join(", ") : "technology, news"

    return `Write a comprehensive, SEO-optimized blog article about: "${title}"

Article Details:
- Category: ${category}
- Tags: ${tags}
- Brief Description: ${excerpt}

Requirements:
1. Write 1000-1500 words of engaging, informative content
2. Use proper markdown formatting with H2 and H3 headings
3. Include an introduction, main content sections, and conclusion
4. Make it SEO-friendly with natural keyword integration
5. Write in a professional, engaging tone
6. Include relevant insights and analysis
7. Add practical takeaways for readers
8. Include at least 5 subheadings for better structure

Structure the article with:
- Compelling introduction
- 4-5 main sections with H2 headings
- Subsections with H3 headings where appropriate
- Conclusion with key takeaways
- Use bullet points and numbered lists where relevant

Focus on providing value to readers while maintaining readability and SEO best practices.`
  }

  generateFallbackContent(article) {
    console.log("🎭 [GROQ SERVICE] Generating fallback content...")

    const title = article.title || "Trending Topic"
    const excerpt = article.excerpt || article.description || "Latest developments in this trending topic"
    const category = article.category || "Technology"
    const tags = Array.isArray(article.tags) ? article.tags : ["technology", "news"]

    const content = `# ${title}

${excerpt}

## Overview

This trending topic has been gaining significant attention across various platforms and communities. Our analysis reveals several key insights and developments that are worth exploring in detail.

## Key Developments

### Current Situation
The current landscape shows interesting patterns and trends that indicate significant changes in the industry. These developments are particularly noteworthy because they represent a shift in how we approach and understand this domain.

### Market Impact
The implications of these changes extend beyond immediate effects, potentially reshaping entire market segments and influencing future strategies across multiple industries.

### Expert Perspectives
Industry experts have shared valuable insights about these developments, highlighting both opportunities and challenges that lie ahead.

## Analysis and Insights

### Technical Aspects
From a technical standpoint, these developments showcase innovative approaches and methodologies that could become standard practices in the near future.

### Business Implications
Organizations are closely monitoring these trends to understand how they might impact their operations, strategies, and competitive positioning.

### Future Outlook
Looking ahead, several factors will likely influence how these trends evolve and what impact they will have on the broader ecosystem.

## Key Takeaways

- **Innovation Drive**: These developments represent significant innovation in the field
- **Market Opportunity**: New opportunities are emerging for businesses and individuals
- **Strategic Importance**: Organizations should consider these trends in their strategic planning
- **Continuous Evolution**: The landscape continues to evolve rapidly, requiring ongoing attention

## Conclusion

As we continue to monitor these developments, it's clear that staying informed and adaptable will be crucial for success. The trends we're seeing today are likely to shape the future of this domain significantly.

*Stay tuned for more updates and analysis on this evolving topic.*`

    console.log(`✅ [GROQ SERVICE] Generated ${content.length} characters of fallback content`)

    return {
      success: false,
      content,
      seo: this.generateSEOData(article),
      source: "fallback_template",
      reason: "API unavailable or failed",
    }
  }

  generateSEOData(article) {
    const title = article.title || "Trending News"
    const excerpt = article.excerpt || article.description || "Latest trending news and updates"
    const tags = Array.isArray(article.tags) ? article.tags : ["technology", "news"]

    return {
      metaTitle: title.length > 60 ? title.substring(0, 57) + "..." : title,
      metaDescription: excerpt.length > 160 ? excerpt.substring(0, 157) + "..." : excerpt,
      keywords: tags.join(", "),
      ogTitle: title,
      ogDescription: excerpt.substring(0, 200),
      twitterTitle: title.substring(0, 70),
      twitterDescription: excerpt.substring(0, 200),
    }
  }

  async testConnection() {
    console.log("🔧 [GROQ SERVICE] Testing connection...")

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key configured")
      return {
        success: false,
        error: "No API key configured",
        fallbackAvailable: true,
      }
    }

    try {
      console.log("📡 [GROQ SERVICE] Testing API connection...")

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: "user", content: "Hello, this is a connection test." }],
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
      )

      console.log("✅ [GROQ SERVICE] Connection test successful")
      return {
        success: true,
        model: this.model,
        status: response.status,
      }
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Connection test failed:", error.message)

      const errorDetails = { error: error.message }
      if (error.response) {
        errorDetails.status = error.response.status
        errorDetails.statusText = error.response.statusText
      }

      return {
        success: false,
        fallbackAvailable: true,
        ...errorDetails,
      }
    }
  }

  async healthCheck() {
    try {
      const result = await this.testConnection()
      return result.success
    } catch (error) {
      return false
    }
  }

  getStatus() {
    return {
      apiKey: !!this.apiKey,
      model: this.model,
      baseUrl: this.baseUrl,
      timeout: this.requestTimeout,
      maxRetries: this.maxRetries,
    }
  }

  generateExcerpt(content) {
    // Remove markdown and get first 160 characters
    const plainText = content.replace(/[#*`]/g, "").replace(/\n+/g, " ").trim()
    return plainText.length > 160 ? plainText.substring(0, 157) + "..." : plainText
  }

  extractTags(title, description) {
    const text = `${title} ${description}`.toLowerCase()
    const commonTags = [
      "technology",
      "ai",
      "business",
      "innovation",
      "news",
      "trending",
      "digital",
      "future",
      "market",
      "analysis",
      "breakthrough",
      "development",
    ]

    const foundTags = commonTags.filter((tag) => text.includes(tag))

    // Add title-based tags
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !["this", "that", "with", "from"].includes(word))

    foundTags.push(...titleWords.slice(0, 3))

    return [...new Set(foundTags)].slice(0, 6)
  }
}

module.exports = new GroqService()
