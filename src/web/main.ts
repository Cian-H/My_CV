/// <reference lib="dom" />
// Global BSON from CDN
// deno-lint-ignore no-explicit-any
declare const BSON: any;

interface Link {
  name: string;
  url: string;
  icon?: string;
}

interface PersonalInfo {
  name: string;
  email: string;
  orcid: string;
  links: Link[];
  city?: string;
  country?: string;
  timezone?: string;
  profiles: Record<string, { text: string; exclude: string[] }>;
}

interface Skill {
  category: string;
  description: string;
}

interface Experience {
  title: string;
  date: string;
  organization: string;
  location?: string;
  bullets: string[];
}

interface Education {
  date: string;
  degree: string;
  institution: string;
  description?: string;
}

interface Employment {
  role: string;
  organization: string;
  department?: string;
  start_date: string;
  end_date?: string;
}

interface Publication {
  title: string;
  year: string;
  journal: string;
  doi?: string;
  url?: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

interface Conference {
  name: string;
  role: string;
  date: string;
  location?: string;
}

interface Language {
  name: string;
  proficiency: string;
}

interface CVData {
  personal_info: PersonalInfo;
  skills?: Skill[];
  experience?: Experience[];
  education?: Education[];
  publications?: Publication[];
  employment?: Employment[];
  projects?: Project[];
  certifications?: Certification[];
  conferences?: Conference[];
  languages?: Language[];
  service?: Service[];
  project_hierarchy?: Record<string, string[]>;
}

function el(tag: string, className?: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function appendMeta(
  parent: HTMLElement,
  items: (string | HTMLElement | undefined | null)[],
) {
  const p = el("p", "meta");
  let first = true;
  for (const item of items) {
    if (!item) continue;
    if (!first) {
      p.appendChild(document.createTextNode(" | "));
    }
    if (typeof item === "string") {
      p.appendChild(document.createTextNode(item));
    } else {
      p.appendChild(item);
    }
    first = false;
  }
  parent.appendChild(p);
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.textContent = text;
  return a;
}

async function renderCV() {
  const cvContent = document.getElementById("cv-content")!;
  cvContent.innerHTML = "Loading CV...";

  try {
    const excludes: string[] = [];
    if (
      !(document.getElementById("toggle-experience") as HTMLInputElement)
        .checked
    ) {
      excludes.push("experience", "employment");
    }
    if (
      !(document.getElementById("toggle-education") as HTMLInputElement).checked
    ) {
      excludes.push("education");
    }
    if (
      !(document.getElementById("toggle-publications") as HTMLInputElement)
        .checked
    ) {
      excludes.push("publications", "conferences");
    }
    if (
      !(document.getElementById("toggle-skills") as HTMLInputElement).checked
    ) {
      excludes.push("skills", "languages");
    }
    if (
      !(document.getElementById("toggle-projects") as HTMLInputElement).checked
    ) {
      excludes.push("projects", "certifications");
    }

    let url = (window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "localhost")
      ? "http://127.0.0.1:3000/api/cv.bson"
      : "/api/cv.bson";
    if (excludes.length > 0) {
      url += "?exclude=" + excludes.join(",");
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch CV");

    const buffer = await response.arrayBuffer();
    const cv: CVData = BSON.deserialize(new Uint8Array(buffer));

    // Retro mode toggle
    const isRetro =
      (document.getElementById("toggle-retro") as HTMLInputElement)?.checked ||
      false;
    if (isRetro) {
      document.body.classList.add("retro-mode");
    } else {
      document.body.classList.remove("retro-mode");
    }

    cvContent.innerHTML = ""; // Clear loader

    if (!cv || !cv.personal_info) {
      cvContent.textContent = "Error: Invalid CV data received.";
      return;
    }

    // --- Personal Info ---
    const pi = cv.personal_info;
    if (pi.profiles) currentProfiles = pi.profiles;
    if (pi.profiles) currentProfiles = pi.profiles;
    const nameH1 = el("h1");
    if (isRetro && pi.name.length > 0) {
      const firstLetter = document.createElement("span");
      firstLetter.className = "retro-cursor";
      firstLetter.textContent = pi.name[0];
      nameH1.appendChild(firstLetter);
      nameH1.appendChild(document.createTextNode(pi.name.substring(1)));
    } else {
      nameH1.textContent = pi.name;
    }
    cvContent.appendChild(nameH1);

    const emailLink = link(`mailto:${pi.email}`, pi.email);

    const orcidLink = link(pi.orcid, "ORCID");
    orcidLink.innerHTML = "";
    orcidLink.style.display = "inline-flex";
    orcidLink.style.alignItems = "center";
    orcidLink.style.gap = "6px";
    orcidLink.style.color = "#A6CE39";
    orcidLink.style.fontWeight = "600";
    orcidLink.style.textDecoration = "none";

    const orcidImg = document.createElement("img");
    orcidImg.src = "https://cdn.simpleicons.org/orcid/A6CE39";
    orcidImg.alt = "ORCID";
    orcidImg.style.width = "16px";
    orcidImg.style.height = "16px";

    orcidLink.appendChild(orcidImg);
    orcidLink.appendChild(
      document.createTextNode(pi.orcid.replace("https://orcid.org/", "")),
    );

    const customLinks = (pi.links || []).map((l) => {
      const a = link(l.url, l.name);
      if (l.icon) {
        // Clear text, insert icon and text
        a.innerHTML = "";
        a.style.display = "inline-flex";
        a.style.alignItems = "center";
        a.style.gap = "6px";
        a.style.color = "var(--text-color)";

        const img = document.createElement("img");
        img.src = l.icon;
        img.alt = l.name;
        img.style.width = "16px";
        img.style.height = "16px";

        a.appendChild(img);
        a.appendChild(document.createTextNode(l.name));
      }
      return a;
    });

    let locString = [pi.city, pi.country].filter(Boolean).join(", ");
    if (pi.timezone) locString += ` (${pi.timezone})`;

    appendMeta(cvContent, [
      locString || null,
      emailLink,
      orcidLink,
    ]);

    const linkContainer = el("div", "contact-links");
    linkContainer.style.display = "flex";
    linkContainer.style.flexWrap = "wrap";
    linkContainer.style.gap = "10px";
    linkContainer.style.marginTop = "12px";
    linkContainer.style.marginBottom = "16px";

    for (const cl of customLinks) {
      if (cl instanceof HTMLElement) {
        cl.style.background = "var(--secondary-bg)";
        cl.style.padding = "6px 12px";
        cl.style.borderRadius = "6px";
        cl.style.textDecoration = "none";
        cl.style.border = "1px solid var(--border-color)";
        cl.style.fontSize = "0.9rem";
      }
      linkContainer.appendChild(cl);
    }
    cvContent.appendChild(linkContainer);

    const profileMode =
      (document.getElementById("profile-selector") as HTMLSelectElement)
        ?.value || "general";
    const profData = pi.profiles[profileMode] || pi.profiles["general"] ||
      pi.profiles["default"] || Object.values(pi.profiles)[0] ||
      { text: "", exclude: [] };
    cvContent.appendChild(el("p", "", profData.text || ""));

    // --- Experience / Employment ---
    if (cv.experience && cv.experience.length > 0) {
      cvContent.appendChild(el("h2", "", "Experience"));
      for (const exp of cv.experience) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", `${exp.title} - ${exp.organization}`));
        appendMeta(item, [exp.date, exp.location]);
        const ul = el("ul");
        for (const b of exp.bullets) ul.appendChild(el("li", "", b));
        item.appendChild(ul);
        cvContent.appendChild(item);
      }
    } else if (cv.employment && cv.employment.length > 0) {
      cvContent.appendChild(el("h2", "", "Employment"));
      for (const emp of cv.employment) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", `${emp.role} - ${emp.organization}`));
        appendMeta(item, [
          `${emp.start_date} - ${emp.end_date || "Present"}`,
          emp.department,
        ]);
        cvContent.appendChild(item);
      }
    }

    // --- Education ---
    if (cv.education && cv.education.length > 0) {
      cvContent.appendChild(el("h2", "", "Education"));
      for (const edu of cv.education) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", `${edu.degree} - ${edu.institution}`));
        appendMeta(item, [edu.date]);
        if (edu.description) item.appendChild(el("p", "", edu.description));
        cvContent.appendChild(item);
      }
    }

    // --- Projects & Certs ---
    if (cv.projects && cv.projects.length > 0) {
      cvContent.appendChild(el("h2", "", "Projects"));

      // Collect unique technologies
      const allTechs = new Set<string>();
      for (const proj of cv.projects) {
        if (proj.technologies) {
          for (const tech of proj.technologies) {
            allTechs.add(tech);
          }
        }
      }
      const sortedTechs = Array.from(allTechs).sort();

      // Filter UI container
      const projectsSectionWrap = el("div", "filter-layout");
      const filterContainer = el("div", "filter-sidebar");
      const projectsListContainer = el("div", "filter-content");

      // Render filter buttons
      let activeFilters: Set<string> = new Set();
      let activeCategories: Set<string> = new Set();
      let currentProfiles: Record<string, { text: string; exclude: string[] }> =
        {};
      const projectItems: { element: HTMLElement; techs: string[] }[] = [];
      const filterButtons: HTMLElement[] = [];

      const updateFilters = () => {
        for (const btn of filterButtons) {
          const isTechMatch = btn.dataset.tech &&
            activeFilters.has(btn.dataset.tech);
          const isCatMatch = btn.dataset.category &&
            activeCategories.has(btn.dataset.category);
          const isAllMatch = btn.dataset.tech === "All" &&
            activeFilters.size === 0 && activeCategories.size === 0;

          if (isTechMatch || isCatMatch || isAllMatch) {
            btn.style.background = "var(--text-color)";
            btn.style.color = "var(--bg-color)";
          } else {
            btn.style.background = "var(--bg-color)";
            btn.style.color = "var(--text-color)";
          }
        }

        const hierarchy = cv.project_hierarchy || {};
        for (const item of projectItems) {
          if (activeFilters.size === 0 && activeCategories.size === 0) {
            item.element.style.display = "block";
          } else {
            let passed = false;
            for (const tech of activeFilters) {
              if (item.techs.includes(tech)) {
                passed = true;
                break;
              }
            }

            if (!passed) {
              for (const cat of activeCategories) {
                const catTechs = hierarchy[cat] || [];
                if (item.techs.some((t) => catTechs.includes(t))) {
                  passed = true;
                  break;
                }
              }
            }

            item.element.style.display = passed ? "block" : "none";
          }
        }
      };

      const createFilterBtn = (techName: string, techValue: string | null) => {
        const btn = el("button", "btn", techName);
        btn.dataset.tech = techValue || "All";
        btn.onclick = () => {
          if (techValue === null) {
            activeFilters.clear();
            activeCategories.clear();
          } else {
            if (activeFilters.has(techValue)) {
              activeFilters.delete(techValue);
            } else {
              activeFilters.add(techValue);
            }
          }
          updateFilters();
        };
        return btn;
      };

      filterContainer.style.flexDirection = "column";
      filterContainer.style.gap = "10px";

      const allRow = el("div");
      allRow.style.marginBottom = "8px";
      const allBtn = createFilterBtn("All", null);
      filterButtons.push(allBtn);
      allRow.appendChild(allBtn);
      filterContainer.appendChild(allRow);

      const hierarchy = cv.project_hierarchy || {};
      const usedTechs = new Set(sortedTechs);

      const createCatSection = (
        category: string,
        relevantTechs: string[],
        isOther: boolean,
      ) => {
        const wrap = el("div");

        const catBtn = el("button", "btn");
        catBtn.style.fontWeight = "bold";
        catBtn.style.width = "100%";
        catBtn.style.textAlign = "left";
        catBtn.style.display = "flex";
        catBtn.style.justifyContent = "space-between";

        const label = el("span", "", category);
        const expandIcon = el("span", "", "[+]");
        expandIcon.style.fontSize = "0.8rem";
        expandIcon.style.opacity = "0.7";
        catBtn.appendChild(label);
        catBtn.appendChild(expandIcon);

        if (!isOther) {
          catBtn.dataset.category = category;
          filterButtons.push(catBtn);
        }

        const subDiv = el("div");
        subDiv.style.display = "none"; // Hidden by default
        subDiv.style.flexWrap = "wrap";
        subDiv.style.gap = "8px";
        subDiv.style.padding = "10px 8px 10px 12px";
        subDiv.style.borderLeft = "2px solid var(--border-color)";
        subDiv.style.marginLeft = "12px";

        catBtn.onclick = () => {
          if (!isOther) {
            if (activeCategories.has(category)) {
              activeCategories.delete(category);
            } else {
              activeCategories.add(category);
            }
            updateFilters();
          }
          // Toggle drill down
          const isExpanded = subDiv.style.display === "flex";
          subDiv.style.display = isExpanded ? "none" : "flex";
          expandIcon.textContent = isExpanded ? "[+]" : "[-]";
        };

        wrap.appendChild(catBtn);

        for (const t of relevantTechs) {
          const btn = createFilterBtn(t, t);
          btn.onclick = () => {
            if (activeFilters.has(t)) {
              activeFilters.delete(t);
            } else {
              activeFilters.add(t);
            }
            updateFilters();
          };
          filterButtons.push(btn);
          subDiv.appendChild(btn);
          if (!isOther) usedTechs.delete(t);
        }
        wrap.appendChild(subDiv);
        filterContainer.appendChild(wrap);
      };

      for (const [category, techs] of Object.entries(hierarchy)) {
        const relevantTechs = techs.filter((t) => usedTechs.has(t));
        if (relevantTechs.length === 0) continue;
        createCatSection(category, relevantTechs, false);
      }

      if (usedTechs.size > 0) {
        createCatSection("Other", Array.from(usedTechs).sort(), true);
      }

      // Render projects
      const projectsList = el("div", "projects-list");
      for (const proj of cv.projects) {
        const item = el("div", "exp-item");
        const titleWrap = el("h3", "", proj.name);
        if (proj.url) {
          titleWrap.appendChild(document.createTextNode(" - "));
          titleWrap.appendChild(link(proj.url, "Link"));
        }
        item.appendChild(titleWrap);
        const tagP = el("p", "meta");
        tagP.style.fontSize = "0.75rem";
        tagP.style.marginTop = "2px";
        tagP.style.marginBottom = "4px";
        tagP.textContent = (proj.technologies || []).join(", ");
        item.appendChild(tagP);
        item.appendChild(el("p", "", proj.description));
        projectsList.appendChild(item);

        projectItems.push({
          element: item,
          techs: proj.technologies || [],
        });
      }
      projectsListContainer.appendChild(projectsList);
      projectsSectionWrap.appendChild(filterContainer);
      projectsSectionWrap.appendChild(projectsListContainer);
      cvContent.appendChild(projectsSectionWrap);

      // Initialize state
      updateFilters();
    }

    if (cv.certifications && cv.certifications.length > 0) {
      cvContent.appendChild(el("h2", "", "Certifications"));
      for (const cert of cv.certifications) {
        const item = el("div", "exp-item");
        const titleWrap = el("h3", "", `${cert.name} - ${cert.issuer}`);
        item.appendChild(titleWrap);
        const l = cert.url ? link(cert.url, "Credential") : null;
        appendMeta(item, [cert.date, l]);
        cvContent.appendChild(item);
      }
    }

    // --- Service ---
    if (cv.service && cv.service.length > 0) {
      cvContent.appendChild(el("h2", "", "Service & Committees"));
      for (const s of cv.service) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", `${s.role} - ${s.organization}`));
        appendMeta(item, [s.date]);
        if (s.description) {
          const p = el("p", "summary", s.description);
          item.appendChild(p);
        }
        cvContent.appendChild(item);
      }
    }

