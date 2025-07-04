const express = require("express")
const router = express.Router()
const Article = require("../models/Article")
const UserPreference = require("../models/UserPreference")

// Get article by slug
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params
    console.log(`🔍 [BACKEND] Fetching article with slug: ${slug}`)

    const article = await Article.findOne({ slug })

    if (!article) {
      console.log(`❌ [BACKEND] Article not found with slug: ${slug}`)
      return res.status(404).json({
        success: false,
        error: "Article not found",
      })
    }

    console.log(`✅ [BACKEND] Found article: ${article.title}`)

    res.json({
      success: true,
      article,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching article by slug:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch article",
    })
  }
})

// Track article view
router.post("/:id/view", async (req, res) => {
  try {
    const { id } = req.params
    console.log(`👁️ [BACKEND] Tracking view for article: ${id}`)

    const article = await Article.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true })

    if (!article) {
      return res.status(404).json({
        success: false,
        error: "Article not found",
      })
    }

    console.log(`✅ [BACKEND] View tracked. New count: ${article.views}`)

    res.json({
      success: true,
      views: article.views,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error tracking view:", error)
    res.status(500).json({
      success: false,
      error: "Failed to track view",
    })
  }
})

// Like/unlike article
router.post("/:id/like", async (req, res) => {
  try {
    const { id } = req.params
    const { userId, userEmail } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      })
    }

    console.log(`❤️ [BACKEND] Processing like for article: ${id} by user: ${userId}`)

    // Find or create user preferences
    let userPrefs = await UserPreference.findOne({ userId })
    if (!userPrefs) {
      userPrefs = new UserPreference({
        userId,
        email: userEmail,
        likedArticles: [],
        savedArticles: [],
        recentlyViewed: [],
      })
    }

    // Check if article is already liked
    const isLiked = userPrefs.likedArticles.some((item) => item.articleId.toString() === id)

    let article
    if (isLiked) {
      // Unlike the article
      userPrefs.likedArticles = userPrefs.likedArticles.filter((item) => item.articleId.toString() !== id)
      article = await Article.findByIdAndUpdate(id, { $inc: { likes: -1 } }, { new: true })
      console.log(`💔 [BACKEND] Article unliked. New count: ${article.likes}`)
    } else {
      // Like the article
      userPrefs.likedArticles.push({
        articleId: id,
        likedAt: new Date(),
      })
      article = await Article.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true })
      console.log(`❤️ [BACKEND] Article liked. New count: ${article.likes}`)
    }

    await userPrefs.save()

    res.json({
      success: true,
      liked: !isLiked,
      likes: article.likes,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error processing like:", error)
    res.status(500).json({
      success: false,
      error: "Failed to process like",
    })
  }
})

// Save/unsave article
router.post("/:id/save", async (req, res) => {
  try {
    const { id } = req.params
    const { userId, userEmail } = req.body

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID required",
      })
    }

    console.log(`🔖 [BACKEND] Processing save for article: ${id} by user: ${userId}`)

    // Find or create user preferences
    let userPrefs = await UserPreference.findOne({ userId })
    if (!userPrefs) {
      userPrefs = new UserPreference({
        userId,
        email: userEmail,
        likedArticles: [],
        savedArticles: [],
        recentlyViewed: [],
      })
    }

    // Check if article is already saved
    const isSaved = userPrefs.savedArticles.some((item) => item.articleId.toString() === id)

    let article
    if (isSaved) {
      // Unsave the article
      userPrefs.savedArticles = userPrefs.savedArticles.filter((item) => item.articleId.toString() !== id)
      article = await Article.findByIdAndUpdate(id, { $inc: { saves: -1 } }, { new: true })
      console.log(`🗑️ [BACKEND] Article unsaved. New count: ${article.saves}`)
    } else {
      // Save the article
      userPrefs.savedArticles.push({
        articleId: id,
        savedAt: new Date(),
      })
      article = await Article.findByIdAndUpdate(id, { $inc: { saves: 1 } }, { new: true })
      console.log(`🔖 [BACKEND] Article saved. New count: ${article.saves}`)
    }

    await userPrefs.save()

    res.json({
      success: true,
      saved: !isSaved,
      saves: article.saves,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error processing save:", error)
    res.status(500).json({
      success: false,
      error: "Failed to process save",
    })
  }
})

// Get trending articles
router.get("/trending", async (req, res) => {
  try {
    console.log(`🔥 [BACKEND] Fetching trending articles`)

    const articles = await Article.find({ trending: true }).sort({ views: -1, createdAt: -1 }).limit(20)

    console.log(`✅ [BACKEND] Found ${articles.length} trending articles`)

    res.json({
      success: true,
      articles,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching trending articles:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch trending articles",
    })
  }
})

// Get categories
router.get("/categories", async (req, res) => {
  try {
    console.log(`📂 [BACKEND] Fetching categories`)

    const categories = await Article.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          name: "$_id",
          count: 1,
          slug: {
            $toLower: {
              $replaceAll: {
                input: "$_id",
                find: " ",
                replacement: "-",
              },
            },
          },
          _id: 0,
        },
      },
      {
        $sort: { count: -1 },
      },
    ])

    console.log(`✅ [BACKEND] Found ${categories.length} categories`)

    res.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching categories:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories",
    })
  }
})

// Get user preferences
router.get("/user/preferences/:userId", async (req, res) => {
  try {
    const { userId } = req.params
    console.log(`👤 [BACKEND] Fetching preferences for user: ${userId}`)

    const preferences = await UserPreference.findOne({ userId })
      .populate("likedArticles.articleId", "title slug excerpt thumbnail createdAt")
      .populate("savedArticles.articleId", "title slug excerpt thumbnail createdAt")
      .populate("recentlyViewed.articleId", "title slug excerpt thumbnail createdAt")

    if (!preferences) {
      console.log(`👤 [BACKEND] No preferences found, creating new`)
      const newPrefs = new UserPreference({
        userId,
        email: "",
        likedArticles: [],
        savedArticles: [],
        recentlyViewed: [],
      })
      await newPrefs.save()

      return res.json({
        success: true,
        preferences: newPrefs,
      })
    }

    console.log(
      `✅ [BACKEND] Found preferences with ${preferences.likedArticles.length} likes, ${preferences.savedArticles.length} saves`,
    )

    res.json({
      success: true,
      preferences,
    })
  } catch (error) {
    console.error("❌ [BACKEND] Error fetching user preferences:", error)
    res.status(500).json({
      success: false,
      error: "Failed to fetch user preferences",
    })
  }
})

module.exports = router
