import os

# Ensure the output directory exists
out_dir = "/home/radxa/projects/portfolio/public/images/diagrams/new"
os.makedirs(out_dir, exist_ok=True)

# 1. DNS Migration Strategy (dns-migration.svg)
dns_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <!-- Dark theme colors -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1e2e" />
      <stop offset="100%" stop-color="#181825" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="800" height="500" fill="url(#bgGrad)" rx="8" />
  <text x="400" y="40" font-family="monospace" font-size="24" fill="#cdd6f4" font-weight="bold" text-anchor="middle">DNS Migration Strategy (Zero-Downtime)</text>
  
  <!-- Phase 1: Parallel Testing -->
  <g transform="translate(50, 80)">
    <rect width="320" height="380" fill="#313244" rx="8" stroke="#45475a" stroke-width="2"/>
    <text x="160" y="30" font-family="monospace" font-size="16" fill="#f38ba8" font-weight="bold" text-anchor="middle">Phase 1: Parallel Testing</text>
    
    <!-- Multi-SAN Cert -->
    <rect x="20" y="60" width="280" height="60" fill="#45475a" rx="4" stroke="#89b4fa" stroke-width="1"/>
    <text x="160" y="85" font-family="monospace" font-size="14" fill="#89b4fa" font-weight="bold" text-anchor="middle">Multi-SAN Certificate</text>
    <text x="160" y="105" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">lb-temp-qa.domain, lb-qa.domain</text>
    
    <!-- Old Server -->
    <rect x="20" y="150" width="120" height="80" fill="#585b70" rx="4"/>
    <text x="80" y="180" font-family="monospace" font-size="14" fill="#cdd6f4" font-weight="bold" text-anchor="middle">Legacy Server</text>
    <text x="80" y="200" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">lb-qa.domain</text>
    <text x="80" y="215" font-family="monospace" font-size="10" fill="#f9e2af" text-anchor="middle">Prod Traffic</text>
    
    <!-- New Server -->
    <rect x="180" y="150" width="120" height="80" fill="#585b70" rx="4"/>
    <text x="240" y="180" font-family="monospace" font-size="14" fill="#a6e3a1" font-weight="bold" text-anchor="middle">New Server</text>
    <text x="240" y="200" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">lb-temp-qa.domain</text>
    <text x="240" y="215" font-family="monospace" font-size="10" fill="#f9e2af" text-anchor="middle">QA Traffic</text>
    
    <!-- Users -->
    <circle cx="80" cy="300" r="15" fill="#cdd6f4"/>
    <text x="80" y="335" font-family="monospace" font-size="12" fill="#cdd6f4" text-anchor="middle">Prod Users</text>
    <path d="M 80 280 L 80 240" stroke="#cdd6f4" stroke-width="2" marker-end="url(#arrow)"/>
    
    <circle cx="240" cy="300" r="15" fill="#f9e2af"/>
    <text x="240" y="335" font-family="monospace" font-size="12" fill="#f9e2af" text-anchor="middle">QA Testers</text>
    <path d="M 240 280 L 240 240" stroke="#f9e2af" stroke-width="2" marker-end="url(#arrow)"/>
  </g>
  
  <!-- Arrow between phases -->
  <path d="M 390 270 L 410 270" stroke="#89b4fa" stroke-width="4" marker-end="url(#arrow)"/>
  <text x="400" y="250" font-family="monospace" font-size="12" fill="#89b4fa" text-anchor="middle">DNS Cutover</text>
  <text x="400" y="290" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(TTL 300s)</text>

  <!-- Phase 2: Post-Cutover -->
  <g transform="translate(430, 80)">
    <rect width="320" height="380" fill="#313244" rx="8" stroke="#45475a" stroke-width="2"/>
    <text x="160" y="30" font-family="monospace" font-size="16" fill="#a6e3a1" font-weight="bold" text-anchor="middle">Phase 2: Post-Cutover</text>
    
    <!-- Multi-SAN Cert -->
    <rect x="20" y="60" width="280" height="60" fill="#45475a" rx="4" stroke="#89b4fa" stroke-width="1"/>
    <text x="160" y="85" font-family="monospace" font-size="14" fill="#89b4fa" font-weight="bold" text-anchor="middle">Multi-SAN Certificate</text>
    <text x="160" y="105" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">(Same certificate remains valid)</text>
    
    <!-- Old Server (Decommissioned) -->
    <rect x="20" y="150" width="120" height="80" fill="#45475a" rx="4" stroke-dasharray="5,5" stroke="#f38ba8"/>
    <text x="80" y="180" font-family="monospace" font-size="14" fill="#6c7086" text-anchor="middle">Legacy Server</text>
    <text x="80" y="200" font-family="monospace" font-size="10" fill="#f38ba8" text-anchor="middle">Decommissioning...</text>
    
    <!-- New Server -->
    <rect x="180" y="150" width="120" height="80" fill="#585b70" rx="4" stroke="#a6e3a1" stroke-width="2"/>
    <text x="240" y="180" font-family="monospace" font-size="14" fill="#a6e3a1" font-weight="bold" text-anchor="middle">New Server</text>
    <text x="240" y="200" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">lb-qa.domain</text>
    <text x="240" y="215" font-family="monospace" font-size="10" fill="#f9e2af" text-anchor="middle">ALL Traffic</text>
    
    <!-- Users -->
    <circle cx="240" cy="300" r="15" fill="#cdd6f4"/>
    <text x="240" y="335" font-family="monospace" font-size="12" fill="#cdd6f4" text-anchor="middle">Prod Users</text>
    <path d="M 240 280 L 240 240" stroke="#cdd6f4" stroke-width="2" marker-end="url(#arrow)"/>
    
    <!-- Instant Rollback -->
    <path d="M 220 280 L 100 240" stroke="#f38ba8" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrow)"/>
    <text x="140" y="280" font-family="monospace" font-size="10" fill="#f38ba8" text-anchor="middle">Instant Rollback Path</text>
  </g>
  
  <!-- Arrow marker definition -->
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
    </marker>
  </defs>
