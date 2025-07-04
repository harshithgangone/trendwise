const Comment = require("../models/Comment")

async function commentRoutes(fastify, options) {
  console.log("💬 [COMMENT ROUTES] Registering comment routes...")

  // Get comments for an article
  fastify.get("/api/comments", async (request, reply) => {
    try {
      const { articleId } = request.query

      if (!articleId || articleId === "undefined") {
        console.log("⚠️ [COMMENTS] No articleId provided")
        return {
          success: true,
          comments: [],
          total: 0,
        }
      }

      console.log(`💬 [COMMENTS] GET /api/comments - Article: ${articleId}`)

      const comments = await Comment.find({ articleId }).sort({ createdAt: -1 }).lean()

      console.log(`✅ [COMMENTS] Found ${comments.length} comments for article ${articleId}`)

      return {
        success: true,
        comments: comments.map((comment) => ({
          ...comment,
          _id: comment._id.toString(),
        })),
        total: comments.length,
      }
    } catch (error) {
      console.error("❌ [COMMENTS] Error fetching comments:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch comments",
      })
    }
  })

  // Post a new comment
  fastify.post("/api/comments", async (request, reply) => {
    try {
      const { articleId, content, author } = request.body

      console.log(`💬 [COMMENTS] POST /api/comments - Article: ${articleId}`)
      console.log(`💬 [COMMENTS] Author: ${author?.email}`)
      console.log(`💬 [COMMENTS] Content: ${content?.substring(0, 50)}...`)

      if (!articleId || !content || !author) {
        console.log("❌ [COMMENTS] Missing required fields")
        return reply.status(400).send({
          success: false,
          error: "Article ID, content, and author are required",
        })
      }

      if (content.trim().length < 1) {
        return reply.status(400).send({
          success: false,
          error: "Comment cannot be empty",
        })
      }

      if (content.length > 1000) {
        return reply.status(400).send({
          success: false,
          error: "Comment is too long (max 1000 characters)",
        })
      }

      const comment = new Comment({
        articleId,
        content: content.trim(),
        author: {
          name: author.name || "Anonymous User",
          email: author.email,
          image: author.image || "/placeholder.svg?height=40&width=40",
        },
        createdAt: new Date(),
      })

      await comment.save()

      console.log(`✅ [COMMENTS] Comment posted successfully: ${comment._id}`)

      return {
        success: true,
        comment: {
          ...comment.toObject(),
          _id: comment._id.toString(),
        },
        message: "Comment posted successfully!",
      }
    } catch (error) {
      console.error("❌ [COMMENTS] Error posting comment:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to post comment",
      })
    }
  })

  console.log("✅ [COMMENT ROUTES] Comment routes registered successfully")
}

module.exports = commentRoutes