    // --- Publications & Conferences ---
    if (cv.publications && cv.publications.length > 0) {
      cvContent.appendChild(el("h2", "", "Publications"));
      for (const pub of cv.publications) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", pub.title));
        const dLink = pub.doi
          ? link(`https://doi.org/${pub.doi}`, "DOI")
          : null;
        const uLink = pub.url ? link(pub.url, "Link") : null;
        appendMeta(item, [pub.year, pub.journal, dLink, uLink]);
        cvContent.appendChild(item);
      }
    }

    if (cv.conferences && cv.conferences.length > 0) {
      cvContent.appendChild(el("h2", "", "Conferences & Talks"));
      for (const conf of cv.conferences) {
        const item = el("div", "exp-item");
        item.appendChild(el("h3", "", `${conf.role} - ${conf.name}`));
        appendMeta(item, [conf.date, conf.location]);
        cvContent.appendChild(item);
      }
    }

    // --- Skills & Languages ---
    if (
      (cv.skills && cv.skills.length > 0) ||
      (cv.languages && cv.languages.length > 0)
    ) {
      cvContent.appendChild(el("h2", "", "Skills"));

      const skillsSectionWrap = el("div", "filter-layout");

      // Filter Sidebar
      const skillFilterContainer = el("div", "filter-sidebar");

      // Skills List
      const skillsListContainer = el("div", "filter-content");

      const skillElements: { element: HTMLElement; tags: string[] }[] = [];
      const categoryHeaders: {
        header: HTMLElement;
        elements: HTMLElement[];
      }[] = [];
      const skillFilterButtons: HTMLElement[] = [];
      let activeSkillFilters: Set<string> = new Set();
      let activeSkillCategories: Set<string> = new Set();

      const updateSkillFilters = () => {
        for (const btn of skillFilterButtons) {
          const isTagMatch = btn.dataset.tag &&
            activeSkillFilters.has(btn.dataset.tag);
          const isCatMatch = btn.dataset.category &&
            activeSkillCategories.has(btn.dataset.category);
          const isAllMatch = btn.dataset.tag === "All" &&
            activeSkillFilters.size === 0 && activeSkillCategories.size === 0;

          if (isTagMatch || isCatMatch || isAllMatch) {
            btn.style.background = "var(--text-color)";
            btn.style.color = "var(--bg-color)";
          } else {
            btn.style.background = "var(--bg-color)";
            btn.style.color = "var(--text-color)";
          }
        }

        const hierarchy = cv.project_hierarchy || {};
        for (const item of skillElements) {
          if (
            activeSkillFilters.size === 0 && activeSkillCategories.size === 0
          ) {
            item.element.style.display = "block";
          } else {
            let passed = false;
            for (const tag of activeSkillFilters) {
              if (item.tags.includes(tag)) {
                passed = true;
                break;
              }
            }
            if (!passed) {
              for (const cat of activeSkillCategories) {
                const catTechs = hierarchy[cat] || [];
                if (item.tags.some((t: string) => catTechs.includes(t))) {
                  passed = true;
                  break;
                }
              }
            }
            item.element.style.display = passed ? "block" : "none";
          }
        }
        for (const ch of categoryHeaders) {
          let anyVisible = false;
          for (const el of ch.elements) {
            if (el.style.display !== "none") {
              anyVisible = true;
              break;
            }
          }
          ch.header.style.display = anyVisible ? "block" : "none";
        }
      };

      const createSkillFilterBtn = (
        tagName: string,
        tagValue: string | null,
      ) => {
        const btn = el("button", "btn", tagName);
        btn.dataset.tag = tagValue || "All";
        btn.onclick = () => {
          if (tagValue === null) {
            activeSkillFilters.clear();
            activeSkillCategories.clear();
          } else {
            if (activeSkillFilters.has(tagValue)) {
              activeSkillFilters.delete(tagValue);
            } else {
              activeSkillFilters.add(tagValue);
            }
          }
          updateSkillFilters();
        };
        return btn;
      };

      const allSkillRow = el("div");
      allSkillRow.style.marginBottom = "8px";
      const allSkillBtn = createSkillFilterBtn("All", null);
      skillFilterButtons.push(allSkillBtn);
      allSkillRow.appendChild(allSkillBtn);
      skillFilterContainer.appendChild(allSkillRow);

      const skillHierarchy = cv.project_hierarchy || {};

      // Extract all tags used in skills
      const allUsedTags = new Set<string>();
      if (cv.skills) {
        for (const s of cv.skills) {
          if (s.tags) {
            for (const t of s.tags) allUsedTags.add(t);
          }
        }
      }
      // Add Languages as a tag automatically
      if (cv.languages) {
        allUsedTags.add("Spoken Languages");
      }

      const createSkillCatSection = (
        category: string,
        relevantTags: string[],
        isOther: boolean,
      ) => {
        const wrap = el("div");

        const catBtn = el("button", "btn");
        catBtn.style.fontWeight = "bold";
        catBtn.style.width = "100%";
        catBtn.style.textAlign = "left";
        catBtn.style.display = "flex";
        catBtn.style.justifyContent = "space-between";

        const label = el("span", "", category);
        const expandIcon = el("span", "", "[+]");
        expandIcon.style.fontSize = "0.8rem";
        expandIcon.style.opacity = "0.7";
        catBtn.appendChild(label);
        catBtn.appendChild(expandIcon);

        if (!isOther) {
          catBtn.dataset.category = category;
          skillFilterButtons.push(catBtn);
        }

        const subDiv = el("div");
        subDiv.style.display = "none";
        subDiv.style.flexWrap = "wrap";
        subDiv.style.gap = "8px";
        subDiv.style.padding = "10px 8px 10px 12px";
        subDiv.style.borderLeft = "2px solid var(--border-color)";
        subDiv.style.marginLeft = "12px";

        catBtn.onclick = () => {
          if (!isOther) {
            if (activeSkillCategories.has(category)) {
              activeSkillCategories.delete(category);
            } else {
              activeSkillCategories.add(category);
            }
            updateSkillFilters();
          }
          const isExpanded = subDiv.style.display === "flex";
          subDiv.style.display = isExpanded ? "none" : "flex";
          expandIcon.textContent = isExpanded ? "[+]" : "[-]";
        };

        wrap.appendChild(catBtn);

        for (const t of relevantTags) {
          const btn = createSkillFilterBtn(t, t);
          skillFilterButtons.push(btn);
          subDiv.appendChild(btn);
          if (!isOther) allUsedTags.delete(t);
        }
        wrap.appendChild(subDiv);
        skillFilterContainer.appendChild(wrap);
      };

      for (const [category, tags] of Object.entries(skillHierarchy)) {
        const relevantTags = (tags as string[]).filter((t) =>
          allUsedTags.has(t)
        );
        if (relevantTags.length === 0) continue;
        createSkillCatSection(category, relevantTags, false);
      }

      if (allUsedTags.size > 0) {
        createSkillCatSection("Other", Array.from(allUsedTags).sort(), true);
      }

      skillsSectionWrap.appendChild(skillFilterContainer);
      skillsSectionWrap.appendChild(skillsListContainer);
      cvContent.appendChild(skillsSectionWrap);

      // Render actual skills
      const skillGroups = new Map<string, any[]>();
      if (cv.skills) {
        for (const skill of cv.skills) {
          if (!skillGroups.has(skill.category)) {
            skillGroups.set(skill.category, []);
          }
          skillGroups.get(skill.category)!.push(skill);
        }
      }

      for (const [category, items] of skillGroups.entries()) {
        const catHeader = el("h3", "", category);
        catHeader.style.marginTop = "0px";
        catHeader.style.marginBottom = "10px";
        skillsListContainer.appendChild(catHeader);

        const currentCatElements: HTMLElement[] = [];

        for (const item of items) {
          const elItem = el("div");
          elItem.style.marginBottom = "12px";
          elItem.style.paddingLeft = "10px";
          elItem.style.borderLeft = "2px solid var(--border-color)";

          const b = el("span");
          b.innerHTML = `• ${item.description}`;
          elItem.appendChild(b);

          if (item.tags && item.tags.length > 0) {
            const tagP = el("p", "meta");
            tagP.style.fontSize = "0.7rem";
            tagP.style.marginTop = "2px";
            tagP.textContent = item.tags.join(", ");
            elItem.appendChild(tagP);
          }

          skillsListContainer.appendChild(elItem);
          skillElements.push({ element: elItem, tags: item.tags || [] });
          currentCatElements.push(elItem);
        }
        categoryHeaders.push({
          header: catHeader,
          elements: currentCatElements,
        });
      }

      if (cv.languages && cv.languages.length > 0) {
        const catHeader = el("h3", "", "Languages");
        catHeader.style.marginTop = "10px";
        catHeader.style.marginBottom = "10px";
        skillsListContainer.appendChild(catHeader);

        const currentCatElements: HTMLElement[] = [];

        for (const l of cv.languages) {
          const elItem = el("div");
          elItem.style.marginBottom = "12px";
          elItem.style.paddingLeft = "10px";
          elItem.style.borderLeft = "2px solid var(--border-color)";

          const b = el("span");
          b.innerHTML = `• ${l.name} (${l.proficiency})`;
          elItem.appendChild(b);

          const tagP = el("p", "meta");
          tagP.style.fontSize = "0.7rem";
          tagP.style.marginTop = "2px";
          tagP.textContent = "Spoken Languages";
          elItem.appendChild(tagP);

          skillsListContainer.appendChild(elItem);
          skillElements.push({ element: elItem, tags: ["Spoken Languages"] });
          currentCatElements.push(elItem);
        }
        categoryHeaders.push({
          header: catHeader,
          elements: currentCatElements,
        });
      }

      updateSkillFilters();
    }

    // Lisp Mode
    const isLisp =
      (document.getElementById("toggle-lisp") as HTMLInputElement)?.checked ||
      false;
    if (isLisp) {
      const rainbowColors = [
        "#ff0000",
        "#ff7f00",
        "#c4c400",
        "#00cc00",
        "#0000ff",
        "#4b0082",
        "#9400d3",
      ];

      const createParen = (text: string, depth: number) => {
        const span = document.createElement("span");
        span.className = "lisp-paren";
        span.style.color = rainbowColors[depth % rainbowColors.length];
        span.style.fontWeight = "bold";
        span.textContent = text;
        return span;
      };

      const applyLisp = (node: Node, depth: number) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (!text) return;

          const words = text.split(/\s+/);
          const frag = document.createDocumentFragment();

          words.forEach((w) => {
            frag.appendChild(createParen("( ", depth + 1));
            const textSpan = document.createElement("span");
            textSpan.className = "lisp-text";
            textSpan.textContent = w;
            frag.appendChild(textSpan);
            frag.appendChild(createParen(" ) ", depth + 1));
          });
          node.parentNode?.replaceChild(frag, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (
            el.tagName === "SCRIPT" || el.classList.contains("lisp-paren") ||
            el.classList.contains("lisp-text")
          ) return;

          Array.from(el.childNodes).forEach((child) =>
            applyLisp(child, depth + 1)
          );

          if (el.id !== "cv-content") {
            el.prepend(createParen("( ", depth));
            el.append(createParen(" )", depth));
          }
        }
      };

      const cvContentEl = document.getElementById("cv-content");
      if (cvContentEl) applyLisp(cvContentEl, 0);
    }

    // --- Generate Table of Contents ---
    const tocContainer = document.getElementById("toc-container");
    if (tocContainer) {
      tocContainer.innerHTML = "";

      const details = document.createElement("details");
      details.className = "toc-details";
      // Open by default on desktop, closed on mobile
      if (window.innerWidth > 768) {
        details.open = true;
      }

      const summary = document.createElement("summary");
      summary.style.cursor = "pointer";
      summary.style.fontWeight = "bold";
      summary.style.userSelect = "none";

      const tocHeader = el("h3", "", "Table of Contents");
      tocHeader.style.display = "inline";
      tocHeader.style.margin = "0";

      summary.appendChild(tocHeader);
      details.appendChild(summary);

      const h2s = cvContent.querySelectorAll("h2");
      const tocList = el("div");
      tocList.style.display = "flex";
      tocList.style.gap = "8px";
      tocList.style.marginTop = "12px";
      tocList.className = "toc-list";

      let i = 0;
      h2s.forEach((h2) => {
        const id = "section-" + i;
        h2.id = id;
        i++;

        const link = document.createElement("a");
        link.href = "#" + id;
        link.textContent = h2.textContent;
        link.className = "toc-link";

        link.onclick = () => {
          if (window.innerWidth <= 768) {
            details.open = false;
          }
        };

        tocList.appendChild(link);
      });

      details.appendChild(tocList);
      tocContainer.appendChild(details);
    }
  } catch (e) {
    cvContent.textContent = "Error loading CV API: " + e;
  }
}

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // --- FUN STUFF LOGIC ---
  const cats: HTMLDivElement[] = [];
  let catInterval: ReturnType<typeof setInterval> | null = null;
  const toggleCat = document.getElementById("toggle-cat") as HTMLInputElement;
  const toggleRetro = document.getElementById(
    "toggle-retro",
  ) as HTMLInputElement;
  const toggleLisp = document.getElementById("toggle-lisp") as HTMLInputElement;

  if (toggleCat) {
    toggleCat.addEventListener("change", () => {
      if (toggleCat.checked) {
        if (!catInterval) {
          catInterval = globalThis.setInterval(() => {
            if (Math.random() < 0.8 && cats.length < 35) {
              const cat = document.createElement("div");
              cat.textContent = "🐈";
              cat.style.position = "fixed";
              const size = Math.floor(Math.random() * 24 + 20); // 20px to 44px
              cat.style.fontSize = size + "px";
              cat.style.zIndex = "9998";
              const startLeft = Math.random() > 0.5;
              const startY = Math.random() * 90;
              const duration = 2.5 + Math.random() * 3.5; // 2.5s to 6s

              cat.style.top = startY + "vh";
              cat.style.left = startLeft ? "-100px" : "110vw";

              const startRot = Math.random() * 360;
              const endRot = startRot + (Math.random() * 1080 - 540); // Spin up to 1.5 times
              const scale = startLeft ? "-1, 1" : "1, 1";

              cat.style.transform = `scale(${scale}) rotate(${startRot}deg)`;
              cat.style.transition =
                `left ${duration}s linear, top ${duration}s linear, transform ${duration}s linear`;
              cat.style.pointerEvents = "none";
              document.body.appendChild(cat);
              cats.push(cat);

              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  cat.style.left = startLeft ? "110vw" : "-100px";
                  const endY = startY + (Math.random() * 60 - 30); // Drift up or down
                  cat.style.top = endY + "vh";
                  cat.style.transform = `scale(${scale}) rotate(${endRot}deg)`;
                });
              });

              setTimeout(() => {
                cat.remove();
                const index = cats.indexOf(cat);
                if (index > -1) cats.splice(index, 1);
              }, duration * 1000 + 500);
            }
          }, 250);
        }
      } else {
        if (catInterval) clearInterval(catInterval);
        catInterval = null;
        cats.forEach((c) => c.remove());
        cats.length = 0;
      }
    });
  }

  if (toggleRetro) toggleRetro.addEventListener("change", renderCV);
  if (toggleLisp) toggleLisp.addEventListener("change", renderCV);

  // --- END FUN STUFF ---

  // Checkboxes
  document.querySelectorAll('.controls input[type="checkbox"]').forEach(
    (cb) => {
      cb.addEventListener("change", renderCV);
    },
  );

  // Theme Selector
  const applyTheme = (theme: string) => {
    if (theme === "auto") {
      const isDark =
        globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  const themeSel = document.getElementById(
    "theme-selector",
  ) as HTMLSelectElement;
  if (themeSel) {
    themeSel.addEventListener("change", (e) => {
      applyTheme((e.target as HTMLSelectElement).value);
    });
    // apply default
    applyTheme(themeSel.value);

    // Listen for system changes if auto is selected
    globalThis.matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => {
        if (themeSel.value === "auto") applyTheme("auto");
      },
    );
  }

  const profileSel = document.getElementById(
    "profile-selector",
  ) as HTMLSelectElement;
  if (profileSel) {
    profileSel.addEventListener("change", (e) => {
      const mode = (e.target as HTMLSelectElement).value;
      const p = currentProfiles[mode] || currentProfiles["general"] ||
        { exclude: [] };
      const excludes = p.exclude || [];

      const setCheck = (id: string, excludeKeys: string[]) => {
        const el = document.getElementById(id) as HTMLInputElement;
        if (el) el.checked = !excludeKeys.some((k) => excludes.includes(k));
      };

      setCheck("toggle-publications", [
        "publications",
        "conferences",
        "service",
      ]);
      setCheck("toggle-experience", ["experience", "employment"]);
      setCheck("toggle-education", ["education"]);
      setCheck("toggle-skills", ["skills", "languages"]);
      setCheck("toggle-projects", ["projects", "certifications"]);

      renderCV();
    });
  }

  // Download PDF
  const downloadBtn = document.getElementById("download-pdf");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      const excludes: string[] = [];
      if (
        !(document.getElementById("toggle-experience") as HTMLInputElement)
          .checked
      ) {
        excludes.push("experience", "employment");
      }
      if (
        !(document.getElementById("toggle-education") as HTMLInputElement)
          .checked
      ) {
        excludes.push("education");
      }
      if (
        !(document.getElementById("toggle-publications") as HTMLInputElement)
          .checked
      ) {
        excludes.push("publications", "conferences");
      }
      if (
        !(document.getElementById("toggle-skills") as HTMLInputElement).checked
      ) {
        excludes.push("skills", "languages");
      }
      if (
        !(document.getElementById("toggle-projects") as HTMLInputElement)
          .checked
      ) {
        excludes.push("projects", "certifications");
      }

      let url = (window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "localhost")
        ? "http://127.0.0.1:3000/api/cv.pdf"
        : "/api/cv.pdf";
      if (excludes.length > 0) {
        url += "?exclude=" + excludes.join(",");
      }
      globalThis.open(url, "_blank");
    });
  }

  renderCV();
});
