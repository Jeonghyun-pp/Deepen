#!/usr/bin/env python3
"""
Slide QA Checker - Automated visual diagnostics for HTML presentation slides.
Uses Playwright to render each slide at 1920x1080 and run JavaScript-based checks.

Usage:
    cd <deck-folder>
    python check_slides.py

Requirements:
    pip install playwright
    playwright install chromium

Output:
    Prints a report of issues found per slide.
    Exit code 0 = no errors, 1 = errors found, 2 = warnings only.
"""

import sys
import os
import glob
import json
import asyncio

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
    sys.exit(2)

# ── Diagnostic JavaScript injected into each slide ──────────────────────────

DIAGNOSTIC_JS = """
() => {
    const results = { errors: [], warnings: [] };
    const slide = document.querySelector('.slide');
    if (!slide) {
        results.errors.push({ check: 'slide-missing', message: 'No .slide element found' });
        return results;
    }

    // Reset transform so we get true 1920x1080 coordinates
    slide.style.position = 'static';
    slide.style.transform = 'none';
    slide.style.top = '0';
    slide.style.left = '0';

    const CANVAS_W = 1920, CANVAS_H = 1080;
    const slideRect = slide.getBoundingClientRect();

    // Decorative class patterns to skip
    const DECO_PATTERNS = [
        'deco', 'bridge-hint', 'red-line', 'connector', 'divider',
        'btn-circle', 'dpad', 'plus-icon', 'minus-icon', 'b-dot',
        'progress-dot', 'dot-active', 'dot-done'
    ];

    function isDecorative(el) {
        const cls = el.className || '';
        if (typeof cls === 'string') {
            for (const pat of DECO_PATTERNS) {
                if (cls.includes(pat)) return true;
            }
        }
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none' && el.tagName === 'svg') return true;
        return false;
    }

    function hasText(el) {
        // Check if element has direct text content (not just from children)
        for (const node of el.childNodes) {
            if (node.nodeType === 3 && node.textContent.trim().length > 0) return true;
        }
        return false;
    }

    function hasAnyText(el) {
        return (el.innerText || '').trim().length > 0;
    }

    function getEffectiveBg(el) {
        let current = el;
        while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            const bg = style.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                return bg;
            }
            current = current.parentElement;
        }
        return 'rgb(245, 240, 235)'; // default --bg
    }

    function parseColor(str) {
        const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
    }

    function luminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    function contrastRatio(c1, c2) {
        const l1 = luminance(c1.r, c1.g, c1.b);
        const l2 = luminance(c2.r, c2.g, c2.b);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    function selectorPath(el) {
        const parts = [];
        let cur = el;
        while (cur && cur !== slide && parts.length < 4) {
            let s = cur.tagName.toLowerCase();
            if (cur.className && typeof cur.className === 'string') {
                const cls = cur.className.split(' ').filter(c => c).slice(0, 2).join('.');
                if (cls) s += '.' + cls;
            }
            parts.unshift(s);
            cur = cur.parentElement;
        }
        return parts.join(' > ');
    }

    // ── CHECK 1: Canvas overflow ──────────────────────────────────────────
    const allEls = slide.querySelectorAll('*');
    for (const el of allEls) {
        if (isDecorative(el)) continue;
        if (!hasAnyText(el) && el.tagName !== 'IMG') continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) continue;

        const r = el.getBoundingClientRect();
        const relTop = r.top - slideRect.top;
        const relLeft = r.left - slideRect.left;
        const relBottom = relTop + r.height;
        const relRight = relLeft + r.width;

        const overflows = {};
        if (relTop < -10) overflows.top = Math.round(-relTop);
        if (relLeft < -10) overflows.left = Math.round(-relLeft);
        if (relBottom > CANVAS_H + 10) overflows.bottom = Math.round(relBottom - CANVAS_H);
        if (relRight > CANVAS_W + 10) overflows.right = Math.round(relRight - CANVAS_W);

        if (Object.keys(overflows).length > 0) {
            results.errors.push({
                check: 'canvas-overflow',
                element: selectorPath(el),
                overflows: overflows,
                message: `Element overflows canvas: ${JSON.stringify(overflows)}px`
            });
        }
    }

    // ── CHECK 2: Flex/Grid children overflow ──────────────────────────────
    for (const el of allEls) {
        const style = window.getComputedStyle(el);
        if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) continue;
        if (el.offsetHeight === 0) continue;

        const diff = el.scrollHeight - el.clientHeight;
        if (diff > 10) {
            results.errors.push({
                check: 'flex-overflow',
                element: selectorPath(el),
                overflow_px: Math.round(diff),
                message: `Flex/grid container content overflows by ${Math.round(diff)}px`
            });
        }
    }

    // ── CHECK 3: Text occlusion (hidden behind siblings) ──────────────────
    for (const el of allEls) {
        if (!hasText(el)) continue;
        if (isDecorative(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (parseFloat(style.opacity) < 0.1) continue;
        if (parseFloat(style.fontSize) < 10) continue;

        const r = el.getBoundingClientRect();
        if (r.width < 5 || r.height < 5) continue;

        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const points = [
            [cx, cy],
            [r.left + 5, r.top + 5],
            [r.right - 5, r.top + 5],
            [r.left + 5, r.bottom - 5],
            [r.right - 5, r.bottom - 5]
        ];

        let hits = 0;
        for (const [px, py] of points) {
            const topEl = document.elementFromPoint(px, py);
            if (topEl && (topEl === el || el.contains(topEl) || topEl.contains(el))) {
                hits++;
            }
        }

        if (hits === 0) {
            results.errors.push({
                check: 'text-occluded',
                element: selectorPath(el),
                text: (el.innerText || '').substring(0, 50),
                message: `Text fully hidden behind other elements`
            });
        } else if (hits <= 2) {
            results.warnings.push({
                check: 'text-partial-occluded',
                element: selectorPath(el),
                visible_points: hits + '/5',
                message: `Text partially hidden (${hits}/5 sample points visible)`
            });
        }
    }

    // ── CHECK 4: Contrast ratio ───────────────────────────────────────────
    for (const el of allEls) {
        if (!hasText(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        if (parseFloat(style.opacity) < 0.1) continue;

        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 10) continue;

        const fgColor = parseColor(style.color);
        const bgStr = getEffectiveBg(el);
        const bgColor = parseColor(bgStr);
        if (!fgColor || !bgColor) continue;

        // Apply opacity
        let totalOpacity = 1;
        let cur = el;
        while (cur && cur !== document.body) {
            totalOpacity *= parseFloat(window.getComputedStyle(cur).opacity);
            cur = cur.parentElement;
        }
        // Alpha-blend fg onto bg
        const effectiveA = fgColor.a * totalOpacity;
        const blended = {
            r: Math.round(effectiveA * fgColor.r + (1 - effectiveA) * bgColor.r),
            g: Math.round(effectiveA * fgColor.g + (1 - effectiveA) * bgColor.g),
            b: Math.round(effectiveA * fgColor.b + (1 - effectiveA) * bgColor.b)
        };

        const ratio = contrastRatio(blended, bgColor);
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && parseInt(style.fontWeight) >= 700);
        const isSource = (el.className || '').includes('source');

        const threshold = isLargeText ? 3.0 : 4.5;

        if (!isSource && ratio < threshold) {
            results.warnings.push({
                check: 'low-contrast',
                element: selectorPath(el),
                ratio: Math.round(ratio * 100) / 100,
                required: threshold,
                fontSize: Math.round(fontSize),
                message: `Low contrast ratio ${ratio.toFixed(2)}:1 (needs ${threshold}:1)`
            });
        }
    }

    // ── CHECK 5: Font size minimum ────────────────────────────────────────
    for (const el of allEls) {
        if (!hasText(el)) continue;
        if (isDecorative(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const fontSize = parseFloat(style.fontSize);
        const isSource = (el.className || '').includes('source');
        const letterSpacing = parseFloat(style.letterSpacing) || 0;
        const isLabel = letterSpacing > 1; // > ~0.08em at 14px

        if (!isSource && !isLabel && fontSize < 12) {
            results.errors.push({
                check: 'font-too-small',
                element: selectorPath(el),
                fontSize: Math.round(fontSize),
                text: (el.innerText || '').substring(0, 40),
                message: `Font size ${Math.round(fontSize)}px is below 12px minimum`
            });
        } else if (!isSource && !isLabel && fontSize < 14) {
            results.warnings.push({
                check: 'font-small',
                element: selectorPath(el),
                fontSize: Math.round(fontSize),
                message: `Font size ${Math.round(fontSize)}px is below 14px recommendation`
            });
        }

        // Long text at small size
        const textLen = (el.innerText || '').trim().length;
        if (!isSource && fontSize < 16 && textLen > 50) {
            results.warnings.push({
                check: 'small-font-long-text',
                element: selectorPath(el),
                fontSize: Math.round(fontSize),
                textLength: textLen,
                message: `${textLen} chars at ${Math.round(fontSize)}px - hard to read`
            });
        }
    }

    // ── CHECK 6: SVG viewBox distortion ───────────────────────────────────
    const svgs = slide.querySelectorAll('svg');
    for (const svg of svgs) {
        if (isDecorative(svg)) continue;
        const vb = svg.getAttribute('viewBox');
        if (!vb) continue;

        const parts = vb.split(/[\\s,]+/).map(Number);
        if (parts.length !== 4 || parts[2] === 0 || parts[3] === 0) continue;

        const vbRatio = parts[2] / parts[3];
        const renderedW = svg.clientWidth || svg.offsetWidth;
        const renderedH = svg.clientHeight || svg.offsetHeight;
        if (renderedW === 0 || renderedH === 0) continue;

        const renderRatio = renderedW / renderedH;
        const deviation = Math.abs(vbRatio - renderRatio) / vbRatio;

        if (deviation > 0.15) {
            results.warnings.push({
                check: 'svg-distortion',
                element: selectorPath(svg),
                viewBoxRatio: Math.round(vbRatio * 100) / 100,
                renderRatio: Math.round(renderRatio * 100) / 100,
                deviation: Math.round(deviation * 100) + '%',
                message: `SVG aspect ratio mismatch: viewBox ${vbRatio.toFixed(2)} vs rendered ${renderRatio.toFixed(2)} (${Math.round(deviation * 100)}% off)`
            });
        }
    }

    // ── CHECK 7: Banned CSS properties ────────────────────────────────────
    for (const el of allEls) {
        const style = window.getComputedStyle(el);

        // backdrop-filter
        const bf = style.backdropFilter || style.webkitBackdropFilter || '';
        if (bf && bf !== 'none') {
            results.warnings.push({
                check: 'banned-css',
                property: 'backdrop-filter',
                element: selectorPath(el),
                message: `backdrop-filter detected - breaks PDF export`
            });
        }

        // text-shadow with blur
        const ts = style.textShadow || '';
        if (ts && ts !== 'none') {
            // text-shadow: h v blur color — check if blur > 2px
            const blurMatch = ts.match(/\\d+px\\s+\\d+px\\s+(\\d+)px/);
            if (blurMatch && parseInt(blurMatch[1]) > 2) {
                results.warnings.push({
                    check: 'banned-css',
                    property: 'text-shadow',
                    element: selectorPath(el),
                    message: `text-shadow with blur > 2px - creates PDF artifacts`
                });
            }
        }

        // box-shadow on small elements
        const bs = style.boxShadow || '';
        if (bs && bs !== 'none') {
            const area = el.offsetWidth * el.offsetHeight;
            if (area < 10000 && area > 0) {
                const blurM = bs.match(/\\d+px\\s+\\d+px\\s+(\\d+)px/);
                if (blurM && parseInt(blurM[1]) > 0) {
                    results.warnings.push({
                        check: 'banned-css',
                        property: 'box-shadow',
                        element: selectorPath(el),
                        area: area,
                        message: `box-shadow with blur on small element (${area}px²) - PDF artifact risk`
                    });
                }
            }
        }
    }

    // ── CHECK 8: Korean keep-all overflow ─────────────────────────────────
    for (const el of allEls) {
        if (!hasAnyText(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.wordBreak === 'keep-all' && el.scrollWidth > el.clientWidth + 5) {
            results.warnings.push({
                check: 'korean-overflow',
                element: selectorPath(el),
                overflow_px: Math.round(el.scrollWidth - el.clientWidth),
                message: `Korean text with keep-all overflows by ${Math.round(el.scrollWidth - el.clientWidth)}px`
            });
        }
    }

    // ── CHECK 9: Empty content containers ─────────────────────────────────
    const contentSelectors = '.card-title, .card-desc, .insight-text, .action-title, .body-text, .hero-number, .hero-label';
    for (const el of slide.querySelectorAll(contentSelectors)) {
        if ((el.innerText || '').trim().length === 0 && !el.querySelector('img, svg')) {
            results.warnings.push({
                check: 'empty-content',
                element: selectorPath(el),
                message: `Empty content container`
            });
        }
    }

    // ── CHECK 10: Sibling overlap ─────────────────────────────────────────
    const containers = slide.querySelectorAll('*');
    for (const container of containers) {
        const style = window.getComputedStyle(container);
        if (!['flex', 'inline-flex', 'grid', 'inline-grid', 'block'].includes(style.display)) continue;

        const children = Array.from(container.children).filter(ch => {
            if (isDecorative(ch)) return false;
            if (ch.offsetWidth === 0 && ch.offsetHeight === 0) return false;
            const s = window.getComputedStyle(ch);
            if (s.display === 'none' || s.position === 'absolute' || s.position === 'fixed') return false;
            return true;
        });

        for (let i = 0; i < children.length; i++) {
            for (let j = i + 1; j < children.length; j++) {
                const r1 = children[i].getBoundingClientRect();
                const r2 = children[j].getBoundingClientRect();

                const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
                const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
                const overlapArea = overlapX * overlapY;

                if (overlapArea > 100) {
                    results.errors.push({
                        check: 'sibling-overlap',
                        element1: selectorPath(children[i]),
                        element2: selectorPath(children[j]),
                        overlapArea: Math.round(overlapArea),
                        message: `Siblings overlap by ${Math.round(overlapArea)}px² area`
                    });
                }
            }
        }
    }

    return results;
}
"""


