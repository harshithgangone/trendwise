import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

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
          console.log("🔐 [AUTH] Processing Google sign-in for:", user.email)
          
          // For now, we'll just allow the sign-in without database operations
          // The user ID will be generated from the email in the session callback
          return true
        } catch (error) {
          console.error("❌ [AUTH] Error during sign-in:", error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      console.log("🔐 [AUTH] Building session for:", token.email)
      
      // Generate a consistent user ID from email
      if (session.user && token.email) {
        // Create a simple hash-based ID from email for consistency
        const userId = Buffer.from(token.email).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 24)
        
        session.user.id = userId
        session.user.role = token.role as string || "user"
        
        console.log("✅ [AUTH] Session created with user ID:", session.user.id)
      }
      
      return session
    },
    async jwt({ token, user, account }) {
      console.log("🔐 [AUTH] Processing JWT for:", token.email)
      
      if (user) {
        token.id = user.id
        token.role = (user as any).role || "user"
      }
      
      // Ensure we always have a role
      if (!token.role) {
        token.role = "user"
      }
      
      return token
    },
    async redirect({ url, baseUrl }) {
      console.log("🔐 [AUTH] Handling redirect:", { url, baseUrl })
      
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
  debug: process.env.NODE_ENV === "development", // Enable debug in development
}