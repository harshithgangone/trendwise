import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { action } = await request.json()
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${backendUrl}/api/admin/toggle-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ success: false, error: errorData.error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error toggling bot on backend:", error)
    return NextResponse.json({ success: false, error: "Failed to toggle bot" }, { status: 500 })
  }
}
