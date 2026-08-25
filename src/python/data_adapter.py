import json

import h5py
import polars as pl

from src.python.models import CVData


class DataAdapter:
    def __init__(self, h5_filepath: str):
        self.h5_filepath = h5_filepath

    def save_cv(self, cv: CVData):
        dump = cv.model_dump()

        for exp in dump.get("experience", []):
            exp["bullets"] = json.dumps(exp["bullets"])
        for proj in dump.get("projects", []):
            proj["technologies"] = json.dumps(proj["technologies"])
        if "personal_info" in dump:
            dump["personal_info"]["links"] = json.dumps(
                dump["personal_info"].get("links", [])
            )
            if "profiles" in dump["personal_info"]:
                dump["personal_info"]["profiles"] = json.dumps(dump["personal_info"]["profiles"])

        if "project_hierarchy" in dump:
            dump["project_hierarchy"] = {"hierarchy": json.dumps(dump["project_hierarchy"])}

        with h5py.File(self.h5_filepath, "w") as f:
            for name, data in dump.items():
                if not data:
                    continue

                df_data = [data] if isinstance(data, dict) else data
                df = pl.DataFrame(df_data)

                if len(df) == 0:
                    continue

                group = f.create_group(name)
                for col in df.columns:
                    series = df[col]
                    if series.dtype == pl.String or series.dtype == pl.Null:
                        dt = h5py.string_dtype(encoding="utf-8")
                        data_list = [
                            "" if x is None else str(x) for x in series.to_list()
                        ]
                        import numpy as np

                        data_arr = np.array(data_list, dtype=object)
                        group.create_dataset(
                            col,
                            data=data_arr,
                            dtype=dt,
                            compression="gzip",
                            compression_opts=9,
                        )
                    else:
                        data_arr = series.to_numpy()
                        group.create_dataset(
                            col, data=data_arr, compression="gzip", compression_opts=9
                        )

    def load_cv(self) -> CVData:
        data_dump = {}
        with h5py.File(self.h5_filepath, "r") as f:
            for name in f:
                group = f[name]
                data_dict = {}
                for col in group:
                    ds = group[col]
                    data = ds[:]
                    if data.dtype.kind in {"S", "O"}:
                        decoded = [
                            x.decode("utf-8") if isinstance(x, bytes) else str(x)
                            for x in data
                        ]
                        data_dict[col] = [None if x == "" else x for x in decoded]
                    else:
                        data_dict[col] = data
                data_dump[name] = pl.DataFrame(data_dict).to_dicts()

        if data_dump.get("personal_info"):
            data_dump["personal_info"] = data_dump["personal_info"][0]

        for exp in data_dump.get("experience", []):
            if isinstance(exp.get("bullets"), str):
                exp["bullets"] = json.loads(exp["bullets"])
        for proj in data_dump.get("projects", []):
            if isinstance(proj.get("technologies"), str):
                proj["technologies"] = json.loads(proj["technologies"])
        
        if "personal_info" in data_dump:
            if isinstance(data_dump["personal_info"].get("links"), str):
                data_dump["personal_info"]["links"] = json.loads(
                    data_dump["personal_info"]["links"]
                )
            if isinstance(data_dump["personal_info"].get("profiles"), str):
                try:
                    data_dump["personal_info"]["profiles"] = json.loads(data_dump["personal_info"]["profiles"])
                except Exception:
                    data_dump["personal_info"]["profiles"] = {}

        if "project_hierarchy" in data_dump and len(data_dump["project_hierarchy"]) > 0:
            val = data_dump["project_hierarchy"][0].get("hierarchy")
            if isinstance(val, str):
                data_dump["project_hierarchy"] = json.loads(val)
            else:
                data_dump["project_hierarchy"] = {}

        return CVData(**data_dump)