async def check_slide(browser, slide_path, slide_num):
    """Check a single slide and return diagnostics."""
    page = await browser.new_page(viewport={"width": 1920, "height": 1080})

    file_url = f"file:///{os.path.abspath(slide_path).replace(os.sep, '/')}"
    await page.goto(file_url, wait_until="networkidle")

    # Wait for fonts
    await page.evaluate("() => document.fonts.ready")
    # Small delay for rendering
    await page.wait_for_timeout(300)

    # Run diagnostics
    results = await page.evaluate(DIAGNOSTIC_JS)
    await page.close()

    return {"slide": slide_num, "file": os.path.basename(slide_path), **results}


async def main():
    # Find slide files
    slide_files = sorted(glob.glob("slide-*.html"), key=lambda f: int(f.split("-")[1].split(".")[0]))
    if not slide_files:
        print("No slide-*.html files found in current directory.")
        sys.exit(2)

    print(f"[CHECK] Checking {len(slide_files)} slides...\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        all_results = []
        for sf in slide_files:
            num = int(sf.split("-")[1].split(".")[0])
            result = await check_slide(browser, sf, num)
            all_results.append(result)

        await browser.close()

    # ── Report ─────────────────────────────────────────────────────────────
    total_errors = 0
    total_warnings = 0
    problem_slides = []

    for r in all_results:
        errors = r.get("errors", [])
        warnings = r.get("warnings", [])

        if errors or warnings:
            problem_slides.append(r["slide"])
            print(f"=== Slide {r['slide']} ({r['file']}) ━━━")

            for e in errors:
                print(f"  [ERROR] [{e['check']}] {e['message']}")
                if 'element' in e:
                    print(f"     -> {e['element']}")
                total_errors += 1

            for w in warnings:
                print(f"  [WARN] [{w['check']}] {w['message']}")
                if 'element' in w:
                    print(f"     -> {w['element']}")
                total_warnings += 1

            print()

    # ── Summary ────────────────────────────────────────────────────────────
    print("=======================================")
    print(f"[SUMMARY] Results: {len(slide_files)} slides checked")
    print(f"   [ERROR] Errors:   {total_errors}")
    print(f"   [WARN] Warnings: {total_warnings}")

    if problem_slides:
        print(f"   [SLIDES] Problem slides: {', '.join(str(s) for s in problem_slides)}")
    else:
        print(f"   [OK] All slides passed!")

    print("=======================================")

    # Save JSON report
    report_path = "qa-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\n[FILE] Full report saved to {report_path}")

    if total_errors > 0:
        sys.exit(1)
    elif total_warnings > 0:
        sys.exit(0)  # warnings don't fail
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
