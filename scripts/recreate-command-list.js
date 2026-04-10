import fs from "fs/promises";

import puppeteer from "puppeteer";

const categories = [
  {
    title: "File & Directory Mgmt",
    items: [
      { cmd: "ls -lah", desc: "List all files with details & hidden files" },
      { cmd: "mkdir -p a/b/c", desc: "Create nested directories" },
      { cmd: "rm -rf dir/", desc: "Remove directory recursively" },
      { cmd: "cp -r src/ dest/", desc: "Copy recursively" },
      { cmd: "mv old new", desc: "Move or rename file/directory" },
      { cmd: "find . -name '*.txt'", desc: "Find files by name" },
      { cmd: "tree -L 2", desc: "List directory in tree format" },
      { cmd: "ln -s /src /dst", desc: "Create soft symlink" },
      { cmd: "readlink -f /dst", desc: "Resolve actual link path" },
      { cmd: "unlink /dst", desc: "Remove symlink safely" },
    ],
  },
  {
    title: "Text Processing & Search",
    items: [
      { cmd: "grep -rnw . -e 'pattern'", desc: "Search recursively for a string" },
      { cmd: "grep -i 'pattern' file", desc: "Case-insensitive search" },
      { cmd: "sed -i 's/old/new/g' file", desc: "Inline find and replace" },
      { cmd: "awk '{print $1}' file", desc: "Print first column of a file" },
      { cmd: "cut -d':' -f1 /etc/passwd", desc: "Extract specific fields" },
      { cmd: "sort -n -r file", desc: "Sort numerically in reverse" },
      { cmd: "uniq -c", desc: "Count unique lines" },
      { cmd: "wc -l file", desc: "Count lines in a file" },
      { cmd: "head -n 20 file", desc: "View first 20 lines" },
      { cmd: "tail -f /var/log/syslog", desc: "Follow log file in real-time" },
    ],
  },
  {
    title: "Archiving, Compress & Sync",
    items: [
      { cmd: "tar -czvf arc.tar.gz dir/", desc: "Compress directory" },
      { cmd: "tar -xzvf arc.tar.gz", desc: "Extract archive" },
      { cmd: "tar -cjvf arc.tar.bz2 dir/", desc: "Create bzip2 archive" },
      { cmd: "zip -r arc.zip dir/", desc: "Create zip archive" },
      { cmd: "unzip arc.zip", desc: "Extract zip archive" },
      { cmd: "xz -z file", desc: "Compress file with xz" },
      { cmd: "xz -d file.xz", desc: "Decompress xz file" },
      { cmd: "rsync -aAHSVx /src/ /dst/", desc: "Sync files/dirs with ACLs, sparse, xattrs" },
    ],
  },
  {
    title: "Network & Connectivity",
    items: [
      { cmd: "ping -c 4 host", desc: "Check connectivity to host" },
      { cmd: "curl -I https://url", desc: "Fetch HTTP headers" },
      { cmd: "curl -sL https://url", desc: "Fetch following redirects silently" },
      { cmd: "wget -c https://url", desc: "Continue broken download" },
      { cmd: "ip a", desc: "Show IP addresses" },
      { cmd: "ip route show", desc: "Show routing table" },
      { cmd: "ss -tulnp | grep LISTEN", desc: "Show listening ports and PIDs" },
      { cmd: "lsof -i :443", desc: "List open files on port 443" },
      { cmd: "dig +short domain.com A", desc: "DNS lookup for A record" },
      { cmd: "nc -vz host 80", desc: "Check if port is open (TCP)" },
      { cmd: "traceroute host", desc: "Trace path to host" },
      { cmd: "mtr host", desc: "Real-time traceroute and ping" },
      { cmd: "tcpdump -i any -nn -s0 -v port 80", desc: "Capture port 80 traffic" },
    ],
  },
  {
    title: "Firewalld & Iptables",
    items: [
      { cmd: "firewall-cmd --state", desc: "Check if firewalld is running" },
      { cmd: "firewall-cmd --list-all", desc: "List all active rules" },
      { cmd: "firewall-cmd --add-port=80/tcp --permanent", desc: "Open port permanently" },
      { cmd: "firewall-cmd --reload", desc: "Apply permanent firewall rules" },
      { cmd: "iptables -L -n -v", desc: "List iptables rules verbosely" },
      { cmd: "iptables -t nat -L -n -v", desc: "List NAT iptables rules" },
      { cmd: "iptables-save > rules.v4", desc: "Save iptables rules" },
      { cmd: "ufw status verbose", desc: "Check UFW status (Ubuntu)" },
    ],
  },
  {
    title: "System & Process Monitor",
    items: [
      { cmd: "top / htop", desc: "Interactive process viewer" },
      { cmd: "ps aux | grep process", desc: "Find a specific process" },
      { cmd: "kill -9 <PID>", desc: "Force kill a process" },
      { cmd: "free -m", desc: "Show available memory" },
      { cmd: "vmstat 1 5", desc: "Virtual memory statistics" },
      { cmd: "iostat -x 1 5", desc: "IO performance statistics" },
      { cmd: "sar -u 1 3", desc: "CPU Activity report" },
      { cmd: "uptime", desc: "System uptime and load average" },
      { cmd: "dmesg -T -w", desc: "Follow kernel messages with timestamps" },
      { cmd: "journalctl -u nginx", desc: "View logs for a specific service" },
      { cmd: "watch -n 1 'systemctl status svc'", desc: "Monitor service status live" },
    ],
  },
  {
    title: "Storage & Filesystems",
    items: [
      { cmd: "df -h", desc: "Show disk space usage" },
      { cmd: "du -sh * | sort -h", desc: "Size of current items sorted" },
      { cmd: "lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS", desc: "Detailed block devices list" },
      { cmd: "ncdu /srv/app", desc: "Interactive ncurses disk usage" },
      { cmd: "find /var/log -type f -size +1G", desc: "Find huge log files" },
      { cmd: "lsof +L1", desc: "List open files that have been deleted" },
    ],
  },
  {
    title: "LVM & Disk Expansion",
    items: [
      { cmd: "echo 1 > /sys/class/block/sdb/device/rescan", desc: "Rescan block device" },
      { cmd: "blockdev --getsize64 /dev/sda", desc: "Check raw block device size" },
      { cmd: "partprobe /dev/sda", desc: "Inform OS of partition table changes" },
      { cmd: "pvresize /dev/sda3", desc: "Expand physical volume" },
      { cmd: "vgs vg_main", desc: "Show volume groups info" },
      { cmd: "lvextend -r -l +100%FREE /dev/vg", desc: "Expand LV and filesystem" },
      { cmd: "xfs_growfs /dev/vg_main/lv_root", desc: "Grow XFS filesystem directly" },
    ],
  },
  {
    title: "Safe ext4 Shrink",
    items: [
      { cmd: "tar -czvf /backup/bak.tar.gz /apps", desc: "ALWAYS backup before shrinking" },
      { cmd: "umount /apps", desc: "Unmount the filesystem first" },
      { cmd: "e2fsck -f /dev/vg_app/lv_apps", desc: "Check filesystem forcibly" },
      { cmd: "resize2fs /dev/vg_app/lv 9.5G", desc: "Shrink filesystem below target" },
      { cmd: "lvreduce -L 10G /dev/vg_app/lv", desc: "Reduce LV to exact target" },
      { cmd: "resize2fs /dev/vg_app/lv_apps", desc: "Expand filesystem back to fit LV" },
      { cmd: "mount /dev/vg_app/lv_apps /apps", desc: "Remount the filesystem" },
    ],
  },
  {
    title: "User, Permission & Audit",
    items: [
      { cmd: "chmod 755 file", desc: "Change file permissions (rwxr-xr-x)" },
      { cmd: "chmod -R 644 dir/", desc: "Change recursively (files)" },
      { cmd: "chown user:group file", desc: "Change file owner and group" },
      { cmd: "chown -R user:group dir", desc: "Change owner recursively" },
      { cmd: "usermod -aG group user", desc: "Add user to a group" },
      { cmd: "passwd user", desc: "Change user password" },
      { cmd: "chage -l svc_user", desc: "Show password expiration info" },
      { cmd: "chage -m 7 -M 99999 svc_user", desc: "Lock password aging policies" },
      { cmd: "ssh-copy-id ops@target-host", desc: "Deploy SSH key to target" },
      { cmd: "awk -F: '($3 == \"0\") {print}' /etc/passwd", desc: "Find root-equivalent users" },
      { cmd: "visudo -c", desc: "Verify sudoers syntax safely" },
      { cmd: "sudo -l -U svc_user", desc: "See allowed sudo commands for user" },
    ],
  },
  {
    title: "Systemd & Services",
    items: [
      { cmd: "systemctl start service", desc: "Start a service" },
      { cmd: "systemctl stop service", desc: "Stop a service" },
      { cmd: "systemctl restart service", desc: "Restart a service" },
      { cmd: "systemctl reload service", desc: "Reload configuration gracefully" },
      { cmd: "systemctl status service", desc: "Check service status" },
      { cmd: "systemctl enable service", desc: "Enable service on boot" },
      { cmd: "systemctl disable service", desc: "Disable service on boot" },
      { cmd: "systemctl daemon-reload", desc: "Reload systemd manager config" },
      { cmd: "journalctl -xe", desc: "Examine detailed error logs" },
      { cmd: "crontab -u svc_user -l", desc: "List crontabs for specific user" },
      { cmd: "grep CRON /var/log/syslog", desc: "Inspect cron activity log" },
    ],
  },
  {
    title: "Git Version Control",
    items: [
      { cmd: "git clone <url>", desc: "Clone repository" },
      { cmd: "git fetch --all --prune", desc: "Fetch all drops dead remote branches" },
      { cmd: "git status", desc: "Show working tree status" },
      { cmd: "git add .", desc: "Stage all changes" },
      { cmd: "git commit -m 'Msg'", desc: "Commit staged changes" },
      { cmd: "git push origin main", desc: "Push to remote branch" },
      { cmd: "git pull --rebase", desc: "Fetch and rebase local branch" },
      { cmd: "git branch -a", desc: "List all local and remote branches" },
      { cmd: "git checkout -b branch", desc: "Create and switch to new branch" },
      { cmd: "git merge main", desc: "Merge main into current branch" },
      { cmd: "git log --graph --oneline --all", desc: "View commit history concisely" },
      { cmd: "git reset --hard HEAD", desc: "Discard all local changes" },
      { cmd: "git stash", desc: "Stash uncommitted changes" },
      { cmd: "git stash pop", desc: "Apply stash" },
      { cmd: "git rebase -i HEAD~3", desc: "Interactive rebase last 3 commits" },
    ],
  },
  {
    title: "Python Context Mgmt",
    items: [
      { cmd: "python3 -m venv .venv", desc: "Create a virtual environment" },
      { cmd: "source .venv/bin/activate", desc: "Activate venv (Linux/macOS)" },
      { cmd: "deactivate", desc: "Exit the virtual environment" },
      { cmd: "python -m pip install --upgrade pip", desc: "Upgrade pip safely inside venv" },
      { cmd: "pip install -r reqs.txt", desc: "Install requirements" },
      { cmd: "pip freeze > reqs.txt", desc: "Save dependencies to file" },
      { cmd: "pip list --outdated", desc: "List outdated pip packages" },
      { cmd: "python3 -m http.server 8080", desc: "Quickly serve directory HTTP" },
    ],
  },
  {
    title: "Ansible Core & Execution",
    items: [
      { cmd: "ansible all -m ping -i inv/lab/", desc: "Ping all lab hosts" },
      { cmd: "ansible-playbook pb.yml", desc: "Run a playbook" },
      { cmd: "ansible-playbook --check --diff pb", desc: "Dry-run with exact diffs" },
      { cmd: "ansible-playbook -i inv pb --step", desc: "Run interacting step-by-step" },
      { cmd: "ansible-playbook -K pb.yml", desc: "Ask for privilege escalation pass" },
      { cmd: "ansible-inventory -i inv --graph", desc: "View inventory structure graphically" },
      { cmd: "ansible-doc -l", desc: "List all available modules" },
      { cmd: "ansible-galaxy install -r reqs.yml", desc: "Install collections/roles" },
      { cmd: "ansible all -m setup | grep os_family", desc: "Quick target OS check ad-hoc" },
    ],
  },
  {
    title: "Ansible Vault & Secrets",
    items: [
      { cmd: "ansible-vault create file", desc: "Create encrypted file" },
      { cmd: "ansible-vault edit file", desc: "Edit encrypted file" },
      { cmd: "ansible-vault view file", desc: "View encrypted file without editing" },
      { cmd: "ansible-vault encrypt file", desc: "Encrypt file with specific ID" },
      { cmd: "ansible-vault decrypt file", desc: "Decrypt a file" },
      { cmd: "ansible-vault rekey file", desc: "Change the vault password" },
      { cmd: "ansible-vault encrypt_string", desc: "Encrypt string from stdin" },
      { cmd: "ansible-playbook --ask-vault-pass", desc: "Run playbook and ask vault pass" },
      { cmd: "ansible-playbook --vault-password-file .pass", desc: "Run playbook with pass file" },
      { cmd: "ansible local -m debug -a 'var=obj'", desc: "Debug print variables ad-hoc" },
    ],
  },
  {
    title: "Ansible Molecule",
    items: [
      { cmd: "molecule init role r_name", desc: "Initialize new role with molecule" },
      { cmd: "molecule create -s default", desc: "Create instances" },
      { cmd: "molecule converge -s default", desc: "Run playbook against instances" },
      { cmd: "molecule idempotence", desc: "Check playbook idempotence" },
      { cmd: "molecule verify -s default", desc: "Run tests (Testinfra, Lint)" },
      { cmd: "molecule test -s default", desc: "Run full lifecycle" },
      { cmd: "molecule login -s default", desc: "Log into a running instance" },
      { cmd: "molecule destroy -s default", desc: "Destroy instances" },
    ],
  },
  {
    title: "Docker Basics",
    items: [
      { cmd: "docker build -t img .", desc: "Build image from Dockerfile" },
      { cmd: "docker run -d -p 80:80 img", desc: "Run container in background" },
      { cmd: "docker ps -a", desc: "List all containers" },
      { cmd: "docker stop <ID>", desc: "Stop a container" },
      { cmd: "docker rm <ID>", desc: "Remove a container" },
      { cmd: "docker rmi <ID>", desc: "Remove an image" },
      { cmd: "docker logs -f <ID>", desc: "Follow container logs" },
      { cmd: "docker exec -it <ID> sh", desc: "Open shell in container" },
      { cmd: "docker system prune -a", desc: "Remove unused data" },
    ],
  },
  {
    title: "Package Management",
    items: [
      { cmd: "apt update && apt upgrade", desc: "Update list & upgrade packages" },
      { cmd: "apt install pkg", desc: "Install package (Debian/Ubuntu)" },
      { cmd: "apt remove pkg", desc: "Remove package" },
      { cmd: "yum check-update", desc: "Check for updates (RHEL/CentOS)" },
      { cmd: "yum update", desc: "Update packages" },
      { cmd: "yum install pkg", desc: "Install package" },
      { cmd: "yum remove pkg", desc: "Remove package" },
      { cmd: "dnf install pkg", desc: "Install package (Modern RHEL/Fedora)" },
      { cmd: "pacman -Syu", desc: "Full system upgrade (Arch Linux)" },
    ],
  },
  {
    title: "DBs, SELinux & Certs",
    items: [
      { cmd: "vim /data/postgres/pg_hba.conf", desc: "Edit Postgres client auth policy" },
      {
        cmd: "sudo -u postgres psql -c 'SELECT pg_reload_conf();'",
        desc: "Reload Postgres gracefully",
      },
      { cmd: "sestatus", desc: "Verify SELinux enablement state" },
      { cmd: "audit2allow -a", desc: "Generate allow rules from audit logs" },
      {
        cmd: "semanage fcontext -a -t postgresql_db_t '/data(/.*)?'",
        desc: "Define SELinux contexts",
      },
      { cmd: "restorecon -Rv /data", desc: "Apply SELinux fcontexts recursively" },
      {
        cmd: "openssl req -new -newkey rsa:2048 -nodes -keyout k.key -out c.csr",
        desc: "Generate CSR immediately",
      },
      { cmd: "openssl x509 -in tls.crt -text -noout", desc: "Inspect x509 certificate data" },
      {
        cmd: "openssl s_client -connect host:443 -showcerts",
        desc: "Examine remote SSL certificate",
      },
      { cmd: "certbot certificates", desc: "List locally managed ACME certs" },
      {
        cmd: "/opt/setup.sh -silent -responsefile props",
        desc: "Run enterprise installer silently",
      },
    ],
  },
];

