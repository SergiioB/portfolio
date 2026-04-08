from pathlib import Path

OUT = Path('/home/radxa/projects/portfolio/public/images/diagrams/new')

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

def panel(x,y,w,h,title,copy,label,lines, alt_idx=None):
    alt_idx = set(alt_idx or [])
    out=[f'<g transform="translate({x} {y})">',f'<rect width="{w}" height="{h}" rx="28" class="panel" />',
         f'<text x="34" y="54" class="panel-title">{esc(title)}</text>',
         f'<text x="34" y="86" class="panel-copy">{esc(copy)}</text>',
         f'<line x1="34" y1="108" x2="{w-34}" y2="108" class="rule" />',
         f'<text x="34" y="138" class="label">{esc(label)}</text>']
    yy=152
    for i,line in enumerate(lines):
        wrapped = wrap_line(line, 76)
        box_h = 24 + 20*len(wrapped)
        out.append(f'<rect x="34" y="{yy}" width="{w-68}" height="{box_h}" rx="12" class="cmd-box" />')
        cls = 'cmd-alt' if i in alt_idx else 'cmd'
        for idx,part in enumerate(wrapped):
            out.append(f'<text x="50" y="{yy+24+20*idx}" class="{cls}">{esc(part)}</text>')
        yy += box_h + 12
    out.append('</g>')
    return '\n'.join(out)

def poster(filename, title, subtitle, badge, panels, width=2200, height=2100):
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{esc(title)} poster">',STYLE,
         f'<rect width="{width}" height="{height}" fill="url(#bg)" />','<g opacity="0.22">']
    horiz=''.join([f'M0 {y}h{width}' for y in range(180, height, 220)])
    vert=''.join([f'M{x} 0v{height}' for x in range(150, width, 260)])
    out += [f'<path d="{horiz}" class="grid" />', f'<path d="{vert}" class="grid" />', '</g>',
            f'<circle cx="{width-270}" cy="180" r="180" fill="#123257" opacity="0.16" />',
            f'<circle cx="260" cy="{height-120}" r="220" fill="#193b24" opacity="0.14" />',
            '<g transform="translate(90 84)">',
            '<rect x="0" y="0" width="470" height="44" rx="22" class="chip" />',
            f'<text x="24" y="29" class="badge">{esc(badge)}</text>',
            f'<text x="0" y="104" class="title">{esc(title)}</text>',
            f'<text x="0" y="142" class="subtitle">{esc(subtitle)}</text>',
            '</g>','<g filter="url(#shadow)">']
    out += panels
    out += ['</g>','</svg>']
    (OUT/filename).write_text('\n'.join(out))

poster('full-linux-engineer-storage.svg',
       'Linux Engineer Command List — Storage and Access',
       'Disk usage, LVM growth and shrink workflows, account inspection, password policy, and SSH access.',
       'LINUX / STORAGE / ACCESS',
       [
           panel(90,310,970,700,'1. Space, mounts, and package checks','Start with visibility before touching partitions, filesystems, or packages.','QUICK TRIAGE',[
               'du -sh /srv/app/* | sort -h',
               '(df -h | head -n1 && df -h | tail -n +2 | sort -hr -k5)',
               'lsblk -o NAME,SIZE,FSTYPE,TYPE,MOUNTPOINTS',
               'rsync -avHSx /source/ /destination/',
               'rpm -qa | grep package-pattern',
               'rpm -qc package-name'
           ],{1,3,5}),
           panel(1140,310,970,700,'2. Expand a disk and grow LVM','Use this sequence when the virtual disk has already been expanded upstream.','RESCAN AND EXTEND',[
               'echo 1 > /sys/class/block/sdb/device/rescan','fdisk /dev/sda','cfdisk /dev/sda','partprobe /dev/sda','pvresize /dev/sda3','vgs vg_main','lvextend -r -l +100%FREE /dev/vg_main/lv_root'
           ],{2,4,6}),
           panel(90,1050,970,760,'3. Shrink ext4 carefully','Only the safe minimum order: filesystem first, then logical volume.','SAFE SHRINK ORDER',[
               'umount /apps','e2fsck -f /dev/vg_app/lv_apps','resize2fs /dev/vg_app/lv_apps 9.5G','lvreduce -L 10G /dev/vg_app/lv_apps','mount /dev/vg_app/lv_apps /apps','resize2fs /dev/vg_app/lv_apps','lvs /dev/vg_app/lv_apps','df -h /apps'
           ],{1,3,5,7}),
           panel(1140,1050,970,760,'4. Accounts, permissions, and audit','Useful account checks when validating service users, ownership, and sudo exposure.','IDENTITY AND ACCESS',[
               'id svc_user && chage -l svc_user','chage -d "$(date +%F)" svc_user','chage -m 7 -M 99999 -I -1 -E -1 svc_user','ssh-copy-id ops_user@target-host','groups svc_user','find / -maxdepth 2 -type d \( -user svc_user -o -group svc_user \) -ls 2>/dev/null','sudo -l -U svc_user | grep -v "not allowed"','getent passwd svc_user'
           ],{1,3,5,7})
       ], height=1920)

