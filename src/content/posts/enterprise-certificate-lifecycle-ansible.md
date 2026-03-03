---
title: "Enterprise Certificate Lifecycle Management with Ansible"
description: "Complete guide to automating SSL/TLS certificate generation, deployment, rotation, and monitoring across enterprise Linux infrastructure using Ansible Vault and OpenSSL."
situation: "Managing SSL/TLS certificates across 200+ servers was manual and error-prone. Certificates were tracked in spreadsheets, private keys were stored unencrypted, and expired certificates caused preventable outages. Compliance audits flagged security violations from plaintext secrets in shared storage."
issue: "No certificate lifecycle management, manual deployment prone to human error, security risks from unencrypted private keys, and reactive rather than proactive expiration monitoring causing service disruptions."
solution: "Implemented comprehensive certificate automation using OpenSSL for CSR generation, Ansible Vault for encryption, automated deployment roles, expiration monitoring with 90-day alerts, and standardized multi-SAN certificate templates."
usedIn: "Enterprise Linux platform supporting Apache reverse proxies, load balancers, PostgreSQL, SAP systems, and secure application endpoints across dev, test, and production environments."
impact: "Eliminated certificate-related outages, reduced deployment time from 2-3 hours to 5-10 minutes, achieved compliance for private key encryption, and established proactive monitoring preventing expiration incidents."
pubDate: 2026-03-03
category: "security"
tags: ["certificates", "ansible", "openssl", "tls", "automation", "security", "vault"]
draft: false
---

## Situation

Certificate management in enterprise environments is notoriously difficult. You have:
- Multiple environments (dev, test, prod) with different CAs
- Different certificate types (single domain, wildcard, multi-SAN)
- Various deployment targets (Apache, Nginx, load balancers, databases)
- Strict compliance requirements for private key handling
- Complex renewal workflows across teams

When I took over certificate management, the situation was critical:
- **No tracking system**: Certificates tracked in shared spreadsheets
- **Manual deployment**: SCP transfers, manual service restarts
- **Security violations**: Private keys stored unencrypted on shared drives
- **Reactive monitoring**: Outages occurred before renewals were initiated
- **Inconsistent configurations**: Missing SAN entries, wrong key sizes, inconsistent paths

The result: 3-4 certificate-related outages per year, compliance audit failures, and 2-3 hours manual effort per certificate deployment.

I designed and implemented a comprehensive certificate lifecycle management system using Ansible that handles the entire workflow from CSR generation to automated renewal.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Certificate Lifecycle                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Generate │───▶│  Encrypt │───▶│  Deploy  │───▶│  Monitor │  │
│  │   CSR     │    │  w/Vault │    │   TLS    │    │Expiration│  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │          │
│       ▼               ▼               ▼               ▼          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ OpenSSL  │    │ Ansible  │    │  Apache  │    │ 90-Day   │  │
│  │   CLI    │    │  Vault   │    │  Role    │    │  Alerts  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: CSR Generation with Proper SAN Entries

### Understanding Modern Certificate Requirements

Modern browsers and clients **require** Subject Alternative Name (SAN) entries. A certificate with only a Common Name (CN) and no SANs will be rejected. This is a common mistake that causes deployment failures.

**Generate key and CSR from the automation control server**:

```bash
# Navigate to certificate files directory
cd /path/to/ansible/files/<hostname>/

# Generate 2048-bit RSA key and CSR with SANs
openssl req -new -newkey rsa:2048 -nodes \
  -keyout tls_cert_<hostname>.key \
  -out <hostname>.csr \
  -subj "/C=DE/ST=Bavaria/L=Munich/O=Organization/OU=Unit/CN=<hostname>.domain.local" \
  -addext "subjectAltName = DNS:<hostname>.domain.local,DNS:<hostname>,DNS:<alias>.domain.local"
```

**Critical components**:
- **2048-bit RSA key**: Industry standard (3072-bit for high-security)
- **Nodes flag**: Creates unencrypted private key (protected by file permissions and Vault)
- **Proper subject structure**: Country, State, Organization, OU, CN
- **SAN entries**: Must include ALL DNS names the certificate will serve

### Multi-SAN Certificates for Load Balancers

