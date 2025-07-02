const Comment = require("../models/Comment")

async function commentRoutes(fastify, options) {
  // Get comments for an article
  fastify.get("/", async (request, reply) => {
    try {
      const { articleId, page = 1, limit = 20 } = request.query

      if (!articleId) {
        return reply.status(400).send({
          success: false,
          error: "Article ID is required",
        })
      }

      const comments = await Comment.find({
        articleId,
        status: "approved",
      })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Comment.countDocuments({
        articleId,
        status: "approved",
      })

      reply.send({
        success: true,
        comments,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch comments",
      })
    }
  })

  // Create a new comment
  fastify.post("/", async (request, reply) => {
    try {
      const { articleId, content, author } = request.body

      if (!articleId || !content || !author) {
        return reply.status(400).send({
          success: false,
          error: "Article ID, content, and author are required",
        })
      }

      const comment = new Comment({
        articleId,
        content,
        author,
      })

      await comment.save()

      reply.status(201).send({
        success: true,
        comment,
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to create comment",
      })
    }
  })

  // Delete a comment (admin only)
  fastify.delete("/:id", async (request, reply) => {
    try {
      const { id } = request.params

      const comment = await Comment.findByIdAndDelete(id)

      if (!comment) {
        return reply.status(404).send({
          success: false,
          error: "Comment not found",
        })
      }

      reply.send({
        success: true,
        message: "Comment deleted successfully",
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to delete comment",
      })
    }
  })

  // Update comment status (admin only)
  fastify.patch("/:id/status", async (request, reply) => {
    try {
      const { id } = request.params
      const { status } = request.body

      if (!["approved", "pending", "rejected"].includes(status)) {
        return reply.status(400).send({
          success: false,
          error: "Invalid status",
        })
      }

      const comment = await Comment.findByIdAndUpdate(id, { status }, { new: true })

      if (!comment) {
        return reply.status(404).send({
          success: false,
          error: "Comment not found",
        })
      }

      reply.send({
        success: true,
        comment,
      })
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({
        success: false,
        error: "Failed to update comment status",
      })
    }
  })
}

module.exports = commentRoutes
