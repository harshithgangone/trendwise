const Comment = require("../models/Comment")

async function commentsRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/comments/:articleId", async (request, reply) => {
    try {
      const { articleId } = request.params
      const { page = 1, limit = 10 } = request.query
      const skip = (page - 1) * limit

      const comments = await Comment.find({ articleId })
        .populate("userId", "name picture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .lean()

      const total = await Comment.countDocuments({ articleId })

      reply.send({
        success: true,
        data: comments,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching comments:", error)

      // Mock comments
      const mockComments = [
        {
          _id: "comment1",
          content: "Great article! Very informative and well-written.",
          userId: {
            name: "John Doe",
            picture: "/placeholder.svg?height=40&width=40",
          },
          createdAt: new Date(),
          likes: 5,
        },
        {
          _id: "comment2",
          content: "Thanks for sharing this insight. Looking forward to more content like this.",
          userId: {
            name: "Jane Smith",
            picture: "/placeholder.svg?height=40&width=40",
          },
          createdAt: new Date(),
          likes: 3,
        },
      ]

      reply.send({
        success: true,
        data: mockComments,
        pagination: { page: 1, limit: 10, total: 2, pages: 1 },
        fallback: true,
      })
    }
  })

  // Create a new comment
  fastify.post("/comments", async (request, reply) => {
    try {
      const { articleId, userId, content } = request.body

      if (!articleId || !userId || !content) {
        return reply.status(400).send({
          success: false,
          message: "Article ID, User ID, and content are required",
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
        message: "Comment created successfully",
      })
    } catch (error) {
      fastify.log.error("Error creating comment:", error)

      // Mock comment creation
      reply.send({
        success: true,
        data: {
          _id: "mock-comment-id",
          content: request.body.content,
          userId: {
            name: "Mock User",
            picture: "/placeholder.svg?height=40&width=40",
          },
          createdAt: new Date(),
          likes: 0,
        },
        message: "Comment created successfully (mock)",
        fallback: true,
      })
    }
  })

  // Like a comment
  fastify.post("/comments/like/:commentId", async (request, reply) => {
    try {
      const { commentId } = request.params
      const comment = await Comment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } }, { new: true })

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: "Comment not found",
        })
      }

      reply.send({
        success: true,
        data: { likes: comment.likes },
      })
    } catch (error) {
      fastify.log.error("Error liking comment:", error)
      reply.status(500).send({
        success: false,
        message: "Error liking comment",
      })
    }
  })

  // Delete a comment
  fastify.delete("/comments/:commentId", async (request, reply) => {
    try {
      const { commentId } = request.params
      const { userId } = request.body

      const comment = await Comment.findById(commentId)

      if (!comment) {
        return reply.status(404).send({
          success: false,
          message: "Comment not found",
        })
      }

      // Check if user owns the comment
      if (comment.userId.toString() !== userId) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to delete this comment",
        })
      }

      await Comment.findByIdAndDelete(commentId)

      reply.send({
        success: true,
        message: "Comment deleted successfully",
      })
    } catch (error) {
      fastify.log.error("Error deleting comment:", error)
      reply.status(500).send({
        success: false,
        message: "Error deleting comment",
      })
    }
  })
}

module.exports = commentsRoutes
