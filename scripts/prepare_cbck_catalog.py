#!/usr/bin/env python3
"""Prepare a *private, unapproved* CBCK candidate registry. No passwords, no DB writes.
Run from repository root: python3 -m pip install beautifulsoup4
                          python3 scripts/prepare_cbck_catalog.py
Files are created in git-ignored private/cbck/. Respect CBCK usage rights.
"""
import csv, datetime, hashlib, json, re, sys, time
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Install parser first: python3 -m pip install beautifulsoup4")

BASE = "https://directory.cbck.or.kr/OnlineAddress/SearchList.aspx"
OUT = Path("private/cbck")
SETS = [
    ("male_all", 6, "all", 200),
    ("female_all", 7, "all", 450),
    ("retreat_house", 15, "all", 175),
    ("male_head", 6, "201005720", 40),
    ("female_head", 7, "201005720", 90),
]
REPEATED_NONLIST_KEYS = {}
COLUMNS = ["record_id","source_type","cbck_code","name","context","source_url","checked_on"]

def fetch(url):
    req = Request(url,headers={"User-Agent":"CAMUM-admin-verification/0.21 (respectful directory check)"})
    for i in range(3):
        try:
            with urlopen(req,timeout=30) as stream:
                return stream.read().decode("utf-8","replace")
        except Exception as exc:
            if i==2: raise RuntimeError(f"Official site unavailable: {url}: {exc}") from exc
            time.sleep(2+i)

def parse(html, kind):
    soup = BeautifulSoup(html,"html.parser")
    text = soup.get_text(" ",strip=True)
    counts = re.findall(r"(\d+)\s*-\s*(\d+)\s*/\s*([\d,]+)\s*건",text)
    if not counts: raise RuntimeError(f"No page count for {kind}; check official HTML")
    end,total = int(counts[-1][1]),int(counts[-1][2].replace(",",""))
    rows={}
    for anchor in soup.select("a[href]"):
        href=anchor.get("href","")
        onclick=anchor.get("onclick","")
        if "DetailInfo.aspx" not in href and "DetailInfo.aspx" not in onclick: continue
        name=re.sub(r"\s+"," ",anchor.get_text(" ",strip=True)).strip()
        if not name or len(name)>180: continue
        url=urljoin(BASE,href) if "DetailInfo.aspx" in href else ""
        match=re.search(r"(?i)(?:[?&]|&amp;)code=([^&#\s\"']+)",href+" "+onclick)
        code=match.group(1) if match else ""
        record_id=f"{kind}:{code}" if code else f"{kind}:{hashlib.sha256((name+url).encode()).hexdigest()[:16]}"
        context=name
        for parent in anchor.parents:
            if getattr(parent,"name",None) in ("body","html"):break
            value=re.sub(r"\s+"," ",parent.get_text(" ",strip=True))
            if len(name)<len(value)<650:
                context=value[:550]
                if "표 주소" in value or "교구" in value: break
        rows[record_id]=dict(record_id=record_id,source_type=kind,cbck_code=code,
            name=name,context=context,source_url=url,
            checked_on=datetime.date.today().isoformat())
    return list(rows.values()),end,total

