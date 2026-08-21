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
        dfs = {
            "personal_info": pl.DataFrame([cv.personal_info.model_dump()]),
            "skills": pl.DataFrame([s.model_dump() for s in cv.skills]),
            "experience": pl.DataFrame(
                [self._serialize_experience(e) for e in cv.experience]
            ),
            "education": pl.DataFrame([e.model_dump() for e in cv.education]),
        }
        if cv.publications:
            dfs["publications"] = pl.DataFrame(
                [p.model_dump() for p in cv.publications]
            )
        if cv.employment:
            dfs["employment"] = pl.DataFrame([e.model_dump() for e in cv.employment])

        with h5py.File(self.h5_filepath, "w") as f:
            for name, df in dfs.items():
                if len(df) == 0:
                    continue
                group = f.create_group(name)
                for col in df.columns:
                    series = df[col]
                    if series.dtype == pl.String or series.dtype == pl.Null:
                        import numpy as np

                        data_list = [
                            "" if x is None else str(x) for x in series.to_list()
                        ]
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
            for name in [
                "personal_info",
                "skills",
                "experience",
                "education",
                "publications",
                "employment",
            ]:
                if name in f:
                    group = f[name]
                    data_dict = {}
                    for col in group:
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

        publications = []
        if "publications" in dfs:
            from src.python.models import Publication

            publications = [Publication(**p) for p in dfs["publications"].to_dicts()]

        employment = []
        if "employment" in dfs:
            from src.python.models import Employment

            employment = [Employment(**e) for e in dfs["employment"].to_dicts()]

        return CVData(
            personal_info=personal_info,
            skills=skills,
            experience=experience,
            education=education,
            publications=publications,
            employment=employment,
        )
