import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const { increment } = await request.json()

    console.log(`❤️ [FRONTEND API] ${increment ? "Liking" : "Unliking"} article: "${id}"`)

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/articles/like/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ increment }),
      },
    )

    if (!response.ok) {
      console.log(`❌ [FRONTEND API] Failed to update likes for article: "${id}"`)
      return NextResponse.json({ success: false, error: "Failed to update likes" }, { status: 500 })
    }

    const result = await response.json()
    console.log(`✅ [FRONTEND API] Likes updated for article: "${id}"`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ [FRONTEND API] Error updating article likes:", error)
    return NextResponse.json({ success: false, error: "Failed to update likes" }, { status: 500 })
  }
}