def collect(kind,group,area,minimum):
    params=dict(cgubn="g",char="all",gubn=str(group),gyogu=area,paged="50",start="1",tbxSearch="")
    first,end,total=parse(fetch(BASE+"?"+urlencode(params)),kind)
    if not first or end==0:raise RuntimeError(f"{kind}: first page empty")
    size=min(end,len(first))
    found={row["record_id"]:row for row in first}
    occurrences=Counter(row["cbck_code"] or row["name"] for row in first)
    for start in range(1+size,total+1,size):
        params.update(start=str(start),paged=str(size))
        rows,_,this_total=parse(fetch(BASE+"?"+urlencode(params)),kind)
        if not rows or this_total!=total:
            raise RuntimeError(f"{kind}: incomplete/changed page at start={start}")
        found.update({row["record_id"]:row for row in rows})
        occurrences.update(row["cbck_code"] or row["name"] for row in rows)
        time.sleep(.15)
    group="male" if kind.startswith("male") else "female" if kind.startswith("female") else "houses"
    if kind.endswith("_all") or kind=="retreat_house":
        repeated={key for key,how_many in occurrences.items() if how_many>1}
        REPEATED_NONLIST_KEYS[group]=repeated
    else:
        repeated=REPEATED_NONLIST_KEYS.get(group,set())
    found={rid:row for rid,row in found.items() if (row["cbck_code"] or row["name"]) not in repeated}
    if len(found)!=total or len(found)<minimum:
        raise RuntimeError(f"{kind}: expected {total} exact list entries; got {len(found)} after excluding {len(repeated)} repeating non-list links. Do not pre-assign codes.")
    print(f"{kind}: {len(found)}/{total} (excluded {len(repeated)} repeating navigational links)")
    return list(found.values()),total

def write_csv(path, rows, cols):
    with path.open("w",encoding="utf-8-sig",newline="") as handle:
        writer=csv.DictWriter(handle,fieldnames=cols,extrasaction="ignore")
        writer.writeheader();writer.writerows(rows)

def previous(path,field):
    if not path.exists():return {}
    with path.open(encoding="utf-8-sig",newline="") as handle:
        return {r["record_id"]:r[field] for r in csv.DictReader(handle) if r.get(field)}

def next_serial(prefix,existing):
    nums=[int(v[len(prefix):]) for v in existing.values() if v.startswith(prefix) and v[len(prefix):].isdigit()]
    return max(nums,default=0)+1

def main():
    source=[];totals={}
    # Fail closed: do not overwrite previous staging until *all five* official lists complete.
    for spec in SETS:
        rows,total=collect(*spec)
        totals[spec[0]]=dict(collected=len(rows),reported=total)
        source.extend(rows)
    OUT.mkdir(parents=True,exist_ok=True)
    orgpath=OUT/"organizations_pending.csv"
    housepath=OUT/"retreat_houses_pending.csv"
    existing_org=previous(orgpath,"management_number")
    existing_house=previous(housepath,"facility_number")
    org_n=next_serial("CAM-",existing_org)
    house_n=next_serial("CAM-H-",existing_house)
    org=[];houses=[]
    for row in sorted(source,key=lambda r:(r["source_type"],r["name"],r["record_id"])):
        kind,rid=row["source_type"],row["record_id"]
        if kind.endswith("_head"):
            code=existing_org.get(rid)
            if not code:code=f"CAM-{org_n:06d}";org_n+=1
            org.append(dict(row,management_number=code,credential_state="unissued",
                approval_state="pending",claim_state="unclaimed",
                review_note="본부/관구/법인 주체 확인 및 기관 신청 필요"))
        elif kind=="retreat_house":
            code=existing_house.get(rid)
            if not code:code=f"CAM-H-{house_n:06d}";house_n+=1
            houses.append(dict(row,facility_number=code,management_number="",
                association_state="unverified",publication_state="unpublished",
                review_note="실제 운영 기관 확인 및 매칭 필요"))
    write_csv(OUT/"cbck_all_records.csv",source,COLUMNS)
    write_csv(orgpath,org,COLUMNS+["management_number","credential_state","approval_state","claim_state","review_note"])
    write_csv(housepath,houses,COLUMNS+["facility_number","management_number","association_state","publication_state","review_note"])
    report=dict(source=BASE,checked_on=datetime.date.today().isoformat(),totals=totals,
        provisional_institution_codes=len(org),provisional_facility_codes=len(houses),
        status="local-only, unverified, unclaimed, unissued; NOT deployed to Supabase",
        next_steps=["confirm CBCK directory reuse permission","deduplicate provinces and communities",
                    "verify house operator","review by central admin","import staging and sync DB number sequence",
                    "claim using verified institution contact; set a unique password then"])
    (OUT/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=="__main__":main()
