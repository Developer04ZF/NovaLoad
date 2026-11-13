// Licensed under Apache-2.0

use std::net::IpAddr;
use std::path::{Path, PathBuf};
use url::Url;

pub fn is_private_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.is_unspecified()
                || v4.octets()[0] == 169 && v4.octets()[1] == 254
        }
        IpAddr::V6(v6) => {
            v6.is_loopback() || v6.is_unspecified() || (v6.segments()[0] & 0xfe00) == 0xfc00
        }
    }
}

pub fn validate_download_url(raw_url: &str, block_private_ips: bool) -> Result<Url, String> {
    let parsed = Url::parse(raw_url.trim()).map_err(|e| format!("Malformed URL: {e}"))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Only HTTP and HTTPS protocols are supported.".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Embedded credentials in URLs are blocked.".to_string());
    }
    if block_private_ips {
        if let Some(host) = parsed.host_str() {
            let lower = host.to_lowercase();
            if lower == "localhost" || lower.ends_with(".local") || lower.ends_with(".internal") {
                return Err(format!("Blocked private host: {host}"));
            }
            if let Ok(ip) = host.parse::<IpAddr>() {
                if is_private_ip(ip) {
                    return Err(format!("Blocked private IP target: {ip}"));
                }
            }
        }
    }
    Ok(parsed)
}

pub fn resolve_safe_path(base_dir: &Path, relative: &Path) -> Result<PathBuf, String> {
    let candidate = base_dir.join(relative);
    let normalized = candidate
        .components()
        .fold(PathBuf::new(), |mut acc, comp| {
            use std::path::Component;
            match comp {
                Component::ParentDir => {
                    acc.pop();
                }
                Component::CurDir => {}
                other => acc.push(other.as_os_str()),
            }
            acc
        });

    if !normalized.starts_with(base_dir) {
        return Err("Path traversal rejected".to_string());
    }
    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_ssrf_targets() {
        assert!(validate_download_url("http://127.0.0.1/admin", true).is_err());
        assert!(validate_download_url("http://169.254.169.254/latest", true).is_err());
        assert!(validate_download_url("file:///etc/passwd", true).is_err());
        assert!(validate_download_url("https://example.org/archive.zip", true).is_ok());
    }
}
