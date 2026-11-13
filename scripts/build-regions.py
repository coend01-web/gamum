"""Compile the official current legal-area download. No institution data is inferred."""
import csv,json,sys
from pathlib import Path
rows=[(c,n) for c,n,s in list(csv.reader(Path(sys.argv[1]).read_text().splitlines(),delimiter='\t'))[1:] if s=='존재']
parents={n:c for c,n in rows if len(n.split())==1}
short={'서울특별시':'서울','경기도':'경기','인천광역시':'인천','강원특별자치도':'강원','충청북도':'충북','충청남도':'충남','대전광역시':'대전','세종특별자치시':'세종','전북특별자치도':'전북','전남광주통합특별시':'전남·광주','경상북도':'경북','대구광역시':'대구','경상남도':'경남','부산광역시':'부산','울산광역시':'울산','제주특별자치도':'제주'}
old={'강원':['강원도'],'전북':['전라북도'],'전남·광주':['전남','광주','전라남도','광주광역시']}
areas=[]
for name,code in parents.items():
 label=short[name];children=[]
 candidates=[(c,n) for c,n in rows if n.startswith(name+' ') and (c.endswith('00000') or name=='세종특별자치시' and len(n.split())==2)]
 names={n:c for c,n in candidates}
 for c,n in candidates:
  tokens=n.split();parent=names.get(' '.join(tokens[:-1]),code)
  children.append({'id':c,'name':' '.join(tokens[1:]),'label':tokens[-1],'parent':parent})
 areas.append({'id':code,'name':name,'label':label,'aliases':list(dict.fromkeys([name,label]+old.get(label,[]))),'children':children})
order=list(short.values());areas.sort(key=lambda a:order.index(a['label']))
Path('home/regions.json').write_text(json.dumps({'source':'https://www.code.go.kr/stdcode/regCodeL.do','download':'https://www.code.go.kr/etc/codeFullDown.do','checkedAt':'2026-11-13','definition':'현존 법정동 코드: 시도 → 시군구(세종은 읍면동). 일반구는 시 아래에 표시.','regions':areas},ensure_ascii=False,indent=2)+'\n')
print(len(areas),'provinces;',sum(len(x['children']) for x in areas),'district/city nodes')
