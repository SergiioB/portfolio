from pathlib import Path

OUT = Path('/home/radxa/projects/portfolio/public/images/diagrams/new')
OUT.mkdir(parents=True, exist_ok=True)

STYLE = '''
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07111d" />
      <stop offset="55%" stop-color="#0c1828" />
      <stop offset="100%" stop-color="#050b14" />
    </linearGradient>
    <linearGradient id="stroke" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2d5b87" />
      <stop offset="50%" stop-color="#2f7f8a" />
      <stop offset="100%" stop-color="#4d8d51" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#02060d" flood-opacity="0.42" />
    </filter>
    <style>
      .title { font: 700 42px "Segoe UI", Arial, sans-serif; fill: #f4f8ff; }
      .subtitle { font: 400 18px "Segoe UI", Arial, sans-serif; fill: #a4b6c8; }
      .badge { font: 700 18px "Consolas", "Courier New", monospace; fill: #8edcff; letter-spacing: 2px; }
      .panel { fill: rgba(10, 20, 33, 0.94); stroke: url(#stroke); stroke-width: 2; }
      .panel-title { font: 700 24px "Segoe UI", Arial, sans-serif; fill: #f6fbff; }
      .panel-copy { font: 400 16px "Segoe UI", Arial, sans-serif; fill: #99aec0; }
      .label { font: 700 13px "Segoe UI", Arial, sans-serif; fill: #7bc7ff; letter-spacing: 1px; }
      .cmd { font: 400 15px "Consolas", "Courier New", monospace; fill: #9ef2bf; }
      .cmd-alt { font: 400 15px "Consolas", "Courier New", monospace; fill: #8dd9ff; }
      .small { font: 400 14px "Consolas", "Courier New", monospace; fill: #90a5b6; }
      .chip { fill: #0b1f31; stroke: #275676; stroke-width: 1.2; }
      .grid { stroke: rgba(120, 162, 190, 0.08); stroke-width: 1; }
      .rule { stroke: rgba(120, 170, 201, 0.18); stroke-width: 1; }
      .cmd-box { fill: #091524; stroke: rgba(85, 141, 182, 0.25); stroke-width: 1; }
    </style>
  </defs>
'''

def esc(t:str)->str:
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def wrap_line(text, limit=72):
    if len(text) <= limit:
        return [text]
    parts=[]
    cur=text
    while len(cur) > limit:
        split = cur.rfind(' ', 0, limit)
        if split < 30:
            split = limit
        parts.append(cur[:split])
        cur = cur[split:].lstrip()
    parts.append(cur)
    return parts

def panel(x,y,w,title,copy,label,lines, alt_idx=None):
    alt_idx = set(alt_idx or [])
    out=[]
    
    copy_wrapped = wrap_line(copy, 95)
    rule_y = 86 + max(0, len(copy_wrapped)-1)*22 + 22
    label_y = rule_y + 30
    
    yy = label_y + 14
    boxes = []
    for i,line in enumerate(lines):
        wrapped = wrap_line(line, 76)
        box_h = 24 + 20*len(wrapped)
        cls = 'cmd-alt' if i in alt_idx else 'cmd'
        box = f'<rect x="34" y="{yy}" width="{w-68}" height="{box_h}" rx="12" class="cmd-box" />'
        boxes.append(box)
        for idx,part in enumerate(wrapped):
            boxes.append(f'<text x="50" y="{yy+24+20*idx}" class="{cls}">{esc(part)}</text>')
        yy += box_h + 12
        
    h = yy + 24
    
    out = [f'<g transform="translate({x} {y})">', f'<rect width="{w}" height="{h}" rx="28" class="panel" />',
           f'<text x="34" y="54" class="panel-title">{esc(title)}</text>']
    for idx, cp in enumerate(copy_wrapped):
        out.append(f'<text x="34" y="{86 + idx*22}" class="panel-copy">{esc(cp)}</text>')
    out.append(f'<line x1="34" y1="{rule_y}" x2="{w-34}" y2="{rule_y}" class="rule" />')
    out.append(f'<text x="34" y="{label_y}" class="label">{esc(label)}</text>')
    out.extend(boxes)
    out.append('</g>')
    
    return h, '\n'.join(out)

