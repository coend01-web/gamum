#!/usr/bin/env python3
"""Generate a local, review-only SQL import for CBCK candidates (NO PASSWORDS).
Prerequisites: run scripts/prepare_cbck_catalog.py; apply Supabase migrations 0001..0004
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
    for section, count in report['totals'].items():
        selected=[r for r in rows if r['source_type']==section]
        if len(selected)!=count['reported'] or count['reported']!=count['collected'] or len({r['record_id'] for r in selected})!=len(selected):
            raise RuntimeError('Incomplete or duplicate source inventory; import stopped.')
    if len(set(org.values()))!=len(org) or len(set(houses.values()))!=len(houses):
        raise RuntimeError('Duplicate reserved numbers; import stopped.')
    review_path=DIR/'directory_review.json'
    if not review_path.exists(): raise RuntimeError('Run review_cbck_catalog.py before exporting.')
    reviews=json.loads(review_path.read_text())
    if {r['source_record_id'] for r in reviews}!={r['record_id'] for r in rows}: raise RuntimeError('Review inventory mismatch')
    statements=[
        "-- CAMUM v0.21 CBCK prefill into PRIVATE STAGING ONLY, NOT ACTIVATION.",
        "-- IMPORTANT: DB migrations 0001, 0002, 0003 and 0004 must already be applied to the DEVELOPMENT project.",
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
          "updated_at=now() where cbck_directory_staging.reviewer_id is null and cbck_directory_staging.organization_id is null and cbck_directory_staging.retreat_house_id is null;"
        )
    for r in reviews:
        # Preserve human decisions and activated entities on repeat imports.
        assignments=','.join(k+'='+maybe(r[k]) if k in ('canonical_source_record_id','parent_source_record_id') else k+'='+q(r[k])
            for k in ('canonical_source_record_id','parent_source_record_id','affiliation_state','operator_name','evidence_url','source_note','review_state'))
        statements.append('update camum_private.cbck_directory_staging set '+assignments+
          ' where source_record_id='+q(r['source_record_id'])+' and reviewer_id is null and organization_id is null and retreat_house_id is null;')
    statements.append("commit;")
    path=DIR/"cbck_staging_review_ONLY.sql"
    path.write_text("\n".join(statements)+"\n",encoding="utf-8")
    print(json.dumps({"staged_directory_rows":len(rows),"unique_cbck_records":len({r["cbck_code"] for r in rows}),
      "reserved_institution_codes":len(org),"reserved_facility_codes":len(houses),
      "sql_path":str(path),"database_modified":False},ensure_ascii=False,indent=2))

if __name__=="__main__":main()
