import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite does not resolve Leaflet's default marker image paths, so set them here.
const restaurantIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Re-centres the map whenever the user's location or the radius changes.
const FitToRadius = ({ center, radiusKm }) => {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLng(center).toBounds(radiusKm * 2000); // metres, side length
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, center, radiusKm]);

  return null;
};

const RestaurantMap = ({ userLocation, radiusKm, restaurants }) => {
  const center = useMemo(
    () => [userLocation.lat, userLocation.lng],
    [userLocation.lat, userLocation.lng],
  );

  // location.coordinates is stored as [longitude, latitude]
  const markers = useMemo(
    () =>
      restaurants.filter((r) => {
        const c = r.location?.coordinates;
        return Array.isArray(c) && c.length === 2 && c.every(Number.isFinite);
      }),
    [restaurants],
  );

  return (
    <div className="restaurant-map-wrap">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        className="restaurant-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToRadius center={center} radiusKm={radiusKm} />

        {/* search radius */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#056a3a", weight: 1, fillOpacity: 0.05 }}
        />

        {/* user location */}
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>

        {markers.map((r) => {
          const [lng, lat] = r.location.coordinates;
          return (
            <Marker key={r._id} position={[lat, lng]} icon={restaurantIcon}>
              <Popup>
                <strong>{r.name}</strong>
                <br />
                {r.address}
                {r.distanceKm !== undefined && (
                  <>
                    <br />
                    📍 {r.distanceKm} km away
                  </>
                )}
                <br />
                <Link to={`/eats/stores/${r._id}/menus`}>View menu</Link>
                {" · "}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Directions
                </a>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default RestaurantMap;
