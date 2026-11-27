# ip-geo-app

A small Express server that returns an IP address and its geographic location as JSON.
Lookups use the [`geoip-lite`](https://www.npmjs.com/package/geoip-lite) database bundled
with the package, so no external API calls or keys are needed.

## Setup

Requires Node.js 18+.

```bash
npm install
npm start          # http://localhost:3000
```

## Usage

| Request        | Returns                                         |
|----------------|-------------------------------------------------|
| `GET /`        | The client's own IP and location                |
| `GET /:ip`     | The location of the given IPv4 or IPv6 address  |

```bash
curl localhost:3000/1.1.2.2
```

```json
{
  "ip": "1.1.2.2",
  "location": {
    "country": "CN",
    "region": "FJ",
    "city": "",
    "timezone": "Asia/Shanghai",
    "latitude": 24.4798,
    "longitude": 118.0819
  }
}
```

- An invalid address returns `400` with an `error` message.
- Private, loopback, or unknown addresses return `"location": null` with a `note`.
- Accuracy is often limited to country level.

## Configuration

| Variable      | Default        | Description                                                                 |
|---------------|----------------|-----------------------------------------------------------------------------|
| `PORT`        | `3000`         | Port to listen on                                                           |
| `HOST`        | all interfaces | Address to bind to. Use `127.0.0.1` behind a local reverse proxy.           |
| `TRUST_PROXY` | `true`         | Read the client IP from `X-Forwarded-For`. Set to `false` when the app is exposed directly, since clients can fake this header. Behind a proxy, the proxy must overwrite the header rather than append to it (see the nginx config below). |

## Deploying to a VPS

The `deploy/` directory has a systemd unit and an nginx site config. In this setup Node listens
on `127.0.0.1:3000` and nginx serves the public ports and terminates TLS.

The geo database is loaded into memory at startup, so the process uses roughly 150–200 MB of RAM.
A VPS with 512 MB or more is recommended.

### 1. Install the app

Install Node.js 18+ and nginx, then:

```bash
sudo git clone https://github.com/sailin/ip-geo.git /opt/ip-geo
cd /opt/ip-geo
sudo npm ci --omit=dev
```

### 2. Run it with systemd

```bash
sudo cp deploy/ip-geo.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ip-geo
curl localhost:3000/8.8.8.8      # quick check
```

The unit runs the app as an unprivileged throwaway user (`DynamicUser=yes`) with a read-only
filesystem, and restarts it if it crashes. If `node` is not at `/usr/bin/node` (for example when
installed with nvm), edit `ExecStart` to the path from `command -v node`. View logs with
`journalctl -u ip-geo -f`.

### 3. Put nginx in front

Edit `server_name` in `deploy/nginx/ip-geo.conf` to your domain, then:

```bash
sudo cp deploy/nginx/ip-geo.conf /etc/nginx/sites-available/ip-geo
sudo ln -s /etc/nginx/sites-available/ip-geo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Add HTTPS with Let's Encrypt:

```bash
sudo certbot --nginx -d geo.example.com
```

The config sets `X-Forwarded-For` to `$remote_addr` instead of the usual
`$proxy_add_x_forwarded_for`. The app uses the left-most address in that header, so appending
would let a client send its own fake value. If you put another proxy or CDN in front of nginx,
use nginx's `real_ip` module so that `$remote_addr` is still the real client.

### Updating

```bash
cd /opt/ip-geo
sudo git pull
sudo npm ci --omit=dev
sudo systemctl restart ip-geo
```

The geo data ships with the `geoip-lite` package and goes stale over time. To refresh it, get a
free [MaxMind license key](https://www.maxmind.com/en/geolite2/signup) and run:

```bash
cd /opt/ip-geo/node_modules/geoip-lite
sudo node scripts/updatedb.js license_key=YOUR_KEY
sudo systemctl restart ip-geo
```

`npm ci` reinstalls the bundled data, so run this again after each app update.
