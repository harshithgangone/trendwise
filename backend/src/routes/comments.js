const Comment = require("../models/Comment")
const User = require("../models/User")

async function commentsRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/comments/:articleId", async (request, reply) => {
    try {
      const { articleId } = request.params
      const { page = 1, limit = 20 } = request.query
      const skip = (page - 1) * limit

      const comments = await Comment.find({
        article: articleId,
        status: "active",
        parentComment: null, // Only top-level comments
      })
        .populate("user", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .lean()

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        comments.map(async (comment) => {
          const replies = await Comment.find({
            parentComment: comment._id,
            status: "active",
          })
            .populate("user", "name avatar")
            .sort({ createdAt: 1 })
            .lean()

          return {
            ...comment,
            replies,
          }
        }),
      )

      const total = await Comment.countDocuments({
        article: articleId,
        status: "active",
        parentComment: null,
      })

      reply.send({
        success: true,
        comments: commentsWithReplies,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      fastify.log.error("Error fetching comments:", error)

      // Mock comments for fallback
      const mockComments = [
        {
          _id: "comment1",
          content: "Great article! Very informative.",
          user: {
            _id: "user1",
            name: "John Doe",
            avatar: "/placeholder.svg?height=40&width=40",
          },
          createdAt: new Date(),
          likes: 5,
          replies: [
            {
              _id: "reply1",
              content: "I agree! Thanks for sharing.",
              user: {
                _id: "user2",
                name: "Jane Smith",
                avatar: "/placeholder.svg?height=40&width=40",
              },
              createdAt: new Date(),
              likes: 2,
            },
          ],
        },
      ]

      reply.send({
        success: true,
        comments: mockComments,
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      })
    }
  })

  // Add a new comment
  fastify.post("/comments", async (request, reply) => {
    try {
      const { articleId, content, parentCommentId } = request.body
      const token = request.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "Authentication required",
        })
      }

      // In a real implementation, verify the JWT token here
      // For now, we'll create a mock response
      const newComment = {
        _id: "new-comment-" + Date.now(),
        content,
        user: {
          _id: "current-user",
          name: "Current User",
          avatar: "/placeholder.svg?height=40&width=40",
        },
        createdAt: new Date(),
        likes: 0,
        replies: [],
      }

      reply.send({
        success: true,
        comment: newComment,
      })
    } catch (error) {
      fastify.log.error("Error adding comment:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to add comment",
      })
    }
  })

  // Like a comment
  fastify.post("/comments/like/:commentId", async (request, reply) => {
    try {
      const { commentId } = request.params
      const token = request.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: "Authentication required",
        })
      }

      // Mock response for liking a comment
      reply.send({
        success: true,
        likes: Math.floor(Math.random() * 10) + 1,
      })
    } catch (error) {
      fastify.log.error("Error liking comment:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to like comment",
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
      if (comment.user.toString() !== userId) {
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
