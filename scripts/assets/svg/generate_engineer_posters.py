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
      .cmd { font: 400 16px "Consolas", "Courier New", monospace; fill: #9ef2bf; }
      .cmd-alt { font: 400 16px "Consolas", "Courier New", monospace; fill: #8dd9ff; }
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


def panel(x,y,w,h,title,copy,label,lines, alt_idx=None):
    alt_idx = set(alt_idx or [])
    out = [f'<g transform="translate({x} {y})">', f'<rect width="{w}" height="{h}" rx="28" class="panel" />',
           f'<text x="34" y="54" class="panel-title">{esc(title)}</text>',
           f'<text x="34" y="86" class="panel-copy">{esc(copy)}</text>',
           f'<line x1="34" y1="108" x2="{w-34}" y2="108" class="rule" />',
           f'<text x="34" y="138" class="label">{esc(label)}</text>']
    y0=152
    for i,line in enumerate(lines):
        box_h = 46 if len(line) < 82 else 62
        out.append(f'<rect x="34" y="{y0}" width="{w-68}" height="{box_h}" rx="12" class="cmd-box" />')
        cls = 'cmd-alt' if i in alt_idx else 'cmd'
        if len(line) < 82:
            out.append(f'<text x="50" y="{y0+29}" class="{cls}">{esc(line)}</text>')
        else:
            # wrap at nearest space around half
            split_at = line.rfind(' ', 0, 76)
            if split_at < 40:
                split_at = 76
            a = line[:split_at]
            b = line[split_at+1:]
            out.append(f'<text x="50" y="{y0+25}" class="{cls}">{esc(a)}</text>')
            out.append(f'<text x="50" y="{y0+47}" class="{cls}">{esc(b)}</text>')
        y0 += box_h + 12
    out.append('</g>')
    return '\n'.join(out)


def poster(filename, title, subtitle, badge, panels, width=2200, height=2100):
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{esc(title)} poster">', STYLE,
           f'<rect width="{width}" height="{height}" fill="url(#bg)" />',
           '<g opacity="0.22">']
    horiz = ''.join([f'M0 {y}h{width}' for y in range(180, height, 220)])
    vert = ''.join([f'M{x} 0v{height}' for x in range(150, width, 260)])
    out += [f'<path d="{horiz}" class="grid" />', f'<path d="{vert}" class="grid" />', '</g>',
            f'<circle cx="{width-270}" cy="180" r="180" fill="#123257" opacity="0.16" />',
            f'<circle cx="260" cy="{height-120}" r="220" fill="#193b24" opacity="0.14" />',
            '<g transform="translate(90 84)">',
            '<rect x="0" y="0" width="420" height="44" rx="22" class="chip" />',
            f'<text x="24" y="29" class="badge">{esc(badge)}</text>',
            f'<text x="0" y="104" class="title">{esc(title)}</text>',
            f'<text x="0" y="142" class="subtitle">{esc(subtitle)}</text>',
            '<rect x="0" y="184" width="2020" height="72" rx="18" fill="#0a192b" stroke="#234f73" stroke-width="1.5" />',
            '<text x="24" y="215" class="label">SAFE PLACEHOLDERS</text>',
            '<text x="24" y="240" class="small">target-host   svc_user   vg_main   lv_root   app.example.internal   default</text>',
            '</g>', '<g filter="url(#shadow)">']
    for p in panels:
        out.append(panel(**p))
    out += ['</g>', '</svg>']
    (OUT / filename).write_text('\n'.join(out))

poster(
    'full-linux-engineer-storage.svg',
    'Linux Engineer Command List — Storage and Access',
    'Disk usage, LVM growth and shrink workflows, account inspection, password policy, and SSH access.',
    'LINUX / STORAGE / ACCESS',
    [
        dict(x=90,y=310,w=970,h=700,title='1. Space, mounts, and package checks',copy='Start with visibility before touching partitions, filesystems, or packages.',label='QUICK TRIAGE',lines=[
            'du -sh /srv/app/* | sort -h',
            '(df -h | head -n1 && df -h | tail -n +2 | sort -hr -k5)',
            'lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS',
            'rsync -avHSx /source/ /destination/',
            'rpm -qa | grep package-pattern',
            'rpm -qc package-name'
        ], alt_idx={1,3,5}),
        dict(x=1140,y=310,w=970,h=700,title='2. Expand a disk and grow LVM',copy='Use this sequence when the virtual disk has already been expanded upstream.',label='RESCAN AND EXTEND',lines=[
            'echo 1 > /sys/class/block/sdb/device/rescan',
            'fdisk /dev/sda',
            'cfdisk /dev/sda',
            'partprobe /dev/sda',
            'pvresize /dev/sda3',
            'vgs vg_main',
            'lvextend -r -l +100%FREE /dev/vg_main/lv_root'
        ], alt_idx={2,4,6}),
        dict(x=90,y=1050,w=970,h=760,title='3. Shrink ext4 carefully',copy='Only the safe minimum order: filesystem first, then logical volume.',label='SAFE SHRINK ORDER',lines=[
            'umount /apps',
            'e2fsck -f /dev/vg_app/lv_apps',
            'resize2fs /dev/vg_app/lv_apps 9.5G',
            'lvreduce -L 10G /dev/vg_app/lv_apps',
            'mount /dev/vg_app/lv_apps /apps',
            'resize2fs /dev/vg_app/lv_apps',
            'lvs /dev/vg_app/lv_apps',
            'df -h /apps'
        ], alt_idx={1,3,5,7}),
        dict(x=1140,y=1050,w=970,h=760,title='4. Accounts, permissions, and audit',copy='Useful account checks when validating service users, ownership, and sudo exposure.',label='IDENTITY AND ACCESS',lines=[
            'id svc_user && chage -l svc_user',
            'chage -d "$(date +%F)" svc_user',
            'chage -m 7 -M 99999 -I -1 -E -1 svc_user',
            'ssh-copy-id ops_user@target-host',
            'groups svc_user',
            'find / -maxdepth 2 -type d \( -user svc_user -o -group svc_user \) -ls 2>/dev/null',
            'sudo -l -U svc_user | grep -v "not allowed"',
            'getent passwd svc_user | awk -F: \'{print "Home: "$6" | Shell: "$7}\''
        ], alt_idx={1,3,5,7})
    ],
    height=1920
)

poster(
    'full-linux-engineer-automation.svg',
    'Linux Engineer Command List — Python and Ansible',
    'Python environments, collection dependencies, Ansible Vault workflows, and quick ad-hoc debugging.',
    'AUTOMATION / PYTHON / ANSIBLE',
    [
        dict(x=90,y=310,w=970,h=560,title='1. Bootstrap the Python environment',copy='Create the virtual environment first so repository dependencies stay isolated.',label='PYTHON BOOTSTRAP',lines=[
            'python3.12 -m venv .venv',
            'source .venv/bin/activate',
            'python -m pip install --upgrade pip',
            'pip install -r requirements.txt'
        ], alt_idx={1,3}),
        dict(x=1140,y=310,w=970,h=560,title='2. Install Ansible and SDK dependencies',copy='Keep Galaxy content installs and Python SDK requirements explicit and separate.',label='DEPENDENCIES',lines=[
            'ansible-galaxy install -r requirements.yml',
            'ansible-galaxy install -r roles/vmware_vm/collections/requirements.yml',
            'pip install -r collections/ansible_collections/community/vmware/requirements.yml',
            'pip install -r collections/ansible_collections/vmware/vmware/requirements.yml'
        ], alt_idx={1,2,3}),
        dict(x=90,y=920,w=970,h=820,title='3. Vault operations and ad-hoc checks',copy='Use these when creating secrets, encrypting files, or validating variables without exposing data.',label='VAULT AND AD-HOC',lines=[
            "ansible-vault encrypt_string --stdin-name 'service_secret'",
            'ansible-vault encrypt files/target-host/tls.key --vault-password-file ~/.secrets/ansible-vault/platform --encrypt-vault-id default',
            'ansible-vault decrypt files/target-host/tls.crt --vault-password-file ~/.secrets/ansible-vault/platform',
            'ansible localhost -m debug -a "var=vault_secret_name"',
            '-e "@inventory/dev/group_vars/all/secret_vars.yml" --ask-vault-pass'
        ], alt_idx={1,3,4}),
        dict(x=1140,y=920,w=970,h=820,title='4. Focused linting and local sharing',copy='Lint only what changed and spin up a quick file share when you need a temporary handoff.',label='DELTA CHECKS',lines=[
            "git diff --name-only release-tag HEAD | grep -E '\\.(yml|yaml)$' | xargs -r ansible-lint",
            'ansible-lint playbook.yml',
            'python3.12 -m http.server 8080'
        ], alt_idx={0,2})
    ],
    height=1850
)

poster(
    'full-linux-engineer-delivery.svg',
    'Linux Engineer Command List — Testing, Git, and Utilities',
    'Molecule scenario loops, safe Git refresh flow, certificates, Vim cleanup, symlinks, and cron reminders.',
    'DELIVERY / GIT / UTILITIES',
    [
        dict(x=90,y=310,w=970,h=620,title='1. Molecule scenario loop',copy='Reset, create, converge, and then log in to inspect the created instance.',label='ROLE TEST CYCLE',lines=[
            'molecule list',
            'molecule destroy -s default',
            'molecule create -s default',
            'molecule converge -s default',
            'molecule login -s default'
        ], alt_idx={1,3}),
        dict(x=1140,y=310,w=970,h=620,title='2. Git recovery sequence',copy='The smallest safe sequence for refreshing a feature branch from main.',label='CONTROLLED MERGE FLOW',lines=[
            'git stash',
            'git checkout main',
            'git pull',
            'git checkout feature-branch',
            'git merge main',
            'git stash pop'
        ], alt_idx={1,3,5}),
        dict(x=90,y=980,w=970,h=700,title='3. Certificates and text cleanup',copy='Generate a CSR with SANs and clean files quickly when you need a fast turnaround.',label='CERTS AND EDITOR',lines=[
            'openssl req -new -newkey rsa:2048 -nodes',
            '-keyout files/target-host/tls.key -out files/target-host/tls.csr',
            '-subj "/C=DE/ST=State/L=City/O=Example Corp/OU=Platform/CN=app.example.internal"',
            '-addext "subjectAltName = DNS:app.example.internal,DNS:target-host.example.internal,DNS:target-host"',
            ':%s/\\s\\+$//e',
            ':%s/old-token/new-token/g'
        ], alt_idx={1,3,5}),
        dict(x=1140,y=980,w=970,h=700,title='4. Symlinks and cron reminders',copy='Tiny commands that prevent surprisingly large mistakes in file layout or scheduled jobs.',label='SMALL BUT IMPORTANT',lines=[
            'ln -s /etc/opt/vendor/app /apps/app',
            'unlink /apps/app',
            'crontab -u svc_user -e',
            'crontab -u svc_user -l',
            '6 14 * * * /usr/bin/systemctl restart example-service'
        ], alt_idx={1,3})
    ],
    height=1780
)

print('generated posters')
