const User = require("../models/User")

async function authRoutes(fastify, options) {
  // Google Sign-in
  fastify.post("/auth/google-signin", async (request, reply) => {
    try {
      const { email, name, picture, googleId } = request.body

      if (!email || !name) {
        return reply.status(400).send({
          success: false,
          message: "Email and name are required",
        })
      }

      // Find or create user
      let user = await User.findOne({ email })

      if (!user) {
        user = new User({
          email,
          name,
          picture,
          googleId,
          provider: "google",
          createdAt: new Date(),
        })
        await user.save()
        fastify.log.info(`New user created: ${email}`)
      } else {
        // Update user info
        user.name = name
        user.picture = picture
        user.lastLogin = new Date()
        await user.save()
        fastify.log.info(`User updated: ${email}`)
      }

      reply.send({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        },
        message: "Sign-in successful",
      })
    } catch (error) {
      fastify.log.error("Error in Google sign-in:", error)

      // Mock successful sign-in for development
      reply.send({
        success: true,
        data: {
          user: {
            id: "mock-user-id",
            email: request.body.email || "user@example.com",
            name: request.body.name || "Mock User",
            picture: request.body.picture || "/placeholder.svg?height=40&width=40",
          },
        },
        message: "Sign-in successful (mock)",
        fallback: true,
      })
    }
  })

  // Get user profile
  fastify.get("/auth/profile/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      const user = await User.findById(userId).select("-googleId").lean()

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        })
      }

      reply.send({
        success: true,
        data: { user },
      })
    } catch (error) {
      fastify.log.error("Error fetching user profile:", error)
      reply.status(500).send({
        success: false,
        message: "Error fetching user profile",
      })
    }
  })

  // Update user profile
  fastify.put("/auth/profile/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      const { name, bio, preferences } = request.body

      const user = await User.findByIdAndUpdate(
        userId,
        { name, bio, preferences, updatedAt: new Date() },
        { new: true },
      ).select("-googleId")

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        })
      }

      reply.send({
        success: true,
        data: { user },
        message: "Profile updated successfully",
      })
    } catch (error) {
      fastify.log.error("Error updating user profile:", error)
      reply.status(500).send({
        success: false,
        message: "Error updating user profile",
      })
    }
  })
}

module.exports = authRoutes
