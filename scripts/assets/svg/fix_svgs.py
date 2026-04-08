import os
import glob
import re

svg_files = glob.glob('/home/radxa/projects/portfolio/public/images/**/*.svg', recursive=True)

def fix_svg_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Common fixes for text bounding and overflow
    
    # 1. Broaden dimensions to prevent truncation if width/height are tight
    # We increase width of root SVG to ensure right-side text has space if it was overflowing.
    # Note: Only touch viewBox if it exists.
    
    # This script will take a simpler approach:
    # We will increase the width of <rect class="cmd-box">, <rect class="panel">, etc in the cheat sheets
    content = content.replace('width="602"', 'width="900"') # Command boxes
    content = content.replace('width="670"', 'width="980"') # Panels
    content = content.replace('width="1420"', 'width="2000"') # Headers
    content = content.replace('x2="636"', 'x2="950"') # Rules
    
    # Let's adjust root viewbox if it looks like the old cheat sheet dimensions
    content = content.replace('width="1600"', 'width="2200"')
    content = content.replace('height="2000"', 'height="2050"')
    content = content.replace('height="2200"', 'height="2200"')
    content = content.replace('viewBox="0 0 1600 2000"', 'viewBox="0 0 2200 2050"')
    content = content.replace('viewBox="0 0 1600 2200"', 'viewBox="0 0 2200 2200"')
    
    # Shift right column if any
    content = content.replace('translate(840', 'translate(1140')
    
    # Remove any stray "SHARING NOTE" or "class=\"note\"" tags if still present
    content = re.sub(r'<g[^>]*>\s*<rect[^>]*class="chip"[^>]*>.*?</g>', '', content, flags=re.DOTALL) 
    # Actually, we shouldn't delete the chip blindly. Just notes.
    content = re.sub(r'<text[^>]*class="note"[^>]*>.*?</text>', '', content, flags=re.DOTALL)
    content = re.sub(r'<g transform="translate\([^)]*\)">\s*<rect[^>]*>\s*<text[^>]*>SHARING NOTE.*?</g>', '', content, flags=re.DOTALL)
    
    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

modified_count = 0
for svg in svg_files:
    if fix_svg_file(svg):
        modified_count += 1
        print(f"Modified: {svg}")

print(f"Total SVGs modified: {modified_count}")
