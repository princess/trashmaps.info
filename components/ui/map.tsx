"use client";

import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { MapContainer, TileLayer, useMap, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
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
const MapUpdater = ({ center, zoom }: Pick<MapProps, 'center' | 'zoom'>) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// This new component contains the logic for fetching and displaying trash bins
const TrashBinFetcher = () => {
  const [trashBins, setTrashBins] = useState<TrashBin[]>([]);
  const [loadingCount, setLoadingCount] = useState(0);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  
  // Grid-based cache state
  const fetchedGridCells = useRef<Set<string>>(new Set());
  const activeGridCells = useRef<Set<string>>(new Set());
  const cellQueue = useRef<string[]>([]);
  const activeRequests = useRef<number>(0);

  const map = useMap();

  const MIN_ZOOM_FOR_FETCH = 10;
  const REQUEST_TIMEOUT = 60000; // 60 seconds
  const GRID_SIZE_LOW_ZOOM = 0.04; // Small enough to be fast, large enough to cover ground
  const GRID_SIZE_HIGH_ZOOM = 0.01; // Small grid for high detail areas
  const MAX_CONCURRENT_REQUESTS = 3;
  const API_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
    'https://overpass.be/api/interpreter',
  ];

  const getGridCells = (bounds: LatLngBounds) => {
    const zoom = map.getZoom();
    const dynamicGridSize = zoom < 14 ? GRID_SIZE_LOW_ZOOM : GRID_SIZE_HIGH_ZOOM;
    
    const minLat = Math.floor(bounds.getSouth() / dynamicGridSize);
    const maxLat = Math.floor(bounds.getNorth() / dynamicGridSize);
    const minLon = Math.floor(bounds.getWest() / dynamicGridSize);
    const maxLon = Math.floor(bounds.getEast() / dynamicGridSize);
    
    const cells: string[] = [];
    for (let lat = minLat; lat <= maxLat; lat++) {
      for (let lon = minLon; lon <= maxLon; lon++) {
        cells.push(`${lat}:${lon}`);
      }
    }
    return cells;
  };

  const getCellBounds = (cellKey: string) => {
    const zoom = map.getZoom();
    const dynamicGridSize = zoom < 14 ? GRID_SIZE_LOW_ZOOM : GRID_SIZE_HIGH_ZOOM;
    const [latIdx, lonIdx] = cellKey.split(':').map(Number);
    return {
      s: latIdx * dynamicGridSize,
      w: lonIdx * dynamicGridSize,
      n: (latIdx + 1) * dynamicGridSize,
      e: (lonIdx + 1) * dynamicGridSize,
    };
  };

  const processQueue = useCallback(async () => {
    if (activeRequests.current >= MAX_CONCURRENT_REQUESTS || cellQueue.current.length === 0) {
      return;
    }

    const cellToFetch = cellQueue.current.shift();
    if (!cellToFetch) return;

    const zoom = map.getZoom();
    activeGridCells.current.add(cellToFetch);
    setLoadingCount(prev => prev + 1);
    activeRequests.current++;

    const cellBounds = getCellBounds(cellToFetch);
    const { s, w, n, e } = cellBounds;

    const isLowZoom = zoom < 14;
    const overpassQuery = isLowZoom ? `
      [out:json][timeout:60][maxsize:1000000];
      (
        node["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});
        node["bin"="yes"](${s},${w},${n},${e});
      );
      out qt center 1500;
    ` : `
      [out:json][timeout:60][maxsize:2000000];
      (
        node["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});
        node["bin"="yes"](${s},${w},${n},${e});
        way["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});
        way["bin"="yes"](${s},${w},${n},${e});
        relation["amenity"~"waste_basket|recycling|waste_disposal"](${s},${w},${n},${e});
      );
      out qt center;
    `;

    let success = false;
    let lastError: any = null;
    const shuffledEndpoints = [...API_ENDPOINTS].sort(() => Math.random() - 0.5);

    try {
      for (const endpoint of shuffledEndpoints) {
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
            const data = await response.json();
            const newBins = data.elements.map((element: any) => ({
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

            fetchedGridCells.current.add(cellToFetch);
            activeGridCells.current.delete(cellToFetch);
            success = true;
            break; 
          }
          
          if (response.status === 429 || response.status === 504) {
            lastError = new Error(`API Busy/Timeout (${response.status})`);
            continue; 
          }
          throw new Error(`API Error ${response.status}`);
        } catch (err: any) {
          lastError = err;
          if (err.name === 'AbortError') lastError = new Error('Client Timeout');
        }
      }

      if (!success) throw lastError;
      setMapMessage(null);

    } catch (err: any) {
      console.error("Fetch cell error:", err, "Cell:", cellToFetch);
      activeGridCells.current.delete(cellToFetch);
      if (trashBins.length === 0) {
        setMapMessage(`Connection issues. Try zooming in or moving the map.`);
      }
    } finally {
      setLoadingCount(prev => Math.max(0, prev - 1));
      activeRequests.current--;
      // Process next in queue
      processQueue();
    }
  }, [map, trashBins.length]); // Dependencies for useCallback

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

  const handleMapChange = useCallback(async () => {
    const zoom = map.getZoom();
    if (zoom < MIN_ZOOM_FOR_FETCH) {
      setMapMessage("Please zoom in to find trash bins.");
      return;
    }

    const currentBounds = map.getBounds();
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
  }, [map, processQueue]);

  useMapEvents({
    moveend: handleMapChange,
    zoomend: handleMapChange,
  });

  useEffect(() => {
    if (map) {
      handleMapChange();
    }
  }, [map, handleMapChange]);

  const isLoading = loadingCount > 0;

  return (
    <>
      <MarkerClusterGroup 
        chunkedLoading 
        maxClusterRadius={60}
        spiderfyOnMaxZoom={true}
        showCoverageOnHover={false}
        disableClusteringAtZoom={19}
        iconCreateFunction={createClusterIcon}
      >
        {trashBins.map((bin) => {
          const isRecycling = bin.tags.amenity === 'recycling' || 
                             Object.keys(bin.tags).some(key => key.startsWith('recycling') && bin.tags[key] === 'yes');
          return (
            <Marker 
              key={bin.id} 
              position={[bin.lat, bin.lon]} 
              icon={getIconForBin(bin)}
              // Pass recycling status as a custom option for the cluster icon function
              {...({ isRecycling } as any)}
            >
              <Popup maxWidth={250} minWidth={150}>
                <BinPopup bin={bin} />
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
             <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
        </div>
      )}
      {!isLoading && mapMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-fit p-2 bg-white/80 backdrop-blur-sm text-gray-800 text-center z-[1000] rounded-md shadow-lg">
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
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${bin.lat}&lon=${bin.lon}&format=json`);
                if (!response.ok) throw new Error("Failed to fetch address");
                const data = await response.json();
                const displayName = data.display_name || "Address not found";
                setAddress(displayName);
                addressCache.set(cacheKey, displayName);
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
        preferCanvas={true} // Use canvas rendering for better performance
        maxZoom={20}
        >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CartoDB</a>'
        maxZoom={20}
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
