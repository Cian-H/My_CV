import streamlit as st

from src.python.data_adapter import DataAdapter

st.set_page_config(page_title="Cian Hughes CV", layout="wide")


@st.cache_data
def load_data():
    adapter = DataAdapter("cv_data.h5")
    return adapter.load_cv()


cv = load_data()

st.title(cv.personal_info.name)
st.markdown(
    f"**Email:** {cv.personal_info.email} | **Github:** [{cv.personal_info.github}](https://github.com/{cv.personal_info.github}) | **ORCID:** [{cv.personal_info.orcid}]({cv.personal_info.orcid})"
)

st.header("Profile")
st.write(cv.personal_info.profile)

st.header("Skills")
col1, col2 = st.columns(2)
with col1:
    st.subheader("Technical")
    for s in cv.skills:
        if s.category == "Technical":
            st.markdown(f"- {s.description}")
with col2:
    st.subheader("Personal")
    for s in cv.skills:
        if s.category == "Personal":
            st.markdown(f"- {s.description}")

st.header("Employment Experience")
for exp in cv.experience:
    loc = f", {exp.location}" if exp.location else ""
    st.subheader(f"{exp.organization}{loc}")
    st.markdown(f"**{exp.title}**, {exp.date}")
    for b in exp.bullets:
        st.markdown(f"- {b}")

st.header("Education")
for edu in cv.education:
    desc = f" - {edu.description}" if edu.description else ""
    st.markdown(f"**{edu.date}**: {edu.degree}, {edu.institution}{desc}")
