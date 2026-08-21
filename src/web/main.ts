/// <reference lib="dom" />
// Global BSON from CDN
declare const BSON: any; // deno-lint-ignore no-explicit-any

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
  profile: string;
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

    let url = "http://127.0.0.1:3000/api/cv.bson";
    if (excludes.length > 0) {
      url += "?exclude=" + excludes.join(",");
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch CV");

    const buffer = await response.arrayBuffer();
    const cv: CVData = BSON.deserialize(new Uint8Array(buffer));

    cvContent.innerHTML = ""; // Clear loader

    if (!cv || !cv.personal_info) {
      cvContent.textContent = "Error: Invalid CV data received.";
      return;
    }

    // --- Personal Info ---
    const pi = cv.personal_info;
    cvContent.appendChild(el("h1", "", pi.name));

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

    cvContent.appendChild(el("p", "", pi.profile));

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
      const filterContainer = el("div", "project-filters");
      filterContainer.style.display = "flex";
      filterContainer.style.flexWrap = "wrap";
      filterContainer.style.gap = "8px";
      filterContainer.style.marginBottom = "16px";

      // Render filter buttons
      let activeFilter: string | null = null;
      const projectItems: { element: HTMLElement; techs: string[] }[] = [];
      const filterButtons: HTMLElement[] = [];

      const updateFilters = () => {
        for (const btn of filterButtons) {
          if (
            btn.dataset.tech === activeFilter ||
            (activeFilter === null && btn.dataset.tech === "All")
          ) {
            btn.style.background = "var(--text-color)";
            btn.style.color = "var(--bg-color)";
          } else {
            btn.style.background = "var(--bg-color)";
            btn.style.color = "var(--text-color)";
          }
        }

        for (const item of projectItems) {
          if (activeFilter === null || item.techs.includes(activeFilter)) {
            item.element.style.display = "block";
          } else {
            item.element.style.display = "none";
          }
        }
      };

      const createFilterBtn = (techName: string, techValue: string | null) => {
        const btn = el("button", "btn", techName);
        btn.dataset.tech = techValue || "All";
        btn.onclick = () => {
          activeFilter = techValue;
          updateFilters();
        };
        return btn;
      };

      const allBtn = createFilterBtn("All", null);
      filterButtons.push(allBtn);
      filterContainer.appendChild(allBtn);

      for (const tech of sortedTechs) {
        const btn = createFilterBtn(tech, tech);
        filterButtons.push(btn);
        filterContainer.appendChild(btn);
      }

      cvContent.appendChild(filterContainer);

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
        appendMeta(item, [(proj.technologies || []).join(", ")]);
        item.appendChild(el("p", "", proj.description));
        projectsList.appendChild(item);

        projectItems.push({
          element: item,
          techs: proj.technologies || [],
        });
      }
      cvContent.appendChild(projectsList);

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

      const skillGroups = new Map<string, string[]>();
      if (cv.skills) {
        for (const skill of cv.skills) {
          if (!skillGroups.has(skill.category)) {
            skillGroups.set(skill.category, []);
          }
          skillGroups.get(skill.category)!.push(skill.description);
        }
      }

      if (cv.languages && cv.languages.length > 0) {
        skillGroups.set(
          "Languages",
          cv.languages.map((l) => `${l.name} (${l.proficiency})`),
        );
      }

      for (const [category, items] of skillGroups.entries()) {
        const catHeader = el("h3", "", category);
        catHeader.style.marginTop = "12px";
        catHeader.style.marginBottom = "8px";
        cvContent.appendChild(catHeader);

        const ul = el("ul");
        ul.style.marginTop = "0";
        for (const item of items) {
          ul.appendChild(el("li", "", item));
        }
        cvContent.appendChild(ul);
      }
    }
  } catch (e) {
    cvContent.textContent = "Error loading CV API: " + e;
  }
}

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Checkboxes
  document.querySelectorAll('.controls input[type="checkbox"]').forEach(
    (cb) => {
      cb.addEventListener("change", renderCV);
    },
  );

  // Theme Selector
  const applyTheme = (theme: string) => {
    if (theme === "auto") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener(
      "change",
      () => {
        if (themeSel.value === "auto") applyTheme("auto");
      },
    );
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

      let url = "http://127.0.0.1:3000/api/cv.pdf";
      if (excludes.length > 0) {
        url += "?exclude=" + excludes.join(",");
      }
      globalThis.open(url, "_blank");
    });
  }

  renderCV();
});
