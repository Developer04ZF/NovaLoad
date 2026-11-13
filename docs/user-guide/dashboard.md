# Dashboard & Telemetry

## Purpose
Monitor global transfer throughput, active queue slots, and recent transfer activity from a single overview workspace (`src/components/DashboardView.tsx`).

## Key Components
- **KPI Summary Cards**: Displays live active transfers, aggregate speed (`currentSpeedBps`), peak recorded session speed (`peakSpeedBps`), queued count, completed count, and failed transfers.
- **Real-Time Bandwidth Chart** (`src/components/BandwidthChart.tsx`): Plots the trailing 60 one-second snapshots (`bandwidthHistory`) delivered over Server-Sent Events (`/api/events`).
- **Quick Controls**: Trigger **Pause All**, **Resume All**, open the single/batch **New Download** modal, or click any transfer to open the **Download Details Drawer**.
- **Empty State Guidance**: Displays custom Novi / illustration states when no transfers exist yet without injecting fake demo metrics.

## Related Documentation
- [Managing Downloads](./downloads.md)
- [Express Backend & SSE Stream](../architecture/backend.md)
