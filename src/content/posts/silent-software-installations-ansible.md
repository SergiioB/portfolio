---
title: "Silent Software Installations on Linux using Ansible"
description: "How to automate interactive vendor installers (like SAS Software Depot) by recording response files and executing them via Ansible."
situation: "During enterprise Linux and virtualization operations across multi-team environments, this case came from work related to \"Silent Software Installations on Linux using Ansible.\""
issue: "Needed a repeatable way to automate interactive vendor installers (like SAS Software Depot) by recording response files and executing them via Ansible."
solution: "Implemented a practical runbook/automation pattern with clear safety checks, execution steps, and verification points."
usedIn: "Used in Linux platform engineering, middleware operations, and datacenter modernization projects in regulated environments."
impact: "Improved repeatability, reduced incident risk, and made operational handoffs clearer across teams."
pubDate: 2026-01-23
category: "infrastructure"
tags: ["ansible", "linux", "installation", "automation"]
draft: false
---

## Situation
Many enterprise software vendors (like SAS, Oracle, or IBM) provide complex installation wizards for Linux that expect an administrator to click through GUI screens or answer interactive prompts. 

When you are provisioning infrastructure with Ansible, you cannot have a playbook hang indefinitely waiting for user input. The solution is to use "Silent Installation" mode combined with a pre-recorded response file.

Here is the strategy we used for automating a SAS 9.4 deployment on RHEL 9.

## Task 1 – The "Record and Playback" Concept

Almost all complex installers offer a way to record your choices.

1.  **Manual Dry Run:** You run the installer manually on a temporary test VM.
2.  **Record Flag:** You pass a specific flag to the installer telling it to record your inputs to a file rather than just installing.
3.  **The Response File:** The result is a text file (often `.properties`, `.rsp`, or `.ini`) containing all the configuration choices you made (installation paths, port numbers, license keys).

For SAS, the manual process involves using their Deployment Wizard to generate a `response.properties` file.

## Task 2 – Preparing the Ansible Role

Once you have the response file, you destroy the test VM and move to Ansible. Your Ansible role needs to handle the prerequisites before launching the installer.

A typical role structure looks like this:

1.  **System Limits:** Configure `/etc/security/limits.conf` (e.g., setting `nofile` to 20480).
2.  **Dependencies:** Install required OS packages via `dnf` (e.g., `libXtst`, `xauth`).
3.  **Users/Groups:** Create the dedicated technical user (e.g., `svc_installer`) using the correct UID/GID.
4.  **Staging the Media:** Transfer the massive installation media (the "Depot") and the `response.properties` file to the target server.

```yaml
- name: Synchronize Software Depot to target
  ansible.posix.synchronize:
    src: "/mnt/nfs_share/software_depots/sas94/"
    dest: "/opt/install_media/sas94/"

- name: Copy response file
  ansible.builtin.copy:
    src: "files/sas_response.properties"
    dest: "/opt/install_media/sas94/response.properties"
```

## Task 3 – Executing the Silent Install

The final step is to execute the installer script, passing it the flags that tell it to run silently and use the response file we just copied.

Because this process can take a long time, we use the `ansible.builtin.command` module (or `shell`) and often increase the timeout or run it asynchronously.

```yaml
- name: Execute Silent Installation
  ansible.builtin.command:
    cmd: "./setup.sh -silent -responsefile /opt/install_media/sas94/response.properties -skiposlevelcheck"
    chdir: "/opt/install_media/sas94/"
  become: yes
  become_user: "svc_installer" # Crucial: Run as the application user, not root
  register: install_result
  changed_when: install_result.rc == 0
```

### Key Takeaway

The core software installation is technically a "non-Ansible process" (Ansible isn't managing the individual files the vendor installer places). However, Ansible is the **orchestrator**: it sets the stage perfectly, triggers the silent install script, and then takes over again to configure the systemd services to manage the newly installed application.