def poster(filename, title, subtitle, badge, panels_data, width=2200):
    col1_x = 90
    col2_x = 1140
    w = 970
    start_y = 310
    gap = 40
    
    y1 = start_y
    y2 = start_y
    
    panels_out = []
    
    for p in panels_data:
        if y1 <= y2:
            x = col1_x
            y = y1
            h, p_out = panel(x, y, w, p['title'], p['copy'], p['label'], p['lines'], p.get('alt_idx', set()))
            y1 += h + gap
        else:
            x = col2_x
            y = y2
            h, p_out = panel(x, y, w, p['title'], p['copy'], p['label'], p['lines'], p.get('alt_idx', set()))
            y2 += h + gap
        panels_out.append(p_out)
        
    height = max(y1, y2) + 60
    
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{esc(title)} poster">',STYLE,
         f'<rect width="{width}" height="{height}" fill="url(#bg)" />','<g opacity="0.22">']
    horiz=''.join([f'M0 {y}h{width}' for y in range(180, height, 220)])
    vert=''.join([f'M{x} 0v{height}' for x in range(150, width, 260)])
    out += [f'<path d="{horiz}" class="grid" />', f'<path d="{vert}" class="grid" />', '</g>',
            f'<circle cx="{width-270}" cy="180" r="180" fill="#123257" opacity="0.16" />',
            f'<circle cx="260" cy="{height-120}" r="220" fill="#193b24" opacity="0.14" />',
            '<g transform="translate(90 84)">',
            '<rect x="0" y="0" width="540" height="44" rx="22" class="chip" />',
            f'<text x="24" y="29" class="badge">{esc(badge)}</text>',
            f'<text x="0" y="104" class="title">{esc(title)}</text>',
            f'<text x="0" y="142" class="subtitle">{esc(subtitle)}</text>',
            '</g>','<g filter="url(#shadow)">']
    out += panels_out
    out += ['</g>','</svg>']
    (OUT/filename).write_text('\n'.join(out))

# ─── Poster 1: Storage and Access ───
poster('full-linux-engineer-storage.svg',
       'Linux Engineer Command List — Storage and Access',
       'Comprehensive disk usage, LVM growth/shrink workflows, account inspection, password policy, and SSH access.',
       'LINUX / STORAGE / ACCESS',
       [
           dict(title='1. Space, mounts, and package checks', copy='Start with visibility before touching partitions, filesystems, or packages. Quickly identify space hogs and open deleted files.', label='QUICK TRIAGE', lines=[
               'du -sh /srv/app/* | sort -h',
               '(df -h | head -n1 && df -h | tail -n +2 | sort -hr -k5)',
               'lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS',
               'ncdu /srv/app',
               'find /var/log -type f -name "*.log" -size +1G -exec ls -lh {} +',
               'lsof +L1',
               'rsync -avHSx /source/ /destination/',
               'rpm -qa | grep package-pattern',
               'rpm -qc package-name'
           ], alt_idx={1,3,5,7}),
           dict(title='2. Expand a disk and grow LVM', copy='Use this sequence when the virtual disk has already been expanded upstream. Rescan, partition, and extend.', label='RESCAN AND EXTEND', lines=[
               'echo 1 > /sys/class/block/sdb/device/rescan',
               'blockdev --getsize64 /dev/sda',
               'fdisk /dev/sda',
               'cfdisk /dev/sda',
               'partprobe /dev/sda',
               'pvresize /dev/sda3',
               'vgs vg_main',
               'lvextend -r -l +100%FREE /dev/vg_main/lv_root',
               'xfs_growfs /dev/vg_main/lv_root'
           ], alt_idx={1,3,5,7}),
           dict(title='3. Shrink ext4 carefully', copy='Only the safe minimum order: backup, filesystem first, then logical volume. Never shrink XFS.', label='SAFE SHRINK ORDER', lines=[
               'tar -czvf /backup/apps_backup.tar.gz /apps',
               'umount /apps',
               'e2fsck -f /dev/vg_app/lv_apps',
               'resize2fs /dev/vg_app/lv_apps 9.5G',
               'lvreduce -L 10G /dev/vg_app/lv_apps',
               'mount /dev/vg_app/lv_apps /apps',
               'resize2fs /dev/vg_app/lv_apps',
               'lvs /dev/vg_app/lv_apps',
               'df -h /apps'
           ], alt_idx={1,3,5,7}),
           dict(title='4. Accounts, permissions, and audit', copy='Useful account checks when validating service users, ownership, root equivalents, and sudo exposure.', label='IDENTITY AND ACCESS', lines=[
               'id svc_user && chage -l svc_user',
               'chage -d "$(date +%F)" svc_user',
               'chage -m 7 -M 99999 -I -1 -E -1 svc_user',
               'usermod -aG wheel ops_user',
               'ssh-copy-id ops_user@target-host',
               "awk -F: '($3 == \"0\") {print}' /etc/passwd",
               'visudo -c',
               'groups svc_user',
               'find / -maxdepth 2 -type d \\( -user svc_user -o -group svc_user \\) -ls 2>/dev/null',
               'sudo -l -U svc_user | grep -v "not allowed"',
               'getent passwd svc_user'
           ], alt_idx={1,3,5,7,9})
       ])

