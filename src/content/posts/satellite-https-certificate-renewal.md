---
title: "Renewing Red Hat Satellite's HTTPS Certificate (katello-certs-check + satellite-installer)"
description: "How to rotate the SSL/TLS server certificate on a Red Hat Satellite server: generate a CSR on the Satellite host, validate the returned chain with katello-certs-check, and apply it with satellite-installer without reinstalling."
situation: "Our Satellite server ran its HTTPS certificate near expiry. The CA team issued a replacement signed by a corporate root, but Satellite's own Apache and Katello services were still serving the old certificate, and the manual cert lifecycle we used for app servers didn't apply to Satellite's internal services."
issue: "Satellite bundles its certificate into the load-balanced Apache and the Katello daemons. Placing a new .pem in the right directory isn't enough — the service layer reads its certs from the installer's configuration, so a plain file swap either fails validation or gets overwritten on the next installer run."
solution: "Generated a new CSR on the Satellite host itself, installed the returned server certificate and CA bundle, validated the full chain with katello-certs-check, then applied the update with satellite-installer using --certs-update-server and --certs-update-server-ca, which repoints Apache and the Katello services at the new certificate."
usedIn: "Red Hat Satellite management platform used for content distribution, patching, and host registration across a RHEL estate."
impact: "Rotated the HTTPS certificate with zero downtime and no reinstallation, and avoided the trap of an installer run overwriting a manually placed certificate. The validated chain check caught a missing CA component before it was ever applied."
pubDate: 2026-08-31
category: ["infrastructure", "automation"]
tags: ["satellite", "katello", "certificates", "openssl", "rhel", "tls"]
draft: false
---

The general Ansible/OpenSSL certificate workflow handles app servers. A Red Hat Satellite box is different: it serves its own HTTPS certificate through Apache and the Katello stack, and that certificate is owned by the Satellite installer, not by a raw directory. When I had to renew it on a live server, the procedure was narrower than the generic case but has one easy-to-miss step at the end.

## 1. Generate the CSR on the Satellite host itself

The private key stays on the server, which is the right place for a service certificate. Generate the key and CSR from the host:

```bash
openssl req -new \
  -key /root/satellite_cert/satellite.key.pem \
  -out /root/satellite_cert/satellite.csr \
  -subj "/C=DE/ST=BM/L=Munich/O=Organization/CN=satellite.example.com" \
  -addext "subjectAltName=DNS:satellite.example.com,DNS:satellite.example.com"
```

A couple of points that matter here:

- The CN and the SAN entries must cover the exact FQDN clients use. If Satellite is also reachable by a short name or an alias, add it to the `subjectAltName` list. Getting the SAN wrong produces certificate-hostname errors after a smooth renewal.
- Keep the private key out of the CSR request. It stays on the host in `0600`, and only the `.csr` goes to the CA team.

## 2. Install the returned certificate and the CA bundle

The CA returns a server certificate and a CA chain. Copy both into the Satellite certificate directory:

```bash
cp /root/satellite_cert/satellite_2026_cert.pem /root/satellite_cert/satellite_cert.pem
cp /root/satellite_cert/ca.pem        /root/satellite_cert/ca.pem
```

Keep the layout predictable: the server certificate, the private key, and the CA bundle all live in the same directory, so the installer can find each one.

## 3. Check the chain before applying anything

`katello-certs-check` is the tool that knows what Satellite expects. It validates that the certificate, the key, and the CA bundle form a valid chain and that the key matches. Run it before touching the live config:

```bash
katello-certs-check \
  -c /root/satellite_cert/satellite_2026_cert.pem \
  -k /root/satellite_cert/satellite.key.pem \
  -b /root/satellite_cert/ca.pem
```

Pass the full CA bundle (server chain) with `-b`. If the bundle is missing an intermediate or the chain doesn't reach the root, this command fails loudly — which is exactly what you want before the installer consumes it.

## 4. Apply the certificate update with satellite-installer

This is the step that does the actual rotation. `certs-update-server` tells the installer to re-issue the server cert from the provided files rather than re-generating its own:

```bash
satellite-installer --scenario satellite \
  --certs-server-cert "/root/satellite_cert/satellite_2026_cert.pem" \
  --certs-server-key  "/root/satellite_cert/satellite.key.pem" \
  --certs-server-ca-cert "/root/satellite_cert/ca.pem" \
  --certs-update-server \
  --certs-update-server-ca
```

The two `--certs-update-*` flags are the important part. Without them, the installer can regenerate its own certificate on a later run and silently undo your manual placement — the reason a plain file swap on Satellite never survives.

## The part that's easy to miss

A manual placement of the new `.pem` into the Apache/Katello directory is not sufficient on Satellite. The services read the certificate path from the installer's configuration, so the durable way to rotate it is through `satellite-installer` with the update flags. The chain-check pass beforehand is what makes the apply step safe: a failed chain is caught before it reaches the running services, not after.

Once applied, verify the running endpoint presents the new certificate:

```bash
openssl s_client -connect satellite.example.com:443 -servername satellite.example.com </dev/null 2>/dev/null \
  | grep -E "subject|issuer|notAfter"
```

The `subject` should show the new CN, the `issuer` should show the corporate CA, and `notAfter` should match the new expiration date.
