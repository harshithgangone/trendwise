import { NextResponse } from "next/server"

export async function POST() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const response = await fetch(`${backendUrl}/api/admin/trigger-bot`, {
      method: "POST",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ success: false, error: errorData.error }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error triggering bot on backend:", error)
    return NextResponse.json({ success: false, error: "Failed to trigger bot" }, { status: 500 })
  }
}
