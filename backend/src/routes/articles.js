const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  console.log("📰 [ARTICLE ROUTES] Registering article routes...")

  // Get all articles with pagination
  fastify.get("/api/articles", async (request, reply) => {
    try {
      console.log("📖 [ARTICLES] GET /api/articles - Fetching articles...")

      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const category = request.query.category
      const featured = request.query.featured === "true"
      const skip = (page - 1) * limit

      console.log(
        `📊 [ARTICLES] Query params - page: ${page}, limit: ${limit}, category: ${category}, featured: ${featured}`,
      )

      // Build query
      const query = {}
      if (category && category !== "all") {
        query.category = new RegExp(category, "i")
      }
      if (featured) {
        query.featured = true
      }

      console.log("🔍 [ARTICLES] MongoDB query:", JSON.stringify(query))

      // Get articles with pagination
      const articles = await Article.find(query).sort({ createdAt: -1, featured: -1 }).skip(skip).limit(limit).lean()

      // Get total count for pagination
      const total = await Article.countDocuments(query)
      const pages = Math.ceil(total / limit)

      console.log(`✅ [ARTICLES] Found ${articles.length} articles (${total} total)`)

      // Transform articles for frontend
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "..." || "No excerpt available",
        thumbnail: article.thumbnail || article.featuredImage || "/placeholder.svg?height=224&width=400",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || Math.floor(Math.random() * 1000) + 100,
        featured: article.featured || false,
        likes: article.likes || Math.floor(Math.random() * 50) + 10,
        saves: article.saves || Math.floor(Math.random() * 20) + 5,
        author: article.author || "TrendWise AI",
      }))

      const response = {
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      }

      console.log("📤 [ARTICLES] Sending response with", transformedArticles.length, "articles")
      return response
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
        message: error.message,
        articles: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
          hasNext: false,
          hasPrev: false,
        },
      })
    }
  })

  // Get single article by slug - THIS IS THE CRITICAL ROUTE
  fastify.get("/api/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [ARTICLES] ==========================================`)
      console.log(`📖 [ARTICLES] GET /api/articles/${slug}`)
      console.log(`📖 [ARTICLES] Request timestamp: ${new Date().toISOString()}`)
      console.log(`📖 [ARTICLES] Request headers:`, request.headers)

      // Find article by slug
      console.log(`🔍 [ARTICLES] Searching for article with slug: ${slug}`)
      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        console.log(`❌ [ARTICLES] Article not found with slug: ${slug}`)
        console.log(`🔍 [ARTICLES] Checking all available slugs...`)

        // Debug: Show all available slugs
        const allArticles = await Article.find({}, { slug: 1, title: 1 }).lean()
        console.log(
          `📋 [ARTICLES] Available articles:`,
          allArticles.map((a) => ({ slug: a.slug, title: a.title })),
        )

        return reply.status(404).send({
          success: false,
          error: "Article not found",
          requestedSlug: slug,
          availableSlugs: allArticles.map((a) => a.slug),
        })
      }

      console.log(`✅ [ARTICLES] Article found:`, {
        _id: article._id,
        title: article.title,
        slug: article.slug,
        hasContent: !!article.content,
        contentLength: article.content?.length,
        category: article.category,
        author: article.author,
      })

      // Increment views
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })
      console.log(`👁️ [ARTICLES] Incremented view count for article: ${article.title}`)

      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content || `<h2>Content Loading</h2><p>This article content is being processed.</p>`,
        excerpt: article.excerpt || article.content?.substring(0, 300) + "..." || "No excerpt available",
        thumbnail: article.thumbnail || article.featuredImage || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: (article.views || 0) + 1,
        featured: article.featured || false,
        likes: article.likes || 0,
        saves: article.saves || 0,
        author: article.author || "TrendWise AI",
        trending: article.trending || false,
      }

      console.log(`✅ [ARTICLES] Transformed article data:`, {
        _id: transformedArticle._id,
        title: transformedArticle.title,
        slug: transformedArticle.slug,
        hasContent: !!transformedArticle.content,
        contentPreview: transformedArticle.content.substring(0, 100) + "...",
      })

      console.log(`📤 [ARTICLES] Sending successful response for: ${article.title}`)
      console.log(`📖 [ARTICLES] ==========================================`)

      return {
        success: true,
        article: transformedArticle,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching article:", error)
      console.error("❌ [ARTICLES] Error stack:", error.stack)
      console.log(`📖 [ARTICLES] ==========================================`)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
        slug: request.params.slug,
      })
    }
  })

  // Create new article
  fastify.post("/api/articles", async (request, reply) => {
    try {
      console.log("📝 [ARTICLES] POST /api/articles - Creating article...")

      const articleData = request.body
      console.log("📄 [ARTICLES] Article data received:", {
        title: articleData.title,
        category: articleData.category,
        tags: articleData.tags,
      })

      // Generate unique slug
      const baseSlug = articleData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

      let slug = baseSlug
      let counter = 1

      while (await Article.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      console.log(`🔗 [ARTICLES] Generated unique slug: ${slug}`)

      const article = new Article({
        ...articleData,
        slug,
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        likes: 0,
        saves: 0,
      })

      await article.save()
      console.log(`✅ [ARTICLES] Article created: ${article.title} (${article.slug})`)

      return {
        success: true,
        article: {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          thumbnail: article.thumbnail,
          createdAt: article.createdAt,
          category: article.category,
          tags: article.tags,
        },
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error creating article:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to create article",
        message: error.message,
      })
    }
  })

  // Get trending articles
  fastify.get("/api/articles/trending", async (request, reply) => {
    try {
      console.log("🔥 [ARTICLES] GET /api/articles/trending")

      const articles = await Article.find({}).sort({ views: -1, likes: -1, createdAt: -1 }).limit(10).lean()

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
        thumbnail: article.thumbnail || article.featuredImage,
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0,
        featured: article.featured || false,
        likes: article.likes || 0,
        saves: article.saves || 0,
        author: article.author || "TrendWise AI",
      }))

      console.log(`✅ [ARTICLES] Found ${transformedArticles.length} trending articles`)
      return {
        success: true,
        articles: transformedArticles,
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching trending articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
        articles: [],
      })
    }
  })

  // Get articles by category
  fastify.get("/api/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const skip = (page - 1) * limit

      console.log(`📂 [ARTICLES] GET /api/articles/category/${category}`)

      const query = { category: new RegExp(category, "i") }

      const articles = await Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

      const total = await Article.countDocuments(query)
      const pages = Math.ceil(total / limit)

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.content?.substring(0, 200) + "...",
        thumbnail: article.thumbnail || article.featuredImage,
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "General",
        readTime: article.readTime || Math.ceil((article.content?.length || 1000) / 200),
        views: article.views || 0,
        featured: article.featured || false,
        likes: article.likes || 0,
        saves: article.saves || 0,
        author: article.author || "TrendWise AI",
      }))

      console.log(`✅ [ARTICLES] Found ${transformedArticles.length} articles in category ${category}`)
      return {
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      console.error("❌ [ARTICLES] Error fetching articles by category:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
        message: error.message,
        articles: [],
      })
    }
  })

  console.log("✅ [ARTICLE ROUTES] Article routes registered successfully")
}

module.exports = articleRoutes
