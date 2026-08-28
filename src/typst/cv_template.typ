#import "clean_print_cv.typ": *

#let cv_path = sys.inputs.at("cv_data_path", default: "/build/clean_cv_data.json")
#let data = json(cv_path)

#show: cv-page-setup

#if "personal" in data [ #cv-header(data.personal) ]
#if "summary" in data and data.summary != "" [ #cv-summary(data.summary) ]
#if "experience" in data and data.experience.len() > 0 [ #cv-experience(data.experience) ]
#let edu = if "education" in data { data.education } else { () }
#let certs = if "certifications" in data { data.certifications } else { () }
#if edu.len() > 0 or certs.len() > 0 [ #cv-education-and-certifications(edu, certs) ]
#if "skills" in data and data.skills.len() > 0 [ #cv-skills(data.skills) ]
#if "publications" in data and data.publications.len() > 0 [ #cv-publications(data.publications) ]
#if "projects" in data and data.projects.len() > 0 [ #cv-projects(data.projects) ]
#if "service" in data and data.service.len() > 0 [ #cv-service(data.service) ]
#if "conferences" in data and data.conferences.len() > 0 [ #cv-conferences(data.conferences) ]
#if "languages" in data and data.languages.len() > 0 [ #cv-languages(data.languages) ]
