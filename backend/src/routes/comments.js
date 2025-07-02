const Comment = require("../models/Comment")

async function commentsRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/comments/:articleId", async (request, reply) => {
    try {
      const { articleId } = request.params

      const comments = await Comment.find({ articleId }).sort({ createdAt: -1 }).lean()

      return {
        success: true,
        comments: comments || [],
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching comments:", error)
      return { success: true, comments: [] }
    }
  })

  // Create a new comment
  fastify.post("/comments", async (request, reply) => {
    try {
      const { articleId, content, author } = request.body

      const comment = new Comment({
        articleId,
        content,
        author,
        createdAt: new Date(),
      })

      await comment.save()

      return {
        success: true,
        comment: comment.toObject(),
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error adding comment:", error)
      return reply.code(500).send({ success: false, error: "Failed to add comment" })
    }
  })

  // Like/unlike a comment
  fastify.post("/comments/:commentId/like", async (request, reply) => {
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