# ─── Poster 2: Python, Ansible, DB, and DNF Patching ───
poster('full-linux-engineer-automation.svg',
       'Linux Engineer Command List — Python, Ansible, DB, Patching',
       'Python environments, playbook runs, Vault workflows, DNF advisory patching, Ansible ad-hoc, and PostgreSQL SELinux fixes.',
       'AUTOMATION / PYTHON / DATABASE / PATCHING',
       [
           dict(title='1. Bootstrap the Python environment', copy='Create the virtual environment first so repository dependencies stay isolated. Manage requirements effectively.', label='PYTHON BOOTSTRAP', lines=[
               'python3.12 -m venv .venv',
               'source .venv/bin/activate',
               'python -m pip install --upgrade pip',
               'pip install -r requirements.txt',
               'pip freeze > requirements.txt',
               'pip list --outdated',
               'python3.12 -m http.server 8080'
           ], alt_idx={1,3,5}),
           dict(title='2. DNF advisory-based patching', copy='Inspect available errata, review severity and CVEs, then apply specific advisories without updating everything on the system.', label='RHEL PATCH MANAGEMENT', lines=[
               'dnf check-update',
               'dnf updateinfo list',
               'dnf updateinfo info',
               'dnf updateinfo list --security',
               'dnf updateinfo list --sec-severity=Critical --sec-severity=Important',
               'dnf upgrade --advisory RHSA-2025:1234 -y',
               'dnf upgrade --security -y',
               'dnf upgrade --security --sec-severity=Critical -y',
               'dnf download --resolve --destdir=/tmp/patches --security',
               'rpm -qa --last | head -20',
               'rpm -V package-name'
           ], alt_idx={1,3,5,7,9}),
           dict(title='3. Ansible ad-hoc execution patterns', copy='Run targeted commands across host groups without writing a playbook. Ideal for patching waves, health checks, and triage.', label='ANSIBLE AD-HOC', lines=[
               'ansible all -i inventory/stage -m ping',
               'ansible -i inventory/stage web_servers_rhel9_* \\',
               '  -u svc_deploy -e "ansible_password={{ lookup(\'env\',\'DEPLOY_PASS\') }}" \\',
               '  -e "ansible_become_password={{ lookup(\'env\',\'DEPLOY_PASS\') }}" \\',
               '  -b -m shell -a \'dnf updateinfo; dnf upgrade --advisory RHSA-2025:1234 -y\'',
               'ansible -i inventory/stage app_servers_* -u svc_deploy \\',
               '  -e "ansible_password={{ lookup(\'env\',\'DEPLOY_PASS\') }}" \\',
               '  -b -m shell -a \'df -h / /apps /data\'',
               'ansible -i inventory/stage db_servers_* -u svc_deploy \\',
               '  -e "ansible_password={{ lookup(\'env\',\'DEPLOY_PASS\') }}" \\',
               '  -b -m shell -a \'rpm -q postgresql-server\'',
               'ansible -i inventory/stage all -u svc_deploy \\',
               '  -e "ansible_password={{ lookup(\'env\',\'DEPLOY_PASS\') }}" \\',
               '  -b -m shell -a \'sestatus; getenforce\''
           ], alt_idx={1,3,5,7}),
           dict(title='4. Galaxy, Vault, and playbook runs', copy='Install dependencies, manage secrets, and run playbooks with safe dry-run and limit flags.', label='ANSIBLE CORE', lines=[
               'ansible-galaxy install -r requirements.yml',
               'ansible-playbook --check --diff playbook.yml',
               'ansible-playbook playbook.yml --step',
               'ansible-inventory -i inventory/stage/ --graph',
               "ansible-vault encrypt_string --stdin-name 'service_secret'",
               'ansible-vault encrypt files/target-host/tls.key --vault-password-file ~/.secure/vault/platform.pass',
               'ansible-vault decrypt files/target-host/tls.crt --vault-password-file ~/.secure/vault/platform.pass',
               'ansible localhost -m debug -a "var=vault_secret_name" -e "@inventory/lab/group_vars/all/secret_vars.yml" --ask-vault-pass',
               'ansible all -m setup | grep ansible_os_family'
           ], alt_idx={1,3,5,7}),
           dict(title='5. PostgreSQL archive and SELinux fixes', copy='Small but critical operational commands for archive troubleshooting, config reloading, and policy enforcement.', label='DB AND POLICY', lines=[
               'vim /data/postgres/main/pg_hba.conf',
               'sudo -u postgres psql -c "SELECT pg_reload_conf();"',
               'tail -f /var/log/postgresql/postgresql-14-main.log',
               "archive_command = 'test -f /data/postgres/archive/%f || cp %p /data/postgres/archive/%f'",
               'sestatus',
               'audit2allow -a',
               'semanage fcontext -a -t postgresql_db_t "/data/postgres/archive(/.*)?"',
               'restorecon -Rv /data/postgres/archive'
           ], alt_idx={1,3,5,7})
       ])

