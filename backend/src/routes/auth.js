const User = require("../models/User")

async function authRoutes(fastify, options) {
  // Google Sign-In
  fastify.post("/google-signin", async (request, reply) => {
    try {
      const { email, name, picture, googleId } = request.body

      if (!email || !name || !googleId) {
        return reply.status(400).send({
          success: false,
          error: "Missing required fields",
        })
      }

      // Check if user already exists
      let user = await User.findOne({ email })

      if (!user) {
        // Create new user
        user = new User({
          email,
          name,
          picture,
          googleId,
          provider: "google",
          createdAt: new Date(),
        })
        await user.save()
        fastify.log.info(`✅ [AUTH] New user created: ${email}`)
      } else {
        // Update existing user
        user.name = name
        user.picture = picture
        user.lastLogin = new Date()
        await user.save()
        fastify.log.info(`✅ [AUTH] User updated: ${email}`)
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
      })
    } catch (error) {
      fastify.log.error("Error in Google sign-in:", error)
      reply.status(500).send({
        success: false,
        error: "Authentication failed",
        message: error.message,
      })
    }
  })

  // Get user profile
  fastify.get("/profile/:userId", async (request, reply) => {
    try {
      const { userId } = request.params

      const user = await User.findById(userId).select("-googleId")

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "User not found",
        })
      }

      reply.send({
        success: true,
        data: user,
      })
    } catch (error) {
      fastify.log.error("Error fetching user profile:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch user profile",
        message: error.message,
      })
    }
  })
}

module.exports = authRoutes
