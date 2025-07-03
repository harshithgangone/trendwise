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

    console.log(`🔗 [SAVE API] Attempting to save article ${articleId} for user ${session.user?.email}`)

    // Call backend API to handle save
    const response = await fetch(`${backendUrl}/api/articles/${articleId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: session.user?.id || session.user?.email,
        userEmail: session.user?.email,
        action: "save",
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ [SAVE API] Successfully saved article ${articleId}`)
      return NextResponse.json(data)
    } else {
      const errorText = await response.text()
      console.error(`❌ [SAVE API] Backend error: ${response.status} - ${errorText}`)
      throw new Error(`Backend error: ${response.status}`)
    }
  } catch (error) {
    console.error("❌ [SAVE API] Error updating save:", error)
    return NextResponse.json({ error: "Failed to update save" }, { status: 500 })
  }
}
