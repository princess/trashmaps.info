"use client"

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddressSearchProps {
  onSelectLocation: (lat: number, lon: number, displayName: string) => void;
  currentCenter?: [number, number];
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  title: string;
  subtitle: string;
}

const AddressSearch = ({ onSelectLocation, currentCenter }: AddressSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [cityContext, setCityContext] = useState("");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestCenterRef = useRef(currentCenter);

  useEffect(() => {
    latestCenterRef.current = currentCenter;
    if (!currentCenter) return;
    
    const getContext = async () => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${currentCenter[0]}&lon=${currentCenter[1]}&format=json`);
            if (res.ok) {
                const data = await res.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "";
                setCityContext(city);
            }
        } catch (e) {}
    };
    getContext();
  }, [currentCenter?.[0], currentCenter?.[1]]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setError(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeCenter = latestCenterRef.current;
      
      const fetchPhoton = async (q: string, bias: boolean) => {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15`;
        if (bias && activeCenter) {
            url += `&lat=${activeCenter[0]}&lon=${activeCenter[1]}&location_bias_scale=0.9`;
        }
        const res = await fetch(url);
        return res.ok ? await res.json() : { features: [] };
      };

      // Force local priority by appending city name to POI searches
      const finalQuery = cityContext && !searchQuery.includes(' ') ? `${searchQuery} ${cityContext}` : searchQuery;
      const data = await fetchPhoton(finalQuery, true);
      
      const mappedResults: NominatimResult[] = data.features.map((f: any) => {
        const p = f.properties;
        const coords = f.geometry.coordinates;
        
        const title = p.name || (p.housenumber ? `${p.housenumber} ${p.street}` : p.street) || p.city || p.country;
        const subtitleParts = [];
        
        if (p.osm_value && p.osm_value !== 'yes' && p.osm_value !== title.toLowerCase()) {
            subtitleParts.push(p.osm_value.charAt(0).toUpperCase() + p.osm_value.slice(1).replace(/_/g, ' '));
        }

        const streetAddr = p.housenumber ? `${p.housenumber} ${p.street}` : p.street;
        if (streetAddr && streetAddr !== title) subtitleParts.push(streetAddr);
        if (p.city && p.city !== title) subtitleParts.push(p.city);
        if (p.state) subtitleParts.push(p.state);
        if (p.country && p.country !== title) subtitleParts.push(p.country);

        return {
          lat: coords[1].toString(),
          lon: coords[0].toString(),
          display_name: title + ", " + subtitleParts.join(', '),
          class: p.osm_key,
          type: p.osm_value,
          title: title,
          subtitle: subtitleParts.filter(Boolean).join(', ')
        };
      });

      // STRICT distance sort within 5km
      if (activeCenter) {
        const [cLat, cLon] = activeCenter;
        mappedResults.sort((a, b) => {
            const aDist = Math.sqrt(Math.pow(parseFloat(a.lat) - cLat, 2) + Math.pow(parseFloat(a.lon) - cLon, 2));
            const bDist = Math.sqrt(Math.pow(parseFloat(b.lat) - cLat, 2) + Math.pow(parseFloat(b.lon) - cLon, 2));
            
            // If one is within ~2km (0.02 deg) and the other isn't, prioritize it heavily
            if (aDist < 0.02 && bDist >= 0.02) return -1;
            if (bDist < 0.02 && aDist >= 0.02) return 1;

            return aDist - bDist;
        });
      }

      setResults(mappedResults.slice(0, 10));
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [cityContext]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!newQuery.trim()) {
        setResults([]);
        setIsOpen(false);
        return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newQuery);
    }, 400);
  };

  const handleSelectResult = (result: NominatimResult) => {
    onSelectLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    setResults([]);
    setIsOpen(false);
    setQuery(result.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0) {
        handleSelectResult(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full sm:w-72" ref={containerRef}>
      <div className="relative group">
        <Search className={cn(
            "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors",
            loading ? "text-green-500 animate-pulse" : "text-gray-400 group-focus-within:text-green-600"
        )} />
        <Input
          type="text"
          placeholder="Search for a place..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-10 pr-10 w-full bg-white/95 backdrop-blur-sm border-gray-200 focus:border-green-500 focus:ring-green-500/20 rounded-full shadow-sm transition-all"
        />
        {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 text-green-600 animate-spin" />
            </div>
        )}
        {!loading && query && (
            <button 
                onClick={() => {
                    setQuery('');
                    setResults([]);
                    setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        )}
      </div>

      {isOpen && (results.length > 0 || error) && (
        <div className="absolute z-[2000] w-full bg-white/98 backdrop-blur-md shadow-2xl rounded-2xl mt-2 py-2 border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {error ? (
            <div className="px-4 py-3 text-sm text-red-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto custom-scrollbar">
              {results.map((result, index) => (
                <li
                  key={`${result.lat}-${result.lon}-${index}`}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors flex items-start gap-3 border-l-4",
                    selectedIndex === index 
                        ? "bg-green-50 border-green-500 text-green-900" 
                        : "hover:bg-gray-50 border-transparent text-gray-700"
                  )}
                  onClick={() => handleSelectResult(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <MapPin className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      selectedIndex === index ? "text-green-600" : "text-gray-400"
                  )} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium line-clamp-2 leading-snug">
                        {result.title}
                    </span>
                    {result.subtitle && (
                      <span className="text-[11px] text-gray-500 line-clamp-1 italic">
                          {result.subtitle}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
