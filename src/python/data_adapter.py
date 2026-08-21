import json

import h5py
import polars as pl
from src.python.models import CVData, Education, Experience, PersonalInfo, Skill


class DataAdapter:
    def __init__(self, h5_filepath: str):
        self.h5_filepath = h5_filepath

    def _serialize_experience(self, exp: Experience) -> dict:
        data = exp.model_dump()
        data["bullets"] = json.dumps(data["bullets"])
        return data

    def _deserialize_experience(self, data: dict) -> Experience:
        data["bullets"] = json.loads(data["bullets"])
        return Experience(**data)

    def save_cv(self, cv: CVData):
        df_personal = pl.DataFrame([cv.personal_info.model_dump()])
        df_skills = pl.DataFrame([s.model_dump() for s in cv.skills])
        df_exp = pl.DataFrame([self._serialize_experience(e) for e in cv.experience])
        df_edu = pl.DataFrame([e.model_dump() for e in cv.education])

        dfs = {
            "personal_info": df_personal,
            "skills": df_skills,
            "experience": df_exp,
            "education": df_edu,
        }

        with h5py.File(self.h5_filepath, "w") as f:
            for name, df in dfs.items():
                group = f.create_group(name)
                for col in df.columns:
                    series = df[col]
                    if series.dtype == pl.String:
                        import numpy as np

                        data_list = ["" if x is None else x for x in series.to_list()]
                        data = np.array(
                            [x.encode("utf-8") for x in data_list], dtype="S"
                        )
                        group.create_dataset(
                            col,
                            data=data,
                            compression="gzip",
                            compression_opts=9,
                        )
                    else:
                        data = series.to_numpy()
                        group.create_dataset(
                            col,
                            data=data,
                            compression="gzip",
                            compression_opts=9,
                        )

    def load_cv(self) -> CVData:
        dfs = {}
        with h5py.File(self.h5_filepath, "r") as f:
            for name in ["personal_info", "skills", "experience", "education"]:
                group = f[name]
                data_dict = {}
                for col in group.keys():
                    ds = group[col]
                    data = ds[:]
                    if data.dtype.kind == "S":
                        data_dict[col] = [x.decode("utf-8") for x in data]
                    else:
                        data_dict[col] = data
                dfs[name] = pl.DataFrame(data_dict)

        personal_info = PersonalInfo(**dfs["personal_info"].to_dicts()[0])
        skills = [Skill(**s) for s in dfs["skills"].to_dicts()]
        experience = [
            self._deserialize_experience(e) for e in dfs["experience"].to_dicts()
        ]
        education = [Education(**e) for e in dfs["education"].to_dicts()]

        return CVData(
            personal_info=personal_info,
            skills=skills,
            experience=experience,
            education=education,
        )
