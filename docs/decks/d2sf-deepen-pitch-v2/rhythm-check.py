#!/usr/bin/env python3
"""
rhythm-check.py — Deck rhythm + editorial quota inspector.

Counts visual elements on every slide and checks them against the
human_ppt quotas:

  - Card boxes on <= 60% of slides
  - Callouts on <= 40% of slides
  - Hero numbers (>= 96px font-size) <= 3 slides total
  - Overlines on only a minority of slides (section-opening)
  - Accent-colour elements <= 2 per slide

Also reports the tier sequence if plan.md annotates each slide with a
"tier" field in the slide planning section (Dense / Editorial / Breath).

Usage:   python3 rhythm-check.py           (run inside a deck folder)

Requires: playwright + chromium (same as check_slides.py).
  pip install playwright && playwright install chromium
"""

import json
import re
import sys
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("rhythm-check: playwright not installed. Run `pip install playwright && playwright install chromium`.")
    sys.exit(1)


DECK = Path(".").resolve()
SLIDE_FILES = sorted(DECK.glob("slide-*.html"), key=lambda p: int(re.search(r"slide-(\d+)", p.name).group(1)))


def inspect_slide(page, url: str) -> dict:
    page.goto(url)
    page.wait_for_load_state("networkidle")
    return page.evaluate("""
        () => {
            const slide = document.querySelector('.slide');
            if (!slide) return {error: 'no .slide found'};
            const q = (sel) => Array.from(slide.querySelectorAll(sel));

            // Count "filled card" elements (anything with a meaningful background or a left-accent border)
            const allElems = Array.from(slide.querySelectorAll('*'));
            let cards = 0, callouts = 0, heroes = 0, overlines = 0, accentMoments = 0;

            const styleOf = (el) => window.getComputedStyle(el);
            const rgb = (s) => {
                const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
                const p = m[1].split(',').map(x => parseFloat(x));
                return {r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3]};
            };
            const isAccentColor = (rgbObj) => {
                if (!rgbObj || rgbObj.a < 0.05) return false;
                const {r, g, b} = rgbObj;
                // Accent = reasonably saturated, not pure black/white/grey
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                const saturation = max === 0 ? 0 : (max - min) / max;
                return saturation > 0.25 && max > 60 && !(r > 220 && g > 220 && b > 220);
            };

            for (const el of allElems) {
                const s = styleOf(el);
                const cls = (el.className && typeof el.className === 'string') ? el.className : '';

                // Cards: explicit .card / .card-filled classes, OR elements with a filled bg AND padding >= 16px
                if (/\\bcard(-filled)?\\b/.test(cls)) cards++;
                else {
                    const bg = rgb(s.backgroundColor);
                    const padV = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
                    const padH = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
                    if (bg && bg.a > 0.08 && padV >= 16 && padH >= 20 && el.offsetWidth > 160 && el.offsetHeight > 80) {
                        // Filter out slide-frame / slide background itself
                        if (!el.classList.contains('slide') && !el.classList.contains('slide-frame')) {
                            cards++;
                        }
                    }
                }

                // Callouts: left-border + tinted background OR .callout class
                if (/\\bcallout\\b/.test(cls)) callouts++;

                // Hero numbers: font-size >= 96px on a text-bearing element
                const fs = parseFloat(s.fontSize);
                if (fs >= 96 && el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 30) {
                    // direct-text elements only (avoid double counting wrapper)
                    const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
                    if (hasDirectText) heroes++;
                }

                // Overlines: .overline / .overline-sc / slide-overline class
                if (/overline/.test(cls)) overlines++;

                // Accent-colour moments (text colour or border colour is saturated)
                if (el.offsetWidth > 0 && el.offsetHeight > 0) {
                    const tc = rgb(s.color);
                    const hasText = el.textContent && el.textContent.trim().length > 0;
                    if (hasText && isAccentColor(tc)) accentMoments++;
                    const bl = rgb(s.borderLeftColor);
                    if (parseFloat(s.borderLeftWidth) >= 2 && isAccentColor(bl)) accentMoments++;
                }
            }

            return {
                cards, callouts, heroes, overlines, accentMoments,
                title: document.title || ''
            };
        }
    """)


