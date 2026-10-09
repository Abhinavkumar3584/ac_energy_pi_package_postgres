#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is not installed. Install it first: sudo apt install python3 python3-venv"
  exit 1
fi

if [ ! -d venv ]; then
  python3 -m venv venv
fi

source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo
if groups "$USER" | grep -qw dialout; then
  echo "Serial permission group: OK (dialout)"
else
  echo "NOTICE: your user is not in the dialout group."
  echo "Run: sudo usermod -aG dialout $USER"
  echo "Then reboot the Raspberry Pi once."
fi

echo
 echo "Starting AC Energy Dashboard on port 5000..."
python3 app.py
