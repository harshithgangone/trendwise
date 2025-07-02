const Comment = require("../models/Comment")

async function commentsRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/:articleId", async (request, reply) => {
    try {
      const { articleId } = request.params
      const { page = 1, limit = 10 } = request.query
      const skip = (page - 1) * limit

      const comments = await Comment.find({
        articleId,
        isApproved: true,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .populate("userId", "name picture")

      const total = await Comment.countDocuments({
        articleId,
        isApproved: true,
      })

      fastify.log.info(`💬 [COMMENTS] Fetched ${comments.length} comments for article ${articleId}`)

      return {
        success: true,
        data: comments,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      fastify.log.error(`❌ [COMMENTS] Failed to fetch comments for article ${request.params.articleId}:`, error)

      return {
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        },
      }
    }
  })

  // Create a new comment
  fastify.post("/", async (request, reply) => {
    try {
      const { articleId, userId, content, author } = request.body

      if (!articleId || !content || !author) {
        return reply.status(400).send({
          success: false,
          error: "Missing required fields",
        })
      }

      const newComment = new Comment({
        articleId,
        userId: userId || null,
        content,
        author,
        isApproved: true, // Auto-approve for now
        createdAt: new Date(),
      })

      await newComment.save()

      fastify.log.info(`💬 [COMMENTS] New comment created for article ${articleId}`)

      return {
        success: true,
        data: newComment,
      }
    } catch (error) {
      fastify.log.error("❌ [COMMENTS] Failed to create comment:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to create comment",
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