For load balancers or multi-service hosts, include all DNS names:

```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout tls_cert_loadbalancer.key \
  -out loadbalancer.csr \
  -subj "/CN=lb-prod.domain.local" \
  -addext "subjectAltName = \
DNS:lb-prod.domain.local,\
DNS:lb-prod-01.domain.local,\
DNS:lb-prod-02.domain.local,\
DNS:service-app.domain.local,\
DNS:api.domain.local"
```

**Benefits**:
- Single certificate for multiple services
- Reduced management overhead
- Consistent expiration dates across services

### Submit CSR to Certificate Authority

Send the `.csr` file to your CA team (or submit via PKI portal). They will return:
1. `<hostname>.cer` or `<hostname>.crt` - The signed server certificate
2. `ca-chain.crt` or `certificatetrustchain.crt` - The CA intermediate/root chain

---

## Phase 2: Secure Storage with Ansible Vault

### Why Vault Encryption is Mandatory

**Never commit unencrypted private keys to Git**, even in private repositories:
- Compliance violations (PCI-DSS, SOC2, ISO 27001)
- Insider threat exposure
- Accidental repository exposure
- Audit failures

**Encrypt the private key immediately**:

```bash
# Encrypt private key with Ansible Vault
ansible-vault encrypt files/<hostname>/tls_cert_<hostname>.key \
  --vault-password-file ~/.secrets/ansible-vault/infrastructure-password

# Optional: Also encrypt certificate files (recommended for prod)
ansible-vault encrypt files/<hostname>/tls_cert_<hostname>.crt \
  --vault-password-file ~/.secrets/ansible-vault/infrastructure-password

# Verify encryption
cat files/<hostname>/tls_cert_<hostname>.key
# Output should start with: $ANSIBLE_VAULT;1.1;AES256
```

### Vault Password Management

**Best practices**:
- Store vault password in secure location (not in Git)
- Use different vault passwords per environment (dev/test/prod)
- Rotate vault passwords annually
- Limit access to vault password file (chmod 600)

**Directory structure**:
```
~/.secrets/ansible-vault/
├── dev-password
├── tst-password
└── prod-password
```

---

## Phase 3: Certificate Deployment Role

### Ansible Role Structure

```
roles/
└── app_certificates/
    ├── defaults/
    │   └── main.yml
    ├── tasks/
    │   └── main.yml
    ├── handlers/
    │   └── main.yml
    └── templates/
        └── certificate-check.sh.j2
```

### Role Tasks

```yaml
# roles/app_certificates/tasks/main.yml
---
- name: Ensure certificate directories exist
  file:
    path: "{{ item }}"
    state: directory
    owner: root
    group: root
    mode: "0755"
  loop:
    - /etc/pki/tls/private
    - /etc/pki/tls/certs

- name: Deploy private key
  copy:
    src: "files/{{ inventory_hostname }}/tls_cert_{{ inventory_hostname }}.key"
    dest: "/etc/pki/tls/private/{{ inventory_hostname }}.key"
    owner: root
    group: root
    mode: "0600"  # CRITICAL: Restrictive permissions
  notify: Restart affected services
  when: certificate_deploy | default(true)

- name: Deploy certificate
  copy:
    src: "files/{{ inventory_hostname }}/tls_cert_{{ inventory_hostname }}.crt"
    dest: "/etc/pki/tls/certs/{{ inventory_hostname }}.crt"
    owner: root
    group: root
    mode: "0644"
  notify: Restart affected services
  when: certificate_deploy | default(true)

- name: Deploy CA chain
  copy:
    src: "files/{{ inventory_hostname }}/ca-chain.crt"
    dest: "/etc/pki/tls/certs/ca-chain.crt"
    owner: root
    group: root
    mode: "0644"
  when: certificate_deploy | default(true)

- name: Verify certificate and key match
  command: >-
    bash -c "
    diff <(openssl x509 -noout -modulus -in /etc/pki/tls/certs/{{ inventory_hostname }}.crt | openssl md5)
          <(openssl rsa -noout -modulus -in /etc/pki/tls/private/{{ inventory_hostname }}.key | openssl md5)"
  register: cert_key_match
  changed_when: false
  failed_when: cert_key_match.rc != 0
  ignore_errors: true

- name: Install certificate expiration check script
  template:
    src: certificate-check.sh.j2
    dest: /usr/local/bin/certificate-check.sh
    owner: root
    group: root
    mode: "0755"
```

