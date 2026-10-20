#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Cloud Pi - 3.5\" SPI Display Setup for Raspberry Pi 4"
echo "=========================================================="

echo "[1/3] Installing Python 3 dependencies via apt..."
sudo apt-get update -qq
sudo apt-get install -y \
  python3-pil \
  python3-pil.imagetk \
  python3-pygame \
  python3-psutil \
  python3-spidev \
  python3-rpi.gpio \
  fonts-dejavu-core

chmod +x cloudpi_spi_display.py

echo "[2/3] Verifying cloudpi_spi_display.py syntax..."
python3 -m py_compile cloudpi_spi_display.py
echo "Syntax OK!"

echo "[3/3] Detecting SPI display backend..."
if [ -e /dev/fb1 ]; then
  echo "Found /dev/fb1 (3.5\" SPI TFT Framebuffer). Launching UI on /dev/fb1..."
  sudo python3 cloudpi_spi_display.py --driver fb --fb /dev/fb1
elif [ -e /dev/spidev0.0 ] && [ -z "$DISPLAY" ]; then
  echo "Found /dev/spidev0.0 (Direct Hardware SPI). Launching UI via spidev..."
  sudo python3 cloudpi_spi_display.py --driver spidev
else
  echo "Launching on DISPLAY=${DISPLAY:-:0}..."
  DISPLAY=${DISPLAY:-:0} CLOUDPI_FULLSCREEN=1 python3 cloudpi_spi_display.py --driver pygame
fi
