#!/usr/bin/env python3
"""Private source review, never membership/credentials. Retains only names and evidence links."""
import csv, json, re, ssl, time, unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.request import urlopen
from bs4 import BeautifulSoup

OUT = Path('private/cbck')
MISSA = 'https://missa.cbck.or.kr/Retreat'
def norm(s):
    return re.sub(r'[^\w]', '', unicodedata.normalize('NFC', s)).lower()
def base(s):
    return norm(re.sub(r'\([^)]*\)', '', s))
def read(name):
    with (OUT/name).open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))
def fetch(url):
    # Use certifi when the macOS Python installation has no system CA bundle.
    try:
        import certifi
        context = ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        context = ssl.create_default_context()
    with urlopen(url, context=context, timeout=30) as f:
        return BeautifulSoup(f.read(), 'html.parser')
def main():
    rows, orgs, houses = read('cbck_all_records.csv'), read('organizations_pending.csv'), read('retreat_houses_pending.csv')
    report = json.loads((OUT/'report.json').read_text())
    for k,v in report['totals'].items():
        if v['collected'] != v['reported'] or sum(r['source_type']==k for r in rows)!=v['reported']:
            raise ValueError('Incomplete source inventory')
    heads = {r['cbck_code']:r for r in orgs}
    unique = {r['cbck_code'] for r in rows}
    if len(heads)!=len(orgs) or any(not r['cbck_code'] for r in rows):
        raise ValueError('Duplicate headquarters code or missing source identity')
    missa = defaultdict(list)
    for callout in fetch(MISSA).select('.bs-callout'):
        h,owner = callout.find('h4'),callout.find('span', recursive=False)
        if h:
            missa[norm(h.get_text(' ',strip=True))].append(owner.get_text(' ',strip=True) if owner else '')
    reviews, groups = [], defaultdict(list)
    for r in orgs: groups[base(r['name'])].append(r['record_id'])
    cachepath=OUT/'operator_evidence.json'
    cache=json.loads(cachepath.read_text()) if cachepath.exists() else {}
    today=report['checked_on']
    for r in rows:
        rid=r['record_id']; canonical=heads.get(r['cbck_code'],r)['record_id']
        item=dict(source_record_id=rid,canonical_source_record_id=canonical if canonical!=rid else None,
                  parent_source_record_id=None,affiliation_state='unverified',operator_name='',
                  evidence_url=r['source_url'],source_note='',review_state='unreviewed')
        if canonical!=rid:
            item.update(review_state='duplicate_review',source_note='동일 CBCK code의 전체 목록/본부 분류 중복. 별도 기관 번호 발급 금지.')
        elif r['source_type'].endswith('_head') and len(groups[base(r['name'])])>1:
            item.update(review_state='duplicate_review',source_note='동일 수도회명에 여러 수도원·관구가 있음. 자치 운영 주체 확인 전 병합 금지.')
        elif r['source_type'].endswith('_all'):
            possible=[x['record_id'] for x in orgs if base(x['name'])==base(r['name'])]
            item.update(review_state='affiliation_review',source_note='분원/지역 공동체. 별도 계정 자동 발급 금지.'+(' 검토 후보: '+', '.join(possible) if possible else ''))
        if r['source_type']=='retreat_house':
            entry=cache.get(r['cbck_code'])
            if not entry or entry.get('checked_on')!=today:
                soup=fetch(r['source_url']); owner=''
                for tr in soup.select('tr'):
                    cells=tr.find_all('td',recursive=False)
                    if len(cells)==2 and cells[0].get_text(' ',strip=True)=='책임수도회':
                        owner=cells[1].get_text(' ',strip=True)
                entry={'operator_name':owner,'checked_on':today,'evidence_url':r['source_url']}
                cache[r['cbck_code']]=entry
                cachepath.write_text(json.dumps(cache,ensure_ascii=False,indent=2))
                time.sleep(.1)
            owner=entry['operator_name']; other=missa.get(norm(r['name']),[])
            explicit=[o for o in other if o]
            conflict=bool(owner and explicit and not any(norm(owner)==norm(o) for o in explicit))
            source=r['source_url']
            if not owner and len(other)==1 and other[0]: owner=other[0];source=MISSA
            matches=[o for o in orgs if norm(o['name'])==norm(owner)] if owner else []
            if not matches and owner: matches=[o for o in orgs if base(o['name'])==norm(owner)]
            item.update(operator_name=owner,evidence_url=source,review_state='affiliation_review')
            if owner and len(matches)==1 and not conflict:
                item.update(parent_source_record_id=matches[0]['record_id'],affiliation_state='source_matched',
                            source_note='공식 출처에 운영 주체 명시. 단일 본부 후보와 대조함. 담당 권한·현재 운영 및 가입 여부는 중앙 확인 필요.')
            else:
                item['source_note']=('두 CBCK 자료의 운영기관 표기가 달라 검토 필요.' if conflict else
                    '운영기관 후보가 여러 관구/수도원에 걸쳐 검토 필요.' if len(matches)>1 else
                    '공식 운영기관은 확인되나 일치하는 본부 후보가 없어 검토 필요.' if owner else
                    '책임 운영기관 명시 없음. 소속 교구를 운영기관으로 추정하지 않음.')
        reviews.append(item)
    (OUT/'directory_review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2))
    summary=dict(unique_directory_records=len(unique),classification_rows=len(rows),
        repeated_head_classification_rows=len(rows)-len(unique),institution_candidates=len(orgs),facility_candidates=len(houses),
        headquarters_groups_requiring_review=sum(len(v)>1 for v in groups.values()),
        facility_source_links=sum(r['affiliation_state']=='source_matched' for r in reviews),
        facilities_requiring_review=sum(r['source_record_id'].startswith('retreat_house:') and r['affiliation_state']=='unverified' for r in reviews),
        source_checked_on=today,live_accounts_created=0,database_modified=False)
    (OUT/'review_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__': main()
