const fastify = require("fastify")()
const User = require("../models/User")

// Google Sign-in endpoint
fastify.post("/google-signin", async (request, reply) => {
  try {
    console.log("🔐 [BACKEND AUTH] Google sign-in request received")

    const { name, email, image, provider, providerId } = request.body

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: "Email is required",
      })
    }

    console.log(`👤 [BACKEND AUTH] Processing user: ${email}`)

    // Check if user exists
    let user = await User.findOne({ email })

    if (user) {
      // Update existing user
      user.name = name || user.name
      user.image = image || user.image
      user.lastLogin = new Date()
      await user.save()

      console.log(`✅ [BACKEND AUTH] Existing user updated: ${email}`)
    } else {
      // Create new user
      user = new User({
        name,
        email,
        image,
        provider,
        providerId,
        role: "user",
        createdAt: new Date(),
        lastLogin: new Date(),
      })

      await user.save()
      console.log(`✅ [BACKEND AUTH] New user created: ${email}`)
    }

    return {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      },
    }
  } catch (error) {
    console.error("❌ [BACKEND AUTH] Error in Google sign-in:", error)
    reply.status(500).send({
      success: false,
      error: "Authentication failed",
      message: error.message,
    })
  }
})

module.exports = fastify
