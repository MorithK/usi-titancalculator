#!/usr/bin/env python3
"""Download original assets from the Unnamed Space Idle wiki icon repository.

Usage (from a React/Vite project root):
    python collect_usi_icons.py
    python collect_usi_icons.py --project C:/path/to/my-app
    python collect_usi_icons.py --archive C:/Downloads/usi-wiki-master.zip

The script uses only Python's standard library. It does not modify any React or
Supabase files and will not overwrite existing assets unless --overwrite is set.
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
import shutil
import sys
import urllib.error
import urllib.request
from zipfile import ZipFile

ARCHIVE_URL = "https://github.com/StuntHacks/usi-wiki/archive/refs/heads/master.zip"
SOURCE_REPO = "https://github.com/StuntHacks/usi-wiki"

# Only exact matching filenames are used: no invented/fuzzy icon associations.
RESOURCE_CANDIDATES = {
    "capital": ["CapitalFragment.svg", "CapitalResource.svg"],
    "veil": ["VeilFragment.svg"],
    "antum": ["AntumFragment.svg"],
    "penum": ["PenumFragment.svg"],
    "zephyrion": ["Alien_Zephyrion.svg"],
    "yttaldar": ["Alien_Yttaldar.svg"],
    "xyloquant": ["Alien_Xyloquant.svg"],
    "wraithtex": ["Alien_Wraithtex.svg"],
    "verdanix": ["Alien_Verdanix.svg"],
}

ATTRIBUTION = """# Icon sources and attribution

Icons collected from the Unnamed Space Idle community wiki's source repository:
- https://github.com/StuntHacks/usi-wiki
- https://spaceidle.game-vault.net/wiki/Internal:Icons

The repository README states that **almost all** icons originate from
https://game-icons.net/ and are distributed under **CC BY 3.0**.
See https://creativecommons.org/licenses/by/3.0/ for the license.

When publishing these icons in your application, provide an attribution link
back to the wiki repository and game-icons.net and preserve any existing
attribution/license metadata. Some individual files may have different rights;
verify those before public redistribution. This script makes no changes to
any source icon artwork.
"""


def get_archive(archive_path: Path | None) -> bytes:
    if archive_path:
        print(f"Reading downloaded archive: {archive_path}")
        return archive_path.read_bytes()
    print(f"Downloading wiki icon source from: {ARCHIVE_URL}")
    request = urllib.request.Request(
        ARCHIVE_URL,
        headers={"User-Agent": "usi-titan-calculator-icon-collector/1.0"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path.cwd(), help="React project directory (default: current folder)")
    parser.add_argument("--archive", type=Path, help="Local GitHub source ZIP, for offline extraction")
    parser.add_argument("--overwrite", action="store_true", help="Replace existing icon files")
    args = parser.parse_args()
    project = args.project.resolve()
    if not (project / "package.json").is_file():
        print(f"ERROR: {project} does not contain package.json. Run this from your React project root or use --project.", file=sys.stderr)
        return 2

    try:
        payload = get_archive(args.archive)
        archive = ZipFile(io.BytesIO(payload))
    except (OSError, urllib.error.URLError, ValueError) as exc:
        print("ERROR: Unable to access GitHub's source ZIP.", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        print(f"Download it manually from {ARCHIVE_URL} and run with --archive <zip-file>.", file=sys.stderr)
        return 1

    root = project / "public" / "images" / "usi-icons"
    file_index: dict[str, list[Path]] = {}
    extracted: list[str] = []
    skipped = 0
    with archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            pieces = Path(member.filename).parts
            if len(pieces) < 3 or pieces[1] not in ("svg", "png"):
                continue
            subpath = Path(*pieces[1:])
            if subpath.suffix.lower() not in (".svg", ".png") or ".." in subpath.parts:
                continue
            destination = root / subpath
            # Extra defense in depth for untrusted ZIP member paths.
            if not destination.resolve().is_relative_to(root.resolve()):
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            if destination.exists() and not args.overwrite:
                skipped += 1
            else:
                with archive.open(member) as src, destination.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted.append(subpath.as_posix())
            file_index.setdefault(subpath.name.casefold(), []).append(destination)

    # Copy exact named resources to a simple URL path convenient for React.
    resource_dir = project / "public" / "images" / "resources"
    resource_dir.mkdir(parents=True, exist_ok=True)
    aliases: dict[str, str] = {}
    not_found: list[str] = []
    for resource, candidates in RESOURCE_CANDIDATES.items():
        match = next((file_index[name.casefold()][0]
                      for name in candidates if name.casefold() in file_index), None)
        if not match:
            not_found.append(resource)
            continue
        target = resource_dir / f"{resource}{match.suffix.lower()}"
        if not target.exists() or args.overwrite:
            shutil.copyfile(match, target)
        aliases[resource] = target.relative_to(project / "public").as_posix()

    root.mkdir(parents=True, exist_ok=True)
    (root / "ATTRIBUTION.md").write_text(ATTRIBUTION, encoding="utf-8")
    manifest = {
        "source": SOURCE_REPO,
        "resource_aliases": aliases,
        "missing_resource_aliases": not_found,
        "all_icons": sorted(str(p.relative_to(root).as_posix())
                            for files in file_index.values() for p in files),
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"\nOriginal icons indexed: {len(manifest['all_icons'])}")
    print(f"New files extracted:   {len(extracted)}; skipped existing: {skipped}")
    print(f"All source assets:     {root}")
    print(f"Resource shortcuts:    {resource_dir}")
    print("\nResource icon mappings:")
    for resource in RESOURCE_CANDIDATES:
        print(f"  {resource:<12} {aliases.get(resource, 'NOT FOUND (choose manually from manifest.json)')}")
    print("\nCheck ATTRIBUTION.md before publishing icons. No database changes were made.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
