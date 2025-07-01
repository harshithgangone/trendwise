"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export function SearchBar() {
  const [query, setQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Implement search functionality
      console.log("Searching for:", query)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full"
    >
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search trending topics, articles, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 pr-24 py-4 text-lg rounded-full border-2 border-gray-200 focus:border-blue-500 transition-all-smooth"
          />
          <Button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-6">
            Search
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
