const fastify = require("fastify")()
const Article = require("../models/Article")

// Get all articles with pagination and filtering
fastify.get("/", async (request, reply) => {
  try {
    console.log("📊 [BACKEND] Articles API called with query:", request.query)

    const {
      page = 1,
      limit = 10,
      search = "",
      tag = "",
      category = "",
      featured = "",
      status = "published",
    } = request.query

    const pageNum = Number.parseInt(page)
    const limitNum = Number.parseInt(limit)
    const skip = (pageNum - 1) * limitNum

    console.log(`📄 [BACKEND] Pagination: page=${pageNum}, limit=${limitNum}, skip=${skip}`)

    // Build query
    const query = { status }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ]
      console.log(`🔍 [BACKEND] Search query: "${search}"`)
    }

    if (tag) {
      query.tags = { $in: [new RegExp(tag, "i")] }
      console.log(`🏷️ [BACKEND] Tag filter: "${tag}"`)
    }

    if (category) {
      query.category = { $regex: category, $options: "i" }
      console.log(`📂 [BACKEND] Category filter: "${category}"`)
    }

    if (featured === "true") {
      query.featured = true
      console.log("⭐ [BACKEND] Featured articles only")
    }

    console.log("🔍 [BACKEND] Final query:", JSON.stringify(query, null, 2))

    // Get total count for pagination
    const total = await Article.countDocuments(query)
    console.log(`📊 [BACKEND] Total articles matching query: ${total}`)

    // Get articles
    const articles = await Article.find(query).sort({ createdAt: -1, featured: -1 }).skip(skip).limit(limitNum).lean()

    console.log(`✅ [BACKEND] Found ${articles.length} articles`)

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum)
    const hasNextPage = pageNum < totalPages
    const hasPrevPage = pageNum > 1

    const response = {
      success: true,
      articles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasNextPage,
        hasPrevPage,
      },
    }

    console.log(`📤 [BACKEND] Sending response with ${articles.length} articles`)
    return response
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching articles:", error)
    reply.status(500).send({
      success: false,
      error: "Failed to fetch articles",
      message: error.message,
    })
  }
})

// Get trending articles
fastify.get("/trending", async (request, reply) => {
  try {
    console.log("🔥 [BACKEND] Trending articles API called")

    const articles = await Article.find({
      status: "published",
      $or: [{ featured: true }, { "stats.views": { $gte: 1000 } }, { "stats.likes": { $gte: 50 } }],
    })
      .sort({
        "stats.views": -1,
        "stats.likes": -1,
        createdAt: -1,
      })
      .limit(10)
      .lean()

    console.log(`✅ [BACKEND] Found ${articles.length} trending articles`)

    return {
      success: true,
      articles,
    }
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching trending articles:", error)
    reply.status(500).send({
      success: false,
      error: "Failed to fetch trending articles",
      message: error.message,
    })
  }
})

// Get categories
fastify.get("/categories", async (request, reply) => {
  try {
    console.log("📂 [BACKEND] Categories API called")

    const categories = await Article.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          name: { $first: "$category" },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          name: "$name",
          count: "$count",
          slug: { $toLower: { $replaceAll: { input: "$name", find: " ", replacement: "-" } } },
        },
      },
    ])

    console.log(`✅ [BACKEND] Found ${categories.length} categories`)

    return {
      success: true,
      categories,
    }
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching categories:", error)
    reply.status(500).send({
      success: false,
      error: "Failed to fetch categories",
      message: error.message,
    })
  }
})

// Get single article by slug
fastify.get("/:slug", async (request, reply) => {
  try {
    const { slug } = request.params
    console.log(`📄 [BACKEND] Single article requested: "${slug}"`)

    const article = await Article.findOne({
      slug,
      status: "published",
    }).lean()

    if (!article) {
      console.log(`❌ [BACKEND] Article not found: "${slug}"`)
      return reply.status(404).send({
        success: false,
        error: "Article not found",
      })
    }

    // Increment view count
    await Article.updateOne({ _id: article._id }, { $inc: { "stats.views": 1 } })

    console.log(`✅ [BACKEND] Article found: "${article.title}"`)

    return {
      success: true,
      article,
    }
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching article:", error)
    reply.status(500).send({
      success: false,
      error: "Failed to fetch article",
      message: error.message,
    })
  }
})

module.exports = fastify
