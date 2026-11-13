# Privacy & Telemetry Policy

## Zero Hidden Telemetry
NovaLoad does **not** include third-party analytics SDKs, telemetry beacons, crash reporting uploads, or background phone-home calls.

## Network Activity Inventory
Every outbound request NovaLoad initiates falls into one of three user-controlled categories:
1. **Explicit User Downloads / Media Probes**: HTTP/HTTPS transfers requested via UI, CLI, or authenticated Browser Bridge.
2. **Optional Gemini AI Requests**: Triggered only when `GEMINI_API_KEY` is configured and the user clicks **Analyze** or **Test Connection** in **AI Assistant** (`aiAllowFileMetadata` shares filename/path/size/SHA-256-prefix metadata; `aiAllowFileContent` defaults to `false`).
3. **Optional Tauri Updater Checks** *(desktop bundle mode only)*: Checks `https://github.com/Developer04ZF/NovaLoad/releases/latest/download/latest.json` when configured in native builds.

## Local Storage Footprint
All history, logs, and settings stay local inside `NOVALOAD_DATA_DIR` (`.novaload/novaload.db`).

## Related Documentation
- [Security Model](./security-model.md)
- [Secrets Management](./secrets-management.md)
