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

| Variable      | Default | Description                                                                 |
|---------------|---------|-----------------------------------------------------------------------------|
| `PORT`        | `3000`  | Port to listen on                                                           |
| `TRUST_PROXY` | `true`  | Read the client IP from `X-Forwarded-For`. Set to `false` when the app is exposed directly, since clients can fake this header. |
