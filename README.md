# TV Remote

Phone web remote for a Philips Saphi smart TV over Wi-Fi, no app install.

> **Scope:** built and tested ONLY on Philips 50PUG6654/78 (2019, Saphi OS, chassis TPM19.6L LA, Brazil). Other Philips Saphi TVs using JointSpace API v6 may work. Android TV Philips models need HTTPS on port 1926 plus pairing and are NOT supported.

## How it works

A static page served over plain HTTP on the LAN calls the TV directly at `http://<tv-ip>:1925/6/`. There is no backend.

- The TV replies `Access-Control-Allow-Origin: *`, but its OPTIONS preflight returns 405. So every request is a CORS simple request: `text/plain` body, no custom headers.
- The page must be served over HTTP, not HTTPS. An HTTPS page calling the HTTP TV endpoint is blocked as mixed content.
- Add to home screen works through the web manifest. The service worker only registers on secure contexts, so it does not run on plain HTTP.

## Features

- Touchpad and D-pad, OK, Back, Home
- Play/Pause, Mute, Power (Standby)
- App shortcuts (YouTube, Netflix, Prime Video) via recorded navigation macros
- Volume and channel rockers beside the app shortcuts
- Extra keys: Source, Options, Info, Adjust, Rewind, Fast forward (single scrolling page)
- Editable TV IP, stored in localStorage (default `192.168.0.155`)

## Build and run

```sh
cd web && npm install && npm run build
cd dist && python3 -m http.server 8787
```

Open `http://<host-lan-ip>:8787` on the phone.

Reserve the TV IP in the router's DHCP settings. Any always-on device can serve the build (e.g. an old Android phone with Termux).

## API notes

Verified on this TV.

| Endpoint | Result |
|---|---|
| `/6/system` | 200 OK |
| `/6/audio/volume` (GET/POST) | 200 OK |
| `/6/input/key` (POST) | 200 OK |
| `/6/powerstate` | 200 OK |
| `/6/context` | 200 OK |
| `/6/activities/tv` | 200 OK |
| `/6/channeldb/tv` | 200 OK |
| `/6/network/devices` | 200 OK (reports wake-on-lan Enabled on Wi-Fi) |
| `/6/input/textentry` | 200 OK |
| `/6/menuitems/settings/structure` | 200 OK |
| `/6/applications` | 403 Forbidden |
| `/6/sources` | 403 Forbidden |
| `/6/notifychange` | 403 Forbidden |
| `/6/activities/current` | 404 Not Found |

## Limitations

- Cannot list or launch apps (403). App shortcuts replay a recorded navigation from the Home screen, so they break if the Home screen app order changes; re-record them in settings.
- Powering on from standby needs Wake-on-LAN (UDP), which a browser cannot send.
- No text input and no screen preview.

## Credits

UI based on https://github.com/Pedroohlr/remote-controller

## License

MIT. See [LICENSE](LICENSE).
