const Groq = require("groq-sdk")

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.client = this.apiKey ? new Groq({ apiKey: this.apiKey }) : null
    this.model = "llama3-8b-8192"
    this.maxTokens = 2048
    this.temperature = 0.7
  }

  async generateArticle(trendData) {
    console.log(`[GROQ SERVICE] Generating article for trend: ${trendData.title}`)

    if (!this.client) {
      console.log("[GROQ SERVICE] No API key provided, using fallback content")
      return this.generateFallbackArticle(trendData)
    }

    try {
      const prompt = this.buildPrompt(trendData)
      console.log(`[GROQ SERVICE] Using prompt: ${prompt.substring(0, 200)}...`)

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional tech journalist and content writer. Write engaging, informative articles that are well-structured and easy to read.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      })

      const generatedContent = completion.choices[0]?.message?.content

      if (!generatedContent) {
        console.log("[GROQ SERVICE] No content generated, using fallback")
        return this.generateFallbackArticle(trendData)
      }

      console.log(`[GROQ SERVICE] Successfully generated article (${generatedContent.length} characters)`)

      return {
        success: true,
        content: generatedContent,
        wordCount: generatedContent.split(" ").length,
        readTime: Math.ceil(generatedContent.split(" ").length / 200),
      }
    } catch (error) {
      console.error("[GROQ SERVICE] Error generating article:", error.message)
      return this.generateFallbackArticle(trendData)
    }
  }

  buildPrompt(trendData) {
    return `Write a comprehensive, engaging article about the following topic:

Title: ${trendData.title}
Description: ${trendData.description || ""}
Category: ${trendData.category || "Technology"}
Source: ${trendData.source || ""}

Requirements:
- Write a complete article of 800-1200 words
- Use a professional, engaging tone
- Include an introduction, main body with multiple sections, and conclusion
- Make it informative and valuable to readers
- Use proper formatting with paragraphs
- Focus on insights, implications, and analysis
- Avoid mentioning specific dates or "breaking news" language
- Make it evergreen content that remains relevant

Please write the full article content:`
  }

  generateFallbackArticle(trendData) {
    console.log("[GROQ SERVICE] Generating fallback article")

    const fallbackContent = `# ${trendData.title}

${trendData.description || "This article explores the latest developments in " + (trendData.category || "technology") + "."}

## Introduction

In today's rapidly evolving digital landscape, staying informed about the latest trends and developments is crucial for both professionals and enthusiasts alike. This article delves into the key aspects of ${trendData.title.toLowerCase()}, examining its implications and potential impact on various industries.

## Key Insights

The emergence of new technologies and methodologies continues to reshape how we approach problem-solving and innovation. Understanding these changes helps us better prepare for future challenges and opportunities.

### Impact on Industry

The implications of these developments extend far beyond immediate applications, potentially transforming entire sectors and creating new opportunities for growth and innovation.

### Future Considerations

As we look ahead, it's important to consider both the benefits and challenges that these advancements may bring. Careful planning and strategic thinking will be essential for maximizing positive outcomes.

## Conclusion

The landscape of ${trendData.category || "technology"} continues to evolve at an unprecedented pace. By staying informed and adaptable, we can better navigate these changes and leverage new opportunities for success.

*This article provides insights into current trends and developments. For the most up-to-date information, please refer to official sources and industry publications.*`

    return {
      success: false,
      content: fallbackContent,
      wordCount: fallbackContent.split(" ").length,
      readTime: Math.ceil(fallbackContent.split(" ").length / 200),
      fallback: true,
    }
  }

  async testConnection() {
    console.log("[GROQ SERVICE] Testing connection...")

    if (!this.client) {
      return {
        success: false,
        error: "No API key configured",
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message. Please respond with 'Connection successful'.",
          },
        ],
        model: this.model,
        max_tokens: 50,
        temperature: 0.1,
      })

      const response = completion.choices[0]?.message?.content

      return {
        success: true,
        response: response,
        model: this.model,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }
    }
  }

  getStatus() {
    return {
      apiKey: !!this.apiKey,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    }
  }
}

module.exports = new GroqService()
