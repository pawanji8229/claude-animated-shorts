#!/usr/bin/env python3
"""Append the user customization to an existing upstream SKILL.md while preserving all existing lines."""
from pathlib import Path
import sys
skill = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('SKILL.md')
addon = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('SKILL_ADDENDUM.md')
marker = '## Mobile cinematic reference override (user project)'
if not skill.is_file() or not addon.is_file():
    raise SystemExit('Need existing SKILL.md and SKILL_ADDENDUM.md in current directory')
old = skill.read_text(encoding='utf-8')
if marker in old:
    print('Already appended; unchanged.')
else:
    backup=skill.with_suffix('.md.original.bak')
    if not backup.exists():
        backup.write_text(old,encoding='utf-8')
    skill.write_text(old.rstrip()+'\n\n---\n\n'+addon.read_text(encoding='utf-8'),encoding='utf-8')
    print(f'Appended addendum. Original backup: {backup}')
