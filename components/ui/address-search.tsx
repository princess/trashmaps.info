"use client"

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AddressSearchProps {
  onSelectLocation: (lat: number, lon: number, displayName: string) => void;
  currentCenter?: [number, number];
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    cycleway?: string;
    path?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

const AddressSearch = ({ onSelectLocation, currentCenter }: AddressSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=6&addressdetails=1`;
      
      // Add spatial biasing if we have a current center
      if (currentCenter) {
        const [lat, lon] = currentCenter;
        // Create a viewbox around the current center (roughly 1 degree)
        const viewbox = `${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`;
        url += `&viewbox=${viewbox}&bounded=0`;
      }

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });
      
      if (!response.ok) throw new Error(`Search failed`);
      
      const data: NominatimResult[] = await response.json();
      setResults(data);
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to load results");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [currentCenter]);

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
    setQuery(result.display_name);
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

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  const parseDisplayName = (result: NominatimResult) => {
    const addr = result.address;
    if (!addr) {
        const parts = result.display_name.split(',').map(p => p.trim());
        return { title: parts[0], subtitle: parts.slice(1).join(', ') };
    }

    // Prioritize Street Address: "HouseNumber Road"
    const street = addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path;
    const houseNumber = addr.house_number;
    
    if (street) {
        const title = houseNumber ? `${houseNumber} ${street}` : street;
        
        // Build subtitle: [Neighborhood/Suburb], City, Country
        const secondary = [
            addr.neighbourhood || addr.suburb,
            addr.city || addr.town || addr.village,
            addr.country
        ].filter(Boolean).join(', ');

        return { title, subtitle: secondary };
    }

    // Fallback if no road is found (e.g. searching for a city or neighborhood directly)
    const parts = result.display_name.split(',').map(p => p.trim());
    return {
        title: parts[0],
        subtitle: parts.slice(1).join(', ')
    };
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
                onClick={clearSearch}
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
              {results.map((result, index) => {
                const { title, subtitle } = parseDisplayName(result);
                return (
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
                          {title}
                      </span>
                      {subtitle && (
                        <span className="text-[11px] text-gray-500 line-clamp-1 italic">
                            {subtitle}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressSearch;
