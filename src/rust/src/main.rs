#![allow(clippy::collapsible_if)]
#![allow(clippy::useless_conversion)]

mod api;
mod cli;
mod data;
mod server;

use anyhow::{Context, Result};
use clap::Parser;
use std::sync::Arc;

use cli::Args;

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let initial_cv = tokio::task::spawn_blocking({
        let path = args.file.clone();
        move || crate::data::read_cv(&path)
    })
    .await
    .context("Failed to join thread")?
    .context(format!(
        "Failed to load initial HDF5 CV data from '{}'",
        args.file
    ))?;

    let state = Arc::new(tokio::sync::RwLock::new(initial_cv));

    tokio::spawn({
        let path = args.file.clone();
        let state = state.clone();
        async move {
            let mut last_mtime = std::fs::metadata(&path).and_then(|m| m.modified()).ok();
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(2));
            loop {
                interval.tick().await;
                if let Ok(meta) = std::fs::metadata(&path) {
                    if let Ok(mtime) = meta.modified() {
                        if Some(mtime) != last_mtime {
                            let path_clone = path.clone();
                            if let Ok(Ok(new_cv)) = tokio::task::spawn_blocking(move || {
                                crate::data::read_cv(&path_clone)
                            })
                            .await
                            {
                                *state.write().await = new_cv;
                                last_mtime = Some(mtime);
                                println!("Reloaded CV data from HDF5 lockfile (file modified).");
                            }
                        }
                    }
                }
            }
        }
    });

    server::run(&args.bind, args.port, state).await?;

    Ok(())
}