const colors = [
  "#8aadf4",
  "#8bd5ca",
  "#a6da95",
  "#f5a97f",
  "#eed49f",
  "#c6a0f6",
  "#ed8796",
  "#f5bde6",
];
let colorIdx = 0;
const columns = [
  { x: 100, y: 250 },
  { x: 1135, y: 250 },
  { x: 2170, y: 250 },
];

const svgNodes = [];

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
    }
  });
}

for (const cat of categories) {
  let blockY = 140;
  const itemNodes = [];

  for (const item of cat.items) {
    const cmd = escapeXml(item.cmd);
    const desc = escapeXml(item.desc);

    if (cmd.length > 28 || desc.length > 37) {
      itemNodes.push({ x: 30, yDiff: blockY, class: "cmd", text: cmd });
      blockY += 32;
      itemNodes.push({ x: 65, yDiff: blockY, class: "desc-indented", text: `&#x21B3; ${desc}` }); // Use unicode arrow instead of bare arrow
      blockY += 55;
    } else {
      itemNodes.push({ x: 30, yDiff: blockY, class: "cmd", text: cmd });
      itemNodes.push({ x: 480, yDiff: blockY, class: "desc", text: desc });
      blockY += 70;
    }
  }

  const blockHeight = blockY + 20;

  let shortestCol = 0;
  for (let i = 1; i < 3; i++) {
    if (columns[i].y < columns[shortestCol].y) shortestCol = i;
  }

  const currentX = columns[shortestCol].x;
  const currentY = columns[shortestCol].y;
  const color = colors[colorIdx % colors.length];
  colorIdx++;

  svgNodes.push(
    `<rect x="${currentX}" y="${currentY}" width="930" height="${blockHeight}" rx="15" fill="#363a4f" stroke="${color}" stroke-width="3" />`
  );
  svgNodes.push(
    `<text x="${currentX + 30}" y="${currentY + 65}" font-family="sans-serif" font-size="36" font-weight="bold" fill="${color}">${escapeXml(cat.title)}</text>`
  );
  svgNodes.push(
    `<line x1="${currentX}" y1="${currentY + 90}" x2="${currentX + 930}" y2="${currentY + 90}" stroke="#494d64" stroke-width="2" />`
  );

  for (const node of itemNodes) {
    if (node.class === "cmd") {
      svgNodes.push(
        `<text x="${currentX + node.x}" y="${currentY + node.yDiff}" font-family="monospace, Courier New" font-size="24" font-weight="bold" fill="#cad3f5">${node.text}</text>`
      );
    } else {
      svgNodes.push(
        `<text x="${currentX + node.x}" y="${currentY + node.yDiff}" font-family="sans-serif" font-size="22" fill="#a5adcb">${node.text}</text>`
      );
    }
  }

  columns[shortestCol].y = currentY + blockHeight + 40;
}

const maxH = Math.max(columns[0].y, columns[1].y, columns[2].y) + 100;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3200 ${maxH}" width="3200" height="${maxH}">
<rect width="3200" height="${maxH}" fill="#24273a" />
<text x="1600" y="160" font-family="sans-serif" font-size="70" font-weight="bold" fill="#cad3f5" text-anchor="middle">The Comprehensive Linux Engineer Command List</text>
<line x1="100" y1="220" x2="3100" y2="220" stroke="#5b6078" stroke-width="4" />
${svgNodes.join("\n")}
</svg>`;

const outputPath =
  "C:/Users/Sergiio/Syncthing/portfolio/public/images/diagrams/new/full-linux-engineer-command-list.svg";
const pngPath =
  "C:/Users/Sergiio/Syncthing/portfolio/public/images/diagrams/new/full-linux-engineer-command-list.png";

async function main() {
  await fs.writeFile(outputPath, svg, "utf-8");
  console.warn("Saved SVG");

  // Create PNG
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 3200, height: maxH, deviceScaleFactor: 1 });
  await page.goto(`file:///${outputPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: pngPath, fullPage: true });
  console.warn("Saved PNG");
  await browser.close();
}

main().catch(console.error);
