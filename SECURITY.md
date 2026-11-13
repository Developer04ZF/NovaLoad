# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.x` | Yes |

## Security Architecture

NovaLoad enforces the following security boundaries:
1. **SSRF Protection**: Download URLs are validated at initial probe and at every HTTP redirect hop. Non-HTTP(S) schemes, embedded URL credentials, private subnets, loopback addresses, and cloud metadata endpoints (`169.254.169.254`) are blocked by default.
2. **Path Traversal Containment**: All file writes, renames, moves, and deletions resolve through `resolveSafePath` inside NovaLoad's managed downloads directory.
3. **Credential Protection**: Gemini API keys remain server-side (`process.env.GEMINI_API_KEY`) or in native OS keyrings (`keyring` crate) and are never logged or sent to browser clients.
4. **AI Confirmation Guardrail**: Gemini AI proposals are returned as structured JSON action plans requiring explicit user review and approval before any filesystem mutation occurs.
5. **Browser Bridge Authentication**: Local handoff requests require a rotatable `x-novaload-token` header.

## Reporting a Vulnerability

Do not open public GitHub issues for security vulnerabilities. Report vulnerabilities privately via GitHub Security Advisories or email `security@novaload.org` with reproduction steps and impact assessment. We acknowledge reports within 48 hours.
