import React, { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Download,
  Terminal,
  Cpu,
  Play,
  FileCode2,
  Settings2,
} from 'lucide-react';
import { CloudPiTelemetry } from './SpiDisplayScreen';

interface RpiDeployPanelProps {
  telemetry: CloudPiTelemetry;
  onEnterKiosk: () => void;
  onApplyPythonTelemetry?: (data: Partial<CloudPiTelemetry>, meta: { pythonVersion: string; execTimeMs: number }) => void;
}

const GITHUB_REPO_URL = 'https://github.com/dattatraybhairi/rpi_homecloud_dashboard.git';
const GITHUB_RAW_PY_URL =
  'https://raw.githubusercontent.com/dattatraybhairi/rpi_homecloud_dashboard/main/cloudpi_spi_display.py';

export const RpiDeployPanel: React.FC<RpiDeployPanelProps> = ({
  onApplyPythonTelemetry,
}) => {
  const [activeTab, setActiveTab] = useState<'python_quickstart' | 'python_source' | 'systemd_wiring'>('python_quickstart');
  const [driverMode, setDriverMode] = useState<'fb' | 'spidev' | 'pygame' | 'tk'>('fb');
  const [fbDevice, setFbDevice] = useState<string>('/dev/fb1');
  const [storageMount, setStorageMount] = useState<string>('/');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pythonSourceCode, setPythonSourceCode] = useState<string>('');
  const [pythonTestResult, setPythonTestResult] = useState<{
    loading: boolean;
    execTimeMs?: number;
    pythonVersion?: string;
    rawJson?: string;
    error?: string;
  }>({ loading: false });

  useEffect(() => {
    fetch('./cloudpi_spi_display.py')
      .then((r) => r.text())
      .then((txt) => {
        if (txt.includes('#!/usr/bin/env python3')) {
          setPythonSourceCode(txt);
        }
      })
      .catch(() => {});
  }, []);

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const downloadPythonBlob = () => {
    if (!pythonSourceCode) return;
    const blob = new Blob([pythonSourceCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloudpi_spi_display.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runLivePythonTest = async () => {
    setPythonTestResult({ loading: true });
    try {
      const res = await fetch('./api/python-telemetry');
      const json = await res.json();
      if (json.ok && json.data) {
        setPythonTestResult({
          loading: false,
          execTimeMs: json.execTimeMs,
          pythonVersion: json.data.pythonVersion,
          rawJson: JSON.stringify(json.data, null, 2),
        });
        onApplyPythonTelemetry?.(
          {
            cpuPercent: json.data.cpuPercent,
            tempCelsius: json.data.tempCelsius,
            ramUsedGb: json.data.ramUsedGb,
            ramTotalGb: json.data.ramTotalGb,
            storageUsedGb: json.data.storageUsedGb,
            storageTotalGb: json.data.storageTotalGb,
            lanIp: json.data.lanIp,
            tailscaleStatus: json.data.tailscaleStatus,
          },
          {
            pythonVersion: json.data.pythonVersion || '3.10',
            execTimeMs: json.execTimeMs || 120,
          }
        );
      } else {
        setPythonTestResult({ loading: false, error: json.error || 'Execution failed' });
      }
    } catch {
      setPythonTestResult({
        loading: false,
        error: 'Backend endpoint unavailable in static GitHub Pages mode.',
      });
    }
  };

  const getRunCommand = () => {
    const storageArg = storageMount !== '/' ? ` --storage-path ${storageMount}` : '';
    if (driverMode === 'fb') {
      return `sudo python3 cloudpi_spi_display.py --driver fb --fb ${fbDevice}${storageArg}`;
    }
    if (driverMode === 'spidev') {
      return `sudo python3 cloudpi_spi_display.py --driver spidev${storageArg}`;
    }
    if (driverMode === 'tk') {
      return `DISPLAY=:0 python3 cloudpi_spi_display.py --driver tk${storageArg}`;
    }
    return `DISPLAY=:0 CLOUDPI_FULLSCREEN=1 python3 cloudpi_spi_display.py --driver pygame${storageArg}`;
  };

  const gitCloneCommands = `# Clone repository on Raspberry Pi 4
git clone ${GITHUB_REPO_URL}
cd rpi_homecloud_dashboard
chmod +x setup_rpi.sh cloudpi_spi_display.py
./setup_rpi.sh`;

  const rawCurlCommands = `# Or download cloudpi_spi_display.py directly from GitHub Raw
curl -sSL ${GITHUB_RAW_PY_URL} -o cloudpi_spi_display.py
chmod +x cloudpi_spi_display.py
${getRunCommand()}`;

  const sshHeredocBundle = `cat << 'EOF' > ~/cloudpi_spi_display.py
${pythonSourceCode}
EOF
chmod +x ~/cloudpi_spi_display.py
${getRunCommand().replace('cloudpi_spi_display.py', '~/cloudpi_spi_display.py')}`;

  const systemdUnit = `[Unit]
Description=Cloud Pi 3.5-inch SPI Nextcloud Display (Python)
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/admin/rpi_homecloud_dashboard
ExecStart=/usr/bin/${getRunCommand().replace(/^sudo\s+/, '').replace('cloudpi_spi_display.py', '/home/admin/rpi_homecloud_dashboard/cloudpi_spi_display.py')}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target`;

  return (
    <div className="rounded-xl border border-slate-800 bg-[#091324] p-5">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            Raspberry Pi 4 Python Runner (<code className="text-sky-400 font-mono text-sm">cloudpi_spi_display.py</code>)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            2× supersampled Pillow (<code className="text-slate-300 font-mono">PIL.ImageDraw</code>) vector renderer ·
            Supports <code className="text-emerald-400 font-mono">/dev/fb1</code> RGB565, <code className="text-sky-400 font-mono">spidev0.0</code>, Pygame &amp; Tkinter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#050C18] rounded-lg border border-slate-800/80">
            <button
              onClick={() => setActiveTab('python_quickstart')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'python_quickstart'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. GitHub &amp; SSH Setup
            </button>
            <button
              onClick={() => setActiveTab('python_source')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'python_source'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Full Python Code
            </button>
            <button
              onClick={() => setActiveTab('systemd_wiring')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'systemd_wiring'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Auto-Boot Service &amp; GPIO
            </button>
          </div>

          <button
            onClick={downloadPythonBlob}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download .py Script
          </button>
        </div>
      </div>

      {/* TAB 1: GITHUB CLONE & SSH COMMANDS */}
      {activeTab === 'python_quickstart' && (
        <div className="mt-4 space-y-4">
          {/* Driver & Storage Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#050C18] border border-slate-800/90">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                3.5&quot; SPI Display Python Driver
              </label>
              <select
                value={driverMode}
                onChange={(e) => setDriverMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#091324] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              >
                <option value="fb">Direct Framebuffer (/dev/fb1 RGB565 — Headless SSH)</option>
                <option value="spidev">Direct Hardware SPI0 (/dev/spidev0.0 ILI9486 — Bookworm)</option>
                <option value="pygame">Pygame Fullscreen Window (DISPLAY=:0 X11/Desktop)</option>
                <option value="tk">Tkinter Borderless Kiosk (DISPLAY=:0 Built-in Tk)</option>
              </select>
            </div>

            {driverMode === 'fb' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Linux Framebuffer Device
                </label>
                <select
                  value={fbDevice}
                  onChange={(e) => setFbDevice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-[#091324] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
                >
                  <option value="/dev/fb1">/dev/fb1 (3.5&quot; SPI TFT Hat)</option>
                  <option value="/dev/fb0">/dev/fb0 (Primary Framebuffer)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  SPI Hardware Interface
                </label>
                <div className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-[#091324] border border-slate-800 text-slate-300">
                  {driverMode === 'spidev' ? 'SPI0 CE0 · DC=GPIO24 · RST=GPIO25' : '480×320 Landscape Window'}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Nextcloud Data Mount Path
              </label>
              <input
                type="text"
                value={storageMount}
                onChange={(e) => setStorageMount(e.target.value || '/')}
                placeholder="/ or /mnt/nextcloud"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-[#091324] border border-slate-700 text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Git Clone + Raw Curl Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Option A: Clone GitHub Repository
                </span>
                <button
                  onClick={() => copyText('git-clone', gitCloneCommands)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === 'git-clone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'git-clone' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 rounded bg-[#091324] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                {gitCloneCommands}
              </pre>
            </div>

            <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  Option B: Direct GitHub Raw Download
                </span>
                <button
                  onClick={() => copyText('raw-curl', rawCurlCommands)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-sky-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedId === 'raw-curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'raw-curl' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-3 rounded bg-[#091324] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                {rawCurlCommands}
              </pre>
            </div>
          </div>

          {/* Offline SSH Paste + Live Python Backend Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 flex flex-col justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-white">Option C: Self-Contained SSH Paste (Offline)</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Creates <code className="font-mono text-slate-300">~/cloudpi_spi_display.py</code> via <code className="font-mono text-emerald-400">cat &lt;&lt; &apos;EOF&apos;</code> and launches immediately without network dependencies.
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <code className="px-2.5 py-1.5 rounded bg-[#091324] border border-slate-800 text-[11px] font-mono text-emerald-300 truncate">
                  {getRunCommand()}
                </code>
                <button
                  onClick={() => copyText('ssh-heredoc', sshHeredocBundle)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  {copiedId === 'ssh-heredoc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'ssh-heredoc' ? 'Copied SSH Bundle' : 'Copy SSH Paste Bundle'}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-white">Test Python 3 Collector</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Executes <code className="text-sky-400 font-mono">python3 cloudpi_spi_display.py --json</code> and updates the preview canvas.
                  </p>
                </div>
                <button
                  onClick={runLivePythonTest}
                  disabled={pythonTestResult.loading}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  {pythonTestResult.loading ? 'Running...' : 'Run Python'}
                </button>
              </div>

              {pythonTestResult.rawJson && (
                <div className="mt-1">
                  <div className="text-[11px] font-mono text-emerald-400 mb-1">
                    Executed on Python {pythonTestResult.pythonVersion} in {pythonTestResult.execTimeMs}ms
                  </div>
                  <pre className="p-2 rounded bg-[#091324] border border-slate-800 text-[11px] font-mono text-slate-300 max-h-24 overflow-y-auto">
                    {pythonTestResult.rawJson}
                  </pre>
                </div>
              )}
              {pythonTestResult.error && (
                <div className="text-xs text-slate-400 font-mono">{pythonTestResult.error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL PYTHON SOURCE CODE */}
      {activeTab === 'python_source' && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              Complete <code className="text-sky-400 font-mono">cloudpi_spi_display.py</code> source with 2× supersampled{' '}
              <code className="text-emerald-400 font-mono">PIL.ImageDraw</code> icons, 16-bit RGB565{' '}
              <code className="text-emerald-400 font-mono">/dev/fb1</code> writer, and direct <code className="text-sky-400 font-mono">ILI9486</code> SPI driver:
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyText('py-full', pythonSourceCode)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copiedId === 'py-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'py-full' ? 'Copied Python Code' : 'Copy Full Script'}
              </button>
            </div>
          </div>
          <pre className="p-4 rounded-lg bg-[#050A14] border border-slate-800/90 text-xs font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
            {pythonSourceCode || '# Loading cloudpi_spi_display.py...'}
          </pre>
        </div>
      )}

      {/* TAB 3: SYSTEMD AUTO-START & SPI WIRING */}
      {activeTab === 'systemd_wiring' && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">
                Auto-Start on Boot (<code className="text-sky-400 font-mono">/etc/systemd/system/cloudpi-spi.service</code>)
              </span>
              <button
                onClick={() => copyText('systemd-unit', systemdUnit)}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                {copiedId === 'systemd-unit' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedId === 'systemd-unit' ? 'Copied' : 'Copy Service'}
              </button>
            </div>
            <pre className="p-3 rounded bg-[#091324] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {systemdUnit}
            </pre>
            <div className="text-[11px] font-mono text-slate-400">
              Enable with: <code className="text-emerald-400">sudo systemctl enable --now cloudpi-spi.service</code>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#050A14] border border-slate-800/90 space-y-3">
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              3.5&quot; SPI GPIO Pinout &amp; /boot/firmware/config.txt
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
              <div className="text-slate-400">Pin 1 / 17: <span className="text-amber-300">3.3V Power</span></div>
              <div className="text-slate-400">Pin 2 / 4: <span className="text-rose-400">5V Backlight</span></div>
              <div className="text-slate-400">Pin 18 (GPIO24): <span className="text-emerald-300">LCD_RS / DC</span></div>
              <div className="text-slate-400">Pin 22 (GPIO25): <span className="text-emerald-300">LCD_RST</span></div>
              <div className="text-slate-400">Pin 19 (GPIO10): <span className="text-sky-300">SPI0 MOSI</span></div>
              <div className="text-slate-400">Pin 21 (GPIO9): <span className="text-sky-300">SPI0 MISO</span></div>
              <div className="text-slate-400">Pin 23 (GPIO11): <span className="text-sky-300">SPI0 SCLK</span></div>
              <div className="text-slate-400">Pin 24 (GPIO8): <span className="text-emerald-300">LCD_CS (CE0)</span></div>
            </div>
            <pre className="p-2.5 rounded bg-[#091324] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
{`# Add to /boot/firmware/config.txt (or /boot/config.txt)
dtparam=spi=on
dtoverlay=piscreen,speed=16000000,rotate=90`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
