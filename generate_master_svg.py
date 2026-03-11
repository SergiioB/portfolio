import sys

def escape_xml(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

colors = {
    "bg": "#24273a",
    "surface0": "#363a4f",
    "surface1": "#494d64",
    "surface2": "#5b6078",
    "text": "#cad3f5",
    "subtext0": "#a5adcb",
    "red": "#ed8796",
    "green": "#a6da95",
    "yellow": "#eed49f",
    "blue": "#8aadf4",
    "mauve": "#c6a0f6",
    "teal": "#8bd5ca",
    "peach": "#f5a97f"
}

sections = [
    {
        "title": "File & Directory Management",
        "color": colors["blue"],
        "commands": [
            ("ls -lah", "List all files with details & hidden files"),
            ("mkdir -p a/b/c", "Create nested directories"),
            ("rm -rf dir/", "Remove directory recursively"),
            ("cp -r src/ dest/", "Copy recursively"),
            ("mv old new", "Move or rename file/directory"),
            ("find . -name '*.txt'", "Find files by name"),
            ("tree -L 2", "List directory in tree format"),
            ("tar -czvf arc.tar.gz dir/", "Compress directory"),
            ("tar -xzvf arc.tar.gz", "Extract archive"),
        ]
    },
    {
        "title": "Text Processing & Search",
        "color": colors["teal"],
        "commands": [
            ("grep -rnw . -e 'pattern'", "Search recursively for a string"),
            ("grep -i 'pattern' file", "Case-insensitive search"),
            ("sed -i 's/old/new/g' file", "Inline find and replace"),
            ("awk '{print $1}' file", "Print first column of a file"),
            ("cut -d':' -f1 /etc/passwd", "Extract specific fields"),
            ("sort -n -r file", "Sort numerically in reverse"),
            ("uniq -c", "Count unique lines"),
            ("wc -l file", "Count lines in a file"),
            ("head -n 20 file", "View first 20 lines"),
            ("tail -f /var/log/syslog", "Follow log file in real-time"),
        ]
    },
    {
        "title": "System & Process Monitoring",
        "color": colors["green"],
        "commands": [
            ("top / htop", "Interactive process viewer"),
            ("ps aux | grep process", "Find a specific process"),
            ("kill -9 <PID>", "Force kill a process"),
            ("free -h", "Show available memory"),
            ("df -h", "Show disk space usage"),
            ("du -sh *", "Size of files/directories in current dir"),
            ("uptime", "System uptime and load average"),
            ("dmesg -w", "Follow kernel messages"),
            ("journalctl -u nginx", "View logs for a specific service"),
            ("lsof -i :80", "List open files on port 80"),
        ]
    },
    {
        "title": "Network Troubleshooting",
        "color": colors["peach"],
        "commands": [
            ("ping -c 4 host", "Check connectivity to host"),
            ("curl -I https://url", "Fetch HTTP headers"),
            ("curl -sL https://url", "Fetch following redirects silently"),
            ("wget -c https://url", "Continue broken download"),
            ("ip a", "Show IP addresses"),
            ("ip route show", "Show routing table"),
            ("netstat -tulnp", "Show listening ports and PIDs"),
            ("ss -tulnp", "Modern alternative to netstat"),
            ("dig domain.com", "DNS lookup"),
            ("nc -vz host 80", "Check if port is open (TCP)"),
            ("traceroute host", "Trace path to host"),
        ]
    },
    {
        "title": "User & Permission Management",
        "color": colors["yellow"],
        "commands": [
            ("chmod 755 file", "Change file permissions (rwxr-xr-x)"),
            ("chmod -R 644 dir/", "Change recursively (files)"),
            ("chown user:group file", "Change file owner and group"),
            ("chown -R user:group dir", "Change owner recursively"),
            ("usermod -aG group user", "Add user to a group"),
            ("passwd user", "Change user password"),
            ("id user", "Show user and group IDs"),
            ("whoami", "Print current effective user id"),
            ("sudo visudo", "Safely edit sudoers file"),
        ]
    },
    {
        "title": "Systemd & Services",
        "color": colors["mauve"],
        "commands": [
            ("systemctl start service", "Start a service"),
            ("systemctl stop service", "Stop a service"),
            ("systemctl restart service", "Restart a service"),
            ("systemctl reload service", "Reload configuration without restart"),
            ("systemctl status service", "Check service status"),
            ("systemctl enable service", "Enable service on boot"),
            ("systemctl disable service", "Disable service on boot"),
            ("systemctl daemon-reload", "Reload systemd manager config"),
            ("journalctl -xe", "Examine detailed error logs"),
        ]
    },
    {
        "title": "Git Version Control",
        "color": colors["red"],
        "commands": [
            ("git clone <url>", "Clone repository"),
            ("git status", "Show working tree status"),
            ("git add .", "Stage all changes"),
            ("git commit -m 'Msg'", "Commit staged changes"),
            ("git push origin main", "Push to remote branch"),
            ("git pull --rebase", "Fetch and rebase local branch"),
            ("git branch -a", "List all branches"),
            ("git checkout -b branch", "Create and switch to new branch"),
            ("git log --oneline", "View commit history concisely"),
            ("git reset --hard HEAD", "Discard all local changes"),
            ("git stash", "Stash uncommitted changes"),
        ]
    },
    {
        "title": "Python Virtual Environments",
        "color": colors["blue"],
        "commands": [
            ("python3 -m venv .venv", "Create a virtual environment"),
            ("source .venv/bin/activate", "Activate venv (Linux/macOS)"),
            ("deactivate", "Exit the virtual environment"),
            ("pip install -r reqs.txt", "Install requirements"),
            ("pip freeze > reqs.txt", "Save dependencies to file"),
            ("pip list", "List installed packages"),
            ("pip install --upgrade pip", "Upgrade pip itself"),
        ]
    },
    {
        "title": "Ansible Basics",
        "color": colors["teal"],
        "commands": [
            ("ansible all -m ping", "Ping all hosts in inventory"),
            ("ansible-playbook pb.yml", "Run a playbook"),
            ("ansible-playbook -i inv pb.yml", "Run with specific inventory"),
            ("ansible-playbook --check pb.yml", "Dry-run playbook"),
            ("ansible-playbook -K pb.yml", "Ask for privilege escalation pass"),
            ("ansible-doc -l", "List all available modules"),
            ("ansible-doc module_name", "Show documentation for module"),
            ("ansible-galaxy install role", "Install role from Galaxy"),
            ("ansible-inventory --list", "View inventory as JSON"),
        ]
    },
    {
        "title": "Ansible Vault",
        "color": colors["peach"],
        "commands": [
            ("ansible-vault create file", "Create encrypted file"),
            ("ansible-vault edit file", "Edit encrypted file"),
            ("ansible-vault view file", "View encrypted file without editing"),
            ("ansible-vault encrypt file", "Encrypt an existing file"),
            ("ansible-vault decrypt file", "Decrypt a file"),
            ("ansible-vault rekey file", "Change the vault password"),
            ("ansible-vault encrypt_string", "Encrypt a single string value"),
            ("ansible-playbook --ask-vault-pass", "Run playbook and ask vault pass"),
            ("ansible-playbook --vault-id", "Run playbook with vault ID file"),
        ]
    },
    {
        "title": "Ansible Molecule",
        "color": colors["green"],
        "commands": [
            ("molecule init role r_name", "Initialize new role with molecule"),
            ("molecule create", "Create instances"),
            ("molecule converge", "Run the playbook against instances"),
            ("molecule idempotence", "Check playbook idempotence"),
            ("molecule verify", "Run tests (e.g., Ansible Lint, Testinfra)"),
            ("molecule destroy", "Destroy instances"),
            ("molecule test", "Run full lifecycle"),
            ("molecule login", "Log into a running instance"),
        ]
    },
    {
        "title": "Docker Basics",
        "color": colors["yellow"],
        "commands": [
            ("docker build -t img .", "Build image from Dockerfile"),
            ("docker run -d -p 80:80 img", "Run container in background"),
            ("docker ps", "List running containers"),
            ("docker ps -a", "List all containers"),
            ("docker stop <ID>", "Stop a container"),
            ("docker rm <ID>", "Remove a container"),
            ("docker rmi <ID>", "Remove an image"),
            ("docker logs -f <ID>", "Follow container logs"),
            ("docker exec -it <ID> sh", "Open shell in container"),
            ("docker system prune -a", "Remove unused data"),
        ]
    },
    {
        "title": "Package Management",
        "color": colors["mauve"],
        "commands": [
            ("apt update", "Update package lists (Debian/Ubuntu)"),
            ("apt upgrade", "Upgrade packages"),
            ("apt install pkg", "Install package"),
            ("apt remove pkg", "Remove package"),
            ("yum check-update", "Check for updates (RHEL/CentOS)"),
            ("yum update", "Update packages"),
            ("yum install pkg", "Install package"),
            ("yum remove pkg", "Remove package"),
            ("dnf install pkg", "Install package (Modern RHEL/Fedora)"),
            ("pacman -Syu", "Full system upgrade (Arch Linux)"),
        ]
    },
    {
        "title": "Archives & Compression",
        "color": colors["blue"],
        "commands": [
            ("tar -cvf arc.tar dir/", "Create uncompressed tar archive"),
            ("tar -xvf arc.tar", "Extract tar archive"),
            ("tar -cjvf arc.tar.bz2 dir/", "Create bzip2 compressed archive"),
            ("gzip file", "Compress file (adds .gz)"),
            ("gunzip file.gz", "Decompress file"),
            ("zip -r arc.zip dir/", "Create zip archive"),
            ("unzip arc.zip", "Extract zip archive"),
            ("xz -z file", "Compress file with xz"),
            ("xz -d file.xz", "Decompress xz file"),
        ]
    },
]

# SVG Dimensions
WIDTH = 3200
HEIGHT = 3800

# Columns definition
NUM_COLS = 3
COL_WIDTH = 930
MARGIN_X = 100
MARGIN_Y = 100
START_Y = 250
SPACING_X = (WIDTH - 2 * MARGIN_X - NUM_COLS * COL_WIDTH) / (NUM_COLS - 1)

svg = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}" width="{WIDTH}" height="{HEIGHT}">',
    # Background
    f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{colors["bg"]}" />',
    # Title
    f'<text x="{WIDTH/2}" y="{MARGIN_Y + 60}" font-family="sans-serif" font-size="70" font-weight="bold" fill="{colors["text"]}" text-anchor="middle">The Comprehensive Linux Engineer Command List</text>',
    f'<line x1="{MARGIN_X}" y1="{MARGIN_Y + 120}" x2="{WIDTH - MARGIN_X}" y2="{MARGIN_Y + 120}" stroke="{colors["surface2"]}" stroke-width="4" />'
]

