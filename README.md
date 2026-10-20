# RPi HomeCloud Dashboard — 3.5" SPI Display (`480×320`)

Status dashboard for **CLOUD PI / Nextcloud** designed for a 3.5-inch SPI TFT display (`480×320` landscape) connected to a Raspberry Pi 4, including both a native Python 3 hardware runner (`cloudpi_spi_display.py`) and an interactive web simulation studio.

- **Repository**: [https://github.com/dattatraybhairi/rpi_homecloud_dashboard.git](https://github.com/dattatraybhairi/rpi_homecloud_dashboard.git)
- **Live Web Simulation (GitHub Pages)**: [https://dattatraybhairi.github.io/rpi_homecloud_dashboard/](https://dattatraybhairi.github.io/rpi_homecloud_dashboard/)
- **Fullscreen 480×320 Kiosk View**: [https://dattatraybhairi.github.io/rpi_homecloud_dashboard/?kiosk=1](https://dattatraybhairi.github.io/rpi_homecloud_dashboard/?kiosk=1)

---

## Features

- **Native 480×320 (3:2) Layout**: Displays Nextcloud node state (`ONLINE`), `CPU %`, `TEMP °C`, `RAM (GB)`, `STORAGE (GB)`, active Nextcloud sessions (`CONNECTED USERS`), `LAN IP`, and `TAILSCALE` status.
- **2× Supersampled Python Vector Renderer (`PIL.ImageDraw`)**: Renders custom icons, progress bars, and typography at `960×640` and downscales with `LANCZOS` to `480×320` for sharp anti-aliased output on small SPI screens.
- **4 Display Output Drivers**:
  1. **Direct Framebuffer (`--driver fb --fb /dev/fb1`)**: Writes 16-bit RGB565 frames directly to `/dev/fb1` over SSH without requiring X11 or a desktop session.
  2. **Direct Hardware SPI (`--driver spidev`)**: Drives `ILI9486` / `ST7796` 3.5" SPI displays directly via `/dev/spidev0.0` (`CE0`, `DC=GPIO24`, `RST=GPIO25`).
  3. **Pygame Fullscreen/Window (`--driver pygame`)**: Renders on X11/Wayland (`DISPLAY=:0`).
  4. **Tkinter Borderless Kiosk (`--driver tk`)**: Uses built-in `python3-tk` + `Pillow ImageTk` on `DISPLAY=:0`.

---

## Quick Start on Raspberry Pi 4

Clone the repository and run the setup script:

```bash
git clone https://github.com/dattatraybhairi/rpi_homecloud_dashboard.git
cd rpi_homecloud_dashboard
chmod +x setup_rpi.sh cloudpi_spi_display.py
./setup_rpi.sh
```

### Direct Single-File Download via `curl`

```bash
curl -sSL https://raw.githubusercontent.com/dattatraybhairi/rpi_homecloud_dashboard/main/cloudpi_spi_display.py -o cloudpi_spi_display.py
chmod +x cloudpi_spi_display.py
sudo python3 cloudpi_spi_display.py --driver fb --fb /dev/fb1
```

---

## Manual Execution Commands

### 1. Direct Linux Framebuffer (`/dev/fb1` RGB565)
```bash
sudo python3 cloudpi_spi_display.py --driver fb --fb /dev/fb1
```

### 2. Direct Hardware SPI0 (`/dev/spidev0.0` ILI9486)
```bash
sudo python3 cloudpi_spi_display.py --driver spidev
```

### 3. Pygame Fullscreen (`DISPLAY=:0`)
```bash
DISPLAY=:0 CLOUDPI_FULLSCREEN=1 python3 cloudpi_spi_display.py --driver pygame
```

### 4. Tkinter Borderless Kiosk (`DISPLAY=:0`)
```bash
DISPLAY=:0 python3 cloudpi_spi_display.py --driver tk
```

---

## Auto-Start on Boot (`systemd`)

```bash
sudo cp cloudpi_spi_display.py /home/admin/cloudpi_spi_display.py
sudo cp cloudpi-spi.service /etc/systemd/system/cloudpi-spi.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudpi-spi.service
```

---

## Web Simulation & GitHub Pages Deployment

The interactive web simulation is built with React, TypeScript, Tailwind CSS, and Vite.

### Local Development
```bash
npm install
npm run dev
```

### GitHub Pages Automatic Deployment
A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically builds the static simulation bundle (`npm run build`) and deploys it to GitHub Pages whenever changes are pushed to `main` or `master`.

To enable GitHub Pages in the repository settings:
1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