</svg>"""

with open(f"{out_dir}/dns-migration.svg", "w") as f:
    f.write(dns_svg)

# 2. Automating AD Computer Object Deletion (automation-loop.svg)
ad_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <!-- Dark theme colors -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1e2e" />
      <stop offset="100%" stop-color="#181825" />
    </linearGradient>
    <!-- Arrow marker definition -->
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
    </marker>
  </defs>
  
  <rect width="800" height="500" fill="url(#bgGrad)" rx="8" />
  <text x="400" y="40" font-family="monospace" font-size="24" fill="#cdd6f4" font-weight="bold" text-anchor="middle">AD Computer Deletion Automation</text>
  
  <!-- Ansible Control Node -->
  <rect x="50" y="100" width="250" height="300" fill="#313244" rx="8" stroke="#89b4fa" stroke-width="2"/>
  <text x="175" y="130" font-family="monospace" font-size="16" fill="#89b4fa" font-weight="bold" text-anchor="middle">Ansible Control Node</text>
  
  <rect x="70" y="160" width="210" height="60" fill="#45475a" rx="4"/>
  <text x="175" y="185" font-family="monospace" font-size="12" fill="#cdd6f4" text-anchor="middle">delegate_to: localhost</text>
  <text x="175" y="205" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(Runs safely off-target)</text>
  
  <rect x="70" y="240" width="210" height="60" fill="#45475a" rx="4"/>
  <text x="175" y="265" font-family="monospace" font-size="12" fill="#f9e2af" text-anchor="middle">--stdin-password</text>
  <text x="175" y="285" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(Prevents 'ps aux' leaks)</text>
  
  <rect x="70" y="320" width="210" height="60" fill="#45475a" rx="4"/>
  <text x="175" y="345" font-family="monospace" font-size="12" fill="#a6e3a1" text-anchor="middle">Idempotent failed_when</text>
  <text x="175" y="365" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(Handles "already deleted")</text>
  
  <!-- Active Directory -->
  <rect x="500" y="100" width="250" height="130" fill="#313244" rx="8" stroke="#f9e2af" stroke-width="2"/>
  <text x="625" y="130" font-family="monospace" font-size="16" fill="#f9e2af" font-weight="bold" text-anchor="middle">Active Directory</text>
  
  <rect x="520" y="150" width="210" height="60" fill="#45475a" rx="4"/>
  <text x="625" y="175" font-family="monospace" font-size="12" fill="#cdd6f4" text-anchor="middle">Target Computer Object</text>
  <text x="625" y="195" font-family="monospace" font-size="10" fill="#f38ba8" text-anchor="middle">[REMOVED]</text>
  
  <!-- Target Node (Offline) -->
  <rect x="500" y="270" width="250" height="130" fill="#313244" rx="8" stroke="#f38ba8" stroke-width="2" stroke-dasharray="5,5"/>
  <text x="625" y="300" font-family="monospace" font-size="16" fill="#f38ba8" font-weight="bold" text-anchor="middle">Target Linux Server</text>
  
  <rect x="520" y="320" width="210" height="60" fill="#45475a" rx="4"/>
  <text x="625" y="345" font-family="monospace" font-size="12" fill="#a6adc8" text-anchor="middle">Status: Decommissioned</text>
  <text x="625" y="365" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(Offline / Unreachable)</text>
  
  <!-- Execution Flow -->
  <path d="M 300 165 L 500 165" stroke="#89b4fa" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="400" y="155" font-family="monospace" font-size="12" fill="#cdd6f4" text-anchor="middle">adcli delete-computer</text>
  
  <path d="M 300 290 L 500 290" stroke="#f38ba8" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arrow)"/>
  <text x="400" y="280" font-family="monospace" font-size="12" fill="#f38ba8" text-anchor="middle">NO direct connection</text>
</svg>"""

with open(f"{out_dir}/automation-loop.svg", "w") as f:
    f.write(ad_svg)

