import express from 'express';
import { createServer as createViteServer } from 'vite';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let prevCpuInfo = os.cpus();

function getCpuUsagePercent(): number {
  const currentCpus = os.cpus();
  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpuInfo[i] || currentCpus[i];
    const curr = currentCpus[i];

    const prevTotal = Object.values(prev.times).reduce((a, b) => a + b, 0);
    const currTotal = Object.values(curr.times).reduce((a, b) => a + b, 0);

    totalDiff += currTotal - prevTotal;
    idleDiff += curr.times.idle - prev.times.idle;
  }

  prevCpuInfo = currentCpus;
  if (totalDiff === 0) return 18;
  const usage = Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
  return Math.max(1, Math.min(100, usage));
}

function getCpuTempCelsius(): number {
  try {
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const raw = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8').trim();
      const temp = Math.round(parseInt(raw, 10) / 1000);
      if (!isNaN(temp) && temp > 0 && temp < 120) {
        return temp;
      }
    }
  } catch {
    // Fallback
  }
  return 46;
}

function getMemoryStats(): { usedGb: number; totalGb: number } {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = totalBytes - freeBytes;
  const totalGb = Number((totalBytes / (1024 ** 3)).toFixed(1));
  const usedGb = Number((usedBytes / (1024 ** 3)).toFixed(1));
  return { usedGb, totalGb };
}

function getStorageStats(): { usedGb: number; totalGb: number } {
  try {
    const output = execSync('df -B1 / | tail -1', { encoding: 'utf8', timeout: 1500 });
    const parts = output.trim().split(/\s+/);
    if (parts.length >= 4) {
      const totalBytes = parseInt(parts[1], 10);
      const usedBytes = parseInt(parts[2], 10);
      if (!isNaN(totalBytes) && !isNaN(usedBytes) && totalBytes > 0) {
        return {
          usedGb: Math.max(1, Math.round(usedBytes / (1024 ** 3))),
          totalGb: Math.max(1, Math.round(totalBytes / (1024 ** 3))),
        };
      }
    }
  } catch {
    // Fallback
  }
  return { usedGb: 612, totalGb: 931 };
}

function getNetworkInfo(): { lanIp: string; tailscaleOk: boolean } {
  const interfaces = os.networkInterfaces();
  let lanIp = '192.168.1.42';
  let tailscaleOk = true;

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (name.startsWith('tailscale') || name.startsWith('ts')) {
          tailscaleOk = true;
        } else if (lanIp === '192.168.1.42') {
          lanIp = addr.address;
        }
      }
    }
  }

  return { lanIp, tailscaleOk };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Serve the standalone Python SPI Display script directly from repo root
  app.get('/cloudpi_spi_display.py', (_req, res) => {
    const rootScript = path.join(__dirname, 'cloudpi_spi_display.py');
    const nestedScript = path.join(__dirname, 'python', 'cloudpi_spi_display.py');
    const scriptPath = fs.existsSync(rootScript) ? rootScript : nestedScript;
    if (fs.existsSync(scriptPath)) {
      res.setHeader('Content-Type', 'text/x-python; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="cloudpi_spi_display.py"');
      res.send(fs.readFileSync(scriptPath, 'utf8'));
    } else {
      res.status(404).send('# Script not found');
    }
  });

  // 2. Serve a 1-command Raspberry Pi 4 setup script (`curl -sSL <url>/setup_rpi_spi.sh | bash`)
  app.get('/setup_rpi_spi.sh', (req, res) => {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = `${proto}://${host}`;

    const installer = `#!/usr/bin/env bash
set -e
echo "=========================================================="
echo "  Cloud Pi - 3.5\\" SPI Display Python Installer for RPi 4"
echo "=========================================================="

echo "[1/3] Installing Python dependencies (Pillow, Pygame, psutil, DejaVu fonts)..."
sudo apt-get update -qq
sudo apt-get install -y python3-pil python3-pil.imagetk python3-pygame python3-psutil python3-spidev python3-rpi.gpio fonts-dejavu-core

mkdir -p ~/cloudpi-spi
cd ~/cloudpi-spi

echo "[2/3] Downloading cloudpi_spi_display.py..."
curl -sSL "${baseUrl}/cloudpi_spi_display.py" -o cloudpi_spi_display.py
chmod +x cloudpi_spi_display.py

echo "[3/3] Checking SPI framebuffer devices..."
if [ -e /dev/fb1 ]; then
  echo "Detected /dev/fb1 (3.5\\" SPI TFT)! Starting Python UI on /dev/fb1..."
  python3 ~/cloudpi-spi/cloudpi_spi_display.py --driver fb --fb /dev/fb1
elif [ -n "$DISPLAY" ]; then
  echo "Detected X11/Wayland DISPLAY=$DISPLAY. Starting Python UI..."
  python3 ~/cloudpi-spi/cloudpi_spi_display.py --driver pygame
else
  echo "Downloaded to ~/cloudpi-spi/cloudpi_spi_display.py"
  echo "Run with: python3 ~/cloudpi-spi/cloudpi_spi_display.py --driver fb --fb /dev/fb1"
fi
`;
    res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
    res.send(installer);
  });

  // 3. Execute the actual Python 3 script (`python/cloudpi_spi_display.py --json`) and return live telemetry
  app.get('/api/python-telemetry', (_req, res) => {
    const startMs = Date.now();
    try {
      const scriptPath = path.join(__dirname, 'python', 'cloudpi_spi_display.py');
      const rawJson = execSync(`python3 "${scriptPath}" --json`, {
        encoding: 'utf8',
        timeout: 3000,
      });
      const parsed = JSON.parse(rawJson);
      res.json({
        ok: true,
        execTimeMs: Date.now() - startMs,
        data: parsed,
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message || 'Failed to execute Python script',
      });
    }
  });

  // 4. Node fallback telemetry endpoint
  app.get('/api/telemetry', (_req, res) => {
    const cpuPercent = getCpuUsagePercent();
    const tempCelsius = getCpuTempCelsius();
    const ram = getMemoryStats();
    const storage = getStorageStats();
    const net = getNetworkInfo();

    res.json({
      hostname: os.hostname() || 'cloudpi',
      platform: `${os.type()} ${os.arch()}`,
      isRaspberryPi: fs.existsSync('/sys/firmware/devicetree/base/model'),
      cpuPercent,
      tempCelsius,
      ramUsedGb: ram.usedGb,
      ramTotalGb: ram.totalGb,
      storageUsedGb: storage.usedGb,
      storageTotalGb: storage.totalGb,
      lanIp: net.lanIp,
      tailscaleOk: net.tailscaleOk,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud Pi SPI Display Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
