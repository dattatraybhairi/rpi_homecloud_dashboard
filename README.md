# Cloud Pi — 3.5" SPI Display UI for Raspberry Pi 4 (`480×320`)

Renders the **CLOUD PI / Nextcloud** status dashboard on a 3.5-inch SPI TFT display (`480×320`) connected to a Raspberry Pi 4 using Python 3 (`cloudpi_spi_display.py`), plus an interactive web simulator.

---

## Run on Your Raspberry Pi 4 (Python)

After pushing this project to GitHub, clone it on your Raspberry Pi 4 (`admin@rpi:~$`) and run:

```bash
# 1. Clone your repository on the Raspberry Pi 4
git clone <YOUR_GITHUB_REPO_URL> cloudpi-spi
cd cloudpi-spi

# 2. Run the automated setup & launcher script
chmod +x setup_rpi.sh cloudpi_spi_display.py
./setup_rpi.sh
```

### Or Run Manually by Driver Type

1. **Direct Framebuffer (`/dev/fb1` RGB565 — works over SSH without X11)**:
   ```bash
   sudo python3 cloudpi_spi_display.py --driver fb --fb /dev/fb1
   ```
2. **Direct Hardware SPI0 (`/dev/spidev0.0` ILI9486 — for Bookworm without `/dev/fb1`)**:
   ```bash
   sudo python3 cloudpi_spi_display.py --driver spidev
   ```
3. **Pygame Fullscreen on Desktop (`DISPLAY=:0`)**:
   ```bash
   DISPLAY=:0 CLOUDPI_FULLSCREEN=1 python3 cloudpi_spi_display.py --driver pygame
   ```
4. **Tkinter Borderless Kiosk (`DISPLAY=:0`)**:
   ```bash
   DISPLAY=:0 python3 cloudpi_spi_display.py --driver tk
   ```

---

## Enable Auto-Start on Boot (`systemd`)

```bash
sudo cp cloudpi_spi_display.py /home/admin/cloudpi_spi_display.py
sudo cp cloudpi-spi.service /etc/systemd/system/cloudpi-spi.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudpi-spi.service
```
