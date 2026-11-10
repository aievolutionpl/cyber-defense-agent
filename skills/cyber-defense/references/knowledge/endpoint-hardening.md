# Endpoint hardening: Windows, macOS, Linux

A short baseline that stops most real-world compromises of a personal or small-business machine. Check with read-only commands; show each command before running it; the user applies changes.

## The baseline (any OS)

1. **Supported OS with automatic updates on.** Past end of life is P1.
2. **Disk encryption on** (BitLocker, FileVault, LUKS). A lost laptop without it is a data breach.
3. **Daily work in a standard account.** Admin rights only on request (UAC / sudo).
4. **Firewall on, inbound blocked by default.** Sharing services off unless needed.
5. **Screen lock** after a few minutes, with a strong password or biometric plus PIN.
6. **Password manager and multi-factor authentication** for email, banking, cloud, Git hosting. Email is the reset key for everything else.
7. **Backups that are tested and not permanently connected** (3-2-1: three copies, two media, one off-site). This is the only reliable ransomware recovery.
8. **Built-in malware protection on and current.** A second antivirus rarely helps; an expired one hurts.
9. **Browser:** current version, few extensions, a content blocker, no saved passwords outside the manager.
10. **Remove what is unused:** old software, old accounts, old remote-access tools.

## Windows - read-only checks (PowerShell)

| Check | Command | Good |
|---|---|---|
| Defender | `Get-MpComputerStatus \| Select-Object AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated` | enabled, signatures < 3 days |
| Firewall | `Get-NetFirewallProfile \| Select-Object Name,Enabled,DefaultInboundAction` | all enabled; inbound Block |
| Network profile | `Get-NetConnectionProfile \| Select-Object Name,NetworkCategory` | Public on untrusted Wi-Fi |
| Disk encryption | `Get-BitLockerVolume \| Select-Object MountPoint,ProtectionStatus` (admin) | On for system drive |
| Admins | `Get-LocalGroupMember Administrators` | only expected accounts |
| Accounts | `Get-LocalUser \| Select-Object Name,Enabled,PasswordRequired,LastLogon` | Guest disabled; no stale users |
| UAC | `(Get-ItemProperty HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System).EnableLUA` | 1 |
| Remote Desktop | `(Get-ItemProperty 'HKLM:\System\CurrentControlSet\Control\Terminal Server').fDenyTSConnections` | 1 unless needed; never forwarded from the internet |
| SMBv1 | `Get-SmbServerConfiguration \| Select-Object EnableSMB1Protocol` | False |
| Recent patches | `Get-HotFix \| Sort-Object InstalledOn -Descending \| Select-Object -First 5` | within the last month |
| Secure Boot | `Confirm-SecureBootUEFI` | True |
| Autostart | `Get-CimInstance Win32_StartupCommand \| Select-Object Name,Command,Location` | every entry explainable |
| Scheduled tasks | `Get-ScheduledTask \| Where-Object {$_.State -ne 'Disabled' -and $_.TaskPath -notlike '\Microsoft\*'}` | every entry explainable |
| Listening ports | `Get-NetTCPConnection -State Listen \| Select-Object LocalAddress,LocalPort,OwningProcess` | nothing unexpected on 0.0.0.0 |

Common findings: RDP reachable from the internet (P0/P1), Defender disabled by a leftover trial antivirus, daily account in Administrators, Office macros allowed from the internet, PowerShell v2 still enabled, Windows 10 without Extended Security Updates.

## macOS - read-only checks (Terminal)

| Check | Command | Good |
|---|---|---|
| FileVault | `fdesetup status` | On |
| System Integrity Protection | `csrutil status` | enabled |
| Gatekeeper | `spctl --status` | assessments enabled |
| Firewall | `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` | enabled |
| Updates | `softwareupdate -l` | no pending security updates |
| Auto-update | `defaults read /Library/Preferences/com.apple.SoftwareUpdate` | automatic checks and installs on |
| Admins | `dscl . -read /Groups/admin GroupMembership` | only expected accounts |
| Sharing | System Settings > General > Sharing | Remote Login, Screen and File Sharing off unless needed |
| Login items | System Settings > General > Login Items; `ls ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons` | every entry explainable |
| Profiles | `profiles list` | no unknown configuration profile |

Common findings: FileVault off, an unknown configuration profile or login item (often adware), an outdated major macOS, Remote Login on with a weak password.

## Linux - read-only checks

| Check | Command | Good |
|---|---|---|
| Pending updates | `apt list --upgradable` / `dnf check-update --security` | none security-relevant |
| Auto-updates | `systemctl is-enabled unattended-upgrades` / `dnf-automatic.timer` | enabled |
| Firewall | `ufw status verbose` / `firewall-cmd --list-all` / `nft list ruleset` | default deny inbound |
| Listening services | `ss -tulpn` | only intended services; databases on 127.0.0.1 |
| SSH | `sshd -T \| grep -Ei 'permitrootlogin\|passwordauthentication\|pubkeyauthentication'` (root) | root login no; password auth no; keys yes |
| Sudoers | `getent group sudo wheel` | only expected accounts |
| Accounts with shells | `awk -F: '$7 !~ /(nologin\|false)$/ {print $1}' /etc/passwd` | every entry explainable |
| Disk encryption | `lsblk -o NAME,FSTYPE,MOUNTPOINT` | `crypto_LUKS` on laptops |
| Running services | `systemctl list-units --type=service --state=running` | nothing unused |
| Scheduled jobs | `crontab -l`; `ls /etc/cron.d`; `systemctl list-timers` | every entry explainable |
| Reboot needed | `test -f /var/run/reboot-required && echo yes` / `needs-restarting -r` | no |
| Kernel support | `uname -r` and the distribution release vs endoflife.date | supported |

Servers additionally: SSH keys only plus fail2ban or equivalent rate limiting, services bound to localhost behind a reverse proxy, no secrets in world-readable files or shell history, separate non-root service accounts, logs shipped off the host, container images rebuilt regularly, Docker socket not exposed.

## Signs worth a closer look

Unknown admin accounts, new autostart or scheduled entries, security tools switched off, unexpected listening ports, browser redirects or new extensions, fans and CPU busy while idle, logins from unknown places in account activity pages. One sign is a question; several together justify the incident playbook.

References: CIS Benchmarks, Microsoft security baselines, the macOS Security Compliance Project, DevSec hardening baselines, Lynis control descriptions (see `sources.md`).