### Handlers

```yaml
# roles/app_certificates/handlers/main.yml
---
- name: Restart Apache
  service:
    name: httpd
    state: restarted

- name: Restart Nginx
  service:
    name: nginx
    state: restarted

- name: Reload HAProxy
  service:
    name: haproxy
    state: reloaded
```

### Host Variables Configuration

```yaml
# inventory/prod/host_vars/webserver01.yml
---
certificate_deploy: true
certificate_key_path: "files/{{ inventory_hostname }}/tls_cert_{{ inventory_hostname }}.key"
certificate_crt_path: "files/{{ inventory_hostname }}/tls_cert_{{ inventory_hostname }}.crt"
certificate_ca_path: "files/{{ inventory_hostname }}/ca-chain.crt"

# Services to restart on certificate update
certificate_services:
  - httpd
  - haproxy
```

---

## Phase 4: Apache Integration

### VirtualHost Configuration

```apache
<VirtualHost *:443>
    ServerName webserver01.domain.local
    ServerAlias webserver01
    
    # SSL Configuration
    SSLEngine on
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
    SSLHonorCipherOrder on
    SSLCompression off
    
    # Certificate files
    SSLCertificateFile /etc/pki/tls/certs/webserver01.crt
    SSLCertificateKeyFile /etc/pki/tls/private/webserver01.key
    SSLCertificateChainFile /etc/pki/tls/certs/ca-chain.crt
    
    # HSTS (HTTP Strict Transport Security)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    ErrorLog logs/webserver01-ssl_error_log
    TransferLog logs/webserver01-ssl_access_log
    CustomLog logs/webserver01-ssl_access_log combined
    
    # Application-specific configuration
    DocumentRoot /var/www/html
    
    <Directory /var/www/html>
        Options -Indexes +IncludesNOEXEC -SymLinksIfOwnerMatch
        AllowOverride None
        Require all granted
    </Directory>
</VirtualHost>
```

### Verification After Deployment

```bash
# Check certificate expiration
openssl x509 -in /etc/pki/tls/certs/webserver01.crt -noout -dates
# Output:
# notBefore=Jan  1 00:00:00 2026 GMT
# notAfter=Jan  1 00:00:00 2027 GMT

# Verify certificate chain
openssl verify -CAfile /etc/pki/tls/certs/ca-chain.crt /etc/pki/tls/certs/webserver01.crt
# Output: /etc/pki/tls/certs/webserver01.crt: OK

# Test SSL connection
openssl s_client -connect webserver01.domain.local:443 -servername webserver01.domain.local < /dev/null 2>/dev/null | grep -E "Verify|Certificate|subject|issuer"
# Output should show: Verify return code: 0 (ok)

# Check with curl
curl -vI https://webserver01.domain.local 2>&1 | grep -E "subject|issuer|expire"
```

---

## Phase 5: Certificate Renewal Workflow

### Proactive Monitoring

**Install monitoring script**:

```bash
#!/bin/bash
# /usr/local/bin/certificate-check.sh

CERT_DIR="/etc/pki/tls/certs"
DAYS_THRESHOLD=90

for cert in "$CERT_DIR"/*.crt; do
    if [ -f "$cert" ]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))
        
        if [ $days_left -lt $DAYS_THRESHOLD ]; then
            echo "WARNING: Certificate $cert expires in $days_left days ($expiry_date)"
            # Send to monitoring system (Nagios, Prometheus, etc.)
        fi
    fi
done
```

**Cron job for daily checks**:

```bash
# /etc/cron.daily/certificate-check
0 6 * * * /usr/local/bin/certificate-check.sh | mail -s "Certificate Expiration Check" admin@domain.local
```

### Renewal Timeline

