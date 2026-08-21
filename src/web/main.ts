/// <reference lib="dom" />
// Global BSON from CDN
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
    let excludes: string[] = [];
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

    const customLinks = (pi.links || []).map((l) => {
      const a = link(l.url, l.name);
      if (l.icon) {
        // Clear text, insert icon and text
        a.innerHTML = "";
        a.style.display = "inline-flex";
        a.style.alignItems = "center";
        a.style.gap = "4px";

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
      emailLink,
      orcidLink,
      ...customLinks,
      locString || null,
    ]);
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
      for (const proj of cv.projects) {
        const item = el("div", "exp-item");
        const titleWrap = el("h3", "", proj.name);
        if (proj.url) {
          titleWrap.appendChild(document.createTextNode(" - "));
          titleWrap.appendChild(link(proj.url, "Link"));
        }
        item.appendChild(titleWrap);
        appendMeta(item, [proj.technologies.join(", ")]);
        item.appendChild(el("p", "", proj.description));
        cvContent.appendChild(item);
      }
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
      cvContent.appendChild(el("h2", "", "Skills & Languages"));
      const grid = el("div", "skills-grid");

      if (cv.skills) {
        for (const skill of cv.skills) {
          grid.appendChild(el("div", "skill-cat", skill.category));
          grid.appendChild(el("div", "", skill.description));
        }
      }
      if (cv.languages) {
        for (const lang of cv.languages) {
          grid.appendChild(el("div", "skill-cat", lang.name));
          grid.appendChild(el("div", "", lang.proficiency));
        }
      }
      cvContent.appendChild(grid);
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

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "light" : "dark",
      );
    });
  }

  // Download PDF
  const downloadBtn = document.getElementById("download-pdf");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      let excludes: string[] = [];
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
