# Hetzner vSwitch Private Networking Setup

This guide explains how to configure private networking between Hetzner bare metal servers using vSwitch.

## Overview

Hetzner vSwitch provides Layer 2 connectivity between servers in the same datacenter. This playbook configures VLAN-tagged interfaces on each server for private inter-server communication.

## Prerequisites

1. **vSwitch created in Hetzner Robot**
   - Log into [Hetzner Robot](https://robot.hetzner.com)
   - Go to vSwitches → Create vSwitch
   - Note the VLAN ID (4000-4091)

2. **Servers attached to vSwitch**
   - In Robot, attach each server to the vSwitch
   - Each server must be in the same datacenter as the vSwitch

3. **SSH access via public IP**
   - The playbook connects via public IP (ansible_host)
   - Private IP is only for inter-server communication

## Finding Required Information

### Physical Interface Name

SSH to the server and run:

```bash
ip link show
```

Look for the main ethernet interface (usually `enp0s31f6`, `eth0`, or similar). It's the one with your public IP.

### VLAN ID

Found in Hetzner Robot panel under vSwitches → Your vSwitch → VLAN ID.

## Inventory Configuration

### Global Variables (group_vars/all.yml)

```yaml
# VLAN ID from Hetzner Robot (must be 4000-4091)
vswitch_vlan_id: 4000

# MTU MUST be 1400 (Hetzner requirement)
vswitch_mtu: 1400

# Private network CIDR
vswitch_private_subnet: "10.0.0.0/24"

# Netplan config file path
vswitch_netplan_file: "/etc/netplan/60-vswitch.yaml"
```

### Per-Host Variables (hosts.yml)

```yaml
mta-1:
  ansible_host: 159.69.x.x           # Public IP for SSH
  vswitch_private_ip: "10.0.0.1"     # Private IP (unique per host)
  vswitch_physical_interface: "enp0s31f6"  # Physical NIC name

mta-2:
  ansible_host: 159.69.x.y
  vswitch_private_ip: "10.0.0.2"
  vswitch_physical_interface: "enp0s31f6"
```

## Usage

### Important: One Server at a Time

This playbook **MUST** target exactly one host per execution. Always use `--limit`:

```bash
# Configure mta-1
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-1

# Configure mta-2
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-2
```

### Dry Run (Recommended First)

```bash
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-1 \
  --check --diff
```

### Only Run Preflight Checks

```bash
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-1 \
  --tags preflight
```

### Only Verify Configuration

```bash
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-1 \
  --tags verify
```

### Verbose Output

```bash
ansible-playbook playbooks/configure-vswitch.yml \
  -i inventory/helsinki/hosts.yml \
  --limit mta-1 \
  -vv
```

## Verification

After configuring all servers, verify connectivity:

### On each server, check the interface:

```bash
ip addr show enp0s31f6.4000
```

Expected output:
```
5: enp0s31f6.4000@enp0s31f6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1400 ...
    inet 10.0.0.1/24 brd 10.0.0.255 scope global enp0s31f6.4000
```

### Check MTU:

```bash
ip link show enp0s31f6.4000 | grep mtu
```

Must show `mtu 1400`.

### Test connectivity between servers:

From mta-1:
```bash
ping 10.0.0.2  # Ping mta-2's private IP
```

## Troubleshooting

### Interface not coming up

1. Check the physical interface exists:
   ```bash
   ip link show enp0s31f6
   ```

2. Check netplan config syntax:
   ```bash
   cat /etc/netplan/60-vswitch.yaml
   netplan generate
   ```

3. Check 8021q module is loaded:
   ```bash
   lsmod | grep 8021q
   ```

4. Try applying netplan again:
   ```bash
   netplan apply
   ```

### Cannot ping other servers

1. Verify both servers are attached to the **same** vSwitch in Hetzner Robot

2. Check VLAN IDs match:
   ```bash
   cat /etc/netplan/60-vswitch.yaml | grep id:
   ```

3. Check firewall isn't blocking:
   ```bash
   # If using ufw
   ufw status

   # If using iptables
   iptables -L INPUT -n | grep 10.0.0
   ```

4. Verify servers are in the same datacenter (vSwitch is datacenter-local)

### MTU issues / Packet loss

MTU **must** be 1400. Hetzner's vSwitch infrastructure doesn't support larger frames.

1. Check current MTU:
   ```bash
   ip link show enp0s31f6.4000 | grep mtu
   ```

2. Fix manually:
   ```bash
   ip link set mtu 1400 dev enp0s31f6.4000
   ```

3. The cron job should fix this on reboot:
   ```bash
   crontab -l | grep ANSIBLE_VSWITCH
   ```

### Large packets fail, small packets work

This is an MTU mismatch. One side has MTU > 1400. Fix both sides:

```bash
ip link set mtu 1400 dev enp0s31f6.4000
```

## How to Rollback

If something goes wrong:

1. SSH to the server (via public IP)

2. Check backups:
   ```bash
   ls -la /root/netplan-backups/
   ```

3. Remove the vSwitch config:
   ```bash
   rm /etc/netplan/60-vswitch.yaml
   ```

4. Restore original configs (if needed):
   ```bash
   cp /root/netplan-backups/*.bak /etc/netplan/
   # Rename to remove .bak extension
   ```

5. Apply:
   ```bash
   netplan apply
   ```

6. Remove cron entry:
   ```bash
   crontab -e
   # Delete the line containing ANSIBLE_VSWITCH_MTU_FIX
   ```

## How to Remove Configuration

To completely remove vSwitch configuration from a server:

```bash
# Remove netplan config
rm /etc/netplan/60-vswitch.yaml

# Apply to remove the interface
netplan apply

# Remove MTU fix cron entry
crontab -l | grep -v ANSIBLE_VSWITCH_MTU_FIX | crontab -

# Remove firewall rules (if using ufw)
ufw delete allow from 10.0.0.0/24
```

## Technical Notes

### Why MTU 1400?

Hetzner vSwitch uses VXLAN encapsulation internally, which adds overhead. The 1400 MTU ensures packets fit within Hetzner's infrastructure without fragmentation.

### Why the cron workaround?

Ubuntu's netplan has a known bug where MTU settings on VLAN interfaces don't always persist across reboots. The cron job ensures MTU is set correctly after each boot.

### VLAN Interface Naming

The interface is named `<physical>.<vlan_id>` (e.g., `enp0s31f6.4000`). This is standard Linux VLAN naming.