| Days Before Expiration | Action |
|------------------------|---------|
| 90 | Monitoring alert sent to certificate owner |
| 60 | Generate new CSR (same process as initial) |
| 45 | Submit CSR to CA, receive new certificate |
| 30 | Deploy new certificate via Ansible (zero-downtime) |
| 7 | Force renewal if not completed, escalate to management |
| 0 | **OUTAGE** (should never happen with this process) |

### Zero-Downtime Renewal

```bash
# 1. Deploy new certificate files (alongside old ones)
ansible-playbook deploy-certificates.yml \
  --limit webserver01 \
  -e certificate_force_renewal=true

# 2. Verify new certificate
ansible webserver01 -m command -a "openssl x509 -in /etc/pki/tls/certs/webserver01.crt -noout -dates"

# 3. Graceful service reload (no connection drops)
ansible webserver01 -m service -a "name=httpd state=reloaded"

# 4. Verify service health
ansible webserver01 -m uri -a "url=https://localhost/ status_code=200"

# 5. Archive old certificate (keep for audit)
ansible webserver01 -m command -a "cp /etc/pki/tls/certs/webserver01.crt /var/log/certificates/webserver01-$(date +%Y%m%d).crt.old"
```

---

## Phase 6: Combining Certificate Files

### Creating PKCS#7 Bundle

Some systems (Windows, certain load balancers) require PKCS#7 format:

```bash
# Combine server certificate and CA chain into .p7b
openssl crl2pkcs7 -nocrl \
  -certfile <hostname>.cer \
  -certfile certificatetrustchain.cer \
  -out <hostname>.p7b

# Encrypt with Vault
ansible-vault encrypt <hostname>.p7b
```

### Creating Full Chain for Linux

```bash
# Concatenate for full chain (Apache, Nginx)
cat <hostname>.cer certificatetrustchain.cer > <hostname>-fullchain.crt

# Deploy fullchain
ansible-vault encrypt <hostname>-fullchain.crt
```

---

## Troubleshooting Common Issues

### Issue 1: Certificate Chain Incomplete

**Symptom**: Browsers show "certificate not trusted" or "incomplete chain" errors

**Diagnosis**:
```bash
openssl s_client -connect hostname:443 -servername hostname < /dev/null 2>/dev/null | openssl x509 -noout -issuer
# Compare issuer with expected CA
```

**Solution**: Ensure CA chain is properly concatenated:
```bash
cat hostname.cer intermediates.cer root.cer > hostname-fullchain.crt
```

### Issue 2: SAN Missing Causes Validation Failures

**Symptom**: Chrome/Firefox show `ERR_CERT_COMMON_NAME_INVALID`

**Root Cause**: Certificate has CN but no SAN entries (deprecated since 2017)

**Solution**: Always include `-addext "subjectAltName = ..."` in CSR generation

### Issue 3: Private Key Permissions Too Open

**Symptom**: SSH or service refuses to start, logs show "Permissions 0644 are too open"

**Solution**:
```yaml
mode: "0600"  # Only root can read
owner: root
group: root
```

### Issue 4: Certificate and Key Mismatch

**Symptom**: Service fails to start, error "key values mismatch"

**Diagnosis**:
```bash
# Check if certificate and key match
diff <(openssl x509 -noout -modulus -in cert.crt | openssl md5) \
     <(openssl rsa -noout -modulus -in key.key | openssl md5)
# Should produce no output (files match)
```

**Solution**: Deploy matching certificate/key pair

### Issue 5: Wrong Certificate Deployed

**Symptom**: Certificate shows wrong hostname

**Root Cause**: Manual file selection error

**Solution**: Automation uses `inventory_hostname` to select correct files:
```yaml
src: "files/{{ inventory_hostname }}/tls_cert_{{ inventory_hostname }}.key"
```

---

## Security Best Practices

### 1. Key Management

- **Encryption**: All private keys encrypted with Ansible Vault
- **Permissions**: `0600` for keys, `0644` for certificates
- **Storage**: Never store keys outside Vault-encrypted files
- **Rotation**: Annual key rotation (new key pair, not just new cert)

### 2. Certificate Standards

- **Key Size**: Minimum 2048-bit RSA (3072 for high-security)
- **Validity**: Maximum 1 year (industry standard since 2020)
- **SANs**: Always include all DNS names
- **Signature Algorithm**: SHA-256 or better (SHA-1 deprecated)

