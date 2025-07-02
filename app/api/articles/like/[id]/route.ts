import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const articleId = params.id
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://trendwise-backend-frpp.onrender.com"

    // Call backend API to increment like count
    const response = await fetch(`${backendUrl}/api/articles/${articleId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: session.user?.email,
        action: "like",
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    } else {
      throw new Error("Failed to update like count")
    }
  } catch (error) {
    console.error("Error updating like:", error)
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 })
  }
}
