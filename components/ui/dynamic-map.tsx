"use client";

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { LatLngExpression } from 'leaflet';

interface MapProps {
  center: LatLngExpression;
  userLocation: LatLngExpression | null;
  zoom: number;
}

const DynamicMap = (props: MapProps) => {
  const Map = useMemo(() => dynamic(() => import('@/components/ui/map').then(mod => mod.Map), {
    loading: () => <p>Loading map...</p>,
    ssr: false,
  }), []);

  return <Map {...props} />;
}

export { DynamicMap as Map };
