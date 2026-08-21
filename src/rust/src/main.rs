#![allow(clippy::collapsible_if)]
#![allow(clippy::useless_conversion)]

use axum::{Json, Router, routing::get};
use hdf5::File;
use serde_json::{Map, Value, json};
use std::net::SocketAddr;
use std::sync::Arc;

fn read_string_column(group: &hdf5::Group, name: &str) -> Result<Vec<String>, hdf5::Error> {
    let ds = group.dataset(name)?;
    let dtype = ds.dtype()?;
    let item_size = dtype.size();
    let raw: Vec<u8> = ds.read_raw()?;

    let mut strings = Vec::new();
    for chunk in raw.chunks(item_size) {
        let len = chunk.iter().position(|&c| c == 0).unwrap_or(chunk.len());
        let s = String::from_utf8_lossy(&chunk[..len]).into_owned();
        strings.push(s);
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
        if let (Ok(cats), Ok(descs)) = (
            read_string_column(&group, "category"),
            read_string_column(&group, "description"),
        ) {
            let mut skills = Vec::new();
            for (c, d) in cats.into_iter().zip(descs.into_iter()) {
                skills.push(json!({"category": c, "description": d}));
            }
            cv.insert("skills".to_string(), Value::Array(skills));
        }
    }

    if let Ok(group) = file.group("experience") {
        if let (Ok(titles), Ok(dates), Ok(orgs), Ok(locs), Ok(bullets)) = (
            read_string_column(&group, "title"),
            read_string_column(&group, "date"),
            read_string_column(&group, "organization"),
            read_string_column(&group, "location"),
            read_string_column(&group, "bullets"),
        ) {
            let mut exps = Vec::new();
            for i in 0..titles.len() {
                // bullets were dumped as json strings in sync.py
                let b_val: Value = serde_json::from_str(&bullets[i]).unwrap_or_else(|_| json!([]));
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
    }

    if let Ok(group) = file.group("education") {
        if let (Ok(dates), Ok(degrees), Ok(insts), Ok(descs)) = (
            read_string_column(&group, "date"),
            read_string_column(&group, "degree"),
            read_string_column(&group, "institution"),
            read_string_column(&group, "description"),
        ) {
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
    }

    if let Ok(group) = file.group("publications") {
        if let (Ok(titles), Ok(years), Ok(journals), Ok(dois), Ok(urls)) = (
            read_string_column(&group, "title"),
            read_string_column(&group, "year"),
            read_string_column(&group, "journal"),
            read_string_column(&group, "doi"),
            read_string_column(&group, "url"),
        ) {
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
    }

    if let Ok(group) = file.group("employment") {
        if let (Ok(roles), Ok(orgs), Ok(depts), Ok(starts), Ok(ends)) = (
            read_string_column(&group, "role"),
            read_string_column(&group, "organization"),
            read_string_column(&group, "department"),
            read_string_column(&group, "start_date"),
            read_string_column(&group, "end_date"),
        ) {
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
    }

    Json(Value::Object(cv))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let file = Arc::new(File::open("../../cv_data.h5")?);

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

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("CV API listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