poster('full-linux-engineer-automation.svg',
       'Linux Engineer Command List — Python, Ansible, and PostgreSQL',
       'Python environments, playbook runs, collection dependencies, Vault workflows, and PostgreSQL SELinux fixes.',
       'AUTOMATION / PYTHON / DATABASE',
       [
           panel(90,310,970,600,'1. Bootstrap the Python environment','Create the virtual environment first so repository dependencies stay isolated.','PYTHON BOOTSTRAP',[
               'python3.12 -m venv .venv','source .venv/bin/activate','python -m pip install --upgrade pip','pip install -r requirements.txt','python3.12 -m http.server 8080'
           ],{1,3}),
           panel(1140,310,970,740,'2. Common Ansible execution patterns','These are the real playbook commands that repeatedly appear during provisioning and follow-up fixes.','PLAYBOOK RUNS',[
               "ansible-playbook -i inventory/lab/ playbooks/platform-bootstrap.yml --limit='target-host' -t app_db_client",
               "ansible-playbook -i inventory/stage/ playbooks/platform-bootstrap.yml --limit='target-host' -t common_usersetup,common_filesystems,common_rhel,common_security,common_customization",
               "ansible-playbook -i inventory/stage/ playbooks/app_postgresql_prereqs.yml --limit='target-host'"
           ],{1}),
           panel(90,980,970,820,'3. Galaxy, Vault, and ad-hoc debugging','Use these when installing dependencies, creating secrets, or validating variables without exposing data.','ANSIBLE CORE',[
               'ansible-galaxy install -r requirements.yml',
               'ansible-galaxy install -r roles/platform_role/collections/requirements.yml',
               'pip install -r collections/ansible_collections/community/general/requirements.yml',
               "ansible-vault encrypt_string --stdin-name 'service_secret'",
               'ansible-vault encrypt files/target-host/tls.key --vault-password-file ~/.secure/vault/platform.pass --encrypt-vault-id default',
               'ansible-vault decrypt files/target-host/tls.crt --vault-password-file ~/.secure/vault/platform.pass',
               'ansible localhost -m debug -a "var=vault_secret_name" -e "@inventory/lab/group_vars/all/secret_vars.yml" --ask-vault-pass'
           ],{1,2,4,6}),
           panel(1140,1100,970,700,'4. PostgreSQL archive and SELinux fixes','Small but critical operational commands that appear during archive, policy, and ownership troubleshooting.','DB AND POLICY',[
               'vim /data/postgres/main/pg_hba.conf',
               'sudo vi /data/postgres/main/postgresql.conf',
               "archive_command = 'test -f /data/postgres/archive/%f || cp %p /data/postgres/archive/%f'",
               'semanage fcontext -a -t postgresql_db_t "/data/postgres/archive(/.*)?"',
               'restorecon -Rv /data/postgres/archive',
               'getent passwd svc_user'
           ],{1,3,5})
       ], height=1920)

poster('full-linux-engineer-delivery.svg',
       'Linux Engineer Command List — Testing, Git, and Utilities',
       'Molecule scenario loops, safe Git refresh flow, silent installer execution, certificates, Vim cleanup, symlinks, and cron reminders.',
       'DELIVERY / GIT / UTILITIES',
       [
           panel(90,310,970,620,'1. Molecule scenario loop','Reset, create, converge, and then log in to inspect the created instance.','ROLE TEST CYCLE',[
               'molecule list','molecule destroy -s default','molecule create -s default','molecule converge -s default','molecule login -s default'
           ],{1,3}),
           panel(1140,310,970,620,'2. Git recovery sequence','The smallest safe sequence for refreshing a feature branch from main.','CONTROLLED MERGE FLOW',[
               'git stash','git checkout main','git pull','git checkout feature-branch','git merge main','git stash pop','git add'
           ],{1,3,5}),
           panel(90,980,970,760,'3. Silent installers and certificates','Run silent installers when the software stack needs non-interactive deployment, then generate CSRs when cert work lands on the same day.','INSTALLERS AND CERTS',[
               '/opt/software-depot/setup.sh -silent -responsefile /opt/software-depot/response.properties -skiposlevelcheck',
               'openssl req -new -newkey rsa:2048 -nodes',
               '-keyout files/target-host/tls.key -out files/target-host/tls.csr',
               '-subj "/C=DE/ST=State/L=City/O=Example Corp/OU=Platform/CN=app.example.internal"',
               '-addext "subjectAltName = DNS:app.example.internal,DNS:target-host.example.internal,DNS:target-host"'
           ],{1,3}),
           panel(1140,980,970,760,'4. Quick editor, symlink, and cron fixes','Tiny commands that prevent surprisingly large mistakes in file layout, text cleanup, or scheduled jobs.','SMALL BUT IMPORTANT',[
               ':%s/\\s\\+$//e',':%s/old-token/new-token/g','ln -s /etc/opt/vendor/app /apps/app','unlink /apps/app','crontab -u svc_user -e','crontab -u svc_user -l','6 14 * * * /usr/bin/systemctl restart example-service'
           ],{1,3,5})
       ], height=1840)

print('regenerated posters v2')
