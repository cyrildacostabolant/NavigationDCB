/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Map as MapIcon, Loader2 } from 'lucide-react';

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialisation de la carte centree sur la France
    const map = L.map(mapRef.current, {
      zoomControl: false 
    }).setView([46.2276, 2.2137], 6);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Couche OpenStreetMap (Standard)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Couche OpenTopoMap (Relief & Courbes de niveau)
    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: 'Map data: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: © <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });

    // On ajoute OSM par défaut
    osmLayer.addTo(map);

    const baseMaps = {
      "OpenStreetMap (Standard)": osmLayer,
      "OpenTopoMap (Relief)": topoLayer
    };

    // Controle des Couches
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

    // Corriger le problème des icônes de marqueurs avec Vite/React
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsSearching(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
      const data = await resp.json();
      setSearchResults(data);

      if (data && data.length > 0) {
        // Naviguer au premier résultat directement
        handleSelectResult(data[0]);
      }
    } catch (error) {
      console.error('Erreur Nominatim:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    if (!mapInstanceRef.current) return;

    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    mapInstanceRef.current.setView([lat, lon], 13);

    if (markerRef.current) {
      markerRef.current.remove();
    }

    markerRef.current = L.marker([lat, lon]).addTo(mapInstanceRef.current);
    if (result.display_name) {
      markerRef.current.bindPopup(result.display_name).openPopup();
    }
    
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#f8fafc] font-sans overflow-hidden text-[#334155]">
      {/* Header */}
      <header className="bg-[#2d5a27] text-white px-6 py-3 flex justify-between items-center shadow-md z-[1001] relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">V</div>
          <h1 className="font-bold tracking-tight text-xl">VibeTrail <span className="font-light opacity-80">Explorer Pro</span></h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <span className="bg-white/10 px-3 py-1 rounded-full">45.8327° N, 6.8651° E</span>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">Settings</button>
            <button className="bg-white text-[#2d5a27] px-4 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer hover:bg-slate-100 transition-colors">Get Premium</button>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden bg-[#e5e7eb]">
        {/* Conteneur Leaflet */}
        <div ref={mapRef} className="absolute inset-0 z-0 outline-none" />

        {/* Floating Search Bar (Top Left) */}
        <div className="absolute top-6 left-6 w-80 z-[1000] space-y-4 pointer-events-none">
          <form onSubmit={handleSearch} className="bg-white shadow-xl rounded-2xl p-2 flex items-center border border-slate-200 pointer-events-auto">
            <button type="submit" className="p-2 text-slate-400 hover:text-[#2d5a27] transition-colors cursor-pointer">
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
            <input
              type="text"
              placeholder="Search trails or locations..."
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-2 ml-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200 pointer-events-auto">
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Search Results</h3>
                <div className="space-y-1">
                  {searchResults.map((res, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600 text-sm flex flex-col transition-colors cursor-pointer"
                      onClick={() => handleSelectResult(res)}
                    >
                      <span className="font-semibold text-slate-800 block truncate w-full">{res.display_name.split(',')[0]}</span>
                      <span className="text-slate-500 text-xs truncate block mt-0.5 w-full">{res.display_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}


        </div>

        {/* Export Buttons Container */}
        <div className="absolute bottom-[20px] right-[20px] z-[1000] flex gap-3 pointer-events-none">
          <button className="pointer-events-auto flex items-center gap-2 bg-[#334155] text-white px-5 py-3 rounded-2xl shadow-2xl hover:bg-slate-700 transition-all active:scale-95 cursor-pointer">
            <span role="img" aria-label="ruler">📏</span> <span className="font-bold text-sm">Adjust A4 Frame</span>
          </button>
          <button className="pointer-events-auto flex items-center gap-2 bg-[#2d5a27] text-white px-6 py-3 rounded-2xl shadow-2xl hover:bg-[#254a20] transition-all active:scale-95 cursor-pointer">
            <span role="img" aria-label="inbox">📥</span> <span className="font-bold text-sm">Export High-Res JPG</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center text-[11px] text-slate-500 font-medium z-[1001] relative">
        <div className="flex gap-4">
          <span>© OpenStreetMap contributors</span>
          <span>Scale 1:25,000</span>
        </div>
        <div className="flex gap-4">
          <span>WGS84</span>
          <span className="text-[#2d5a27] font-bold">System Status: Optimal</span>
        </div>
      </footer>
    </div>
  );
}
