const axios = require("axios")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.baseUrl = "https://api.groq.com/openai/v1"
    this.model = "llama3-8b-8192"
    this.requestTimeout = 30000
    this.maxRetries = 2

    console.log("🤖 [GROQ SERVICE] Initialized")
    console.log(`🔑 [GROQ SERVICE] API Key: ${this.apiKey ? "Present ✅" : "Missing ❌"}`)
    console.log(`🎯 [GROQ SERVICE] Model: ${this.model}`)
    console.log(`⏱️ [GROQ SERVICE] Timeout: ${this.requestTimeout}ms`)
  }

  async generateArticle(trend) {
    console.log("📝 [GROQ SERVICE] Starting article generation...")
    console.log(`📰 [GROQ SERVICE] Topic: "${trend.title?.substring(0, 50)}..."`)
    console.log(`📊 [GROQ SERVICE] Source: ${trend.source || "unknown"}`)

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key found, using fallback content")
      return this.generateFallbackArticle(trend)
    }

    try {
      const prompt = this.createArticlePrompt(trend)
      console.log(`📏 [GROQ SERVICE] Prompt length: ${prompt.length} characters`)

      const response = await this.makeGroqRequest(prompt)

      if (response && response.content) {
        console.log(`✅ [GROQ SERVICE] Successfully generated ${response.content.length} characters of content`)

        return {
          title: this.extractTitle(response.content) || trend.title,
          content: response.content,
          excerpt: this.generateExcerpt(response.content),
          tags: this.extractTags(trend.title, response.content),
          category: this.categorizeContent(trend.title, response.content),
          success: true,
          source: "groq_ai",
        }
      }

      throw new Error("No content received from Groq API")
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Content generation failed:", error.message)
      console.log("🔄 [GROQ SERVICE] Falling back to template content...")
      return this.generateFallbackArticle(trend)
    }
  }

  async makeGroqRequest(prompt) {
    console.log("📡 [GROQ SERVICE] Making API request to Groq...")

    const requestData = {
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "You are a professional content writer specializing in creating engaging, informative articles about trending topics. Write in a clear, engaging style with proper markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
    }

    console.log(`🔧 [GROQ SERVICE] Request config:`)
    console.log(`   Model: ${this.model}`)
    console.log(`   Max Tokens: ${requestData.max_tokens}`)
    console.log(`   Temperature: ${requestData.temperature}`)

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 [GROQ SERVICE] Attempt ${attempt}/${this.maxRetries}`)

        const startTime = Date.now()
        const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: this.requestTimeout,
        })

        const duration = Date.now() - startTime
        console.log(`📈 [GROQ SERVICE] API Response received in ${duration}ms`)
        console.log(`📊 [GROQ SERVICE] Status: ${response.status}`)

        if (response.data.usage) {
          console.log(`💰 [GROQ SERVICE] Token usage:`, response.data.usage)
        }

        if (response.data && response.data.choices && response.data.choices[0]) {
          const content = response.data.choices[0].message.content
          console.log(`✅ [GROQ SERVICE] Content generated successfully (${content.length} chars)`)
          return { content }
        }

        throw new Error("No content in API response")
      } catch (error) {
        console.error(`❌ [GROQ SERVICE] Attempt ${attempt} failed:`, error.message)

        if (error.response) {
          console.error(`📊 [GROQ SERVICE] API Error Status: ${error.response.status}`)
          console.error(`📊 [GROQ SERVICE] API Error Data:`, error.response.data)

          // Don't retry on authentication errors
          if (error.response.status === 401 || error.response.status === 403) {
            throw new Error("Authentication failed - check GROQ API key")
          }
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

  createArticlePrompt(trend) {
    const title = trend.title || "Untitled Article"
    const description = trend.description || trend.excerpt || "No description available"
    const category = trend.category || "General"

    return `Write a comprehensive, engaging blog article about: "${title}"

Article Details:
- Topic: ${title}
- Category: ${category}
- Description: ${description}

Requirements:
1. Write 800-1200 words of high-quality, informative content
2. Use proper markdown formatting with H2 and H3 headings
3. Include an engaging introduction that hooks the reader
4. Create 3-4 main sections with descriptive H2 headings
5. Add subsections with H3 headings where appropriate
6. Include a compelling conclusion with key takeaways
7. Use bullet points and numbered lists where relevant
8. Write in a professional, engaging tone
9. Make it SEO-friendly with natural keyword integration
10. Provide valuable insights and practical information

Structure:
- Compelling introduction paragraph
- 3-4 main sections with H2 headings
- Subsections with H3 headings where needed
- Conclusion with key takeaways
- Use markdown formatting throughout

Focus on providing real value to readers while maintaining excellent readability and engagement.`
  }

  generateFallbackArticle(trend) {
    console.log("🎭 [GROQ SERVICE] Generating fallback article...")

    const title = trend.title || "Trending Topic Analysis"
    const description = trend.description || trend.excerpt || "Latest developments in this trending topic"
    const category = trend.category || "Technology"

    const content = `# ${title}

${description}

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
      title,
      content,
      excerpt: this.generateExcerpt(content),
      tags: this.extractTags(title, content),
      category,
      success: false,
      source: "fallback_template",
      reason: "API unavailable or failed",
    }
  }

  extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1].trim() : null
  }

  generateExcerpt(content) {
    // Remove markdown and get first paragraph
    const plainText = content
      .replace(/#{1,6}\s+/g, "") // Remove headers
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold
      .replace(/\*(.+?)\*/g, "$1") // Remove italic
      .replace(/\[(.+?)\]$$.+?$$/g, "$1") // Remove links
      .replace(/`(.+?)`/g, "$1") // Remove code
      .trim()

    const firstParagraph = plainText.split("\n\n")[0] || plainText.split("\n")[0]
    return firstParagraph.length > 160 ? firstParagraph.substring(0, 157) + "..." : firstParagraph
  }

  extractTags(title, content) {
    const text = (title + " " + content).toLowerCase()
    const commonTags = [
      "technology",
      "ai",
      "business",
      "health",
      "science",
      "innovation",
      "sustainability",
      "climate",
      "environment",
      "future",
      "trends",
      "analysis",
      "breakthrough",
      "development",
      "research",
    ]

    const foundTags = commonTags.filter((tag) => text.includes(tag))

    // Add title-based tags
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 4 && !["this", "that", "with", "from", "they", "have", "been"].includes(word))

    foundTags.push(...titleWords.slice(0, 3))

    return [...new Set(foundTags)].slice(0, 8)
  }

  categorizeContent(title, content) {
    const text = (title + " " + content).toLowerCase()

    const categoryKeywords = {
      Technology: [
        "tech",
        "ai",
        "artificial intelligence",
        "software",
        "app",
        "digital",
        "innovation",
        "startup",
        "computer",
      ],
      Business: ["business", "economy", "market", "finance", "investment", "company", "corporate", "entrepreneur"],
      Health: ["health", "medical", "medicine", "wellness", "fitness", "nutrition", "healthcare", "disease"],
      Science: ["science", "research", "study", "discovery", "experiment", "scientific", "breakthrough"],
      Environment: ["environment", "climate", "green", "sustainability", "renewable", "carbon", "pollution"],
      Entertainment: ["entertainment", "movie", "music", "celebrity", "film", "show", "gaming", "sports"],
    }

    let bestCategory = "General"
    let maxScore = 0

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (text.match(new RegExp(keyword, "g")) || []).length
        return acc + matches
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestCategory = category
      }
    }

    return bestCategory
  }

  async healthCheck() {
    console.log("🏥 [GROQ SERVICE] Performing health check...")

    if (!this.apiKey) {
      console.log("⚠️ [GROQ SERVICE] No API key configured")
      return false
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [{ role: "user", content: "Hello, this is a health check." }],
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

      console.log("✅ [GROQ SERVICE] Health check passed")
      return true
    } catch (error) {
      console.error("❌ [GROQ SERVICE] Health check failed:", error.message)
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
      healthy: !!this.apiKey,
    }
  }
}

module.exports = new GroqService()