col_x = [MARGIN_X + i * (COL_WIDTH + SPACING_X) for i in range(NUM_COLS)]
col_y = [START_Y for _ in range(NUM_COLS)]

col_idx = 0

for section in sections:
    # Calculate section height
    padding_y = 30
    title_height = 60
    cmd_spacing = 70
    sec_height = padding_y * 2 + title_height + len(section["commands"]) * cmd_spacing
    
    # Check if section fits in current column
    if col_y[col_idx] + sec_height > HEIGHT - MARGIN_Y:
        col_idx += 1
        if col_idx >= NUM_COLS:
            col_idx = NUM_COLS - 1
            print(f"Warning: Section {section['title']} overflows the page.", file=sys.stderr)
            
    x = col_x[col_idx]
    y = col_y[col_idx]
    
    # Draw section box
    svg.append(f'<rect x="{x}" y="{y}" width="{COL_WIDTH}" height="{sec_height}" rx="15" fill="{colors["surface0"]}" stroke="{section["color"]}" stroke-width="3" />')
    
    # Section title
    svg.append(f'<text x="{x + 30}" y="{y + padding_y + 35}" font-family="sans-serif" font-size="36" font-weight="bold" fill="{section["color"]}">{escape_xml(section["title"])}</text>')
    
    # Line under title
    svg.append(f'<line x1="{x}" y1="{y + padding_y + 60}" x2="{x + COL_WIDTH}" y2="{y + padding_y + 60}" stroke="{colors["surface1"]}" stroke-width="2" />')
    
    # Commands
    cmd_y = y + padding_y + 60 + 50
    for cmd, desc in section["commands"]:
        # Command (monospace)
        svg.append(f'<text x="{x + 30}" y="{cmd_y}" font-family="monospace, Courier New" font-size="24" font-weight="bold" fill="{colors["text"]}">{escape_xml(cmd)}</text>')
        # Description (sans-serif)
        svg.append(f'<text x="{x + 480}" y="{cmd_y}" font-family="sans-serif" font-size="22" fill="{colors["subtext0"]}">{escape_xml(desc)}</text>')
        cmd_y += cmd_spacing
        
    col_y[col_idx] += sec_height + 40

svg.append('</svg>')

with open('/home/radxa/projects/portfolio/public/images/diagrams/new/full-linux-engineer-command-list.svg', 'w') as f:
    f.write('\n'.join(svg))

print("SVG successfully generated.")