# 3. Linux-Active Directory Integration (pam-auth-flow.svg)
pam_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <!-- Dark theme colors -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1e2e" />
      <stop offset="100%" stop-color="#181825" />
    </linearGradient>
    <!-- Arrow marker definition -->
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
    </marker>
  </defs>
  
  <rect width="800" height="500" fill="url(#bgGrad)" rx="8" />
  <text x="400" y="40" font-family="monospace" font-size="24" fill="#cdd6f4" font-weight="bold" text-anchor="middle">Linux AD Integration: PAM Flow</text>
  
  <!-- Left Side: Problem (system-auth) -->
  <g transform="translate(50, 80)">
    <rect width="320" height="380" fill="#313244" rx="8" stroke="#f38ba8" stroke-width="2"/>
    <text x="160" y="30" font-family="monospace" font-size="16" fill="#f38ba8" font-weight="bold" text-anchor="middle">Broken Flow: system-auth</text>
    
    <rect x="20" y="60" width="280" height="50" fill="#45475a" rx="4"/>
    <text x="160" y="85" font-family="monospace" font-size="14" fill="#cdd6f4" font-weight="bold" text-anchor="middle">User runs `su`</text>
    <text x="160" y="100" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(/etc/pam.d/su includes system-auth)</text>
    
    <path d="M 160 110 L 160 140" stroke="#cdd6f4" stroke-width="2" marker-end="url(#arrow)"/>
    
    <rect x="20" y="140" width="280" height="50" fill="#45475a" rx="4" stroke="#f38ba8" stroke-width="2"/>
    <text x="160" y="165" font-family="monospace" font-size="14" fill="#f38ba8" font-weight="bold" text-anchor="middle">pam_fprintd.so (Fingerprint)</text>
    <text x="160" y="180" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">Hardware missing / AD user has no fingerprint</text>
    
    <path d="M 160 190 L 160 220" stroke="#f38ba8" stroke-width="2" marker-end="url(#arrow)"/>
    
    <rect x="20" y="220" width="280" height="50" fill="#45475a" rx="4" opacity="0.5"/>
    <text x="160" y="245" font-family="monospace" font-size="14" fill="#a6adc8" font-weight="bold" text-anchor="middle">pam_sss.so (AD Password)</text>
    <text x="160" y="260" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">Never Reached due to early fail</text>
    
    <rect x="20" y="300" width="280" height="50" fill="#f38ba8" rx="4" opacity="0.2"/>
    <text x="160" y="330" font-family="monospace" font-size="16" fill="#f38ba8" font-weight="bold" text-anchor="middle">"Permission Denied"</text>
  </g>
  
  <!-- Divider -->
  <line x1="400" y1="90" x2="400" y2="450" stroke="#45475a" stroke-width="2" stroke-dasharray="5,5"/>
  
  <!-- Right Side: Solution (password-auth) -->
  <g transform="translate(430, 80)">
    <rect width="320" height="380" fill="#313244" rx="8" stroke="#a6e3a1" stroke-width="2"/>
    <text x="160" y="30" font-family="monospace" font-size="16" fill="#a6e3a1" font-weight="bold" text-anchor="middle">Fixed Flow: password-auth</text>
    
    <rect x="20" y="60" width="280" height="50" fill="#45475a" rx="4"/>
    <text x="160" y="85" font-family="monospace" font-size="14" fill="#cdd6f4" font-weight="bold" text-anchor="middle">User runs `su`</text>
    <text x="160" y="100" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">(/etc/pam.d/su includes password-auth)</text>
    
    <path d="M 160 110 L 160 140" stroke="#cdd6f4" stroke-width="2" marker-end="url(#arrow)"/>
    
    <rect x="20" y="140" width="280" height="50" fill="#45475a" rx="4" stroke="#f9e2af" stroke-width="2"/>
    <text x="160" y="165" font-family="monospace" font-size="14" fill="#f9e2af" font-weight="bold" text-anchor="middle">pam_unix.so</text>
    <text x="160" y="180" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">Checks local password (fails for AD user)</text>
    
    <path d="M 160 190 L 160 220" stroke="#89b4fa" stroke-width="2" marker-end="url(#arrow)"/>
    <text x="190" y="210" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">Fallback (sufficient/optional)</text>
    
    <rect x="20" y="220" width="280" height="50" fill="#45475a" rx="4" stroke="#a6e3a1" stroke-width="2"/>
    <text x="160" y="245" font-family="monospace" font-size="14" fill="#a6e3a1" font-weight="bold" text-anchor="middle">pam_sss.so (AD Password)</text>
    <text x="160" y="260" font-family="monospace" font-size="10" fill="#a6adc8" text-anchor="middle">Validates via SSSD to Active Directory</text>
    
    <path d="M 160 270 L 160 300" stroke="#a6e3a1" stroke-width="2" marker-end="url(#arrow)"/>
    
    <rect x="20" y="300" width="280" height="50" fill="#a6e3a1" rx="4" opacity="0.2"/>
    <text x="160" y="330" font-family="monospace" font-size="16" fill="#a6e3a1" font-weight="bold" text-anchor="middle">Authentication Success</text>
  </g>
</svg>"""

with open(f"{out_dir}/pam-auth-flow.svg", "w") as f:
    f.write(pam_svg)

print("Generated 3 SVGs successfully.")
