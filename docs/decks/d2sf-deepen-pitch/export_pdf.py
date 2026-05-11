#!/usr/bin/env python3
"""
Playwright-based PDF exporter for slide decks.

Exports through the viewer (index.html) so the PDF is pixel-perfect identical
to what you see in the browser. Same CSS cascade, same rendering — guaranteed.

Usage:
    python3 export_pdf.py                    # Export all slides (auto-starts server)
    python3 export_pdf.py --output deck.pdf  # Custom output filename
    python3 export_pdf.py --port 8731        # Custom port (default: auto-find)
    python3 export_pdf.py --no-server        # Don't auto-start server (expects one running)

Requirements:
    pip install playwright Pillow
    playwright install chromium
"""

import argparse
import glob
import os
import socket
import subprocess
import sys
import time
from io import BytesIO

from PIL import Image
from playwright.sync_api import sync_playwright

# JS: Enter export mode — hide viewer chrome, disable transitions, fill viewport
EXPORT_SETUP_JS = """
() => {
    // Hide viewer chrome
    document.querySelectorAll('.progress, .controls, .hints, .loading-msg')
        .forEach(el => el.style.display = 'none');

    // Disable transitions for instant slide switching
    document.querySelectorAll('#slideContainer > .slide')
        .forEach(s => s.style.transition = 'none');

    // Position slide-container to fill 1920x1080 viewport exactly
    const c = document.getElementById('slideContainer');
    c.style.position = 'fixed';
    c.style.top = '0';
    c.style.left = '0';
    c.style.transform = 'none';
    c.style.width = '1920px';
    c.style.height = '1080px';
    c.style.borderRadius = '0';
    c.style.boxShadow = 'none';
    c.style.overflow = 'hidden';

    // Clean body
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    document.body.style.overflow = 'hidden';

    return document.querySelectorAll('#slideContainer > .slide').length;
}
"""

# JS: Wait for all web fonts to finish loading
WAIT_FONTS_JS = """
() => document.fonts.ready.then(() => true)
"""


def find_slide_count(deck_dir):
    """Count slide-N.html files."""
    return len(glob.glob(os.path.join(deck_dir, "slide-*.html")))


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0


def find_available_port(start=8731):
    port = start
    while port < start + 100:
        if not is_port_in_use(port):
            return port
        port += 1
    raise RuntimeError(f"No available ports in range {start}-{start+100}")


def start_server(deck_dir, port):
    proc = subprocess.Popen(
        [sys.executable, '-m', 'http.server', str(port)],
        cwd=deck_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(30):
        if is_port_in_use(port):
            return proc
        time.sleep(0.2)
    proc.kill()
    raise RuntimeError(f"Failed to start server on port {port}")


def export_slides_to_pdf(deck_dir, output_path, port=None, auto_start=True):
    expected = find_slide_count(deck_dir)
    if expected == 0:
        print("No slide files found!")
        sys.exit(1)

    print(f"Found {expected} slide files")

    # Server setup
    server_proc = None
    if port and is_port_in_use(port):
        print(f"Using existing server on port {port}")
    elif auto_start:
        port = port or find_available_port()
        print(f"Starting HTTP server on port {port}...")
        server_proc = start_server(deck_dir, port)
    else:
        port = port or 8731
        if not is_port_in_use(port):
            print(f"No server running on port {port}.")
            sys.exit(1)

    base_url = f"http://localhost:{port}"
    screenshots = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=2,
            )

            # Load the viewer (same page the user sees in browser)
            print("  Loading viewer...")
            page.goto(f"{base_url}/index.html", wait_until="networkidle")
            page.wait_for_selector('#slideContainer > .slide.active', timeout=15000)

            # Wait for web fonts
            page.evaluate(WAIT_FONTS_JS)
            page.wait_for_timeout(300)

            # Enter export mode
            total = page.evaluate(EXPORT_SETUP_JS)
            print(f"  {total} slides loaded")
            page.wait_for_timeout(100)

            for i in range(total):
                print(f"  [{i+1:2d}/{total}] slide-{i+1}")

                # Navigate using the viewer's own showSlide function
                page.evaluate("(n) => showSlide(n)", i)
                page.wait_for_timeout(100)

                # Screenshot the active slide
                el = page.query_selector('#slideContainer > .slide.active')
                png = el.screenshot(type="png") if el else page.screenshot(type="png")

                img = Image.open(BytesIO(png))
                if img.mode == 'RGBA':
                    img = img.convert('RGB')
                screenshots.append(img)

            browser.close()

        # Combine into PDF
        if screenshots:
            screenshots[0].save(
                output_path,
                "PDF",
                resolution=300.0,
                save_all=True,
                append_images=screenshots[1:] or [],
            )
            size_mb = os.path.getsize(output_path) / (1024 * 1024)
            print(f"\n  PDF: {output_path}")
            print(f"  Size: {size_mb:.1f} MB  |  Pages: {len(screenshots)}")

    finally:
        if server_proc:
            server_proc.kill()


def main():
    parser = argparse.ArgumentParser(description="Export slide deck to PDF")
    parser.add_argument("--output", "-o", default=None, help="Output PDF filename")
    parser.add_argument("--port", "-p", type=int, default=None,
                        help="Server port (default: auto-find available port)")
    parser.add_argument("--no-server", action="store_true",
                        help="Don't auto-start server (expects one already running)")
    args = parser.parse_args()

    deck_dir = os.path.dirname(os.path.abspath(__file__))
    output = args.output or os.path.join(deck_dir, "deck-export.pdf")

    export_slides_to_pdf(
        deck_dir, output,
        port=args.port,
        auto_start=not args.no_server,
    )


if __name__ == "__main__":
    main()