### 3. Environment Separation

- **Different CAs**: Separate certificate authorities for dev/test/prod
- **Different Vaults**: Separate Vault passwords per environment
- **No Wildcards in Automation**: Each host gets individual certificate
- **Blast Radius**: Limit impact of single certificate compromise

### 4. Audit and Compliance

- **Version Control**: All certificate files in Git (encrypted)
- **Change Tracking**: Git commits document all changes
- **Access Logs**: Ansible logs track who deployed what
- **Expiration Audit**: Monthly report on certificates expiring in 180 days

---

## Advanced: Multi-Environment Certificate Strategy

### Development Environment

- **Self-signed or internal CA**: Faster issuance, no cost
- **Longer validity**: 2 years (reduced operational overhead)
- **Automated renewal**: Less critical, but still recommended

### Production Environment

- **Public or enterprise CA**: Higher trust, compliance requirement
- **Short validity**: 1 year maximum
- **Strict monitoring**: 90-day alerts, escalation procedures
- **Change control**: Formal approval for deployments

### Vault Configuration

```bash
# Different vaults per environment
~/.secrets/ansible-vault/
├── dev-password      # Development certificates
├── tst-password      # Test/QA certificates
└── prod-password     # Production certificates (most restricted)

# Usage
ansible-playbook deploy.yml --limit dev -e @vault-dev.yml --ask-vault-pass
ansible-playbook deploy.yml --limit prod -e @vault-prod.yml --ask-vault-pass
```

---

## Impact and Metrics

### Before Automation

| Metric | Value |
|--------|-------|
| Certificate-related outages per year | 3-4 |
| Manual effort per deployment | 2-3 hours |
| Certificate configurations | Inconsistent across servers |
| Expiration tracking | Reactive (spreadsheet-based) |
| Compliance status | Failed audits (plaintext keys) |

### After Automation

| Metric | Value | Improvement |
|--------|-------|-------------|
| Certificate-related outages | 0 | 100% elimination |
| Deployment time | 5-10 minutes | 93% reduction |
| Configurations | Standardized | Consistent SANs, key sizes |
| Expiration tracking | Proactive (90-day alerts) | Zero surprise expirations |
| Compliance status | Passed audits | Vault encryption, audit trail |

### Operational Metrics

- **200+ certificates** managed across environments
- **Zero outages** in 18 months
- **100% compliance** in security audits
- **<10 minutes** average deployment time
- **Automated renewal** for 95% of certificates

---

## Certificate Lifecycle Diagram

