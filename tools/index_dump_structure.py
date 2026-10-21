#!/usr/bin/env python3
"""
FFBE Asset Dump Indexer
Scans ffbe_asset_dump-main and generates docs/asset_structure.md.
"""

import os
import sys
import subprocess

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mjs_script = os.path.join(script_dir, "index_dump_structure.mjs")
    
    # Delegate to node runner
    res = subprocess.run(["node", mjs_script], capture_output=False)
    sys.exit(res.returncode)

if __name__ == "__main__":
    main()
