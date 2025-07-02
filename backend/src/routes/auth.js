const User = require("../models/User")
const { OAuth2Client } = require("google-auth-library")

async function authRoutes(fastify, options) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

  // Google Sign-In
  fastify.post("/google-signin", async (request, reply) => {
    try {
      const { credential } = request.body

      if (!credential) {
        return reply.status(400).send({
          success: false,
          error: "Missing credential",
        })
      }

      fastify.log.info("🔐 [AUTH] Processing Google sign-in...")

      // Verify the Google token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      })

      const payload = ticket.getPayload()
      const { sub: googleId, email, name, picture } = payload

      fastify.log.info(`🔐 [AUTH] Google token verified for: ${email}`)

      // Check if user exists
      let user = await User.findOne({ email })

      if (!user) {
        // Create new user
        user = new User({
          googleId,
          email,
          name,
          avatar: picture,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await user.save()
        fastify.log.info(`✅ [AUTH] New user created: ${email}`)
      } else {
        // Update existing user
        user.googleId = googleId
        user.name = name
        user.avatar = picture
        user.lastLogin = new Date()
        user.updatedAt = new Date()

        await user.save()
        fastify.log.info(`✅ [AUTH] Existing user updated: ${email}`)
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
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
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          savedArticles: user.savedArticles || [],
          likedArticles: user.likedArticles || [],
          createdAt: user.createdAt,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [AUTH] Failed to fetch user profile:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch profile",
      })
    }
  })

  // Update user profile
  fastify.put("/profile/:userId", async (request, reply) => {
    try {
      const { userId } = request.params
      const { name, preferences } = request.body

      const user = await User.findByIdAndUpdate(
        userId,
        {
          name,
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
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [AUTH] Failed to update user profile:", error)
      return reply.status(500).send({
        success: false,
        error: "Failed to update profile",
      })
    }
  })
}

module.exports = authRoutes
