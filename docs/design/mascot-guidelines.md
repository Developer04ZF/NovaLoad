# Novi Mascot Guidelines

**Novi** is NovaLoad's original vector mascot—a compact obsidian-and-cobalt transfer bot equipped with a signal antenna, side thruster stabilizers, an expressive visor screen, and a chest progress core.

## Official Mascot Variations (`assets/branding/mascot/`)

| Pose / State | Asset File | Intended Context |
| :--- | :--- | :--- |
| **Default** | `assets/branding/mascot/mascot-default.svg` | General docs, About page, neutral headers |
| **Happy** | `assets/branding/mascot/mascot-happy.svg` | Welcome states, onboarding, positive confirmations |
| **Downloading** | `assets/branding/mascot/mascot-downloading.svg` | Active multi-connection transfers & throughput docs |
| **Thinking** | `assets/branding/mascot/mascot-thinking.svg` | Optional Gemini AI analysis & URL probing |
| **Error** | `assets/branding/mascot/mascot-error.svg` | Failed downloads, SSRF blocks, checksum mismatches |
| **Success** | `assets/branding/mascot/mascot-success.svg` | Verified SHA-256 completions & milestone badges |
| **Idle / Sleeping** | `assets/branding/mascot/mascot-idle.svg` | Empty queues, paused transfers, sleep schedules |
| **Security** | `assets/branding/mascot/mascot-security.svg` | Security documentation, safe path containment, threat model |

## Design Continuity
In-app interactive mascot components live in `src/components/svg/NoviMascot.tsx` and share identical geometric proportions, visor contrast, and cobalt/emerald/amber/crimson state palette.

## Related Documentation
- [Brand Guidelines](./brand-guidelines.md)
- [SVG & Animation Guidelines](./illustration-guidelines.md)
