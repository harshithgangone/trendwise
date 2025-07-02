const User = require("../models/User")

async function authRoutes(fastify, options) {
  // Google Sign-In endpoint
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
      let user = await User.findOne({
        $or: [{ email: email }, { googleId: googleId }],
      })

      if (user) {
        // Update existing user
        user.name = name
        user.picture = picture
        user.lastLogin = new Date()
        await user.save()

        fastify.log.info(`👤 [AUTH] User signed in: ${email}`)
      } else {
        // Create new user
        user = new User({
          email,
          name,
          picture,
          googleId,
          provider: "google",
          createdAt: new Date(),
          lastLogin: new Date(),
        })

        await user.save()
        fastify.log.info(`👤 [AUTH] New user created: ${email}`)
      }

      return {
        success: true,
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [AUTH] Google sign-in failed:", error)

      return reply.status(500).send({
        success: false,
        error: "Authentication failed",
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

      return {
        success: true,
        data: user,
      }
    } catch (error) {
      fastify.log.error("❌ [AUTH] Failed to fetch user profile:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to fetch profile",
      })
    }
  })

  // Update user preferences
  fastify.put("/preferences/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      const { preferences } = request.body

      const user = await User.findByIdAndUpdate(
        userId,
        {
          preferences,
          updatedAt: new Date(),
        },
        { new: true },
      ).select("-googleId")

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "User not found",
        })
      }

      return {
        success: true,
        data: user,
      }
    } catch (error) {
      fastify.log.error("❌ [AUTH] Failed to update preferences:", error)

      return reply.status(500).send({
        success: false,
        error: "Failed to update preferences",
      })
    }
  })
}

module.exports = authRoutes
