use anyhow::Result;
use hdf5::File;
use serde_json::{Map, Value, json};

fn read_string_column(group: &hdf5::Group, name: &str) -> Result<Vec<String>, hdf5::Error> {
    let ds = group.dataset(name)?;
    let raw: Vec<hdf5::types::VarLenUnicode> = ds.read_raw()?;

    let mut strings = Vec::new();
    for s in raw {
        strings.push(s.parse().unwrap_or_default());
    }
    Ok(strings)
}

pub fn read_cv(path: &str) -> Result<Value> {
    let file = File::open(path)?;
    let mut cv = Map::new();

    if let Ok(group) = file.group("personal_info") {
        let mut pi = Map::new();
        for col in &[
            "name", "email", "orcid", "profile", "city", "country", "timezone",
        ] {
            if let Ok(v) = read_string_column(&group, col) {
                if let Some(s) = v.first() {
                    if !s.is_empty() {
                        pi.insert(col.to_string(), json!(s));
                    }
                }
            }
        }
        if let Ok(v) = read_string_column(&group, "links") {
            if let Some(s) = v.first() {
                let parsed: Value = serde_json::from_str(s).unwrap_or_else(|_| json!([]));
                pi.insert("links".to_string(), parsed);
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

    Ok(Value::Object(cv))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_read_cv_from_real_file() {
        // The test runs from `src/rust/`, so the lockfile is two dirs up
        let path = "../../cv_data.h5";

        // Only run the test if the file actually exists
        if std::path::Path::new(path).exists() {
            let result = read_cv(path);
            assert!(
                result.is_ok(),
                "Failed to parse cv_data.h5: {:?}",
                result.err()
            );

            let cv = result.unwrap();
            assert!(cv.is_object());
            let obj = cv.as_object().unwrap();

            // Check that it successfully extracted the key sections
            assert!(obj.contains_key("personal_info"));
            assert!(obj.contains_key("publications"));
            assert!(obj.contains_key("employment"));
        } else {
            println!("Skipping HDF5 parse test because ../../cv_data.h5 does not exist");
        }
    }
}
