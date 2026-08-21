#![allow(clippy::collapsible_if)]
#![allow(clippy::useless_conversion)]

use axum::{Json, Router, routing::get};
use hdf5::File;
use serde_json::{Map, Value, json};
use std::net::SocketAddr;
use std::sync::Arc;

fn read_string_column(group: &hdf5::Group, name: &str) -> Result<Vec<String>, hdf5::Error> {
    let ds = group.dataset(name)?;
    let raw: Vec<hdf5::types::VarLenUnicode> = ds.read_raw()?;

    let mut strings = Vec::new();
    for s in raw {
        strings.push(s.parse().unwrap_or_default());
    }
    Ok(strings)
}

async fn get_cv(file: Arc<File>) -> Json<Value> {
    let mut cv = Map::new();

    if let Ok(group) = file.group("personal_info") {
        let mut pi = Map::new();
        for col in &["name", "email", "github", "orcid", "profile"] {
            if let Ok(v) = read_string_column(&group, col) {
                if let Some(s) = v.first() {
                    pi.insert(col.to_string(), json!(s));
                }
            }
        }
        cv.insert("personal_info".to_string(), Value::Object(pi));
    }

    if let Ok(group) = file.group("skills") {
        match (
            read_string_column(&group, "category"),
            read_string_column(&group, "description"),
        ) {
            (Ok(cats), Ok(descs)) => {
                let mut skills = Vec::new();
                for (c, d) in cats.into_iter().zip(descs.into_iter()) {
                    skills.push(json!({"category": c, "description": d}));
                }
                cv.insert("skills".to_string(), Value::Array(skills));
            }
            err => println!("Skills error: {:?}", err),
        }
    }

    if let Ok(group) = file.group("experience") {
        match (
            read_string_column(&group, "title"),
            read_string_column(&group, "date"),
            read_string_column(&group, "organization"),
            read_string_column(&group, "location"),
            read_string_column(&group, "bullets"),
        ) {
            (Ok(titles), Ok(dates), Ok(orgs), Ok(locs), Ok(bullets)) => {
                let mut exps = Vec::new();
                for i in 0..titles.len() {
                    let b_val: Value =
                        serde_json::from_str(&bullets[i]).unwrap_or_else(|_| json!([]));
                    exps.push(json!({
                        "title": titles[i],
                        "date": dates[i],
                        "organization": orgs[i],
                        "location": if locs[i].is_empty() { Value::Null } else { json!(locs[i]) },
                        "bullets": b_val
                    }));
                }
                cv.insert("experience".to_string(), Value::Array(exps));
            }
            err => println!("Experience error: {:?}", err),
        }
    }

    if let Ok(group) = file.group("education") {
        match (
            read_string_column(&group, "date"),
            read_string_column(&group, "degree"),
            read_string_column(&group, "institution"),
            read_string_column(&group, "description"),
        ) {
            (Ok(dates), Ok(degrees), Ok(insts), Ok(descs)) => {
                let mut edus = Vec::new();
                for i in 0..dates.len() {
                    edus.push(json!({
                        "date": dates[i],
                        "degree": degrees[i],
                        "institution": insts[i],
                        "description": if descs[i].is_empty() { Value::Null } else { json!(descs[i]) }
                    }));
                }
                cv.insert("education".to_string(), Value::Array(edus));
            }
            err => println!("Education error: {:?}", err),
        }
    }

    if let Ok(group) = file.group("publications") {
        match (
            read_string_column(&group, "title"),
            read_string_column(&group, "year"),
            read_string_column(&group, "journal"),
            read_string_column(&group, "doi"),
            read_string_column(&group, "url"),
        ) {
            (Ok(titles), Ok(years), Ok(journals), Ok(dois), Ok(urls)) => {
                let mut pubs = Vec::new();
                for i in 0..titles.len() {
                    pubs.push(json!({
                        "title": titles[i],
                        "year": years[i],
                        "journal": journals[i],
                        "doi": if dois[i].is_empty() { Value::Null } else { json!(dois[i]) },
                        "url": if urls[i].is_empty() { Value::Null } else { json!(urls[i]) },
                    }));
                }
                cv.insert("publications".to_string(), Value::Array(pubs));
            }
            err => println!("Publications error: {:?}", err),
        }
    }

    if let Ok(group) = file.group("employment") {
        match (
            read_string_column(&group, "role"),
            read_string_column(&group, "organization"),
            read_string_column(&group, "department"),
            read_string_column(&group, "start_date"),
            read_string_column(&group, "end_date"),
        ) {
            (Ok(roles), Ok(orgs), Ok(depts), Ok(starts), Ok(ends)) => {
                let mut emps = Vec::new();
                for i in 0..roles.len() {
                    emps.push(json!({
                        "role": roles[i],
                        "organization": orgs[i],
                        "department": if depts[i].is_empty() { Value::Null } else { json!(depts[i]) },
                        "start_date": starts[i],
                        "end_date": if ends[i].is_empty() { Value::Null } else { json!(ends[i]) },
                    }));
                }
                cv.insert("employment".to_string(), Value::Array(emps));
            }
            err => println!("Employment error: {:?}", err),
        }
    }

    Json(Value::Object(cv))
}

use clap::Parser;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(short, long, env = "CV_PORT", default_value_t = 3000)]
    port: u16,

    #[arg(short, long, env = "CV_BIND", default_value = "127.0.0.1")]
    bind: String,

    #[arg(short, long, env = "CV_HDF5_PATH", default_value = "cv_data.h5")]
    file: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let file = Arc::new(File::open(&args.file).unwrap_or_else(|e| {
        panic!("Failed to open HDF5 file at '{}': {}", args.file, e);
    }));

    let app = Router::new()
        .route(
            "/api/cv",
            get({
                let f = file.clone();
                move || {
                    let f2 = f.clone();
                    async move { get_cv(f2).await }
                }
            }),
        )
        .layer(tower_http::cors::CorsLayer::permissive());

    let addr: SocketAddr = format!("{}:{}", args.bind, args.port).parse()?;
    println!("CV API listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
