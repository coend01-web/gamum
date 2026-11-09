#!/usr/bin/env python3
"""Generate a local, review-only SQL import for CBCK candidates (NO PASSWORDS).
Prerequisites: run scripts/prepare_cbck_catalog.py; apply Supabase migrations 0001..0003
to a DEVELOPMENT project before manually reviewing/executing this SQL.
"""
import csv, json
from pathlib import Path

DIR=Path("private/cbck")
def read(name):
    with (DIR/name).open("r",encoding="utf-8-sig",newline="") as f:
        return list(csv.DictReader(f))

def q(value):
    if value is None:return "NULL"
    return "'"+str(value).replace("\x00","").replace("'","''")+"'"

def maybe(value):
    return q(value) if value else "NULL"

def main():
    report=json.loads((DIR/"report.json").read_text(encoding="utf-8"))
    rows=read("cbck_all_records.csv")
    org={x["record_id"]:x["management_number"] for x in read("organizations_pending.csv")}
    houses={x["record_id"]:x["facility_number"] for x in read("retreat_houses_pending.csv")}
    if len(org)!=report["provisional_institution_codes"] or len(houses)!=report["provisional_facility_codes"]:
        raise RuntimeError("Codes/record counts changed: rerun the complete CBCK audit first.")
    statements=[
        "-- CAMUM v0.21 CBCK prefill into PRIVATE STAGING ONLY, NOT ACTIVATION.",
        "-- IMPORTANT: DB migrations 0001, 0002 and 0003 must already be applied to the DEVELOPMENT project.",
        "-- This does not create live organizations or user accounts and does not set passwords.",
        "-- Review and confirm source rights, duplicate/legal entity affiliation and code sequence BEFORE execution.",
        "begin;",
    ]
    for record in rows:
        values=[
            q(record["record_id"]),q(record["cbck_code"]),q(record["source_type"]),
            q(record["name"]),q(record["context"]),q(record["source_url"]),
            q(record["checked_on"]),maybe(org.get(record["record_id"])),
            maybe(houses.get(record["record_id"]))
        ]
        statements.append(
          "insert into camum_private.cbck_directory_staging "
          "(source_record_id,cbck_code,source_section,official_name,source_context,"
          "official_detail_url,source_checked_on,provisional_management_number,"
          "provisional_facility_number) values ("+",".join(values)+") "
          "on conflict (source_record_id) do update set "
          "official_name=excluded.official_name,"
          "source_context=excluded.source_context,"
          "official_detail_url=excluded.official_detail_url,"
          "source_checked_on=excluded.source_checked_on,"
          "updated_at=now();"
        )
    statements.append("commit;")
    path=DIR/"cbck_staging_review_ONLY.sql"
    path.write_text("\n".join(statements)+"\n",encoding="utf-8")
    print(json.dumps({"staged_directory_rows":len(rows),
      "reserved_institution_codes":len(org),"reserved_facility_codes":len(houses),
      "sql_path":str(path),"database_modified":False},ensure_ascii=False,indent=2))

if __name__=="__main__":main()
