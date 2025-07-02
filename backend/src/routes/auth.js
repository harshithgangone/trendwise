const User = require("../models/User")

async function authRoutes(fastify, options) {
  // Google sign-in
  fastify.post("/auth/google-signin", async (request, reply) => {
    try {
      const { email, name, image, googleId } = request.body

      fastify.log.info(`🔐 [BACKEND] Google sign-in attempt for: ${email}`)

      let user = await User.findOne({ email })

      if (!user) {
        user = new User({
          email,
          name,
          image,
          googleId,
          provider: "google",
          createdAt: new Date(),
        })
        await user.save()
        fastify.log.info(`✅ [BACKEND] New user created: ${email}`)
      } else {
        // Update user info
        user.name = name
        user.image = image
        user.lastLogin = new Date()
        await user.save()
        fastify.log.info(`✅ [BACKEND] User updated: ${email}`)
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error in Google sign-in:", error)
      return reply.code(500).send({ success: false, error: "Authentication failed" })
    }
  })

  // Get user profile
  fastify.get("/auth/profile/:email", async (request, reply) => {
    try {
      const { email } = request.params

      const user = await User.findOne({ email }).lean()

      if (!user) {
        return reply.code(404).send({ success: false, error: "User not found" })
      }

      return {
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
          createdAt: user.createdAt,
        },
      }
    } catch (error) {
      fastify.log.error("❌ [BACKEND] Error fetching user profile:", error)
      return reply.code(500).send({ success: false, error: "Failed to fetch profile" })
    }
  })
}

module.exports = authRoutes
