---
title: "Managing Linux Users and Groups with Ansible"
description: "A practical pattern for managing local users, groups, and sudo access across Linux servers using Ansible with host-specific variables."
situation: "User management was manual and inconsistent. Service accounts had different UIDs across servers, sudo access was granted via one-off edits, and onboarding new servers required hours of manual work."
usedIn: "Linux platform at a German bank, managing 50+ service accounts and 200+ servers with consistent user configurations."
impact: "Reduced user provisioning time from hours to minutes, eliminated UID/GID conflicts, and enabled audit-compliant sudo access management."
pubDate: 2026-02-10
category: ["infrastructure", "automation"]
tags: ["ansible", "linux", "user-management", "sudo"]
draft: false
---

## Situation

When deploying new applications, you frequently need to provision technical users (service accounts) on Linux servers. In an enterprise environment, especially when dealing with clustered applications or shared storage (like NFS), it is critical that these users have **identical UIDs and GIDs across all servers**.

If a user has `UID 1001` on Server A and `UID 1005` on Server B, file permissions on a shared NFS mount will break. Here is how we manage this using Ansible to ensure consistency.

## Task 1 – Defining the Source of Truth

We don't hardcode user creation into individual application playbooks. Instead, we use a central `common_usersetup` role and a single source of truth for all local technical users: `unix_local_users.yml`.

Every technical user gets a dedicated block defining its properties.

```yaml
# vars/unix_local_users.yml
local_users_app:
  myapp:
    uid: 45004
    gid: 45004
    is_ad_user: false
    is_external_group: false
    home: /opt/myapp/home
    comment: "Technical user for MyApp Service"

  legacyapp:
    uid: 41002
    gid: 41002
    is_ad_user: false
    is_external_group: false
    home: /opt/legacy/home
```

## Task 2 – The Importance of Static IDs

Notice that we explicitly assign `uid: 45004` and `gid: 45004`.

We maintain a registry of allocated ID ranges. When a new application needs a user, we pick the next available ID from the `45xxx` block. This prevents Ansible from simply running `useradd` and letting the OS assign the next available ID, which guarantees mismatch across servers built at different times.

## Task 3 – Handling Deprecated Users

A common issue occurs when an old application is decommissioned, or a user needs to be replaced. You can't just delete the user from your `unix_local_users.yml` file, because then Ansible won't know it needs to remove that user from existing servers.

If you try to reuse the UID for a _new_ user while the old user still exists, Ansible will throw a duplicate key/UID error.

To solve this, we move the old user to a `deprecated_users` list:

```yaml
# vars/deprecated_users.yml
deprecated_users:
  - name: oldapp
    state: absent
    remove: yes # also removes the home directory
```

Our Ansible role first iterates through `deprecated_users`, ensuring they are removed, before it provisions the users in `local_users_app`. This prevents UID conflicts and keeps the servers clean.

## Task 4 – Creating the User with Ansible

The actual Ansible task within our `common_usersetup` role looks like this:

```yaml
- name: "Ensure local groups exist"
  ansible.builtin.group:
    name: "{{ item.key }}"
    gid: "{{ item.value.gid }}"
    state: present
  loop: "{{ local_users_app | dict2items }}"
  when: not item.value.is_external_group

- name: "Ensure local users exist"
  ansible.builtin.user:
    name: "{{ item.key }}"
    uid: "{{ item.value.uid }}"
    group: "{{ item.value.gid }}"
    home: "{{ item.value.home }}"
    comment: "{{ item.value.comment | default('') }}"
    shell: "/bin/bash"
    state: present
  loop: "{{ local_users_app | dict2items }}"
```

By separating the data (`unix_local_users.yml`) from the logic (the Ansible tasks), any systems engineer can request a new technical user via a simple Pull Request adding a few lines of YAML, without needing to understand the underlying automation code.

