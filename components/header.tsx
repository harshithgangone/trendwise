"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, LogOut, Settings, TrendingUp, Home, Grid3X3, Info } from "lucide-react"

export function Header() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleNavigation = (path: string) => {
    setIsOpen(false)
    if (mounted) {
      // Use window.location for article pages to ensure navigation works
      if (pathname?.startsWith("/article/")) {
        window.location.href = path
      } else {
        router.push(path)
      }
    }
  }

  const isActive = (path: string) => pathname === path

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold gradient-text">TrendWise</div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleNavigation("/")}
            className="text-2xl font-bold gradient-text hover:opacity-80 transition-opacity"
          >
            TrendWise
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <button
            onClick={() => handleNavigation("/")}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              isActive("/") ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </button>
          <button
            onClick={() => handleNavigation("/trending")}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              isActive("/trending")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Trending</span>
          </button>
          <button
            onClick={() => handleNavigation("/categories")}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              isActive("/categories")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span>Categories</span>
          </button>
          <button
            onClick={() => handleNavigation("/about")}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              isActive("/about") ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Info className="h-4 w-4" />
            <span>About</span>
          </button>
        </nav>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {status === "loading" ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                    <AvatarFallback>{session.user?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={() => handleNavigation("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {session.user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => handleNavigation("/admin")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => handleNavigation("/login")} variant="default">
              Sign In
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col space-y-4">
                <button
                  onClick={() => handleNavigation("/")}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => handleNavigation("/trending")}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Trending</span>
                </button>
                <button
                  onClick={() => handleNavigation("/categories")}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span>Categories</span>
                </button>
                <button
                  onClick={() => handleNavigation("/about")}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Info className="h-4 w-4" />
                  <span>About</span>
                </button>
                {session && (
                  <button
                    onClick={() => handleNavigation("/profile")}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
