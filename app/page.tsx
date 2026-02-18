"use client"

import { useState, useCallback, useEffect } from "react"
import { MapPin, Recycle } from 'lucide-react'
import { AdComponent } from "@/components/ui/ad-component"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Map } from "@/components/ui/dynamic-map"
import AddressSearch from "@/components/ui/address-search"
export default function TrashMapsHome() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]); // Default to London
  const [mapZoom, setMapZoom] = useState(14); // Start at zoom level 14 or higher
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleSelectLocation = useCallback((lat: number, lon: number) => {
    setMapCenter([lat, lon]);
    setMapZoom(16);
  }, []);

  const handleGeolocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);

    const fetchGeoIpLocation = async () => {
        try {
            const response = await fetch('http://ip-api.com/json/');
            const data = await response.json();
            if (data.status === 'success' && data.lat && data.lon) {
                setMapCenter([data.lat, data.lon]);
                setMapZoom(14); // Zoom to city level for GeoIP
            }
        } catch (ipError) {
            console.error("GeoIP lookup failed:", ipError);
        } finally {
            setIsLocating(false);
        }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setMapCenter(coords);
          setUserLocation(coords);
          setMapZoom(16); // Zoom to neighborhood level for precise location
          setIsLocating(false);
        },
        (error) => {
          let message = "Precise location denied. Using approximate location.";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              console.warn("User denied Geolocation.");
              message = "Location permission denied. Finding your approximate location.";
              break;
            case error.POSITION_UNAVAILABLE:
              console.warn("Geolocation position unavailable.");
              message = "Location is currently unavailable. Finding your approximate location.";
              break;
            case error.TIMEOUT:
              console.warn("Geolocation request timed out.");
              message = "Location request timed out. Finding your approximate location.";
              break;
          }
          setLocationError(message);
          fetchGeoIpLocation(); // Fallback to GeoIP
        }
      );
    } else {
      setLocationError("Geolocation is not supported. Using approximate location.");
      fetchGeoIpLocation(); // Fallback to GeoIP
    }
  }, []);

  // Automatically get user's location on initial load
  useEffect(() => {
    handleGeolocation();
  }, [handleGeolocation]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Trash Maps",
            "url": "https://trashmaps.info",
            "description": "Interactive map to find public trash and recycling bins near you.",
            "applicationCategory": "Map",
            "operatingSystem": "All",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })
        }}
      />
      
      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">Trash Maps - Find Public Trash and Recycling Bins Near You</h1>

      <main className="relative h-full w-full">
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
             Use our map to quickly locate nearby public trash and recycling bins.
            </p>
            <AdComponent />
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
      
      {/* Map Controls Panel (Top-Left) */}
      <div className="absolute top-0 left-0 z-10 p-2 w-full sm:w-auto max-w-[calc(100%-50px)] sm:max-w-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col gap-2 w-full sm:max-w-sm">
            <div className="flex flex-wrap gap-2 items-center">
                  <AddressSearch onSelectLocation={handleSelectLocation} />
            </div>
        </div>
      </div>

      {/* Geolocation Button (Bottom-Right) */}
      <div className="absolute bottom-20 right-4 sm:right-10 z-20">
        <Button 
          variant="default" 
          size="icon" 
          className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700 shadow-lg" 
          onClick={handleGeolocation} 
          disabled={isLocating}
        >
          {isLocating ? (
             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          ) : (
            <MapPin className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {locationError && (
        <div className="absolute bottom-36 right-4 sm:right-10 z-20 p-2 bg-red-100 text-red-800 rounded-md shadow-lg text-sm max-w-[250px]">
          {locationError}
        </div>
      )}

      {/* Full Screen Map */}
      <div className="absolute top-0 left-0 h-full w-full z-0">
        <Map center={mapCenter} userLocation={userLocation} zoom={mapZoom} />  
      </div>
      </main>

      {/* Bottom Banner */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 bg-gray-900/90 backdrop-blur-sm text-white py-2 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-green-600 p-1 rounded-md">
              <Recycle className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">Trash Maps</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
