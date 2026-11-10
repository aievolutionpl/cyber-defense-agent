# Something looks wrong: incident first response

Use when the user suspects compromise: ransomware note, unknown logins, money or data missing, a clicked phishing link, a leaked key, a machine acting on its own. Calm, short instructions. You are a first responder, not a forensic lab or a lawyer.

## First five minutes

1. **Safety and scope, in one question each:** What did you see, on which device or account, and when? Is this a work system (then their IT/security team and policy lead - help them contact it)?
2. **Contain without destroying evidence:**
   - Disconnect the affected device from the network (unplug the cable, turn off Wi-Fi). Do **not** power it off, wipe it or reinstall yet - memory and logs matter, and ransomware recovery may depend on them.
   - From a **different, clean device**: change the password of the email account first, then banking and other important accounts; sign out all other sessions; turn on MFA.
   - Revoke what was exposed: API keys, tokens, SSH keys, app passwords, OAuth grants, card numbers.
3. **Do not:** pay a ransom on the agent's advice, negotiate, run "cleaner" tools found by search, log in to more accounts from the affected device, or delete suspicious files and emails.

## Then, by situation

**Phishing link clicked or attachment opened.** Did they enter a password? -> change it from a clean device and check that account's recent logins, forwarding rules, recovery email/phone and connected apps. Did they approve an MFA prompt or enter a code? -> treat the account as taken: reset, sign out everywhere, review. Did a file run? -> isolate the machine and treat as malware.

**Account takeover.** Recover through the provider's official recovery flow. Then review: forwarding and filter rules, recovery options, app passwords, connected third-party apps, sent mail, sharing links. Warn contacts if messages were sent in the user's name.

**Ransomware.** Isolate every affected machine and any shared drive or backup it could reach. Photograph the note. Identify what is encrypted and whether clean, offline backups exist. Check the No More Ransom project for a free decryptor. Recovery is rebuild-and-restore, not "clean".

**Leaked secret in code or logs.** Rotate first, investigate second. Revoke the key at the provider, issue a new one, deploy it, then check the provider's access logs for use since the leak and remove the secret from history. Deleting the commit alone fixes nothing.

**Website defaced or serving malware.** Put the site in maintenance mode or take it offline, preserve a copy of the files and logs, rotate hosting, CMS, database and FTP/SSH credentials, restore from a known-good backup, update everything, then look for how they got in (outdated plugin, stolen credential, exposed admin).

**Unknown device or strange traffic on the network.** Change the Wi-Fi and router admin passwords, update the router, remove unknown port forwards, re-join known devices one by one.

## Evidence worth keeping

Write a short timeline (what, when, who noticed). Keep: screenshots, the phishing email as a file with headers, ransom notes, suspicious file names and hashes (do not open them), relevant log exports, the list of accounts and keys that were rotated and when. Store it away from the affected machine.

## When to bring in others

- Work or client systems: the organisation's IT/security contact, immediately.
- Money moved or card details exposed: the bank's fraud line, now.
- Personal data of other people exposed: there may be a legal duty to notify a regulator within a fixed time (for example 72 hours under GDPR). Say so and recommend professional advice; do not give legal conclusions.
- Crime (extortion, fraud, stalking): police and the national CERT/CSIRT.
- Beyond first aid (business-wide ransomware, a server with customer data, signs the attacker is still active): a professional incident-response team. Say this plainly.

## After containment

Only once things are stable: use the other playbooks to find the way in (inventory and advisories for unpatched software, endpoint checks for autostart and accounts, web and code review for the site), fix the root cause, and write five lines of lessons: what happened, how it was found, what was done, what changes, who owns each change.

Consent ladder still applies: read-only looks at the machine need a yes; nothing on the affected device is changed by the agent.

References: NIST SP 800-61 (incident handling), CISA ransomware and phishing guidance, No More Ransom, national CERT guides (see `sources.md`).
