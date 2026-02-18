"use client";

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import { LatLngExpression, Icon, divIcon, LatLngBounds } from 'leaflet';
import { useEffect, useState, useCallback, useRef } from 'react';

// Custom icons for trash bins
const generalTrashIcon = new Icon({
  iconUrl: '/trash-icon-general.svg',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const recyclingTrashIcon = new Icon({
  iconUrl: '/trash-icon-recycling.svg',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

interface MapProps {
  center: LatLngExpression;
  userLocation: LatLngExpression | null;
  zoom: number;
}

interface TrashBin {
  id: number;
  lat: number;
  lon: number;
  tags: {
    amenity: string;
    [key: string]: string;
  };
}

// Component to update the map view when center props change
const MapUpdater = ({ center, zoom }: MapProps) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// This new component contains the logic for fetching and displaying trash bins
const TrashBinFetcher = () => {
  const [trashBins, setTrashBins] = useState<TrashBin[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache state: List of bounds we have already successfully fetched
  const fetchedAreas = useRef<LatLngBounds[]>([]);

  const map = useMap();

  const MIN_ZOOM_FOR_FETCH = 14;
  const REQUEST_TIMEOUT = 20000; // 20 seconds
  const API_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  const getIconForBin = (bin: TrashBin) => {
    const isRecycling = bin.tags.amenity === 'recycling' || 
                       Object.keys(bin.tags).some(key => key.startsWith('recycling') && bin.tags[key] === 'yes');
    return isRecycling ? recyclingTrashIcon : generalTrashIcon;
  };

  const handleMapChange = useCallback(async () => {
    // Cancel previous request if it's still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM_FOR_FETCH) {
      // Don't clear bins, just stop fetching and warn
      setMapMessage("Please zoom in to find trash bins.");
      setLoadingBins(false);
      return;
    }

    const currentBounds = map.getBounds();

    // SPATIAL CACHE CHECK:
    // If the current view is fully contained within an area we've already fetched,
    // we don't need to do anything. We already have the data.
    const isCached = fetchedAreas.current.some(area => area.contains(currentBounds));

    if (isCached) {
      setLoadingBins(false);
      setMapMessage(null);
      return; 
    }

    // Start fetching
    setLoadingBins(true);
    setMapMessage("Updating bins...");
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"waste_basket|recycling|waste_disposal"](${currentBounds.getSouth()},${currentBounds.getWest()},${currentBounds.getNorth()},${currentBounds.getEast()});
        way["amenity"~"waste_basket|recycling|waste_disposal"](${currentBounds.getSouth()},${currentBounds.getWest()},${currentBounds.getNorth()},${currentBounds.getEast()});
        relation["amenity"~"waste_basket|recycling|waste_disposal"](${currentBounds.getSouth()},${currentBounds.getWest()},${currentBounds.getNorth()},${currentBounds.getEast()});
      );
      out center;
    `;

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let lastError: any = null;
    let response: Response | null = null;

    for (const endpoint of API_ENDPOINTS) {
      if (signal.aborted) break;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery)}`,
          signal: signal,
        });

        if (response.ok) {
          lastError = null;
          break; // Success
        }

        if (response.status === 429 || response.status === 504) {
          console.warn(`Endpoint ${endpoint} failed with status ${response.status}. Trying next...`);
          lastError = new Error(`API servers are busy (status: ${response.status})`);
          continue; // Try next endpoint
        }

        lastError = new Error(`Overpass API error! status: ${response.status}`);
        break; // Don't retry on other errors like 400
        
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError') break; 
      }
    }

    clearTimeout(timeoutId);

    try {
      if (!response || !response.ok) throw lastError;

      const data = await response.json();
      const newBins = data.elements.map((element: any) => ({
        id: element.id,
        lat: element.type === 'node' ? element.lat : element.center.lat,
        lon: element.type === 'node' ? element.lon : element.center.lon,
        tags: element.tags,
      }));
      
      // MERGE RESULTS:
      // Add new bins to our existing list, removing duplicates by ID.
      setTrashBins(prevBins => {
        const binMap = new Map(prevBins.map(b => [b.id, b]));
        newBins.forEach((b: TrashBin) => binMap.set(b.id, b));
        return Array.from(binMap.values());
      });

      // Update Cache: Remember this area was successfully fetched
      fetchedAreas.current.push(currentBounds);

      setMapMessage(null);
      if (newBins.length === 0 && trashBins.length === 0) {
         // Only show "No bins" if we truly have 0 bins total, 
         // otherwise it's confusing if we have bins from a previous pan.
         // Actually, better to only show it if the *current fetch* returned nothing 
         // AND we aren't showing any bins in the *current view*.
         // For simplicity, let's just clear the message if we have bins.
      }
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMapMessage(`Error: ${err.message}. Please try again.`);
      }
    } finally {
      setLoadingBins(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [map]);

  useMapEvents({
    moveend: handleMapChange,
  });

  useEffect(() => {
    if (map) {
      handleMapChange();
    }
  }, [map, handleMapChange]);

  const message = loadingBins ? "Updating bins..." : mapMessage;

  return (
    <>
      {trashBins.map((bin) => (
        <Marker key={bin.id} position={[bin.lat, bin.lon]} icon={getIconForBin(bin)}>
          <Popup maxWidth={250} minWidth={150}>
            <BinPopup bin={bin} />
          </Popup>
        </Marker>
      ))}
      {loadingBins && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
             <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
      )}
      {!loadingBins && mapMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-fit p-2 bg-white/80 backdrop-blur-sm text-gray-800 text-center z-[1000] rounded-md shadow-lg">
          {mapMessage}
        </div>
      )}
    </>
  );
}