# ─── Poster 3: Testing, Git, and Utilities ───
poster('full-linux-engineer-delivery.svg',
       'Linux Engineer Command List — Testing, Git, and Utilities',
       'Molecule test cycles, safe Git branch recovery, silent installers, SSL cert validation, and system maintenance.',
       'DELIVERY / GIT / UTILITIES',
       [
           dict(title='1. Molecule scenario loop', copy='Complete cycle to reset, create, converge, test, and log in to inspect the ephemeral created instance.', label='ROLE TEST CYCLE', lines=[
               'molecule list',
               'molecule destroy -s default',
               'molecule create -s default',
               'molecule converge -s default',
               'molecule test -s default',
               'molecule verify -s default',
               'molecule login -s default'
           ], alt_idx={1,3,5}),
           dict(title='2. Git recovery and branch splitting', copy='Safe branch refresh, path-based checkout for splitting mixed branches, stash handling, and verification.', label='GIT WORKFLOW', lines=[
               'git fetch --all --prune',
               'git stash -u',
               'git switch main && git pull',
               'git switch -c clean-branch',
               'git checkout mixed-branch -- specific/path/',
               'git diff --cached --name-only',
               'git merge main',
               'git stash pop',
               'git restore --staged .',
               'git restore --source=main --worktree .',
               'git log --graph --oneline --all'
           ], alt_idx={1,3,5,7,9}),
           dict(title='3. Silent installers and certificates', copy='Run non-interactive deployments, generate CSRs with SANs, and quickly validate SSL/TLS certificates and chains.', label='INSTALLERS AND CERTS', lines=[
               '/opt/software-depot/setup.sh -silent -responsefile /opt/software-depot/response.properties -skiposlevelcheck',
               'openssl req -new -newkey rsa:2048 -nodes',
               '-keyout files/target-host/tls.key -out files/target-host/tls.csr',
               '-subj "/C=DE/ST=State/L=City/O=Example Corp/OU=Platform/CN=app.example.internal"',
               '-addext "subjectAltName = DNS:app.example.internal,DNS:target-host.example.internal"',
               'openssl x509 -in tls.crt -text -noout',
               'openssl s_client -connect target-host:443 -showcerts',
               'certbot certificates'
           ], alt_idx={1,3,5,7}),
           dict(title='4. Systemd and service management', copy='Service lifecycle, boot-time control, log inspection, and live monitoring for RHEL systems.', label='SYSTEMD SERVICES', lines=[
               'systemctl start example-service',
               'systemctl restart example-service',
               'systemctl reload example-service',
               'systemctl status example-service',
               'systemctl enable example-service',
               'systemctl daemon-reload',
               'journalctl -u example-service --since "1 hour ago"',
               'journalctl -xe',
               "watch -n 1 'systemctl status example-service'",
               'crontab -u svc_user -e',
               'crontab -u svc_user -l'
           ], alt_idx={1,3,5,7,9})
       ])

