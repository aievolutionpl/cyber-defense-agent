# Home and small-office network

Scope: the network the user owns or administers. Never scan, probe or look up addresses that belong to someone else (a neighbour's Wi-Fi, an ISP's equipment, an employer's network without written permission).

## What usually goes wrong

1. The router: default admin password, firmware years old or out of support, remote administration on.
2. Port forwards and UPnP exposing a NAS, camera, RDP, database or admin panel to the internet.
3. Weak Wi-Fi: WPA/WEP, WPS PIN enabled, one shared password for staff, guests and gadgets.
4. Forgotten devices: cameras, printers and IoT that never update, on the same network as laptops.
5. Remote access left behind: old VPN accounts, TeamViewer/AnyDesk with unattended access.

## Step 1 - what this machine exposes (L2)

`node tools/cda.mjs inventory --name pc --yes` lists listening TCP ports as `network-reachable` or `loopback-only`. For each reachable port ask: what is it, who needs it, and from where? Typical answers: file sharing (445), remote desktop (3389), a development server, a database that should be on 127.0.0.1.

Read-only context commands (show each one first):

| | Windows | macOS | Linux |
|---|---|---|---|
| Firewall | `Get-NetFirewallProfile` | `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` | `ufw status verbose` / `nft list ruleset` |
| Listeners with process | `Get-NetTCPConnection -State Listen` | `lsof -nP -iTCP -sTCP:LISTEN` | `ss -tulpn` |
| Addresses, gateway, DNS | `ipconfig /all` | `ifconfig`; `scutil --dns` | `ip -br addr`; `ip route`; `resolvectl status` |
| Wi-Fi security | `netsh wlan show interfaces` | `system_profiler SPAirPortDataType` | `nmcli -f ACTIVE,SSID,SECURITY dev wifi` |
| Neighbours seen | `arp -a` | `arp -a` | `ip neigh` |
| Network profile | `Get-NetConnectionProfile` | - | - |

`arp -a` / `ip neigh` shows devices this machine has already talked to. It sends nothing and is the safest device list. Private addresses and MAC vendors are still the user's data: keep them out of web searches.

## Step 2 - the router (the user looks, you guide)

Ask the user to open the router's admin page and read out or paste the settings. Checklist:

- Admin password changed from the default; admin page not reachable from the internet (remote management off).
- Firmware version and date. Look up the model for end-of-life status and known vulnerabilities (model name only). An unsupported router is P1: replace it.
- Wi-Fi: WPA3 or WPA2-AES; never WEP/WPA/TKIP. WPS off. A long passphrase that is not the default on the sticker.
- UPnP off unless something specific needs it. Port forwarding list: every entry explained; remove the rest. DMZ host off.
- Guest network for visitors; a separate network or VLAN for cameras, TVs and smart devices so they cannot reach laptops.
- DNS servers are the ones the user expects (unexpected DNS is a sign of hijacking).
- Connected-devices list: every device recognised. Unknown ones: change the Wi-Fi password and re-join the known devices.
- Cloud or app-based remote management: only if the user uses it, protected with MFA.

## Step 3 - what the internet sees (L4, consent required)

Preferred: reason from the router's port-forward list and from each service's own settings. If the user wants an outside view of **their own** public address, they can check it themselves in an internet-wide scan database (Shodan, Censys) or with their ISP's or router vendor's test - explain that this reveals their IP address to that service and let them decide. Do not submit their address anywhere yourself without a clear yes.

On-network discovery with a scanner (only if the user already has one, confirms they administer the network, and asks for it): one ping sweep of their own subnet and a default TCP scan of their own hosts at normal timing. No evasion options, no vulnerability or brute-force scripts, no addresses outside their private range. Then interpret; the scan itself fixes nothing.

## Step 4 - interpret

| Observation | Priority | Advice |
|---|---|---|
| RDP, SMB, VNC, Telnet, a database or an admin panel reachable from the internet | P0-P1 | close the forward; use a VPN (WireGuard, Tailscale-style mesh, or the router's VPN) |
| Router or NAS out of support, or with a known exploited flaw | P1 | update or replace |
| Default or shared admin credentials on router, NAS, camera | P1 | unique passwords in a password manager, MFA where offered |
| WEP/WPA/TKIP or WPS enabled | P1 | WPA2-AES/WPA3, WPS off |
| IoT and work devices on one flat network | P2 | guest/IoT network |
| UPnP on with unknown mappings | P2 | disable; add explicit forwards only if needed |
| SMBv1, Telnet, FTP in use inside the network | P2 | replace with SMB3, SSH, SFTP |
| No DNS filtering | P3 | consider a protective resolver |

## Small-office additions

A named owner for the network; unique accounts instead of shared ones; MFA on email and remote access; offboarding removes Wi-Fi and VPN access; backups of the router configuration; a simple inventory of devices; logs or at least alerts from the firewall; an offline or immutable backup of business data; a one-page plan for who to call when something goes wrong.

## Retest

After changes: re-run `inventory` for local listeners, have the user re-read the router's forward and device lists, and reconnect a device to confirm Wi-Fi settings. State what was verified by observation and what is the user's report.

References: CIS Controls v8 (Implementation Group 1), NIST guidance for home and small-office networks, national CERT router hardening guides (see `sources.md`).