// New component to handle the content and logic for a single bin's popup
const BinPopup = ({ bin }: { bin: TrashBin }) => {
    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchAddress = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${bin.lat}&lon=${bin.lon}&format=json`);
                if (!response.ok) throw new Error("Failed to fetch address");
                const data = await response.json();
                setAddress(data.display_name || "Address not found");
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                setAddress("Could not load address.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAddress();
    }, [bin.lat, bin.lon]);

    const getTitle = () => {
      switch(bin.tags.amenity) {
        case 'recycling': return 'Recycling Point';
        case 'waste_disposal': return 'Waste Disposal';
        default: return 'Trash Bin';
      }
    };

    return (
        <div className="flex flex-col gap-1 min-w-[140px]">
            <strong className="text-base font-bold text-green-800">{getTitle()}</strong>
            <div className="text-xs text-gray-600 leading-tight">
              {isLoading ? "Loading address..." : address}
            </div>
            
            <div className="mt-1 pt-1 border-t border-gray-100">
              {Object.entries(bin.tags).map(([key, value]) => {
                  // Show specific recycling types (glass, paper, organic, etc.)
                  if (key.startsWith('recycling:') && value === 'yes') {
                      return (
                        <div key={key} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <p className="capitalize text-[10px] leading-tight text-gray-500">
                            {key.split(':')[1].replace('_', ' ')}
                          </p>
                        </div>
                      );
                  }
                  // Show if it's a specific type of waste disposal
                  if (key === 'waste' && value !== 'yes') {
                    return <p key={key} className="text-[10px] text-blue-600 font-medium capitalize">{value} waste</p>
                  }
                  return null;
              })}
              {bin.tags.description && <p className="text-[10px] italic mt-1 text-gray-400 leading-tight border-t border-gray-50 pt-1">{bin.tags.description}</p>}
            </div>
        </div>
    );
};

const TrashMap = ({ center, userLocation, zoom }: MapProps) => {
  const gpsIcon = divIcon({
    className: 'gps-marker',
    html: '<div class="pulse"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  return (
    <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false} // Disable default top-left control
        scrollWheelZoom={true} // Re-enable scroll wheel zoom
        doubleClickZoom={true} // Re-enable double click zoom
        dragging={true} // Ensure dragging is enabled
        >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CartoDB</a>'
      />
      <MapUpdater center={center} zoom={zoom} />
      <TrashBinFetcher />
      {userLocation && (
        <Marker position={userLocation} icon={gpsIcon} />
      )}
      <ZoomControl position="topright" /> {/* Add ZoomControl to top-right */}
    </MapContainer>
  );
};

export { TrashMap as Map };
