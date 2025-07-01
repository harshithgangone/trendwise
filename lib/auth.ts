import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import User from "@/backend/src/models/User" // Import the User model from backend

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Connect to MongoDB if not already connected
          if (User.db.readyState !== 1) {
            require("@/backend/src/config/database") // Re-initialize DB connection if needed
          }

          let existingUser = await User.findOne({ email: user.email })

          if (!existingUser) {
            existingUser = await User.create({
              name: user.name,
              email: user.email,
              image: user.image,
              provider: account.provider,
              providerId: account.providerAccountId,
            })
            console.log("New user created:", existingUser.email)
          } else {
            // Update user details if they've changed
            existingUser.name = user.name
            existingUser.image = user.image
            await existingUser.save()
            console.log("Existing user updated:", existingUser.email)
          }
          return true
        } catch (error) {
          console.error("Error saving user to DB:", error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      // Add user ID from MongoDB to session
      if (token.email) {
        try {
          if (User.db.readyState !== 1) {
            require("@/backend/src/config/database")
          }
          const dbUser = await User.findOne({ email: token.email }).select("_id role")
          if (dbUser) {
            session.user.id = dbUser._id.toString()
            session.user.role = dbUser.role
          }
        } catch (error) {
          console.error("Error fetching user from DB for session:", error)
        }
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role // Cast to any to access role
      }
      return token
    },
    async redirect({ url, baseUrl }) {
      // Handle redirect after sign in
      const callbackUrl = new URL(url).searchParams.get("callbackUrl")
      if (callbackUrl) {
        // Ensure the callback URL is from the same origin for security
        try {
          const callbackURL = new URL(callbackUrl, baseUrl)
          if (callbackURL.origin === baseUrl) {
            return callbackURL.toString()
          }
        } catch {
          // Invalid URL, fall back to base URL
        }
      }
      return baseUrl
    },
  },
  pages: {
    signIn: "/login", // Custom sign-in page
  },
  secret: process.env.NEXTAUTH_SECRET, // IMPORTANT: Set this in your .env.local
}