# ─── Poster 4: Networking and Performance ───
poster('full-linux-engineer-networking.svg',
       'Linux Engineer Command List — Networking and Perf',
       'Traffic analysis, port diagnostics, load metrics, memory usage, and firewalls.',
       'LINUX / NETWORKING / PERF',
       [
           dict(title='1. Port Bindings and Connections', copy='Identify what is listening, who is connected, and test remote connectivity without external tools.', label='PORTS AND SOCKETS', lines=[
               'ss -tulnp | grep LISTEN',
               'netstat -anp | grep :80',
               'lsof -i :443',
               'nc -zv target-host 22',
               'telnet target-host 443',
               'curl -vI https://target-host'
           ], alt_idx={1,3,5}),
           dict(title='2. Traffic and Routing', copy='Check routing tables, trace network paths, and capture live packets to debug network drops and DNS issues.', label='ROUTES AND PACKETS', lines=[
               'ip addr show',
               'ip route show',
               'ping -c 4 8.8.8.8',
               'traceroute target-host',
               'mtr target-host',
               'tcpdump -i eth0 port 53',
               'tcpdump -i any -nn -s0 -v port 80',
               'dig +short target-host A'
           ], alt_idx={1,3,5,7}),
           dict(title='3. Load and System Diagnostics', copy='Monitor active processes, CPU load, memory limits, and I/O wait times to identify system bottlenecks.', label='METRICS AND LOAD', lines=[
               'uptime',
               'top -b -n 1 | head -n 20',
               'htop',
               'free -m',
               'vmstat 1 5',
               'iostat -x 1 5',
               'sar -u 1 3',
               'dmesg -T | tail -n 50'
           ], alt_idx={1,3,5,7}),
           dict(title='4. Firewalld and Iptables', copy='List active firewall rules, open ports permanently, and reload configurations safely without dropping connections.', label='FIREWALL RULES', lines=[
               'firewall-cmd --state',
               'firewall-cmd --list-all',
               'firewall-cmd --add-port=8080/tcp --permanent',
               'firewall-cmd --reload',
               'iptables -L -n -v',
               'iptables -t nat -L -n -v',
               'iptables-save > /etc/iptables/rules.v4',
               'ufw status verbose'
           ], alt_idx={1,3,5,7})
       ])

print('regenerated posters v3 (dynamic engine)')
