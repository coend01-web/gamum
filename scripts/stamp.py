#!/usr/bin/env python3
"""배포 전에 실행: 화면 파일 주소에 버전 표시(?v=...)를 붙여, 배포하면 새로고침 없이 새 파일이 열리게 합니다.

사용법: python3 scripts/stamp.py            (현재 시각으로 버전 표시)
        python3 scripts/stamp.py 20261116a  (버전 직접 지정)
"""
import re
import sys
import time
from pathlib import Path

root = Path(__file__).resolve().parent.parent
v = sys.argv[1] if len(sys.argv) > 1 else time.strftime('%Y%m%d%H%M')


def tag(url: str) -> str:
    base = re.sub(r'\?v=[\w.-]+$', '', url)
    return f'{base}?v={v}'


# 1) home/index.html: 같은 사이트 안의 css·js 파일
index = root / 'home' / 'index.html'
html = index.read_text(encoding='utf-8')
html = re.sub(
    r'((?:href|src)=")((?!https?:|//|#|data:)[^"]+\.(?:css|js))(\?v=[\w.-]+)?(")',
    lambda m: m.group(1) + tag(m.group(2)) + m.group(4),
    html,
)
index.write_text(html, encoding='utf-8')

# 2) home/app.js: 모듈 가져오기와 데이터 파일
app = root / 'home' / 'app.js'
js = app.read_text(encoding='utf-8')
js = re.sub(r"(from ')(\./[\w.-]+\.js)(\?v=[\w.-]+)?(')", lambda m: m.group(1) + tag(m.group(2)) + m.group(4), js)
js = re.sub(r"(fetch\(')([\w./-]+\.json)(\?v=[\w.-]+)?(')", lambda m: m.group(1) + tag(m.group(2)) + m.group(4), js)
app.write_text(js, encoding='utf-8')

print('version', v)
