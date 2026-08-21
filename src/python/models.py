from pydantic import BaseModel


class PersonalInfo(BaseModel):
    name: str
    email: str
    github: str
    orcid: str
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


class CVData(BaseModel):
    personal_info: PersonalInfo
    skills: list[Skill]
    experience: list[Experience]
    education: list[Education]
    publications: list[Publication] = []
    employment: list[Employment] = []
