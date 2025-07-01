const Groq = require("groq-sdk")

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "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",
})

class GroqService {
  constructor() {
    console.log("🤖 Groq AI Service initialized")
  }

  async generateArticle(trendData) {
    try {
      console.log(`🚀 Groq AI: Starting article generation for "${trendData.query}"`)

      const prompt = this.createArticlePrompt(trendData)
      console.log(`🔗 Groq AI: Connecting to Groq API...`)

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a professional content writer and SEO expert. Create high-quality, engaging articles about trending topics. 
            
            CRITICAL: You must respond with ONLY valid JSON. No markdown, no code blocks, no extra text. Just pure JSON.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 2500,
        top_p: 1,
        stream: false,
      })

      const content = chatCompletion.choices[0]?.message?.content
      if (!content) {
        throw new Error("No content generated from Groq API")
      }

      console.log(`✅ Groq AI: Successfully connected and generated content (${content.length} characters)`)

      const parsedArticle = this.parseArticleContent(content, trendData)
      console.log(`🎯 Groq AI: Article processed - "${parsedArticle.title}" (${parsedArticle.readTime} min read)`)

      return parsedArticle
    } catch (error) {
      console.error(`❌ Groq AI: Generation failed -`, error.message)
      console.log(`🔄 Groq AI: Using fallback template`)
      return this.generateFallbackArticle(trendData)
    }
  }

  async generateTweetContent(prompt) {
    try {
      console.log(`🐦 Groq AI: Generating tweet content...`)

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a social media expert who creates realistic Twitter content. Generate diverse, engaging tweets that sound like real people. 
            
            CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no extra text.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama3-8b-8192",
        temperature: 0.8,
        max_tokens: 1000,
        top_p: 1,
        stream: false,
      })

      const content = chatCompletion.choices[0]?.message?.content
      if (!content) {
        throw new Error("No tweet content generated")
      }

      console.log(`✅ Groq AI: Tweet content generated successfully`)

      // Parse the JSON response
      const cleanContent = this.cleanJsonContent(content)
      const parsed = JSON.parse(cleanContent)

      console.log(`🎯 Groq AI: Generated ${parsed.tweets?.length || 0} tweets`)
      return parsed
    } catch (error) {
      console.error(`❌ Groq AI: Tweet generation failed -`, error.message)
      return null
    }
  }

  cleanJsonContent(content) {
    // Clean the content aggressively
    let cleanContent = content.trim()

    // Remove markdown code blocks
    cleanContent = cleanContent.replace(/```json\s*/g, "").replace(/```\s*/g, "")

    // Remove any leading/trailing non-JSON content
    const jsonStart = cleanContent.indexOf("{")
    const jsonEnd = cleanContent.lastIndexOf("}") + 1

    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd)
    }

    // Fix common JSON issues
    cleanContent = cleanContent
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, "\\r") // Escape carriage returns
      .replace(/\t/g, "\\t") // Escape tabs

    return cleanContent
  }

  createArticlePrompt(trendData) {
    return `Create a professional article about: "${trendData.query}"

Requirements:
- Professional, engaging tone
- 600-900 words
- SEO optimized
- Include H1, H2, H3 headings
- Use proper HTML structure
- Include relevant keywords naturally

Context:
- Search Volume: ${trendData.searchVolume || "High"}
- Geographic Interest: ${trendData.geo || "Global"}
- Related Topics: ${trendData.relatedTopics?.join(", ") || "Technology, Innovation"}

Respond with ONLY this JSON structure (no markdown, no code blocks):
{
  "title": "Professional article title",
  "content": "Full HTML content with proper structure",
  "excerpt": "Compelling summary (150-200 characters)",
  "meta": {
    "description": "SEO meta description (150-160 characters)",
    "keywords": "relevant, keywords, separated, by, commas"
  },
  "tags": ["Tag1", "Tag2", "Tag3"],
  "readTime": 6
}`
  }

  parseArticleContent(content, trendData) {
    try {
      console.log(`🔍 Groq AI: Parsing generated content...`)

      const cleanContent = this.cleanJsonContent(content)
      const parsed = JSON.parse(cleanContent)
      console.log(`✅ Groq AI: Content parsed successfully`)

      // Validate and return with defaults
      const result = {
        title: parsed.title || `${trendData.query}: Latest Insights and Analysis`,
        content: parsed.content || this.generateFallbackContent(trendData),
        excerpt:
          parsed.excerpt || `Explore the latest developments in ${trendData.query} and their impact on the industry.`,
        meta: parsed.meta || {
          description: `Comprehensive analysis of ${trendData.query} trends and market insights.`,
          keywords: `${trendData.query}, trends, analysis, market, insights`,
        },
        tags: parsed.tags || [trendData.query.split(" ")[0], "Trending", "Analysis"],
        readTime: parsed.readTime || 6,
      }

      console.log(`🎉 Groq AI: Article generation complete - AI content ready`)
      return result
    } catch (error) {
      console.error(`❌ Groq AI: Parsing failed -`, error.message)
      console.log(`🔄 Groq AI: Using fallback structure`)
      return this.generateFallbackArticle(trendData)
    }
  }

  generateFallbackArticle(trendData) {
    console.log(`📝 Groq AI: Generating fallback article for "${trendData.query}"`)

    const title = `${trendData.query}: Comprehensive Market Analysis and Future Outlook`
    const content = this.generateFallbackContent(trendData)

    const result = {
      title,
      content,
      excerpt: `Discover the latest trends and insights about ${trendData.query}, including market analysis and future predictions.`,
      meta: {
        description: `In-depth analysis of ${trendData.query} trends, market impact, and future outlook for industry professionals.`,
        keywords: `${trendData.query}, market analysis, trends, insights, future outlook, industry`,
      },
      tags: [trendData.query.split(" ")[0], "Market Analysis", "Trends", "Industry"],
      readTime: 6,
    }

    console.log(`✅ Groq AI: Fallback article ready`)
    return result
  }

  generateFallbackContent(trendData) {
    return `
      <h1>${trendData.query}: Comprehensive Market Analysis and Future Outlook</h1>
      
      <p>The landscape of <strong>${trendData.query}</strong> has been experiencing unprecedented growth and transformation. With search volumes reaching ${trendData.searchVolume || "significant levels"} across ${trendData.geo || "global"} markets, this trend represents a pivotal shift in how industries approach innovation and development.</p>
      
      <h2>Current Market Dynamics</h2>
      <p>Recent analysis reveals that ${trendData.query} has emerged as a critical factor driving change across multiple sectors. Industry leaders and market analysts are closely monitoring developments in this space, recognizing its potential to reshape traditional business models and create new opportunities for growth.</p>
      
      <h3>Key Market Indicators</h3>
      <ul>
        <li><strong>Search Volume Growth:</strong> ${trendData.searchVolume || "High"} interest levels indicate strong market momentum</li>
        <li><strong>Geographic Reach:</strong> Significant adoption across ${trendData.geo || "global"} markets</li>
        <li><strong>Industry Impact:</strong> Cross-sector implications driving widespread attention</li>
        ${trendData.relatedTopics?.map((topic) => `<li><strong>${topic}:</strong> Contributing to the overall ecosystem development</li>`).join("") || ""}
      </ul>
      
      <h2>Industry Applications and Use Cases</h2>
      <p>The practical applications of ${trendData.query} span numerous industries, from technology and healthcare to finance and manufacturing. Organizations are increasingly investing in research and development to harness the potential of this emerging trend.</p>
      
      <h3>Sector-Specific Implementations</h3>
      <p>Leading companies across various sectors are implementing ${trendData.query} solutions to enhance operational efficiency, improve customer experiences, and drive innovation. These implementations are setting new industry standards and creating competitive advantages for early adopters.</p>
      
      <h2>Future Outlook and Predictions</h2>
      <p>Market forecasts suggest that ${trendData.query} will continue to gain momentum over the coming years. Industry experts predict significant developments that could fundamentally alter how businesses operate and compete in the global marketplace.</p>
      
      <h3>Strategic Considerations</h3>
      <p>Organizations looking to capitalize on ${trendData.query} trends should consider developing comprehensive strategies that address both immediate opportunities and long-term implications. This includes investing in talent development, technology infrastructure, and strategic partnerships.</p>
      
      <h2>Conclusion</h2>
      <p>As ${trendData.query} continues to evolve, staying informed about the latest developments and market trends will be crucial for business success. Organizations that proactively adapt to these changes will be best positioned to thrive in an increasingly competitive landscape.</p>
    `
  }

  async generateSummary(text, maxLength = 200) {
    try {
      console.log(`📝 Groq AI: Generating summary...`)

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Create a compelling summary of this text in ${maxLength} characters or less: ${text}`,
          },
        ],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 100,
      })

      const summary = chatCompletion.choices[0]?.message?.content || text.substring(0, maxLength)
      console.log(`✅ Groq AI: Summary generated`)
      return summary
    } catch (error) {
      console.error(`❌ Groq AI: Summary generation failed -`, error.message)
      return text.substring(0, maxLength)
    }
  }
}

module.exports = new GroqService()
