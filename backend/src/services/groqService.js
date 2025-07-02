const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
    this.isHealthy = false
    this.lastHealthCheck = null
  }

  async healthCheck() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.log("❌ [GROQ] API key not found")
        this.isHealthy = false
        return false
      }

      // Simple test request
      const response = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: "Hello" }],
        model: "llama3-8b-8192",
        max_tokens: 10,
      })

      this.isHealthy = true
      this.lastHealthCheck = new Date()
      console.log("✅ [GROQ] Service is healthy")
      return true
    } catch (error) {
      console.error("❌ [GROQ] Health check failed:", error.message)
      this.isHealthy = false
      return false
    }
  }

  getStatus() {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastHealthCheck,
      hasApiKey: !!process.env.GROQ_API_KEY,
    }
  }

  async generateArticle(topic, category = "general") {
    try {
      console.log(`🤖 [GROQ] Generating article for topic: ${topic}`)

      if (!this.isHealthy) {
        console.log("⚠️ [GROQ] Service unhealthy, attempting to generate anyway...")
      }

      const prompt = `Write a comprehensive news article about "${topic}" in the ${category} category. 
      
      Requirements:
      - Write a compelling headline
      - Include 3-4 paragraphs of detailed content
      - Make it informative and engaging
      - Use a professional news writing style
      - Include relevant context and background information
      
      Format the response as JSON with this structure:
      {
        "title": "Article headline",
        "content": "Full article content with paragraphs",
        "summary": "Brief 2-sentence summary"
      }`

      const response = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional news writer. Generate high-quality, factual news articles based on the given topics.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-70b-8192",
        max_tokens: 1500,
        temperature: 0.7,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content generated")
      }

      // Try to parse JSON response
      try {
        const articleData = JSON.parse(content)
        console.log(`✅ [GROQ] Article generated successfully: ${articleData.title}`)
        return articleData
      } catch (parseError) {
        // If JSON parsing fails, create structured response from plain text
        console.log("⚠️ [GROQ] JSON parsing failed, creating structured response")
        const lines = content.split("\n").filter((line) => line.trim())
        const title = lines[0] || `Breaking: ${topic}`
        const contentText = lines.slice(1).join("\n\n") || content

        return {
          title: title.replace(/^(Title:|Headline:)/i, "").trim(),
          content: contentText,
          summary: `Latest developments regarding ${topic}. Stay informed with comprehensive coverage.`,
        }
      }
    } catch (error) {
      console.error(`❌ [GROQ] Failed to generate article for ${topic}:`, error.message)

      // Return fallback content
      return {
        title: `Breaking News: ${topic}`,
        content: `This is a developing story about ${topic}. Our team is working to bring you the latest updates and comprehensive coverage of this important ${category} news. 

        The situation continues to evolve, and we are monitoring all developments closely. This story has significant implications for the ${category} sector and beyond.

        We will continue to update this story as more information becomes available. Stay tuned for the latest developments and expert analysis on this breaking news story.

        For more updates on this and other ${category} news, continue following our comprehensive coverage.`,
        summary: `Breaking news coverage of ${topic} with ongoing developments in the ${category} sector.`,
      }
    }
  }

  async generateMultipleArticles(topics, category = "general") {
    console.log(`🤖 [GROQ] Generating ${topics.length} articles for category: ${category}`)
    const articles = []

    for (const topic of topics) {
      try {
        const article = await this.generateArticle(topic, category)
        articles.push(article)

        // Add delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ [GROQ] Failed to generate article for ${topic}:`, error.message)
        // Continue with other articles even if one fails
      }
    }

    console.log(`✅ [GROQ] Generated ${articles.length} articles successfully`)
    return articles
  }
}

module.exports = new GroqService()
