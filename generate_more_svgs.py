import os

# Ensure the directory exists
os.makedirs("public/images/diagrams/new", exist_ok=True)

# 1. ansible-apache-reverse-proxy.svg
apache_proxy_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
  <defs>
    <style>
      .bg { fill: #0f172a; }
      .text-title { fill: #f8fafc; font-family: monospace; font-size: 18px; font-weight: bold; }
      .text-sub { fill: #94a3b8; font-family: monospace; font-size: 14px; }
      .text-code { fill: #cbd5e1; font-family: monospace; font-size: 12px; }
      .box { fill: #1e293b; stroke: #334155; stroke-width: 2; rx: 6; }
      .box-highlight { fill: #1e293b; stroke: #38bdf8; stroke-width: 2; rx: 6; }
      .box-success { fill: #1e293b; stroke: #4ade80; stroke-width: 2; rx: 6; }
      .line { stroke: #475569; stroke-width: 2; stroke-dasharray: 4; }
      .arrow { stroke: #475569; stroke-width: 2; fill: none; }
      .arrow-solid { stroke: #38bdf8; stroke-width: 2; fill: none; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
    </marker>
    <marker id="arrowhead-solid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
    </marker>
  </defs>

  <rect width="800" height="450" class="bg" />
  
  <text x="40" y="40" class="text-title">Ansible Apache Reverse Proxy Architecture</text>
  <text x="40" y="60" class="text-sub">Standardized deployment with dynamic configuration snippets</text>

  <!-- Ansible Control Node -->
  <rect x="40" y="100" width="220" height="280" class="box" />
  <text x="60" y="130" class="text-title">Ansible Control</text>
  
  <rect x="60" y="150" width="180" height="60" class="box-highlight" />
  <text x="70" y="170" class="text-code">Inventory Variables</text>
  <text x="70" y="190" class="text-code">server_name: app.int</text>
  
  <rect x="60" y="230" width="180" height="60" class="box-highlight" />
  <text x="70" y="250" class="text-code">Role: app_apache</text>
  <text x="70" y="270" class="text-code">Handles SSL/Firewall</text>
  
  <rect x="60" y="310" width="180" height="50" class="box-highlight" />
  <text x="70" y="330" class="text-code">Proxy Snippet</text>
  <text x="70" y="350" class="text-code">ProxyPass / http:...</text>

  <!-- Connection line -->
  <path d="M 260 240 L 340 240" class="arrow-solid" marker-end="url(#arrowhead-solid)" />
  <text x="270" y="230" class="text-code">Deploy Config</text>

  <!-- Target Server -->
  <rect x="350" y="100" width="380" height="280" class="box" />
  <text x="370" y="130" class="text-title">Target Server (Web/Proxy)</text>

  <rect x="370" y="160" width="160" height="180" class="box-success" />
  <text x="390" y="190" class="text-title">Apache HTTPD</text>
  <text x="390" y="220" class="text-code">VirtualHost (443)</text>
  <text x="390" y="240" class="text-code">SSL Termination</text>
  <text x="390" y="260" class="text-code">ModProxy</text>
  <text x="390" y="290" class="text-code">Include snippet</text>

  <!-- Traffic -->
  <path d="M 530 250 L 590 250" class="arrow-solid" marker-end="url(#arrowhead-solid)" />
  <text x="540" y="240" class="text-code">Proxy</text>

  <rect x="600" y="200" width="110" height="80" class="box" />
  <text x="615" y="230" class="text-title">App Service</text>
  <text x="615" y="250" class="text-code">(e.g. Tomcat)</text>
  <text x="615" y="270" class="text-code">Port 8080</text>
  
  <!-- Network / Client -->
  <path d="M 370 200 L 290 200" class="arrow" marker-end="url(#arrowhead)" />
  <text x="310" y="190" class="text-code">HTTPS In</text>
</svg>"""

with open("public/images/diagrams/new/ansible-apache-reverse-proxy.svg", "w") as f:
    f.write(apache_proxy_svg)

# 2. offline-first-sync-architecture-outbox-pattern.svg
outbox_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <defs>
    <style>
      .bg { fill: #0f172a; }
      .text-title { fill: #f8fafc; font-family: monospace; font-size: 18px; font-weight: bold; }
      .text-sub { fill: #94a3b8; font-family: monospace; font-size: 14px; }
      .text-code { fill: #cbd5e1; font-family: monospace; font-size: 12px; }
      .box { fill: #1e293b; stroke: #334155; stroke-width: 2; rx: 6; }
      .box-highlight { fill: #1e293b; stroke: #eab308; stroke-width: 2; rx: 6; }
      .box-primary { fill: #1e293b; stroke: #3b82f6; stroke-width: 2; rx: 6; }
      .line { stroke: #475569; stroke-width: 2; stroke-dasharray: 4; }
      .arrow { stroke: #475569; stroke-width: 2; fill: none; }
      .arrow-sync { stroke: #eab308; stroke-width: 2; fill: none; stroke-dasharray: 4; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
    </marker>
    <marker id="arrowhead-sync" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#eab308" />
    </marker>
  </defs>

  <rect width="800" height="500" class="bg" />
  
  <text x="40" y="40" class="text-title">Offline-First Sync with Outbox Pattern</text>
  <text x="40" y="60" class="text-sub">Decoupling UI responsiveness from network reliability</text>

  <!-- Mobile Device / Client -->
  <rect x="40" y="100" width="340" height="340" class="box" />
  <text x="60" y="130" class="text-title">Mobile Client</text>

  <rect x="60" y="150" width="300" height="60" class="box-primary" />
  <text x="75" y="185" class="text-title">App UI (Fast / Responsive)</text>
  
  <rect x="60" y="240" width="140" height="80" class="box" />
  <text x="75" y="265" class="text-title">Local DB</text>
  <text x="75" y="295" class="text-code">Immediate Read/Write</text>

  <rect x="220" y="240" width="140" height="80" class="box-highlight" />
  <text x="235" y="265" class="text-title">Outbox Table</text>
  <text x="235" y="285" class="text-code">1. PENDING</text>
  <text x="235" y="305" class="text-code">2. IN_PROGRESS</text>

  <rect x="60" y="340" width="300" height="70" class="box-highlight" />
  <text x="75" y="365" class="text-title">Background Sync Worker</text>
  <text x="75" y="390" class="text-code">Monitors Outbox | Exponential Backoff</text>

  <!-- Flow Lines inside Client -->
  <path d="M 130 210 L 130 240" class="arrow" marker-end="url(#arrowhead)" />
  <path d="M 290 210 L 290 240" class="arrow" marker-end="url(#arrowhead)" />
  <path d="M 290 320 L 290 340" class="arrow" marker-end="url(#arrowhead)" />

  <!-- Cloud Infrastructure -->
  <rect x="500" y="100" width="260" height="340" class="box" />
  <text x="520" y="130" class="text-title">Cloud Infrastructure</text>

  <rect x="540" y="180" width="180" height="80" class="box-primary" />
  <text x="560" y="210" class="text-title">API Gateway</text>
  <text x="560" y="240" class="text-code">Authentication</text>

  <rect x="540" y="300" width="180" height="80" class="box" />
  <text x="560" y="330" class="text-title">Cloud Database</text>
  <text x="560" y="360" class="text-code">(Firestore)</text>

  <path d="M 630 260 L 630 300" class="arrow" marker-end="url(#arrowhead)" />

  <!-- Network Connection -->
  <path d="M 360 375 L 500 375" class="arrow-sync" marker-end="url(#arrowhead-sync)" />
  <text x="385" y="365" class="text-code">Async Network Call</text>
  <path d="M 500 220 L 360 220" class="arrow" marker-end="url(#arrowhead)" />
  <text x="390" y="210" class="text-code">ACK / Sync State</text>
  
</svg>"""

with open("public/images/diagrams/new/offline-first-sync-architecture-outbox-pattern.svg", "w") as f:
    f.write(outbox_svg)

# 3. nfs-share-management-automation.svg
nfs_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <defs>
    <style>
      .bg { fill: #0f172a; }
      .text-title { fill: #f8fafc; font-family: monospace; font-size: 16px; font-weight: bold; }
      .text-sub { fill: #94a3b8; font-family: monospace; font-size: 14px; }
      .text-code { fill: #cbd5e1; font-family: monospace; font-size: 12px; }
      .box { fill: #1e293b; stroke: #334155; stroke-width: 2; rx: 6; }
      .box-prod { fill: #1e293b; stroke: #10b981; stroke-width: 2; rx: 6; }
      .box-backup { fill: #1e293b; stroke: #f59e0b; stroke-width: 2; rx: 6; }
      .box-ansible { fill: #1e293b; stroke: #6366f1; stroke-width: 2; rx: 6; }
      .arrow { stroke: #475569; stroke-width: 2; fill: none; }
      .arrow-prod { stroke: #10b981; stroke-width: 2; fill: none; }
      .arrow-bad { stroke: #ef4444; stroke-width: 2; fill: none; stroke-dasharray: 4; }
    </style>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
    </marker>
    <marker id="arrowhead-prod" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
    </marker>
    <marker id="arrowhead-bad" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
    </marker>
  </defs>

  <rect width="800" height="500" class="bg" />
  
  <text x="40" y="40" class="text-title">Automated NFS Management at Scale</text>
  <text x="40" y="60" class="text-sub">Consistent provisioning and intelligent network routing</text>

  <!-- Ansible Automation Layer -->
  <rect x="40" y="90" width="720" height="80" class="box-ansible" />
  <text x="60" y="120" class="text-title">Ansible Automation Layer</text>
  <text x="60" y="145" class="text-code">Deploys LVM, exportfs rules, and Client fstab with explicit IPs</text>

  <!-- Server -->
  <rect x="40" y="200" width="200" height="260" class="box" />
  <text x="60" y="230" class="text-title">NFS Server</text>
  
  <rect x="60" y="250" width="160" height="40" class="box" />
  <text x="70" y="275" class="text-code">/srv/oracle_data</text>

  <rect x="60" y="300" width="160" height="40" class="box" />
  <text x="70" y="325" class="text-code">/srv/sapmnt</text>

  <rect x="60" y="360" width="160" height="70" class="box" />
  <text x="70" y="380" class="text-code">LVM Storage</text>
  <text x="70" y="400" class="text-code">vg_storage</text>
  <text x="70" y="415" class="text-code">ext4 (nodev,noatime)</text>

  <!-- Networks -->
  <rect x="290" y="220" width="220" height="70" class="box-prod" />
  <text x="310" y="245" class="text-title">Production Net (10G)</text>
  <text x="310" y="270" class="text-code">Direct IP: 10.76.x.x</text>

  <rect x="290" y="350" width="220" height="70" class="box-backup" />
  <text x="310" y="375" class="text-title">Backup Net (1G)</text>
  <text x="310" y="400" class="text-code">DNS Resolved (172.x.x.x)</text>

  <!-- Clients -->
  <rect x="560" y="200" width="200" height="260" class="box" />
  <text x="580" y="230" class="text-title">Client Servers</text>

  <rect x="580" y="250" width="160" height="50" class="box" />
  <text x="590" y="270" class="text-code">Oracle DB</text>
  <text x="590" y="290" class="text-code">/oracle/oradata</text>

  <rect x="580" y="320" width="160" height="50" class="box" />
  <text x="590" y="340" class="text-code">SAP App</text>
  <text x="590" y="360" class="text-code">/usr/sap</text>

  <rect x="580" y="390" width="160" height="50" class="box" />
  <text x="590" y="410" class="text-code">fstab: _netdev,</text>
  <text x="590" y="425" class="text-code">hard,bg,rsize=32k</text>

  <!-- Connections -->
  <path d="M 240 255 L 290 255" class="arrow-prod" marker-end="url(#arrowhead-prod)" />
  <path d="M 510 255 L 560 255" class="arrow-prod" marker-end="url(#arrowhead-prod)" />
  <text x="515" y="245" class="text-code">Force IP</text>

  <path d="M 240 385 L 290 385" class="arrow-bad" marker-end="url(#arrowhead-bad)" />
  <path d="M 510 385 L 560 385" class="arrow-bad" marker-end="url(#arrowhead-bad)" />
  <text x="515" y="375" class="text-code" style="fill:#ef4444">Avoid DNS</text>
</svg>"""

with open("public/images/diagrams/new/nfs-share-management-automation.svg", "w") as f:
    f.write(nfs_svg)
