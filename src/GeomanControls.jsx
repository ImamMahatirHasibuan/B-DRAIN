import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

function GeomanControls() {
  const map = useMap();

  useEffect(() => {
    // Add Geoman controls to the map
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: true,
      drawRectangle: true,
      drawPolygon: true,
      drawCircle: true,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    // Configure measurement options
    map.pm.setGlobalOptions({
      measurements: { 
        measurement: true,
        displayFormat: 'metric'
      },
      templineStyle: {
        color: '#3b82f6',
      },
      hintlineStyle: {
        color: '#3b82f6',
        dashArray: [5, 5],
      },
    });

    // Event listeners for measuring
    map.on('pm:create', (e) => {
      const layer = e.layer;
      
      // Add measurement info to shapes
      if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        const areaInHectares = (area / 10000).toFixed(2);
        const areaInSqMeters = area.toFixed(2);
        
        layer.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">📏 Pengukuran Luas</h4>
            <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <strong style="color: #0c4a6e;">${areaInSqMeters} m²</strong><br>
              <span style="font-size: 0.9em; color: #475569;">${areaInHectares} hektar</span>
            </div>
            <p style="margin: 0; font-size: 0.85em; color: #64748b;">Klik kanan untuk edit/hapus</p>
          </div>
        `).openPopup();
      } else if (layer instanceof L.Circle) {
        const radius = layer.getRadius();
        const area = Math.PI * radius * radius;
        const areaInHectares = (area / 10000).toFixed(2);
        
        layer.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">📏 Pengukuran Radius</h4>
            <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <strong style="color: #0c4a6e;">Radius: ${radius.toFixed(2)} m</strong><br>
              <span style="font-size: 0.9em; color: #475569;">Area: ${area.toFixed(2)} m² (${areaInHectares} ha)</span>
            </div>
            <p style="margin: 0; font-size: 0.85em; color: #64748b;">Klik kanan untuk edit/hapus</p>
          </div>
        `).openPopup();
      } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        const latlngs = layer.getLatLngs();
        let totalDistance = 0;
        
        for (let i = 0; i < latlngs.length - 1; i++) {
          totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
        }
        
        const distanceInKm = (totalDistance / 1000).toFixed(2);
        
        layer.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">📏 Pengukuran Jarak</h4>
            <div style="background: #f1f5f9; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
              <strong style="color: #0c4a6e;">${totalDistance.toFixed(2)} m</strong><br>
              <span style="font-size: 0.9em; color: #475569;">${distanceInKm} km</span>
            </div>
            <p style="margin: 0; font-size: 0.85em; color: #64748b;">Klik kanan untuk edit/hapus</p>
          </div>
        `).openPopup();
      }
    });

    // Cleanup on unmount
    return () => {
      map.pm.removeControls();
      map.off('pm:create');
    };
  }, [map]);

  return null;
}

export default GeomanControls;
