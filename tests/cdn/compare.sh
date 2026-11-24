#!/usr/bin/env bash
# Response time for the same static file from origin (the droplet) and CDN (Cloudinary).
# Phase 4, figure F19. Exercise 4 (CDN), Exercise 5 (RTT). Run from your own computer.
#
# Usage: ./compare.sh <CDN-URL> [runs]
#   CDN-URL: the CDN URL printed by npm run cdn:upload (default file: style.css)
#   runs:    requests per URL (default 20)
# Output: F19_cdn-responstid_<date>.csv (raw data for the appendix) and a summary in the terminal.
set -euo pipefail

CDN_URL="${1:?Usage: ./compare.sh <CDN-URL> [runs]}"
RUNS="${2:-20}"
ORIGIN_URL="${ORIGIN_URL:-https://night-agent.me/public/style.css}"
OUT="F19_cdn-responstid_$(date +%Y-%m-%d).csv"

# curl's timers are cumulative from the start of the request:
# dns = DNS lookup, tcp = TCP handshake done, tls = TLS handshake done,
# ttfb = first byte of the response, total = whole file received.
FORMAT='%{time_namelookup},%{time_connect},%{time_appconnect},%{time_starttransfer},%{time_total},%{size_download},%{remote_ip},%{http_version}'

echo "target,run,dns_s,tcp_s,tls_s,ttfb_s,total_s,bytes,remote_ip,http_version" > "$OUT"
for target in origin cdn; do
  url="$ORIGIN_URL"; [ "$target" = cdn ] && url="$CDN_URL"
  for run in $(seq 1 "$RUNS"); do
    # A new connection per request, so every run includes DNS, TCP and TLS.
    line=$(curl -s -o /dev/null -H 'Cache-Control: no-cache' -w "$FORMAT" "$url")
    echo "$target,$run,$line" >> "$OUT"
  done
done

echo "Raw data: $OUT"
echo
echo "Median in ms (n=$RUNS per target):"
printf '%-8s %8s %8s %8s %8s %8s\n' target dns tcp tls ttfb total
for target in origin cdn; do
  med() { grep "^$target," "$OUT" | cut -d, -f"$1" | sort -n | awk '{a[NR]=$1} END {m=(NR%2)?a[(NR+1)/2]:(a[NR/2]+a[NR/2+1])/2; printf "%8.1f", m*1000}'; }
  printf '%-8s %s %s %s %s %s\n' "$target" "$(med 3)" "$(med 4)" "$(med 5)" "$(med 6)" "$(med 7)"
done

echo
echo "Who answered (server and cache headers):"
for url in "$ORIGIN_URL" "$CDN_URL"; do
  echo "== $url"
  curl -sI "$url" | grep -iE '^(HTTP/|(server|via|age|cache-control|x-cache|x-served-by|cf-cache-status|content-type|content-length):)' || true
done

echo
echo "DNS: which edge server the CDN host name resolves to (CNAME chain):"
CDN_HOST=$(echo "$CDN_URL" | awk -F/ '{print $3}')
dig +noall +answer "$CDN_HOST" || echo "dig failed or is not installed"
