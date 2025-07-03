const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  // GET /api/articles - Get all articles with pagination
  fastify.get("/articles", async (request, reply) => {
    try {
      console.log("📖 [ARTICLES API] GET /articles - Fetching articles from database")

      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const category = request.query.category
      const featured = request.query.featured
      const skip = (page - 1) * limit

      // Build query
      const query = {}
      if (category && category !== "all") {
        query.category = category
      }
      if (featured === "true") {
        query.featured = true
      }

      console.log(`📊 [ARTICLES API] Query params: page=${page}, limit=${limit}, category=${category || "all"}`)

      // Get articles with pagination
      const [articles, total] = await Promise.all([
        Article.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Article.countDocuments(query),
      ])

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles (${total} total)`)

      // Transform articles for frontend
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "general",
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        author: article.author || "TrendWise AI",
      }))

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }

      return reply.send({
        success: true,
        articles: transformedArticles,
        pagination,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching articles:", error.message)

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

  // GET /api/articles/:slug - Get single article by slug
  fastify.get("/articles/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📖 [ARTICLES API] GET /articles/${slug}`)

      const article = await Article.findOne({ slug }).lean()

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: ${slug}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      await Article.updateOne({ slug }, { $inc: { views: 1 } })

      console.log(`✅ [ARTICLES API] Found article: ${article.title}`)

      // Transform article for frontend
      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        thumbnail: article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "general",
        readTime: article.readTime || 5,
        views: (article.views || 0) + 1,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        author: article.author || "TrendWise AI",
        trendData: article.trendData,
        media: article.media,
      }

      return reply.send({
        success: true,
        article: transformedArticle,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching article:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // GET /api/articles/by-id/:id - Get single article by ID
  fastify.get("/articles/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`📖 [ARTICLES API] GET /articles/by-id/${id}`)

      const article = await Article.findById(id).lean()

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: ${id}`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ARTICLES API] Found article: ${article.title}`)

      // Transform article for frontend
      const transformedArticle = {
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        thumbnail: article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "general",
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        author: article.author || "TrendWise AI",
        trendData: article.trendData,
        media: article.media,
      }

      return reply.send(transformedArticle)
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching article by ID:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
        message: error.message,
      })
    }
  })

  // GET /api/articles/categories - Get all categories
  fastify.get("/articles/categories", async (request, reply) => {
    try {
      console.log("📊 [ARTICLES API] GET /articles/categories")

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
      console.error("❌ [ARTICLES API] Error fetching categories:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
        categories: [],
      })
    }
  })

  // GET /api/articles/trending - Get trending articles
  fastify.get("/articles/trending", async (request, reply) => {
    try {
      console.log("🔥 [ARTICLES API] GET /articles/trending")

      const limit = Number.parseInt(request.query.limit) || 10

      const trendingArticles = await Article.find().sort({ views: -1, likes: -1, createdAt: -1 }).limit(limit).lean()

      console.log(`✅ [ARTICLES API] Found ${trendingArticles.length} trending articles`)

      // Transform articles for frontend
      const transformedArticles = trendingArticles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "general",
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        author: article.author || "TrendWise AI",
      }))

      return reply.send({
        success: true,
        articles: transformedArticles,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching trending articles:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
        articles: [],
      })
    }
  })

  // GET /api/articles/category/:category - Get articles by category
  fastify.get("/articles/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const page = Number.parseInt(request.query.page) || 1
      const limit = Number.parseInt(request.query.limit) || 10
      const skip = (page - 1) * limit

      console.log(`📊 [ARTICLES API] GET /articles/category/${category}`)

      const [articles, total] = await Promise.all([
        Article.find({ category }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Article.countDocuments({ category }),
      ])

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles in category "${category}"`)

      // Transform articles for frontend
      const transformedArticles = articles.map((article) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        thumbnail: article.thumbnail || "/placeholder.svg?height=400&width=600",
        createdAt: article.createdAt,
        tags: article.tags || [],
        category: article.category || "general",
        readTime: article.readTime || 5,
        views: article.views || 0,
        likes: article.likes || 0,
        saves: article.saves || 0,
        featured: article.featured || false,
        author: article.author || "TrendWise AI",
      }))

      const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      }

      return reply.send({
        success: true,
        articles: transformedArticles,
        pagination,
        category,
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error fetching articles by category:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
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

  // POST /api/articles - Create new article
  fastify.post("/articles", async (request, reply) => {
    try {
      console.log("📝 [ARTICLES API] POST /articles - Creating new article")

      const articleData = request.body

      // Generate unique slug if not provided
      if (!articleData.slug) {
        const baseSlug = articleData.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim("-")
          .substring(0, 60)

        let slug = baseSlug
        let counter = 1

        while (await Article.findOne({ slug })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }

        articleData.slug = slug
      }

      const article = new Article(articleData)
      await article.save()

      console.log(`✅ [ARTICLES API] Created article: ${article.title}`)

      return reply.status(201).send({
        success: true,
        article: {
          _id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          thumbnail: article.thumbnail,
          createdAt: article.createdAt,
          tags: article.tags,
          category: article.category,
          readTime: article.readTime,
          views: article.views,
          likes: article.likes,
          saves: article.saves,
          featured: article.featured,
          author: article.author,
        },
      })
    } catch (error) {
      console.error("❌ [ARTICLES API] Error creating article:", error.message)

      return reply.status(500).send({
        success: false,
        error: "Failed to create article",
        message: error.message,
      })
    }
  })
}

module.exports = articleRoutes
