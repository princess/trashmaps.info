"use client"

import { useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddressSearchProps {
  onSelectLocation: (lat: number, lon: number, displayName: string) => void;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

const AddressSearch = ({ onSelectLocation }: AddressSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: NominatimResult[] = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Error fetching geocoding data:", err);
      setError("Failed to fetch search results. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(newQuery);
    }, 500); // Debounce search to reduce API calls
  };

  const handleSelectResult = (result: NominatimResult) => {
    onSelectLocation(parseFloat(result.lat), parseFloat(result.lon), result.display_name);
    setResults([]); // Clear results after selection
    setQuery(result.display_name); // Set input to the selected location's display name
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search location..."
          value={query}
          onChange={handleChange}
          className="pl-10 w-64"
          disabled={loading}
        />
      </div>

      {loading && <div className="absolute z-10 w-full bg-white shadow-lg rounded-md mt-1 p-2">Loading...</div>}
      {error && <div className="absolute z-10 w-full bg-red-100 text-red-700 shadow-lg rounded-md mt-1 p-2">{error}</div>}

      {results.length > 0 && (
        <ul className="absolute z-10 w-full bg-white shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.lat + result.lon + result.display_name}
              className="p-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
              onClick={() => handleSelectResult(result)}
            >
              {result.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressSearch;
