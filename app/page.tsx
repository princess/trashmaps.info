"use client"

import { useState, useEffect } from "react"
import { MapPin, Search, Filter, Star, X, Recycle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function TrashMapsHome() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)

  return (
    <div className="h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Welcome Modal */}
      <Dialog open={showWelcomeModal} onOpenChange={setShowWelcomeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="bg-green-600 p-3 rounded-lg">
                <Recycle className="h-8 w-8 text-white" />
              </div>
              <DialogTitle className="text-3xl font-bold text-green-800">Trash Maps</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Welcome to Trash Maps!
            </h3>
            <p className="text-gray-600">
              Welcome to Trash Maps! Can't find a trash can? Use our map to quickly locate nearby public bins. It's the easiest way to dispose of your trash responsibly and help keep our streets tidy.
            </p>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg mb-4">
              <p className="text-xs opacity-75 mb-2">Advertisement</p>
              <h4 className="font-bold mb-1">Eco-Friendly Products</h4>
              <p className="text-sm mb-3">{"Discover sustainable solutions for a cleaner tomorrow"}</p>
              <Button variant="secondary" size="sm" className="bg-white text-blue-600 hover:bg-gray-100">
                Learn More
              </Button>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <p>🗺️ Global coverage in 150+ countries</p>
            </div>
            <Button 
              onClick={() => setShowWelcomeModal(false)}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Start Exploring
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Simple Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 p-1.5 rounded-lg">
                <Recycle className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-green-800">Trash Maps</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Map Section - Main Content */}
      <section className="flex-1 p-4">
        <div className="container mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Map Controls */}
            <div className="border-b p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Public Bins</Badge>
                  <Badge variant="secondary">Recycling</Badge>
                  <Badge variant="secondary">Compost</Badge>
                </div>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Showing 1,247 bins in your area
              </div>
            </div>
            
            {/* Map Display */}
            <div className="h-full bg-gradient-to-br from-green-100 to-blue-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/world-map-location-pins.png')] bg-cover bg-center opacity-20"></div>
              
              {/* Sample Map Markers */}
              <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-green-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors animate-pulse">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-green-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="absolute top-1/3 right-1/4 transform translate-x-1/2 -translate-y-1/2">
                <div className="bg-green-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="absolute bottom-1/3 left-1/4 transform -translate-x-1/2 translate-y-1/2">
                <div className="bg-green-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="absolute top-2/3 right-1/3 transform translate-x-1/2 -translate-y-1/2">
                <div className="bg-green-600 p-2 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
              </div>
              
              {/* Map Info Card */}
              <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">Central Park Bin #247</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Public trash bin with recycling</p>
                <div className="flex items-center gap-1 mb-2">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <Star className="h-3 w-3 text-gray-300" />
                  <span className="text-xs text-gray-500 ml-1">4.2 (23 reviews)</span>
                </div>
                <p className="text-xs text-gray-500">Last updated: 2 hours ago</p>
              </div>

              {/* Map Legend */}
              <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
                <h4 className="text-sm font-semibold mb-2">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>Nearly Full</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Full</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-white py-3 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="bg-green-600 p-1.5 rounded-lg">
              <Recycle className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold">Trash Maps</span>
          </div>
          <p className="text-gray-400 text-sm">
            Making the world cleaner, one bin at a time.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            &copy; 2024 Trash Maps. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
