import React, { useState, useEffect, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Activity,
  Server,
  Sliders,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import { SpiDisplayScreen, CloudPiTelemetry, ConnectedUserSession } from './components/SpiDisplayScreen';
import { RpiDeployPanel } from './components/RpiDeployModal';

const REFERENCE_PRESET: CloudPiTelemetry = {
  title: 'CLOUD PI',
  subtitle: 'Nextcloud',
  online: true,
  cpuPercent: 18,
  tempCelsius: 46,
  ramUsedGb: 1.2,
  ramTotalGb: 3.8,
  storageUsedGb: 612,
  storageTotalGb: 931,
  users: [
    {
      id: 'u1',
      name: 'Asha',
      userIconType: 'person',
      activityLabel: 'Web',
      activityIconType: 'web',
      time: '10:42',
    },
    {
      id: 'u2',
      name: 'Phone',
      userIconType: 'phone',
      activityLabel: 'Sync',
      activityIconType: 'sync',
      time: '10:39',
    },
  ],
  lanIp: '192.168.1.42',
  tailscaleStatus: 'OK',
};

type DataMode = 'reference' | 'simulated' | 'live_host';
type FrameStyle = 'spi_bezel' | 'pixel_480x320' | 'compare_ref';

export default function App() {
  const [telemetry, setTelemetry] = useState<CloudPiTelemetry>(REFERENCE_PRESET);
  const [dataMode, setDataMode] = useState<DataMode>('reference');
  const [frameStyle, setFrameStyle] = useState<FrameStyle>('spi_bezel');
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [hostPlatformInfo, setHostPlatformInfo] = useState<string>('Linux Container');

  // Check URL for ?kiosk=1 so RPi4 Chromium boots straight into fullscreen display
  const [isKioskMode, setIsKioskMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('kiosk') === '1' || params.get('kiosk') === 'true';
    }
    return false;
  });

  // Handle Escape key to exit Kiosk mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isKioskMode) {
        setIsKioskMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isKioskMode]);

  // Mode 2: Realistic Nextcloud RPi4 Workload Simulation
  useEffect(() => {
    if (dataMode !== 'simulated') return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setTelemetry((prev) => {
        const cpuDelta = Math.floor(Math.random() * 11) - 5;
        const nextCpu = Math.max(8, Math.min(92, prev.cpuPercent + cpuDelta));
        const targetTemp = 43 + Math.round(nextCpu * 0.22);
        const nextTemp =
          prev.tempCelsius < targetTemp
            ? prev.tempCelsius + 1
            : prev.tempCelsius > targetTemp
            ? prev.tempCelsius - 1
            : prev.tempCelsius;
        const ramDelta = (Math.random() - 0.48) * 0.1;
        const nextRam = Number(Math.max(0.8, Math.min(prev.ramTotalGb - 0.2, prev.ramUsedGb + ramDelta)).toFixed(1));

        return {
          ...prev,
          cpuPercent: nextCpu,
          tempCelsius: nextTemp,
          ramUsedGb: nextRam,
          users: prev.users.map((u, idx) => (idx === 0 ? { ...u, time: timeStr } : u)),
        };
      });
    }, 1600);

    return () => clearInterval(interval);
  }, [dataMode]);

  // Mode 3: Poll Real Backend Python 3 Script (python/cloudpi_spi_display.py --json)
  const fetchLiveHostTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/python-telemetry');
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.data) return;
      const d = json.data;
      setHostPlatformInfo(`Python ${d.pythonVersion || '3.10'} · ${json.execTimeMs}ms`);
      setTelemetry((prev) => ({
        ...prev,
        cpuPercent: d.cpuPercent ?? prev.cpuPercent,
        tempCelsius: d.tempCelsius ?? prev.tempCelsius,
        ramUsedGb: d.ramUsedGb ?? prev.ramUsedGb,
        ramTotalGb: d.ramTotalGb ?? prev.ramTotalGb,
        storageUsedGb: d.storageUsedGb ?? prev.storageUsedGb,
        storageTotalGb: d.storageTotalGb ?? prev.storageTotalGb,
        lanIp: d.lanIp ?? prev.lanIp,
        tailscaleStatus: d.tailscaleStatus ?? prev.tailscaleStatus,
        users: prev.users.map((u, i) => (i === 0 && d.users?.[0]?.time ? { ...u, time: d.users[0].time } : u)),
      }));
    } catch {
      // Ignore network hiccups
    }
  }, []);

  useEffect(() => {
    if (dataMode !== 'live_host') return;
    fetchLiveHostTelemetry();
    const timer = setInterval(fetchLiveHostTelemetry, 2000);
    return () => clearInterval(timer);
  }, [dataMode, fetchLiveHostTelemetry]);

  const handleResetToReference = () => {
    setDataMode('reference');
    setTelemetry(REFERENCE_PRESET);
  };

  const triggerSyncBurst = () => {
    setTelemetry((prev) => ({
      ...prev,
      cpuPercent: 76,
      tempCelsius: 58,
      ramUsedGb: Math.min(prev.ramTotalGb, Number((prev.ramUsedGb + 0.7).toFixed(1))),
      users: prev.users.map((u) =>
        u.userIconType === 'phone' ? { ...u, activityLabel: 'Sync', activityIconType: 'sync' } : u
      ),
    }));
  };

  const handleAddUserSession = () => {
    if (telemetry.users.length >= 3) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newSession: ConnectedUserSession = {
      id: `u-${Date.now()}`,
      name: telemetry.users.length === 2 ? 'Laptop' : 'Tablet',
      userIconType: telemetry.users.length % 2 === 0 ? 'person' : 'phone',
      activityLabel: telemetry.users.length % 2 === 0 ? 'Web' : 'Sync',
      activityIconType: telemetry.users.length % 2 === 0 ? 'web' : 'sync',
      time: now,
    };
    setTelemetry((prev) => ({ ...prev, users: [...prev.users, newSession] }));
  };

  const handleRemoveUserSession = (id: string) => {
    if (telemetry.users.length <= 1) return;
    setTelemetry((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  // FULLSCREEN 3.5" SPI KIOSK RENDER MODE
  if (isKioskMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#051122] flex items-center justify-center overflow-hidden">
        <div className="w-full h-full relative">
          <SpiDisplayScreen data={telemetry} kioskFullscreen={true} />

          {/* Subtle exit control in top-right corner for desktop preview / touch exit */}
          <button
            onClick={() => setIsKioskMode(false)}
            title="Exit 3.5 inch Kiosk Mode (Esc)"
            className="absolute top-2 right-2 opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 text-[11px] font-medium text-slate-200 flex items-center gap-1.5"
          >
            <Minimize2 className="w-3 h-3" />
            Exit Kiosk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050C18] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-[#071020]">
        <a
          href="#simulator"
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Cloud Pi SPI Studio
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <a href="#simulator" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            SPI Simulator
          </a>
          <a
            href="#simulator"
            onClick={(e) => {
              e.preventDefault();
              setFrameStyle(frameStyle === 'compare_ref' ? 'spi_bezel' : 'compare_ref');
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Reference Comparison
          </a>
          <a href="#telemetry-controls" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            Telemetry Controls
          </a>
          <a href="#rpi-deploy" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
            Run on RPi 4
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsKioskMode(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-[#12E86B] rounded-lg hover:bg-[#28f57d] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Launch 3.5&quot; Kiosk Mode
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Toolbar: Mode Switchers & Display View Switcher */}
        <div
          id="simulator"
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/70"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Raspberry Pi 4 · 3.5&quot; SPI LCD Nextcloud Monitor
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              480×320 (3:2) landscape hardware UI · Interactive telemetry controls · Ready for Chromium Kiosk or{' '}
              <code className="text-sky-400 font-mono">/dev/fb1</code> Python Pygame
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Viewport Frame Selector */}
            <div className="flex items-center gap-1 p-1 bg-[#091324] rounded-lg border border-slate-800">
              <button
                onClick={() => setFrameStyle('spi_bezel')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  frameStyle === 'spi_bezel'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3.5&quot; Hardware Bezel
              </button>
              <button
                onClick={() => setFrameStyle('pixel_480x320')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  frameStyle === 'pixel_480x320'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Native 480×320
              </button>
              <button
                onClick={() => setFrameStyle('compare_ref')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  frameStyle === 'compare_ref'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                Compare w/ Uploaded Image
              </button>
            </div>

            {/* Data Source Selector */}
            <div className="flex items-center gap-1 p-1 bg-[#091324] rounded-lg border border-slate-800">
              <button
                onClick={handleResetToReference}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  dataMode === 'reference'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Reference Snapshot
              </button>
              <button
                onClick={() => setDataMode('simulated')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  dataMode === 'simulated'
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Simulate Activity
              </button>
              <button
                onClick={() => setDataMode('live_host')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  dataMode === 'live_host'
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                Live Python 3
              </button>
            </div>
          </div>
        </div>

        {/* Main 12-Col Split: Display Canvas (Left 7 cols) + Interactive Controls (Right 5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: 3.5" SPI Display Stage */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {frameStyle === 'spi_bezel' && (
              <div className="w-full max-w-[680px]">
                {/* Physical RPi 4 3.5" SPI Hat PCB & Bezel */}
                <div className="relative rounded-2xl bg-[#111824] p-4 sm:p-6 border-2 border-slate-700/80 shadow-2xl">
                  {/* Top GPIO 26-Pin Gold Header Row Indicator */}
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 13 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-2 h-2 rounded-xs bg-amber-400/80 border border-amber-300/40"
                          title={`GPIO SPI Header Pin Pair ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      RPi4B · ILI9486 3.5&quot; SPI TFT · 480×320 · /dev/fb1
                    </div>
                  </div>

                  {/* Inner LCD Screen Frame */}
                  <div className="rounded-xl overflow-hidden border-2 border-[#030812] shadow-inner">
                    <SpiDisplayScreen
                      data={telemetry}
                      selectedWidget={selectedWidget}
                      onSelectWidget={(w) => setSelectedWidget(w === selectedWidget ? null : w)}
                    />
                  </div>

                  {/* Bottom Bezel Silkscreen Labels */}
                  <div className="flex items-center justify-between mt-3 px-2 text-[11px] font-mono text-slate-400">
                    <span>TOUCH: XPT2046 (SPI0 CE1) · CLICK ANY WIDGET TO INSPECT</span>
                    <span>BACKLIGHT: 100%</span>
                  </div>
                </div>
              </div>
            )}

            {frameStyle === 'pixel_480x320' && (
              <div className="flex flex-col items-center py-6">
                <div className="mb-3 text-xs font-mono text-slate-400">
                  Exact 1:1 Native Hardware Pixel Dimensions (480px × 320px)
                </div>
                <div
                  style={{ width: '480px', height: '320px' }}
                  className="rounded-lg overflow-hidden border border-slate-700 shadow-2xl shrink-0"
                >
                  <SpiDisplayScreen
                    data={telemetry}
                    kioskFullscreen={true}
                    selectedWidget={selectedWidget}
                    onSelectWidget={(w) => setSelectedWidget(w === selectedWidget ? null : w)}
                  />
                </div>
              </div>
            )}

            {frameStyle === 'compare_ref' && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-emerald-400 flex items-center justify-between">
                    <span>Live Interactive Web / SPI UI</span>
                    <span className="font-mono text-[11px] text-slate-400">Scalable Vector + DOM</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-700">
                    <SpiDisplayScreen data={telemetry} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-sky-400 flex items-center justify-between">
                    <span>Your Uploaded Reference Image</span>
                    <span className="font-mono text-[11px] text-slate-400">Original PNG</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-[#07162C] aspect-[3/2] flex items-center justify-center">
                    <img
                      src="/assets/aistudio/image_03ba6d99.png"
                      alt="Uploaded Cloud Pi Nextcloud Reference UI"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Interactive Telemetry & Hardware Controls */}
          <div
            id="telemetry-controls"
            className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#091324] p-5 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-white">Interactive Display Telemetry</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerSyncBurst}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors whitespace-nowrap shrink-0"
                >
                  Test Sync Spike
                </button>
                <button
                  onClick={handleResetToReference}
                  title="Reset to exact reference image numbers"
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {dataMode === 'live_host' && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
                <span>Reading real-time OS metrics from backend</span>
                <span className="font-mono text-[11px] text-emerald-400">{hostPlatformInfo}</span>
              </div>
            )}

            {/* Header & Status Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Header Title</label>
                <input
                  type="text"
                  value={telemetry.title}
                  onChange={(e) => setTelemetry({ ...telemetry, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#050C18] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Service Subtitle</label>
                <input
                  type="text"
                  value={telemetry.subtitle}
                  onChange={(e) => setTelemetry({ ...telemetry, subtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#050C18] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Node State</label>
                <button
                  onClick={() => setTelemetry({ ...telemetry, online: !telemetry.online })}
                  className={`w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    telemetry.online
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {telemetry.online ? 'ONLINE' : 'OFFLINE'}
                </button>
              </div>
            </div>

            {/* Sliders for CPU, TEMP, RAM, STORAGE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* CPU Slider */}
              <div className="p-3 rounded-lg bg-[#050C18] border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">CPU Load</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">{telemetry.cpuPercent}%</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={telemetry.cpuPercent}
                  onChange={(e) => {
                    setDataMode('reference');
                    setTelemetry({ ...telemetry, cpuPercent: Number(e.target.value) });
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* TEMP Slider */}
              <div className="p-3 rounded-lg bg-[#050C18] border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">SoC Temp</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">{telemetry.tempCelsius}°C</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={85}
                  value={telemetry.tempCelsius}
                  onChange={(e) => {
                    setDataMode('reference');
                    setTelemetry({ ...telemetry, tempCelsius: Number(e.target.value) });
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* RAM Slider */}
              <div className="p-3 rounded-lg bg-[#050C18] border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">RAM Used</span>
                  <span className="font-mono font-bold text-sky-400 tabular-nums">
                    {telemetry.ramUsedGb.toFixed(1)} / {telemetry.ramTotalGb.toFixed(1)} GB
                  </span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={telemetry.ramTotalGb}
                  step={0.1}
                  value={telemetry.ramUsedGb}
                  onChange={(e) => {
                    setDataMode('reference');
                    setTelemetry({ ...telemetry, ramUsedGb: Number(e.target.value) });
                  }}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* STORAGE Slider */}
              <div className="p-3 rounded-lg bg-[#050C18] border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Storage Used</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {telemetry.storageUsedGb} / {telemetry.storageTotalGb} GB
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={telemetry.storageTotalGb}
                  step={1}
                  value={telemetry.storageUsedGb}
                  onChange={(e) => {
                    setDataMode('reference');
                    setTelemetry({ ...telemetry, storageUsedGb: Number(e.target.value) });
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Connected Users Editor */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Connected Nextcloud Sessions</span>
                {telemetry.users.length < 3 && (
                  <button
                    onClick={handleAddUserSession}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Session
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {telemetry.users.map((u, idx) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-[#050C18] border border-slate-800/90 text-xs"
                  >
                    <button
                      onClick={() => {
                        const updated = [...telemetry.users];
                        updated[idx] = {
                          ...u,
                          userIconType: u.userIconType === 'person' ? 'phone' : 'person',
                        };
                        setTelemetry({ ...telemetry, users: updated });
                      }}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white font-mono text-[11px] shrink-0"
                      title="Toggle Icon Type"
                    >
                      {u.userIconType === 'person' ? 'User' : 'Phone'}
                    </button>

                    <input
                      type="text"
                      value={u.name}
                      onChange={(e) => {
                        const updated = [...telemetry.users];
                        updated[idx] = { ...u, name: e.target.value };
                        setTelemetry({ ...telemetry, users: updated });
                      }}
                      className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-white"
                    />

                    <button
                      onClick={() => {
                        const nextAct = u.activityIconType === 'web' ? 'sync' : 'web';
                        const updated = [...telemetry.users];
                        updated[idx] = {
                          ...u,
                          activityIconType: nextAct,
                          activityLabel: nextAct === 'web' ? 'Web' : 'Sync',
                        };
                        setTelemetry({ ...telemetry, users: updated });
                      }}
                      className="px-2 py-1 rounded bg-slate-800 text-sky-300 hover:text-white shrink-0"
                    >
                      {u.activityLabel}
                    </button>

                    <input
                      type="text"
                      value={u.time}
                      onChange={(e) => {
                        const updated = [...telemetry.users];
                        updated[idx] = { ...u, time: e.target.value };
                        setTelemetry({ ...telemetry, users: updated });
                      }}
                      className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-slate-300 font-mono text-center ml-auto"
                    />

                    {telemetry.users.length > 1 && (
                      <button
                        onClick={() => handleRemoveUserSession(u.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="Remove session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Network & Tailscale Controls */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">LAN IPv4 Address</label>
                <input
                  type="text"
                  value={telemetry.lanIp}
                  onChange={(e) => setTelemetry({ ...telemetry, lanIp: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-[#050C18] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Tailscale Tunnel</label>
                <button
                  onClick={() =>
                    setTelemetry({
                      ...telemetry,
                      tailscaleStatus: telemetry.tailscaleStatus === 'OK' ? 'RELAY' : 'OK',
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-[#050C18] border border-slate-700 text-emerald-400 hover:border-slate-600 transition-colors"
                >
                  TAILSCALE {telemetry.tailscaleStatus}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Deployment & Standalone Python Script Section */}
        <div id="rpi-deploy">
          <RpiDeployPanel
            telemetry={telemetry}
            onEnterKiosk={() => setIsKioskMode(true)}
            onApplyPythonTelemetry={(pyData, meta) => {
              setHostPlatformInfo(`Python ${meta.pythonVersion} · ${meta.execTimeMs}ms`);
              setTelemetry((prev) => ({
                ...prev,
                ...pyData,
              }));
            }}
          />
        </div>
      </main>
    </div>
  );
}
