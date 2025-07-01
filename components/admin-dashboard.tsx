"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, FileText, Users, TrendingUp, RefreshCw, Play, Pause, Settings, Wifi, WifiOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DataSourceNotification } from "@/components/data-source-notification"

interface DashboardStats {
  totalArticles: number
  totalComments: number
  totalUsers: number
  trendsGenerated: number
}

export function AdminDashboard() {
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    totalComments: 0,
    totalUsers: 0,
    trendsGenerated: 0,
  })
  const [botStatus, setBotStatus] = useState<"running" | "stopped">("stopped")
  const [loading, setLoading] = useState(false)
  const [showDataNotification, setShowDataNotification] = useState(false)
  const [dataSourceInfo, setDataSourceInfo] = useState({ isRealData: false, source: "Mock Data" })

  useEffect(() => {
    fetchStats()
    fetchBotStatus()
    checkDataSource()
  }, [])

  const checkDataSource = async () => {
    try {
      const response = await fetch("/api/admin/data-source-status")
      const data = await response.json()
      setDataSourceInfo({
        isRealData: data.isUsingRealData || false,
        source: data.source || "Mock Data",
      })
    } catch (error) {
      console.error("Error checking data source:", error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchBotStatus = async () => {
    try {
      const response = await fetch("/api/admin/bot-status")
      const data = await response.json()
      setBotStatus(data.status)
    } catch (error) {
      console.error("Error fetching bot status:", error)
    }
  }

  const handleTriggerBot = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/trigger-bot", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          variant: "success",
          title: "Content Generation Started",
          description: "TrendBot is now generating fresh content from real news sources.",
        })

        // Show data source notification
        setShowDataNotification(true)

        // Refresh stats and data source info
        setTimeout(() => {
          fetchStats()
          checkDataSource()
        }, 2000)
      }
    } catch (error) {
      console.error("Error triggering bot:", error)
      toast({
        title: "Error",
        description: "Failed to trigger bot. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBot = async () => {
    try {
      const response = await fetch("/api/admin/toggle-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: botStatus === "running" ? "stop" : "start" }),
      })

      if (response.ok) {
        const newStatus = (typeof botStatus === "object" ? botStatus.isActive : botStatus === "running")
          ? "stopped"
          : "running"
        setBotStatus(newStatus)
        toast({
          variant: "success",
          title: `Bot ${newStatus}`,
          description: `Content generation bot has been ${newStatus}.`,
        })
      }
    } catch (error) {
      console.error("Error toggling bot:", error)
      toast({
        title: "Error",
        description: "Failed to toggle bot status.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Data Source Notification */}
      {showDataNotification && (
        <DataSourceNotification
          isRealData={dataSourceInfo.isRealData}
          source={dataSourceInfo.source}
          onClose={() => setShowDataNotification(false)}
        />
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center space-x-2">
            <Badge variant={botStatus === "running" ? "default" : "secondary"}>
              Bot Status: {typeof botStatus === "object" ? (botStatus.isActive ? "running" : "stopped") : botStatus}
            </Badge>
            <Badge
              variant={dataSourceInfo.isRealData ? "default" : "secondary"}
              className={dataSourceInfo.isRealData ? "bg-green-600" : "bg-orange-600"}
            >
              {dataSourceInfo.isRealData ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {dataSourceInfo.source}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalArticles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trends Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trendsGenerated}</div>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Bot Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleTriggerBot} disabled={loading} className="flex items-center">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Generating..." : "Generate New Content"}
              </Button>

              <Button variant="outline" onClick={handleToggleBot} className="flex items-center bg-transparent">
                {botStatus === "running" ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Bot
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Bot
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={checkDataSource} className="flex items-center bg-transparent">
                <Wifi className="h-4 w-4 mr-2" />
                Check Data Source
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span>Content generation using {dataSourceInfo.source}</span>
                <span className="text-sm text-gray-500">Active</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span>Bot crawled trending topics from GNews API</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span>New articles generated from real news data</span>
                <span className="text-sm text-gray-500">4 hours ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
