// Licensed under Apache-2.0

use reqwest::Client;
use sha2::{Digest, Sha256};
use std::path::Path;
use tokio::fs::OpenOptions;
use tokio::io::{AsyncSeekExt, AsyncWriteExt, SeekFrom};

#[derive(Debug, Clone)]
pub struct SegmentRange {
    pub index: usize,
    pub start: u64,
    pub end: u64,
}

pub fn split_segments(total_bytes: u64, connections: usize) -> Vec<SegmentRange> {
    if total_bytes == 0 || connections <= 1 {
        return vec![SegmentRange {
            index: 0,
            start: 0,
            end: total_bytes.saturating_sub(1),
        }];
    }
    let chunk = total_bytes / (connections as u64);
    (0..connections)
        .map(|i| {
            let start = (i as u64) * chunk;
            let end = if i == connections - 1 {
                total_bytes - 1
            } else {
                ((i as u64) + 1) * chunk - 1
            };
            SegmentRange { index: i, start, end }
        })
        .collect()
}

pub async fn download_segment_to_file(
    client: &Client,
    url: &str,
    part_path: &Path,
    seg: SegmentRange,
) -> Result<(), String> {
    let mut req = client.get(url);
    if seg.end >= seg.start {
        req = req.header("Range", format!("bytes={}-{}", seg.start, seg.end));
    }
    let mut resp = req.send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() && resp.status().as_u16() != 206 {
        return Err(format!("Unexpected HTTP status: {}", resp.status()));
    }

    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .open(part_path)
        .await
        .map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(seg.start))
        .await
        .map_err(|e| e.to_string())?;

    while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
    }
    file.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn sha256_file(path: &Path) -> Result<String, String> {
    let bytes = tokio::fs::read(path).await.map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    Ok(hex::encode(hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn splits_byte_ranges_without_gaps() {
        let segs = split_segments(1000, 4);
        assert_eq!(segs.len(), 4);
        assert_eq!(segs[0].start, 0);
        assert_eq!(segs[0].end, 249);
        assert_eq!(segs[3].start, 750);
        assert_eq!(segs[3].end, 999);
    }
}
