---
title: "Flexible Apache Reverse Proxy Configuration with Ansible"
description: "How to use a single, universal Ansible role to deploy static sites, PHP apps, or complex reverse proxies just by changing host variables."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Flexible Apache Reverse Proxy Configuration with Ansible.\""
issue: "Needed a repeatable way to use a single, universal Ansible role to deploy static sites, PHP apps, or complex reverse proxies just by changing host variables."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-02-25
category: "infrastructure"
tags: ["ansible", "apache", "proxy", "tomcat"]
draft: false
---

## Situation
When managing dozens of web servers, you don't want a separate Ansible role for every single type of application (static HTML, PHP, reverse proxy to Tomcat, etc.). A better approach is to design a universal `app_apache` role that provides the core container (VirtualHost, SSL, Firewall rules) and injects the specific behavior via a configuration snippet.

Here is how you can configure a host as an Apache Reverse Proxy (e.g., passing traffic to Tomcat) without touching the underlying role's code.

## Task 1 – The Host Variables

In your inventory `host_vars` for the specific server (e.g., `host-example-01.yml`), you define the server name and point to the custom snippet.

```yaml
# 1. Enable network connection (CRITICAL for SELinux to allow proxying)
app_apache_setsebool_httpd_can_network_connect: true

# 2. Define the VirtualHost server name
app_apache_server_name_https: "app.example.internal"

# 3. Inject the Proxy Logic
# Point to a local snippet file in your Ansible repository
app_apache_vhost_https_include_filename: "files/snippets/reverse_proxy_tomcat_8080.conf"

# 4. Certificates
app_apache_cert_bundle_input:
  - "{{inventory_hostname}}/server.crt"
```

## Task 2 – The Proxy Snippet

Create the snippet file in your Ansible repository at `files/snippets/reverse_proxy_tomcat_8080.conf`. This contains standard Apache directives.

```apache
ProxyPreserveHost On
ProxyPass / http://localhost:8080/
ProxyPassReverse / http://localhost:8080/
```

## Why This Design Works

In your main Ansible role's `vhost.conf.j2` template, you simply include a Jinja lookup:

```jinja2
{{ lookup('file', app_apache_vhost_https_include_filename, errors='ignore') }}
```

This transforms your Ansible role into a universal Lego piece. The role handles the tedious tasks (installing packages, configuring firewalld, renewing TLS certificates), and your `host_vars` define the personality of the server. 

If tomorrow you need a static site instead of a proxy, you just point `app_apache_vhost_https_include_filename` to a different snippet with a `DocumentRoot` and `<Directory>` block, and set `app_apache_setsebool_httpd_can_network_connect: false`. No role refactoring needed!