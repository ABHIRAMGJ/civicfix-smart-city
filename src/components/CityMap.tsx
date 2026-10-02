import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { CivicIssue, FieldWorker } from '../types.ts';

interface CityMapProps {
  issues: CivicIssue[];
  workers?: FieldWorker[];
  onSelectIssue?: (issue: CivicIssue) => void;
  pickerMode?: boolean;
  selectedLat?: number;
  selectedLng?: number;
  onPickLocation?: (lat: number, lng: number) => void;
  heightClass?: string;
  showHeatmapToggle?: boolean;
  defaultHeatmap?: boolean;
  selectedIssueId?: number;
}

const TADIPATRI_LANDMARKS = [
  {
    name: 'Bugga Ramalingeswara Swamy Temple (Ward 4)',
    lat: 14.9132,
    lng: 78.0078,
  },
  {
    name: 'Chintala Venkataramana Swamy Temple (Ward 8)',
    lat: 14.9085,
    lng: 78.0110,
  },
  {
    name: 'Tadipatri Clock Tower & Yellanur Road (Ward 12)',
    lat: 14.9068,
    lng: 78.0084,
  },
  {
    name: 'APSRTC Bus Stand & NH-67 Bypass (Ward 15)',
    lat: 14.9042,
    lng: 78.0145,
  },
  {
    name: 'Tadipatri Railway Station Junction (Ward 19)',
    lat: 14.9154,
    lng: 78.0162,
  },
];

export const CityMap: React.FC<CityMapProps> = ({
  issues,
  workers = [],
  onSelectIssue,
  pickerMode = false,
  selectedLat = 14.9091,
  selectedLng = 78.0092,
  onPickLocation,
  heightClass = 'h-[420px]',
  showHeatmapToggle = true,
  defaultHeatmap = false,
  selectedIssueId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap' | 'workers'>(
    defaultHeatmap ? 'heatmap' : 'markers'
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = pickerMode
      ? [selectedLat, selectedLng]
      : [14.9091, 78.0092];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: pickerMode ? 15 : 14,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; OpenStreetMap contributors · Tadipatri Municipality GIS',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    if (pickerMode && onPickLocation) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onPickLocation(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // Draw Tadipatri Municipal Corporation Service Boundary polygon
    const tadipatriBoundary: [number, number][] = [
      [14.932, 77.985],
      [14.932, 78.035],
      [14.888, 78.035],
      [14.888, 77.985],
    ];
    L.polygon(tadipatriBoundary, {
      color: '#0284C7',
      weight: 1.5,
      dashArray: '6, 6',
      fillColor: '#0284C7',
      fillOpacity: 0.03,
    }).addTo(group);

    // Subtle reference markers for Tadipatri Municipal Wards
    for (const lm of TADIPATRI_LANDMARKS) {
      const refMarker = L.circleMarker([lm.lat, lm.lng], {
        radius: 4,
        color: '#64748B',
        weight: 1,
        fillColor: '#94A3B8',
        fillOpacity: 0.6,
      }).addTo(group);
      refMarker.bindTooltip(lm.name, { direction: 'bottom', offset: [0, 4] });
    }

    if (pickerMode) {
      const pinMarker = L.circleMarker([selectedLat, selectedLng], {
        radius: 10,
        color: '#0F172A',
        weight: 3,
        fillColor: '#0284C7',
        fillOpacity: 0.95,
      }).addTo(group);
      pinMarker.bindTooltip(
        `Selected Tadipatri GPS: ${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`,
        { permanent: true, direction: 'top', offset: [0, -10] }
      );
      map.setView([selectedLat, selectedLng], map.getZoom());
    }

    // Live Field Worker GPS Tracking & Route Lines
    if (viewMode === 'workers' && !pickerMode) {
      for (const w of workers) {
        const wLat = w.currentLat && w.currentLat < 20 ? w.currentLat : 14.9091;
        const wLng = w.currentLng && w.currentLng > 70 ? w.currentLng : 78.0092;
        const workerMarker = L.circleMarker([wLat, wLng], {
          radius: 7,
          color: '#0F172A',
          weight: 2,
          fillColor: '#7C3AED',
          fillOpacity: 0.95,
        }).addTo(group);
        workerMarker.bindTooltip(
          `<div class="text-xs font-medium">Field Crew: ${w.name}<br/><span class="text-slate-600">${w.roleTitle} (${w.phone})</span></div>`,
          { direction: 'top', offset: [0, -6] }
        );
      }
    }

    const priorityColors: Record<string, string> = {
      Critical: '#DC2626',
      High: '#D97706',
      Medium: '#0284C7',
      Low: '#475569',
    };

    for (const issue of issues) {
      if (!issue.latitude || !issue.longitude) continue;
      const color =
        issue.status === 'Resolved' || issue.status === 'Closed'
          ? '#16A34A'
          : priorityColors[issue.priority] || '#0284C7';

      if (viewMode === 'heatmap' && !pickerMode) {
        const radiusMeters =
          issue.priority === 'Critical'
            ? 450
            : issue.priority === 'High'
              ? 320
              : 220;
        L.circle([issue.latitude, issue.longitude], {
          radius: radiusMeters,
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.3,
        }).addTo(group);
      }

      // Draw shortest route from Tadipatri Municipal Office (14.9091, 78.0092) or assigned worker when in workers mode
      if (viewMode === 'workers' && !pickerMode) {
        L.polyline(
          [
            [14.9091, 78.0092],
            [issue.latitude, issue.longitude],
          ],
          {
            color: '#7C3AED',
            weight: 2,
            dashArray: '4, 4',
          }
        ).addTo(group);
      }

      const marker = L.circleMarker([issue.latitude, issue.longitude], {
        radius: issue.priority === 'Critical' ? 9 : 8,
        color: '#FFFFFF',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95,
      }).addTo(group);

      marker.bindTooltip(
        `<div class="text-xs font-medium">${issue.complaintId} · ${issue.category} (${issue.priority})<br/><span class="text-slate-600">${issue.title}</span><br/><span class="text-emerald-700">${issue.departmentName || ''}</span></div>`,
        { direction: 'top', offset: [0, -6] }
      );

      if (onSelectIssue && !pickerMode) {
        marker.on('click', () => {
          onSelectIssue(issue);
        });
      }
    }
  }, [
    issues,
    workers,
    viewMode,
    pickerMode,
    selectedLat,
    selectedLng,
    onSelectIssue,
  ]);

  return (
    <div className="relative w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-100">
      {showHeatmapToggle && !pickerMode && (
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 p-1 bg-white/95 backdrop-blur border border-slate-200 rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('markers')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'markers'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Accepted Pins ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'heatmap'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ward Density Hotspots
          </button>
          <button
            type="button"
            onClick={() => setViewMode('workers')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'workers'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Field Crew GPS & Routes
          </button>
        </div>
      )}

      <div ref={containerRef} className={`w-full ${heightClass}`} />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] inline-block" />
            <span>Critical Priority</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] inline-block" />
            <span>High Priority</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] inline-block" />
            <span>Medium / Standard</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] inline-block" />
            <span>Resolved / Closed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED] inline-block" />
            <span>Field Supervisor GPS</span>
          </span>
        </div>
        <span className="font-mono tabular-nums text-slate-500">
          {pickerMode
            ? 'Click anywhere in Tadipatri map to pin exact GPS coordinates'
            : issues.length === 0
              ? 'Tadipatri, Anantapur, AP (14.9091° N, 78.0092° E) — 0 active problems currently'
              : `${issues.length} Admin-accepted civic issue(s) in Tadipatri Municipality`}
        </span>
      </div>
    </div>
  );
};
