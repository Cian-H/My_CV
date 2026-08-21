#let cv = json("/build/cv_data.json")

#set page(margin: (x: 1.5cm, y: 1.5cm))
#set text(font: "Linux Libertine", size: 10pt)

#show heading: set text(fill: rgb("1C4587"))

#align(center)[
  #text(size: 20pt, weight: "bold", fill: rgb("1C4587"))[#cv.personal_info.name]

  *Email:* #cv.personal_info.email | *Github:* #cv.personal_info.github

  *ORCID:* #link(cv.personal_info.orcid)
]

#v(1em)

== PROFILE
#cv.personal_info.profile

#v(1em)

== SKILLS

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #align(center)[*Technical*]
    #for skill in cv.skills {
      if skill.category == "Technical" [
        - #skill.description
      ]
    }
  ],
  [
    #align(center)[*Personal*]
    #for skill in cv.skills {
      if skill.category == "Personal" [
        - #skill.description
      ]
    }
  ],
)

#v(1em)

== EMPLOYMENT EXPERIENCE

#if cv.experience.len() > 0 [
  #for exp in cv.experience [
    #strong[#exp.organization#if exp.location != none [, #exp.location]] \
    #strong[#exp.title], #exp.date
    #for bullet in exp.bullets [
      - #bullet
    ]
    #v(0.5em)
  ]
] else if "employment" in cv and cv.employment.len() > 0 [
  #for emp in cv.employment [
    #strong[#emp.organization#if emp.department != none [, #emp.department]] \
    #strong[#emp.role], #emp.start_date - #if emp.end_date != none [#emp.end_date] else [Present]
    #v(0.5em)
  ]
]

#v(1em)

== EDUCATION

#grid(
  columns: (1fr, 4fr),
  gutter: 10pt,
  ..cv
    .education
    .map(edu => (
      [*#edu.date*],
      [#edu.degree, #edu.institution #if edu.description != none and edu.description != "" [\ #edu.description]],
    ))
    .flatten()
)

#if "publications" in cv and cv.publications.len() > 0 [
  #v(1em)

  == PUBLICATIONS

  #for pub in cv.publications [
    #strong[#pub.title] \
    #pub.journal, #pub.year
    #if pub.doi != none and pub.doi != "" [
      | #link("https://doi.org/" + pub.doi)[DOI]
    ]
    #if pub.url != none and pub.url != "" [
      | #link(pub.url)[Link]
    ]
    #v(0.5em)
  ]
]
