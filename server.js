import express from 'express';
import geoip from 'geoip-lite';
import { isIP } from 'node:net';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust X-Forwarded-For when running behind a reverse proxy / load balancer.
// Set TRUST_PROXY=false to disable if the app is exposed directly.
app.set('trust proxy', process.env.TRUST_PROXY !== 'false');

function normalizeIp(ip = '') {
  // Strip IPv4-mapped IPv6 prefix, e.g. "::ffff:203.0.113.5"
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function lookup(ip) {
  const geo = geoip.lookup(ip);
  return {
    ip,
    location: geo
      ? {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          latitude: geo.ll?.[0],
          longitude: geo.ll?.[1],
        }
      : null,
    ...(geo ? {} : { note: 'No geo data (private, loopback, or unknown IP)' }),
  };
}

// GET /        -> the client's own IP
app.get('/', (req, res) => {
  res.json(lookup(normalizeIp(req.ip)));
});

// GET /:ip     -> a user-specified IPv4 or IPv6 address
app.get('/:ip', (req, res) => {
  const ip = normalizeIp(req.params.ip);
  if (!isIP(ip)) {
    return res.status(400).json({ error: `Invalid IP address: ${req.params.ip}` });
  }
  res.json(lookup(ip));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
