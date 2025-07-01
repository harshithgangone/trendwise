const Article = require("../models/Article")

async function articleRoutes(fastify, options) {
  // Get all articles with enhanced logging
  fastify.get("/", async (request, reply) => {
    try {
      console.log(`📖 [ARTICLES API] Fetching articles...`)
      const { page = 1, limit = 10, search, tag, category } = request.query
      console.log(`📊 [ARTICLES API] Query params:`, { page, limit, search, tag, category })

      const query = { status: "published" }

      if (search) {
        query.$text = { $search: search }
        console.log(`🔍 [ARTICLES API] Search query: "${search}"`)
      }

      if (tag) {
        query.tags = { $in: [tag] }
        console.log(`🏷️ [ARTICLES API] Tag filter: "${tag}"`)
      }

      if (category) {
        query.tags = { $in: [category] }
        console.log(`📂 [ARTICLES API] Category filter: "${category}"`)
      }

      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content") // Exclude full content for list view

      const total = await Article.countDocuments(query)

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles (${total} total)`)
      console.log(`📄 [ARTICLES API] Page ${page} of ${Math.ceil(total / limit)}`)

      reply.send({
        success: true,
        articles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching articles:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles",
      })
    }
  })

  // Get single article by ID
  fastify.get("/by-id/:id", async (request, reply) => {
    try {
      const { id } = request.params
      console.log(`📰 [ARTICLES API] Fetching article by ID: "${id}"`)

      const article = await Article.findById(id)

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: "${id}"`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      console.log(`✅ [ARTICLES API] Article found: "${article.title}"`)
      reply.send(article)
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching article by ID:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get single article by slug with enhanced logging
  fastify.get("/:slug", async (request, reply) => {
    try {
      const { slug } = request.params
      console.log(`📰 [ARTICLES API] Fetching article: "${slug}"`)

      const article = await Article.findOne({
        slug,
        status: "published",
      })

      if (!article) {
        console.log(`❌ [ARTICLES API] Article not found: "${slug}"`)
        return reply.status(404).send({
          success: false,
          error: "Article not found",
        })
      }

      // Increment view count
      article.views += 1
      await article.save()

      console.log(`✅ [ARTICLES API] Article found: "${article.title}"`)
      console.log(`👀 [ARTICLES API] Views updated: ${article.views}`)

      reply.send(article)
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching article:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch article",
      })
    }
  })

  // Get trending articles with enhanced logging
  fastify.get("/trending/top", async (request, reply) => {
    try {
      console.log(`🔥 [ARTICLES API] Fetching trending articles...`)

      const articles = await Article.find({ status: "published" })
        .sort({ views: -1, likes: -1, saves: -1 })
        .limit(10)
        .select("-content")

      console.log(`✅ [ARTICLES API] Found ${articles.length} trending articles`)

      reply.send({
        success: true,
        articles,
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching trending articles:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch trending articles",
      })
    }
  })

  // Get articles by category with enhanced logging
  fastify.get("/category/:category", async (request, reply) => {
    try {
      const { category } = request.params
      const { page = 1, limit = 10 } = request.query

      console.log(`📂 [ARTICLES API] Fetching articles for category: "${category}"`)

      const articles = await Article.find({
        tags: { $in: [category] },
        status: "published",
      })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")

      const total = await Article.countDocuments({
        tags: { $in: [category] },
        status: "published",
      })

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles in category "${category}"`)

      reply.send({
        success: true,
        articles,
        category,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching articles by category:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by category",
      })
    }
  })

  // Get articles by tag
  fastify.get("/tag/:tag", async (request, reply) => {
    try {
      const { tag } = request.params
      const { page = 1, limit = 10 } = request.query

      console.log(`🏷️ [ARTICLES API] Fetching articles for tag: "${tag}"`)

      const articles = await Article.find({
        tags: { $in: [tag] },
        status: "published",
      })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select("-content")

      const total = await Article.countDocuments({
        tags: { $in: [tag] },
        status: "published",
      })

      console.log(`✅ [ARTICLES API] Found ${articles.length} articles with tag "${tag}"`)

      reply.send({
        success: true,
        articles,
        tag,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching articles by tag:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch articles by tag",
      })
    }
  })

  // Get available categories
  fastify.get("/meta/categories", async (request, reply) => {
    try {
      console.log(`📂 [ARTICLES API] Fetching available categories...`)

      const categories = await Article.aggregate([
        { $match: { status: "published" } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])

      const formattedCategories = categories.map((cat) => ({
        name: cat._id,
        count: cat.count,
        slug: cat._id.toLowerCase().replace(/\s+/g, "-"),
      }))

      console.log(`✅ [ARTICLES API] Found ${formattedCategories.length} categories`)

      reply.send({
        success: true,
        categories: formattedCategories,
      })
    } catch (error) {
      console.error(`❌ [ARTICLES API] Error fetching categories:`, error.message)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch categories",
      })
    }
  })

  // Like/unlike an article
  fastify.post("/like/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const { increment } = request.body;
      const article = await Article.findById(id);
      if (!article) {
        return reply.status(404).send({ success: false, error: "Article not found" });
      }
      if (increment) {
        article.likes += 1;
      } else {
        article.likes = Math.max(0, article.likes - 1);
      }
      await article.save();
      reply.send({ success: true, likes: article.likes });
    } catch (error) {
      console.error("❌ [ARTICLES API] Error updating likes:", error.message);
      reply.status(500).send({ success: false, error: "Failed to update likes" });
    }
  });

  // Save/unsave an article
  fastify.post("/save/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const { increment } = request.body;
      const article = await Article.findById(id);
      if (!article) {
        return reply.status(404).send({ success: false, error: "Article not found" });
      }
      if (increment) {
        article.saves += 1;
      } else {
        article.saves = Math.max(0, article.saves - 1);
      }
      await article.save();
      reply.send({ success: true, saves: article.saves });
    } catch (error) {
      console.error("❌ [ARTICLES API] Error updating saves:", error.message);
      reply.status(500).send({ success: false, error: "Failed to update saves" });
    }
  });
}

module.exports = articleRoutes
