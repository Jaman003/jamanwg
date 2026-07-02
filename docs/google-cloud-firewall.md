# Google Cloud firewall

The VM-level setup can start jamanWG and AmneziaWG, but Google Cloud still has
a network firewall in front of the VM. For a typical public endpoint on UDP 443,
the required rule is:

```bash
gcloud compute firewall-rules create allow-jamanwg-awg \
  --network=default \
  --allow=udp:443,tcp:8787 \
  --source-ranges=0.0.0.0/0 \
  --description="Allow jamanWG AmneziaWG UDP and admin panel"
```

If the admin panel should not be public, omit `tcp:8787` and use an SSH tunnel:

```bash
ssh -i ~/.ssh/id_ed25519 \
  -L 8787:127.0.0.1:8787 \
  admin@<server-public-ip>
```

Then open:

```text
http://127.0.0.1:8787
```

AmneziaWG itself still needs `udp:443` open for clients.
