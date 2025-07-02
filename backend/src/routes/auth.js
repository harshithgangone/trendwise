const User = require("../models/User")

async function authRoutes(fastify, options) {
  // Google Sign-in endpoint
  fastify.post("/google-signin", async (request, reply) => {
    try {
      const { email, name, image, googleId } = request.body

      console.log(`🔐 [AUTH] Google sign-in attempt for: ${email}`)

      if (!email || !name) {
        return reply.status(400).send({
          success: false,
          error: "Email and name are required",
        })
      }

      // Check if user already exists
      let user = await User.findOne({ email })

      if (user) {
        // Update existing user
        user.name = name
        user.image = image
        user.googleId = googleId
        user.lastLogin = new Date()
        await user.save()

        console.log(`✅ [AUTH] Existing user updated: ${email}`)
      } else {
        // Create new user
        user = new User({
          email,
          name,
          image,
          googleId,
          provider: "google",
          createdAt: new Date(),
          lastLogin: new Date(),
        })
        await user.save()

        console.log(`✅ [AUTH] New user created: ${email}`)
      }

      reply.send({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      })
    } catch (error) {
      console.error("❌ [AUTH] Error in Google sign-in:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to process sign-in",
        message: error.message,
      })
    }
  })

  // Get user profile
  fastify.get("/profile/:email", async (request, reply) => {
    try {
      const { email } = request.params

      const user = await User.findOne({ email }).select("-googleId")

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: "User not found",
        })
      }

      reply.send({
        success: true,
        user,
      })
    } catch (error) {
      console.error("❌ [AUTH] Error fetching user profile:", error)
      reply.status(500).send({
        success: false,
        error: "Failed to fetch user profile",
      })
    }
  })
}

module.exports = authRoutes
