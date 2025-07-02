const Comment = require("../models/Comment")

async function commentsRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/:articleId", async (request, reply) => {
    try {
      const { articleId } = request.params
      const { page = 1, limit = 10 } = request.query

      const comments = await Comment.find({ articleId })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("userId", "name picture")
        .exec()

      const total = await Comment.countDocuments({ articleId })

      reply.send({
        success: true,
        data: comments,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalComments: total,
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching comments:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch comments",
        message: error.message,
      })
    }
  })

  // Create a new comment
  fastify.post("/", async (request, reply) => {
    try {
      const { articleId, userId, content } = request.body

      if (!articleId || !userId || !content) {
        return reply.status(400).send({
          success: false,
          error: "Missing required fields",
        })
      }

      const comment = new Comment({
        articleId,
        userId,
        content,
        createdAt: new Date(),
      })

      await comment.save()
      await comment.populate("userId", "name picture")

      reply.send({
        success: true,
        data: comment,
      })
    } catch (error) {
      fastify.log.error("Error creating comment:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to create comment",
        message: error.message,
      })
    }
  })

  // Like/unlike a comment
  fastify.post("/:commentId/like", async (request, reply) => {
    try {
      const { commentId } = request.params
      const { userId } = request.body

      const comment = await Comment.findById(commentId)

      if (!comment) {
        return reply.status(404).send({
          success: false,
          error: "Comment not found",
        })
      }

      // Toggle like
      const userLikedIndex = comment.likes.indexOf(userId)
      if (userLikedIndex > -1) {
        comment.likes.splice(userLikedIndex, 1)
      } else {
        comment.likes.push(userId)
      }

      await comment.save()

      return {
        success: true,
        data: {
          likes: comment.likes.length,
          userLiked: comment.likes.includes(userId),
        },
      }
    } catch (error) {
      fastify.log.error(`❌ [COMMENTS] Failed to like comment ${request.params.commentId}:`, error)

      return reply.status(500).send({
        success: false,
        error: "Failed to like comment",
      })
    }
  })
}

module.exports = commentsRoutes
