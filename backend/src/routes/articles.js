const Article = require("../models/Article")
const GroqService = require("../services/groqService")
const UnsplashService = require("../services/unsplashService")

async function articlesRoutes(fastify, options) {
  // GET /api/articles - Get all articles with pagination
  fastify.get("/", async (request, reply) => {
    try {
      console.log("📖 [ARTICLES API] GET / - Fetching articles")
      console.log("📊 [ARTICLES API] Query params:", request.query)

      const page = Math.max(1, Number.parseInt(request.query.page) || 1)
      const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit) || 10))
      const skip = (page - 1) * limit

      console.log(`📄 [ARTICLES API] Pagination: page=${page}, limit=${limit}, skip=${skip}`)

      // Get total count
      const total = await Article.countDocuments()
      console.log(`📊 [ARTICLES API] Total articles in database: ${total}`)

      if (total === 0) {
        console.log("⚠️ [ARTICLES API] No articles found in database")
        return reply.send({
          success: true,
          articles: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
          message: "No articles found",
        })
      }

      // Fetch articles with pagination
      const articles = await Article.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles`)

      // Transform articles for frontend
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.description?.substring(0, 150) + "..." || "",
        thumbnail: article.thumbnail || article.image || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        readTime: article.readTime || Math.ceil((article.content?.length || 0) / 200),
        views: article.views || Math.floor(Math.random() * 1000) + 100,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        likes: article.likes || Math.floor(Math.random() * 50) + 10,
        shares: article.shares || Math.floor(Math.random() * 20) + 5,
      }))

      const totalPages = Math.ceil(total / limit)

      const response = {
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }

      console.log(`✅ [ARTICLES API] Sending ${transformedArticles.length} articles`)
      return reply.send(response)
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching articles:", error)
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

  // GET /api/articles/trending - Get trending articles
  fastify.get("/trending", async (request, reply) => {
    try {
      console.log("🔥 [ARTICLES API] GET /trending - Fetching trending articles")

      const limit = Math.min(20, Math.max(1, Number.parseInt(request.query.limit) || 10))

      const articles = await Article.find().sort({ views: -1, createdAt: -1 }).limit(limit).lean()

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.description?.substring(0, 150) + "..." || "",
        thumbnail: article.thumbnail || article.image || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        readTime: article.readTime || Math.ceil((article.content?.length || 0) / 200),
        views: article.views || Math.floor(Math.random() * 1000) + 100,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        likes: article.likes || Math.floor(Math.random() * 50) + 10,
        shares: article.shares || Math.floor(Math.random() * 20) + 5,
      }))

      console.log(`✅ [ARTICLES API] Found ${transformedArticles.length} trending articles`)

      return reply.send({
        success: true,
        articles: transformedArticles,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching trending articles:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        message: error.message,
        articles: [],
      })
    }
  })

  // GET /api/articles/categories - Get all categories
  fastify.get("/categories", async (request, reply) => {
    try {
      console.log("📂 [ARTICLES API] GET /categories - Fetching categories")

      const categories = await Article.distinct("category")
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const count = await Article.countDocuments({ category })
          return { name: category, count }
        }),
      )

      console.log(`✅ [ARTICLES API] Found ${categories.length} categories`)

      return reply.send({
        success: true,
        categories: categoriesWithCounts,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching categories:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
        message: error.message,
        categories: [],
      })
    }
  })

  // GET /api/articles/category/:category - Get articles by category
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      console.log(`📂 [ARTICLES API] GET /category/${category} - Fetching articles by category`)

      const page = Math.max(1, Number.parseInt(request.query.page) || 1)
      const limit = Math.min(50, Math.max(1, Number.parseInt(request.query.limit) || 10))
      const skip = (page - 1) * limit

      const total = await Article.countDocuments({ category })
      const articles = await Article.find({ category }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt || article.description?.substring(0, 150) + "..." || "",
        thumbnail: article.thumbnail || article.image || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        readTime: article.readTime || Math.ceil((article.content?.length || 0) / 200),
        views: article.views || Math.floor(Math.random() * 1000) + 100,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        likes: article.likes || Math.floor(Math.random() * 50) + 10,
        shares: article.shares || Math.floor(Math.random() * 20) + 5,
      }))

      const totalPages = Math.ceil(total / limit)

      console.log(`✅ [ARTICLES API] Found ${transformedArticles.length} articles in category ${category}`)

      return reply.send({
        success: true,
        articles: transformedArticles,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching articles for category ${request.params.category}:`, error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
        message: error.message,
        articles: [],
      })
    }
  })

  // GET /api/articles/:slug - Get single article by slug
  fastify.get("/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [ARTICLES API] GET /${slug} - Fetching single article`)

      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
          message: `No article found with slug: ${slug}`,
        })
      }

      // Increment views
      await Article.findByIdAndUpdate(article._id, { $inc: { views: 1 } })

      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt || article.description?.substring(0, 150) + "..." || "",
        thumbnail: article.thumbnail || article.image || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        tags: article.tags || [],
        readTime: article.readTime || Math.ceil((article.content?.length || 0) / 200),
        views: (article.views || 0) + 1,
        featured: article.featured || false,
        category: article.category || "General",
        author: article.author || "TrendWise AI",
        likes: article.likes || Math.floor(Math.random() * 50) + 10,
        shares: article.shares || Math.floor(Math.random() * 20) + 5,
        sourceUrl: article.sourceUrl,
        originalSource: article.originalSource,
      }

      console.log(`✅ [ARTICLES API] Found article: ${article.title}`)

      return reply.send({
        success: true,
        article: transformedArticle,
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching article ${request.params.slug}:`, error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // POST /api/articles - Create new article (for admin/bot use)
  fastify.post("/", async (request, reply) => {
    try {
      console.log("📝 [ARTICLES API] POST / - Creating new article")
      console.log("📊 [ARTICLES API] Request body:", JSON.stringify(request.body, null, 2))

      const articleData = request.body

      // Generate slug if not provided
      if (!articleData.slug) {
        articleData.slug = articleData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      }

      // Ensure unique slug
      let uniqueSlug = articleData.slug
      let counter = 1
      while (await Article.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${articleData.slug}-${counter}`
        counter++
      }
      articleData.slug = uniqueSlug

      // Set default values
      articleData.createdAt = articleData.createdAt || new Date()
      articleData.views = articleData.views || 0
      articleData.likes = articleData.likes || 0
      articleData.shares = articleData.shares || 0

      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [ARTICLES API] Created article: ${article.title} (${article.slug})`)

      return reply.status(201).send({
        success: true,
        article: {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          createdAt: article.createdAt,
        },
        message: "Article created successfully",
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error creating article:", error)

      if (error.code === 11000) {
        return reply.status(400).send({
          success: false,
          error: "Duplicate article",
          message: "An article with this slug already exists",
        })
      }

      return reply.status(500).send({
        success: false,
        error: "Failed to create article",
        message: error.message,
      })
    }
  })
}

module.exports = articlesRoutes
