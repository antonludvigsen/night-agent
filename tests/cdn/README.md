# CDN: origin vs. Cloudinary (phase 4, figure F19)

Exercise 4 (Cloudinary as CDN) and Exercise 5 (RTT).

The same static frontend file exists in two places:
- **Origin:** the droplet, `https://night-agent.me/public/style.css` (Nginx → Express static)
- **CDN:** Cloudinary, uploaded with `npm run cdn:upload` (from `backend/`)

The dashboard still loads its files from the origin. The CDN copy is only used for the comparison.

## Measurement
```
./compare.sh "<CDN URL from npm run cdn:upload>" 20
```
Run it from your own computer. It writes `F19_cdn-responstid_<date>.csv` with DNS, TCP, TLS, TTFB
and total time per request, prints the medians, the server and cache headers (HIT/MISS, `age`) and
the CNAME chain from `dig`. Run it twice: the first CDN request can be a cache MISS at the edge.
Save the output as evidence in `Evidens/Fase 4/`.
