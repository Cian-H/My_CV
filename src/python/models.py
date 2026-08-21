from pydantic import BaseModel


class Link(BaseModel):
    name: str
    url: str
    icon: str | None = None


class PersonalInfo(BaseModel):
    name: str
    email: str
    orcid: str
    links: list[Link] = []
    city: str | None = None
    country: str | None = None
    timezone: str | None = None
    profile: str


class Skill(BaseModel):
    category: str
    description: str


class Experience(BaseModel):
    title: str
    date: str
    organization: str
    location: str | None = None
    bullets: list[str]


class Education(BaseModel):
    date: str
    degree: str
    institution: str
    description: str | None = None


class Employment(BaseModel):
    role: str
    organization: str
    department: str | None = None
    start_date: str
    end_date: str | None = None


class Publication(BaseModel):
    title: str
    year: str
    journal: str
    doi: str | None = None
    url: str | None = None


class Project(BaseModel):
    name: str
    description: str
    technologies: list[str] = []
    url: str | None = None


class Certification(BaseModel):
    name: str
    issuer: str
    date: str
    url: str | None = None


class Conference(BaseModel):
    name: str
    role: str
    date: str
    location: str | None = None


class Language(BaseModel):
    name: str
    proficiency: str


class CVData(BaseModel):
    personal_info: PersonalInfo
    skills: list[Skill]
    experience: list[Experience]
    education: list[Education]
    publications: list[Publication] = []
    employment: list[Employment] = []
    projects: list[Project] = []
    certifications: list[Certification] = []
    conferences: list[Conference] = []
    languages: list[Language] = []