```svg
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="800" height="600" fill="#f8fafc"/>
  
  <!-- Title -->
  <text x="400" y="40" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="#1e293b">
    Enterprise Certificate Lifecycle Management
  </text>
  
  <!-- Phase 1: Generate -->
  <g transform="translate(50, 80)">
    <rect x="0" y="0" width="180" height="100" rx="8" fill="#3b82f6" opacity="0.1" stroke="#3b82f6" stroke-width="2"/>
    <text x="90" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#1e40af">1. Generate CSR</text>
    <text x="90" y="55" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">OpenSSL CLI</text>
    <text x="90" y="75" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">2048-bit RSA key</text>
    <text x="90" y="90" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">SAN entries included</text>
  </g>
  
  <!-- Arrow 1 -->
  <path d="M 240 130 L 280 130" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Phase 2: Encrypt -->
  <g transform="translate(290, 80)">
    <rect x="0" y="0" width="180" height="100" rx="8" fill="#8b5cf6" opacity="0.1" stroke="#8b5cf6" stroke-width="2"/>
    <text x="90" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#6d28d9">2. Encrypt</text>
    <text x="90" y="55" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Ansible Vault</text>
    <text x="90" y="75" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">AES-256 encryption</text>
    <text x="90" y="90" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Git-safe storage</text>
  </g>
  
  <!-- Arrow 2 -->
  <path d="M 480 130 L 520 130" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Phase 3: Deploy -->
  <g transform="translate(530, 80)">
    <rect x="0" y="0" width="180" height="100" rx="8" fill="#10b981" opacity="0.1" stroke="#10b981" stroke-width="2"/>
    <text x="90" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#059669">3. Deploy</text>
    <text x="90" y="55" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Ansible Role</text>
    <text x="90" y="75" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Apache/Nginx</text>
    <text x="90" y="90" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">0600 permissions</text>
  </g>
  
  <!-- Arrow down -->
  <path d="M 620 190 L 620 250" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)"/>
  
  <!-- Phase 4: Monitor -->
  <g transform="translate(530, 260)">
    <rect x="0" y="0" width="180" height="100" rx="8" fill="#f59e0b" opacity="0.1" stroke="#f59e0b" stroke-width="2"/>
    <text x="90" y="30" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#d97706">4. Monitor</text>
    <text x="90" y="55" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">90-day alerts</text>
    <text x="90" y="75" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Daily checks</text>
    <text x="90" y="90" text-anchor="middle" font-family="Arial" font-size="11" fill="#475569">Expiration tracking</text>
  </g>
  
  <!-- Arrow loop back -->
  <path d="M 520 310 L 100 310 L 100 190" stroke="#64748b" stroke-width="2" fill="none" marker-end="url(#arrowhead)" stroke-dasharray="5,5"/>
  <text x="310" y="305" text-anchor="middle" font-family="Arial" font-size="11" fill="#64748b" font-style="italic">Renewal loop (60 days before expiry)</text>
  
  <!-- Security Layer -->
  <g transform="translate(50, 400)">
    <rect x="0" y="0" width="700" height="140" rx="8" fill="#ef4444" opacity="0.05" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5"/>
    <text x="350" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#dc2626">Security & Compliance Layer</text>
    
    <g transform="translate(30, 40)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">Vault encryption for all private keys</text>
    </g>
    
    <g transform="translate(30, 65)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">0600 file permissions enforced</text>
    </g>
    
    <g transform="translate(30, 90)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">Separate vaults per environment</text>
    </g>
    
    <g transform="translate(380, 40)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">Audit trail via Git commits</text>
    </g>
    
    <g transform="translate(380, 65)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">Annual key rotation policy</text>
    </g>
    
    <g transform="translate(380, 90)">
      <circle cx="10" cy="10" r="5" fill="#dc2626"/>
      <text x="25" y="15" font-family="Arial" font-size="11" fill="#1e293b">PCI-DSS, SOC2 compliant</text>
    </g>
  </g>
  
  <!-- Arrow marker definition -->
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#64748b"/>
    </marker>
  </defs>
</svg>
```

---

## Validation Matrix

| Validation Goal | What to Baseline | Success Criteria |
|-----------------|------------------|------------------|
| Certificate Validity | Expiration date, chain completeness, SAN entries | `openssl verify` returns OK, browser shows valid connection |
| Service Availability | HTTPS endpoint responds, no SSL errors | `curl -vI https://hostname` returns 200 with valid cert |
| Security Compliance | Key permissions, vault encryption, no plaintext | `ls -l` shows 0600, all keys encrypted with Vault |
| Renewal Readiness | Monitoring alerts, renewal procedure tested | Alert received 90 days before expiration, renewal tested |

---

## Failure Modes and Mitigations

| Failure Mode | Why It Appears | Mitigation |
|--------------|----------------|------------|
| Missing SAN entries | CSR generated without `-addext` flag | Template includes all required SANs by default |
| Expired certificate | Renewal not started early enough | Monitoring alerts 90 days before expiration |
| Wrong certificate deployed | Manual file selection error | Automation uses `inventory_hostname` to select files |
| Private key exposed | Insecure permissions or unencrypted storage | Vault encryption, 0600 permissions enforced |
| Chain incomplete | CA chain not concatenated properly | Automated deployment includes full chain |

---

## Recruiter-Readable Impact Summary

- **Scope**: Secure certificate lifecycle management across 200+ enterprise servers
- **Execution quality**: Guarded by automated validation, proactive monitoring, encryption
- **Outcome signal**: Zero outages, standardized configurations, full audit trail
- **Technical depth**: OpenSSL, PKI, Ansible Vault, Apache SSL, compliance requirements
- **Business impact**: 93% time reduction, 100% compliance, zero preventable outages
