import express from "express"
import Article from "../models/Article.js"

const router = express.Router()

// Get all articles
router.get("/", async (request, reply) => {
  try {
    const articles = await Article.find()
    reply.send(articles)
  } catch (error) {
    console.error("❌ [ARTICLES] Error fetching articles:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Get single article
router.get("/:id", async (request, reply) => {
  try {
    const { id } = request.params
    const article = await Article.findById(id)

    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    reply.send(article)
  } catch (error) {
    console.error("❌ [ARTICLES] Error fetching article:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Add new article
router.post("/", async (request, reply) => {
  try {
    const article = new Article(request.body)
    await article.save()
    reply.code(201).send({ success: true, message: "Article created successfully", data: article })
  } catch (error) {
    console.error("❌ [ARTICLES] Error creating article:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Update article
router.put("/:id", async (request, reply) => {
  try {
    const { id } = request.params
    const article = await Article.findByIdAndUpdate(id, request.body, { new: true })

    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    reply.send({ success: true, message: "Article updated successfully", data: article })
  } catch (error) {
    console.error("❌ [ARTICLES] Error updating article:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Delete article
router.delete("/:id", async (request, reply) => {
  try {
    const { id } = request.params
    const article = await Article.findByIdAndDelete(id)

    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    reply.send({ success: true, message: "Article deleted successfully" })
  } catch (error) {
    console.error("❌ [ARTICLES] Error deleting article:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Add like endpoint
router.post("/:id/like", async (request, reply) => {
  try {
    const { id } = request.params
    const { userId, action } = request.body

    console.log(`👍 [ARTICLES] User ${userId} ${action}d article ${id}`)

    const article = await Article.findById(id)
    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    // Increment like count for real user interaction
    if (action === "like") {
      article.likes = (article.likes || 0) + 1
    } else if (action === "unlike") {
      article.likes = Math.max(0, (article.likes || 0) - 1)
    }

    await article.save()

    console.log(`✅ [ARTICLES] Article ${id} now has ${article.likes} likes`)

    reply.send({
      success: true,
      likes: article.likes,
      message: `Article ${action}d successfully`,
    })
  } catch (error) {
    console.error("❌ [ARTICLES] Error updating like:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Add save endpoint
router.post("/:id/save", async (request, reply) => {
  try {
    const { id } = request.params
    const { userId, action } = request.body

    console.log(`💾 [ARTICLES] User ${userId} ${action}d article ${id}`)

    const article = await Article.findById(id)
    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    // Increment save count for real user interaction
    if (action === "save") {
      article.saves = (article.saves || 0) + 1
    } else if (action === "unsave") {
      article.saves = Math.max(0, (article.saves || 0) - 1)
    }

    await article.save()

    console.log(`✅ [ARTICLES] Article ${id} now has ${article.saves} saves`)

    reply.send({
      success: true,
      saves: article.saves,
      message: `Article ${action}d successfully`,
    })
  } catch (error) {
    console.error("❌ [ARTICLES] Error updating save:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

// Add view tracking endpoint
router.post("/:id/view", async (request, reply) => {
  try {
    const { id } = request.params
    const { userId } = request.body

    console.log(`👁️ [ARTICLES] User ${userId || "anonymous"} viewed article ${id}`)

    const article = await Article.findById(id)
    if (!article) {
      return reply.status(404).send({ success: false, error: "Article not found" })
    }

    // Increment view count for real user interaction
    article.views = (article.views || 0) + 1
    await article.save()

    console.log(`✅ [ARTICLES] Article ${id} now has ${article.views} views`)

    reply.send({
      success: true,
      views: article.views,
      message: "View recorded successfully",
    })
  } catch (error) {
    console.error("❌ [ARTICLES] Error updating view:", error)
    reply.status(500).send({ success: false, error: error.message })
  }
})

export default router
