"use client";

import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { LatLngExpression, Icon, divIcon, LatLngBounds } from 'leaflet';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

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
  searchedLocation?: LatLngExpression | null;
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
const MapUpdater = ({ center, zoom }: Pick<MapProps, 'center' | 'zoom'>) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

const API_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.be/api/interpreter',
];

// Tracks last use and failure counts for each mirror to implement rate limiting and circuit breaking
const endpointStatus = new Map<string, { lastUsed: number; failureCount: number }>();
API_ENDPOINTS.forEach(url => endpointStatus.set(url, { lastUsed: 0, failureCount: 0 }));

// This new component contains the logic for fetching and displaying trash bins
const TrashBinFetcher = ({ center, zoom }: Pick<MapProps, 'center' | 'zoom'>) => {
  const [trashBins, setTrashBins] = useState<TrashBin[]>([]);
  const [loadingCount, setLoadingCount] = useState(0);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [renderBounds, setRenderBounds] = useState<LatLngBounds | null>(null);
  
  // Grid-based cache state
  const fetchedGridCells = useRef<Set<string>>(new Set());
  const activeGridCells = useRef<Set<string>>(new Set());
  const cellQueue = useRef<string[]>([]);
  const activeRequests = useRef<number>(0);

  const map = useMap();

  const MIN_ZOOM_FOR_FETCH = 15;
  const REQUEST_TIMEOUT = 60000; 
  const MAX_CONCURRENT_REQUESTS = 3;
  const mirrorsInProgress = useRef<Set<string>>(new Set());

  const getGridSize = useCallback((zoom: number) => {
    if (zoom >= 16) return 0.02; // ~2km
    return 0.05; // ~5km for zoom 15
  }, []);

  const getGridCells = useCallback((bounds: LatLngBounds) => {
    const zoom = map.getZoom();
    const gridSize = getGridSize(zoom);
    const minLat = Math.floor(bounds.getSouth() / gridSize);
    const maxLat = Math.floor(bounds.getNorth() / gridSize);
    const minLon = Math.floor(bounds.getWest() / gridSize);
    const maxLon = Math.floor(bounds.getEast() / gridSize);
    
    const cells: string[] = [];
    for (let lat = minLat; lat <= maxLat; lat++) {
      for (let lon = minLon; lon <= maxLon; lon++) {
        // Include gridSize in the key to prevent overlap between zoom levels
        cells.push(`${gridSize}:${lat}:${lon}`);
      }
    }
    return cells;
  }, [map, getGridSize]);

  const getCellBounds = useCallback((cellKey: string) => {
    const [gridSizeStr, latIdxStr, lonIdxStr] = cellKey.split(':');
    const gridSize = parseFloat(gridSizeStr);
    const latIdx = parseInt(latIdxStr);
    const lonIdx = parseInt(lonIdxStr);
    
    return {
      s: latIdx * gridSize,
      w: lonIdx * gridSize,
      n: (latIdx + 1) * gridSize,
      e: (lonIdx + 1) * gridSize,
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (activeRequests.current >= MAX_CONCURRENT_REQUESTS || cellQueue.current.length === 0) {
      return;
    }

    const now = Date.now();
    
    // Select best mirror: 
    // 1. Not currently in progress
    // 2. Not used in last 3 seconds (to avoid 429)
    // 3. Lowest failure count
    const availableMirrors = API_ENDPOINTS
      .filter(url => !mirrorsInProgress.current.has(url))
      .filter(url => (now - (endpointStatus.get(url)?.lastUsed || 0)) > 3000)
      .sort((a, b) => (endpointStatus.get(a)?.failureCount || 0) - (endpointStatus.get(b)?.failureCount || 0));

    if (availableMirrors.length === 0) {
      // All mirrors are busy, recently used, or failing. Wait and retry.
      setTimeout(() => processQueue(), 1000);
      return;
    }

    const endpoint = availableMirrors[0];
    const maxBatchSize = 4; // Smaller batches with larger grid
    const cellsToFetch = cellQueue.current.splice(0, maxBatchSize);
    if (cellsToFetch.length === 0) return;

    const zoom = map.getZoom();
    cellsToFetch.forEach(c => activeGridCells.current.add(c));
    setLoadingCount(prev => prev + 1);
    activeRequests.current++;
    mirrorsInProgress.current.add(endpoint);
    
    const status = endpointStatus.get(endpoint)!;
    status.lastUsed = Date.now();

    const allBounds = cellsToFetch.map(getCellBounds);
    const s = Math.min(...allBounds.map(b => b.s));
    const w = Math.min(...allBounds.map(b => b.w));
    const n = Math.max(...allBounds.map(b => b.n));
    const e = Math.max(...allBounds.map(b => b.e));

    const isLowZoom = zoom < 14;
    const limit = isLowZoom ? 800 : 2000;
    
    // Minified query to avoid encoding issues with some mirrors
    const overpassQuery = isLowZoom 
      ? `[out:json][timeout:60];(node["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});node["bin"="yes"](${s},${w},${n},${e}););out center ${limit};`
      : `[out:json][timeout:60];(node["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});node["bin"="yes"](${s},${w},${n},${e});way["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});way["bin"="yes"](${s},${w},${n},${e});relation["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e}););out center ${limit};`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        status.failureCount = 0; 
        const data = await response.json();
        
        const newBins = (data.elements || []).map((element: any) => ({
          id: element.id,
          lat: element.type === 'node' ? element.lat : element.center.lat,
          lon: element.type === 'node' ? element.lon : element.center.lon,
          tags: element.tags || {},
        }));
        
        setTrashBins(prevBins => {
          const binMap = new Map(prevBins.map(b => [b.id, b]));
          newBins.forEach((b: TrashBin) => binMap.set(b.id, b));
          return Array.from(binMap.values());
        });

        cellsToFetch.forEach(c => fetchedGridCells.current.add(c));
        setMapMessage(null);
      } else {
        if (response.status === 429) {
          // Extra penalty for 429
          status.lastUsed = Date.now() + 5000; 
        }
        throw new Error(`API Error ${response.status}`);
      }
    } catch (err: any) {
      console.error(`Fetch error from ${endpoint}:`, err);
      status.failureCount++;
      // Put cells back in front of queue to retry
      cellQueue.current.unshift(...cellsToFetch);
      
      setTrashBins(prev => {
        if (prev.length === 0) {
          setMapMessage(`Connection issues. Retrying...`);
        }
        return prev;
      });
    } finally {
      cellsToFetch.forEach(c => activeGridCells.current.delete(c));
      mirrorsInProgress.current.delete(endpoint);
      setLoadingCount(prev => Math.max(0, prev - 1));
      activeRequests.current--;
      setTimeout(() => processQueue(), 50);
    }
  }, [map, getCellBounds]);

  const getIconForBin = (bin: TrashBin) => {
    const isRecycling = bin.tags.amenity === 'recycling' || 
                       Object.keys(bin.tags).some(key => key.startsWith('recycling') && bin.tags[key] === 'yes');
    return isRecycling ? recyclingTrashIcon : generalTrashIcon;
  };

  const createClusterIcon = (cluster: any) => {
    const markers = cluster.getAllChildMarkers();
    let recyclingCount = 0;
    const total = markers.length;

    markers.forEach((m: any) => {
      if (m.options.isRecycling) recyclingCount++;
    });

    const recyclingPercent = (recyclingCount / total) * 100;
    
    // Higher contrast colors: vibrant green and dark slate gray
    const recyclingColor = "#16a34a";
    const generalColor = "#374151";
    
    return divIcon({
      html: `
        <div style="
          position: relative; 
          width: 48px; 
          height: 48px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 50%;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          border: 2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 34px; height: 34px;">
            <defs>
              <linearGradient id="binFill-${cluster._leaflet_id}" x1="0" x2="0" y1="1" y2="0">
                <stop offset="${recyclingPercent}%" stop-color="${recyclingColor}" />
                <stop offset="${recyclingPercent}%" stop-color="${generalColor}" />
              </linearGradient>
            </defs>
            <path 
              d="M9 3v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5V3H9M6 6h12v13H6V6m3 2v9h2V8H9m4 0v9h2V8h-2Z" 
              fill="url(#binFill-${cluster._leaflet_id})"
              stroke="white"
              stroke-width="0.3"
            />
          </svg>
          <div style="
            position: absolute;
            bottom: -2px;
            right: -2px;
            background: #0f172a;
            color: white;
            border-radius: 12px;
            padding: 1.5px 7px;
            font-size: 11px;
            font-weight: 800;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            min-width: 20px;
            text-align: center;
            z-index: 10;
          ">
            ${total}
          </div>
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });
  };

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMapChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const zoom = map.getZoom();
      
      // Update render bounds whenever map changes
      setRenderBounds(map.getBounds());

      if (zoom < MIN_ZOOM_FOR_FETCH) {
        setMapMessage("Please zoom in to find trash bins.");
        return;
      }

      const currentBounds = map.getBounds();
      if (!currentBounds || !currentBounds.getNorth) return; // Safety check

      const visibleCells = getGridCells(currentBounds);
      
      const newCells = visibleCells.filter(c => 
        !fetchedGridCells.current.has(c) && 
        !activeGridCells.current.has(c) && 
        !cellQueue.current.includes(c)
      );

      if (newCells.length === 0) {
        if (activeRequests.current === 0) setMapMessage(null);
        return;
      }

      // Add new cells to queue
      cellQueue.current.push(...newCells);
      
      // Start processing queue (up to MAX_CONCURRENT_REQUESTS)
      for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
        processQueue();
      }
    }, 400); // 400ms debounce
  }, [map, processQueue, getGridCells]);

  useMapEvents({
    moveend: handleMapChange,
    zoomend: handleMapChange,
  });

  useEffect(() => {
    if (map) {
      handleMapChange();
      // Set initial render bounds
      setRenderBounds(map.getBounds());
    }
  }, [map, handleMapChange, center, zoom]);

  const visibleBins = useMemo(() => {
    if (!renderBounds) return trashBins;
    // Pad by 20% to prevent markers disappearing at edges
    const padded = renderBounds.pad(0.2);
    return trashBins.filter(bin => padded.contains([bin.lat, bin.lon]));
  }, [trashBins, renderBounds]);

  const isLoading = loadingCount > 0;
  const isZoomedOut = map.getZoom() < MIN_ZOOM_FOR_FETCH;

  return (
    <>
      {!isZoomedOut && (
        <MarkerClusterGroup 
          chunkedLoading 
          maxClusterRadius={60}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={19}
          iconCreateFunction={createClusterIcon}
        >
          {visibleBins.map((bin: TrashBin) => {
            const isRecycling = bin.tags.amenity === 'recycling' || 
                               Object.keys(bin.tags).some(key => key.startsWith('recycling') && bin.tags[key] === 'yes');
            return (
              <Marker 
                key={bin.id} 
                position={[bin.lat, bin.lon]} 
                icon={getIconForBin(bin)}
                {...({ isRecycling } as any)}
              >
                <Popup maxWidth={250} minWidth={150}>
                  <BinPopup bin={bin} />
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      )}
      
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
             <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
      )}

      {isZoomedOut && mapMessage && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] p-6 bg-white/90 backdrop-blur-md text-gray-900 text-center rounded-xl shadow-2xl border border-white/50 max-w-[280px] animate-in fade-in zoom-in duration-300">
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
          <p className="font-bold text-lg leading-tight text-green-900">{mapMessage}</p>
          <p className="text-xs text-gray-500 mt-2">Bins are only visible at neighborhood levels to keep the map fast.</p>
        </div>
      )}

      {!isZoomedOut && !isLoading && mapMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-fit px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-800 text-sm font-medium z-[1000] rounded-full shadow-md border border-white/20">
          {mapMessage}
        </div>
      )}
    </>
  );
}

// Simple module-level cache for addresses
const addressCache = new Map<string, string>();

// New component to handle the content and logic for a single bin's popup
const BinPopup = ({ bin }: { bin: TrashBin }) => {
    const cacheKey = `${bin.lat}:${bin.lon}`;
    const [address, setAddress] = useState<string | null>(addressCache.get(cacheKey) || null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (address) return; // Already cached

        const fetchAddress = async () => {
            setIsLoading(true);
            try {
                // Use addressdetails=1 to get specific fields
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${bin.lat}&lon=${bin.lon}&format=json&addressdetails=1`);
                if (!response.ok) throw new Error("Failed to fetch address");
                const data = await response.json();
                
                let displayStr = "";
                const addr = data.address;
                
                if (addr) {
                    // Try to build "House Number Street Name"
                    const street = addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path;
                    const houseNumber = addr.house_number;
                    
                    if (street) {
                        displayStr = houseNumber ? `${houseNumber} ${street}` : street;
                        
                        // Add City/Town if available for context
                        const city = addr.city || addr.town || addr.village || addr.suburb;
                        if (city) displayStr += `, ${city}`;
                    } else {
                        // Fallback to full display name if road is missing
                        displayStr = data.display_name;
                    }
                } else {
                    displayStr = data.display_name || "Address not found";
                }

                setAddress(displayStr);
                addressCache.set(cacheKey, displayStr);
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                setAddress("Could not load address.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAddress();
    }, [bin.lat, bin.lon, cacheKey, address]);

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
              <a 
                href={`https://www.openstreetmap.org/edit?node=${bin.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9px] text-green-600 hover:underline mt-2 block font-medium"
              >
                Missing something? Edit on OpenStreetMap
              </a>
            </div>
        </div>
    );
};

const TrashMap = ({ center, userLocation, searchedLocation, zoom }: MapProps) => {
  const gpsIcon = divIcon({
    className: 'gps-marker',
    html: '<div class="pulse"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

  const searchIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
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
        preferCanvas={true} // Use canvas rendering for better performance
        maxZoom={20}
        minZoom={3}
        >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CartoDB</a>'
        maxZoom={20}
        minZoom={3}
      />
      <MapUpdater center={center} zoom={zoom} />
      <TrashBinFetcher center={center} zoom={zoom} />
      {userLocation && (
        <Marker position={userLocation} icon={gpsIcon} />
      )}
      {searchedLocation && (
        <Marker position={searchedLocation} icon={searchIcon} />
      )}
      <ZoomControl position="topright" /> {/* Add ZoomControl to top-right */}
    </MapContainer>
  );
};

export { TrashMap as Map };