def parse_tier_from_plan(plan_path: Path) -> list:
    """Extract tier assignments from plan.md if present."""
    if not plan_path.exists():
        return []
    text = plan_path.read_text(encoding="utf-8", errors="ignore")
    # Look for "- **밀도 티어**: Dense" or "- **Tier**: Dense" per slide
    tiers = []
    for block in re.split(r"(?m)^###\s+슬라이드\s+\d+|^###\s+Slide\s+\d+", text)[1:]:
        m = re.search(r"(?:밀도\s*티어|Tier)\W*[:\s]+(\w+)", block, re.IGNORECASE)
        tiers.append((m.group(1).capitalize() if m else "?"))
    return tiers


def main():
    files = SLIDE_FILES
    if not files:
        print("rhythm-check: no slide-*.html files found.")
        sys.exit(1)

    tiers = parse_tier_from_plan(DECK / "plan.md")
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        for i, f in enumerate(files, 1):
            url = f"file:///{f.as_posix()}"
            r = inspect_slide(page, url)
            r["slide"] = i
            r["file"] = f.name
            r["tier"] = tiers[i-1] if i-1 < len(tiers) else "?"
            results.append(r)
            print(f"  [{i:>2}] {f.name}  "
                  f"tier={r['tier']:<9} "
                  f"cards={r.get('cards',0):<2} "
                  f"callouts={r.get('callouts',0):<2} "
                  f"heroes={r.get('heroes',0):<2} "
                  f"overlines={r.get('overlines',0):<2} "
                  f"accent-moments={r.get('accentMoments',0)}")
        browser.close()

    n = len(results)
    tier_seq = "".join((r["tier"][0] if r["tier"] in ("Dense", "Editorial", "Breath") else "?") for r in results)
    pct_card = sum(1 for r in results if r.get("cards", 0) >= 1) / n * 100
    pct_callout = sum(1 for r in results if r.get("callouts", 0) >= 1) / n * 100
    total_heroes = sum(r.get("heroes", 0) for r in results)
    slides_with_hero = sum(1 for r in results if r.get("heroes", 0) >= 1)
    slides_with_overline = sum(1 for r in results if r.get("overlines", 0) >= 1)

    print()
    print("========== RHYTHM REPORT ==========")
    print(f"Slides                 : {n}")
    print(f"Tier sequence          : {tier_seq}")
    print(f"  Dense / Editorial / Breath counts: "
          f"{tier_seq.count('D')} / {tier_seq.count('E')} / {tier_seq.count('B')}")

    # Quotas
    violations = []
    if pct_card > 60:
        violations.append(f"Cards on {pct_card:.0f}% of slides (quota: ≤60%)")
    if pct_callout > 40:
        violations.append(f"Callouts on {pct_callout:.0f}% of slides (quota: ≤40%)")
    if slides_with_hero > 3:
        violations.append(f"Hero numbers on {slides_with_hero} slides (quota: ≤3)")

    # 3-in-a-row Dense check
    if re.search(r"D{3,}", tier_seq):
        violations.append("3+ consecutive Dense slides (rhythm violation)")

    # At least one Breath per half
    half = n // 2
    if "B" not in tier_seq[:half]:
        violations.append("No Breath slide in the first half of the deck")
    if "B" not in tier_seq[half:]:
        violations.append("No Breath slide in the second half of the deck")

    # Accent moments per slide
    for r in results:
        if r.get("accentMoments", 0) > 2:
            violations.append(f"Slide {r['slide']}: {r['accentMoments']} accent-colour moments (quota: ≤2)")

    print()
    print(f"Cards quota           : {pct_card:.0f}%  (≤60%)  {'OK' if pct_card <= 60 else 'FAIL'}")
    print(f"Callouts quota        : {pct_callout:.0f}%  (≤40%)  {'OK' if pct_callout <= 40 else 'FAIL'}")
    print(f"Hero-number slides    : {slides_with_hero}  (≤3)    {'OK' if slides_with_hero <= 3 else 'FAIL'}")
    print(f"Overline slides       : {slides_with_overline}  (should be few — ideally section-openers only)")
    print()

    if violations:
        print(f"❌ {len(violations)} violation(s):")
        for v in violations:
            print(f"   - {v}")
    else:
        print("✅ All quotas satisfied.")

    (DECK / "rhythm-report.json").write_text(
        json.dumps({"slides": results, "tier_seq": tier_seq,
                    "violations": violations}, indent=2),
        encoding="utf-8")
    print()
    print("Full report: rhythm-report.json")


if __name__ == "__main__":
    main()
