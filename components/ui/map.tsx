import React from 'react';
import { OSM } from 'ol/source';
import { Map, View, TileLayer } from 'react-openlayers';
import 'react-openlayers/dist/index.css'; // for css

const MapComponent = ({ }) => {

  return (
    <Map controls={[]} interactions={[]}>
      <TileLayer source={new OSM()} />
      <View center={[-10997148, 4569099]} zoom={4}/>
    </Map>
  );
};

export { MapComponent as Map };