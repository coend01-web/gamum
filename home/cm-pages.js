/* 미리보기: 웹툰·게시판·로그인·수도회 화면. 실제 데이터 연결 전 화면 틀입니다. */
(function () {
  var note = '<p class="cm-preview-note">화면 미리보기입니다. 아래 글과 이름은 모두 예시이며 실제 자료가 아닙니다.</p>';
  function safe(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function back() { return '<a class="back-link" href="#home">← 가뭄으로 돌아가기</a>'; }

  var posts = [
      ['피정 후기', '첫 침묵 피정을 다녀왔어요 (예시 글)', '머뭄이', '19:00', 12, 3, 4],
      ['질문', '부부 피정은 보통 며칠 일정인가요? (예시 글)', '요셉', '18:44', 32, 0, 2],
      ['기도 지향', '수험생 아들을 위해 함께 기도해 주세요 (예시 글)', '모니카', '18:41', 27, 5, 6],
      ['정보', '묵주기도 각 단에 맞춘 성경 구절 정리 (예시 글)', '말씀지기', '18:27', 30, 2, 2],
      ['묵상·필사', '오늘 복음 필사 나눕니다 (예시 글)', '루치아', '17:32', 19, 1, 0],
      ['자유', '처음 가입했어요, 잘 부탁드립니다 (예시 글)', '안드레아', '17:05', 31, 0, 1]
    ];
  function board() {
    var cats = ['전체', '공지', '자유', '피정 후기', '질문', '기도 지향', '묵상·필사', '정보'];

    return back() +
      '<section class="cm-page-head"><h1>게시판</h1><p>피정 이야기와 기도 지향을 함께 나누는 곳입니다.</p></section>' + note +
      '<div class="cm-board-tabs" role="tablist"><button role="tab" aria-selected="true">전체</button><button role="tab" aria-selected="false">인기글</button><button role="tab" aria-selected="false">공지</button><label class="cm-board-count"><select aria-label="한 화면 글 수"><option>30개</option><option>50개</option></select></label></div>' +
      '<div class="cm-board-cats">' + cats.map(function (c, i) { return '<button aria-pressed="' + (i === 0) + '">' + c + '</button>'; }).join('') + '</div>' +
      '<ul class="cm-board-list">' +
      '<li class="cm-notice"><span class="cm-badge">공지</span><a href="#post/0">게시판 이용 안내와 지켜 주실 약속</a><span class="cm-cmt">3</span></li>' +
      posts.map(function (p, n) {
        return '<li><a href="#post/' + (n + 1) + '" class="cm-post"><strong>' + p[1] + '</strong><span class="cm-meta">' + p[0] + '<i></i>' + p[2] + '<i></i>' + p[3] + '<i></i>조회 ' + p[4] + '<i></i>추천 ' + p[5] + '</span></a><span class="cm-cmt" aria-label="댓글 ' + p[6] + '개">' + p[6] + '</span></li>';
      }).join('') + '</ul>' +
      '<a class="cm-write" href="#login" aria-label="글쓰기"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23l1.2-5L18 6.2l3.8 3.8L10 21.8z"/><path d="M15.5 8.7l3.8 3.8"/></svg></a>';
  }

  var kinds = [['webtoon', '웹툰'], ['novel', '웹소설'], ['video', '영상'], ['essay', '묵상글'], ['audio', '오디오']];
  function contents() {
    var parts = location.hash.slice(1).split('/'), kind = parts[1] || 'webtoon';
    if (parts[2]) return contentView(kind, parts[2]);
    var tabs = '<div class="cm-board-cats cm-kind-tabs">' + kinds.map(function (k) { return '<a href="#contents/' + k[0] + '" aria-current="' + (k[0] === kind ? 'page' : 'false') + '">' + k[1] + '</a>'; }).join('') + '</div>';
    var head = back() + '<section class="cm-page-head"><h1>콘텐츠</h1><p>말씀과 신앙 이야기를 웹툰·웹소설·영상·글로 만납니다.</p></section>' + note + tabs;
    var name = kinds.filter(function (k) { return k[0] === kind; })[0][1];
    if (kind === 'webtoon') {
      return head +
        '<div class="cm-pills"><button aria-pressed="true">작가별</button><button aria-pressed="false">성경별</button><button aria-pressed="false">저작권 안내</button><button aria-pressed="false">연재 문의</button></div>' +
        '<div class="cm-sort"><button aria-pressed="true">✓ 업데이트순</button><span aria-hidden="true">|</span><button aria-pressed="false">가나다순</button></div>' +
        '<div class="cm-authors">' + [1, 2, 3, 4, 5].map(function (i) { return '<a href="#contents/webtoon/' + i + '" class="cm-author"><span class="cm-avatar">' + (i < 4 ? '<i class="cm-new" aria-label="새 회차"></i>' : '') + '그림</span>[작가 이름]</a>'; }).join('') + '</div>' +
        '<a class="cm-episode" href="#contents/webtoon/1"><span class="cm-ref">루카 14,16-24</span><div class="cm-episode-art">웹툰 이미지 자리</div><h2>[웹툰 제목] · 큰 잔치의 비유</h2><p>[작가 이름] · 최신 회차</p></a>';
    }
    var rows = [1, 2, 3, 4, 5].map(function (i) {
      var sub = { novel: '[작가 이름] · 연재 중 · [n]화', video: '[채널 이름] · [n]분', essay: '[글쓴이] · [날짜]', audio: '[진행자] · [n]분' }[kind];
      return '<li><a class="cm-ct-row" href="#contents/' + kind + '/' + i + '"><span class="cm-ct-thumb cm-ct-' + kind + '" aria-hidden="true">' + name + '</span><span class="cm-cvl-body"><strong>[' + name + ' 제목 ' + i + ']</strong><span class="cm-cvl-line">[한 줄 소개]</span><span class="cm-meta">' + sub + '</span></span></a></li>';
    }).join('');
    return head + '<div class="cm-sort"><button aria-pressed="true">✓ 업데이트순</button><span aria-hidden="true">|</span><button aria-pressed="false">인기순</button></div><ul class="cm-cvl cm-ct-list">' + rows + '</ul>';
  }
  function contentView(kind, id) {
    var name = (kinds.filter(function (k) { return k[0] === kind; })[0] || kinds[0])[1];
    var body = {
      webtoon: '<div class="cm-viewer">' + [1, 2, 3].map(function (i) { return '<div class="cm-viewer-cut">웹툰 ' + i + '컷 이미지 자리</div>'; }).join('') + '</div>',
      novel: '<div class="cm-reader"><p>[웹소설 본문이 들어갑니다. 읽기 편하도록 글자를 크게, 줄 간격을 넉넉하게 둡니다.]</p><p>[다음 문단]</p></div>',
      video: '<div class="cm-video" aria-hidden="true">영상 재생 자리 (유튜브 연결)</div>',
      essay: '<div class="cm-reader"><p>[묵상글 본문이 들어갑니다.]</p></div>',
      audio: '<div class="cm-video cm-audio" aria-hidden="true">오디오 재생 자리</div>'
    }[kind] || '';
    var n = Number(id) || 1;
    return '<a class="back-link" href="#contents/' + kind + '">← ' + name + ' 목록으로</a>' + note +
      '<article class="cm-read"><span class="cm-cv-kind">' + name + '</span><h1>[' + name + ' 제목 ' + n + ']</h1><p class="cm-meta">[작가 이름]<i></i>[날짜]<i></i>조회 [n]</p>' + body +
      '<nav class="cm-prevnext" aria-label="이전·다음"><a href="#contents/' + kind + '/' + Math.max(1, n - 1) + '">← 이전 화</a><a href="#contents/' + kind + '">목록</a><a href="#contents/' + kind + '/' + (n + 1) + '">다음 화 →</a></nav></article>';
  }

  function login() {
    return back() +
      '<section class="cm-page-head"><h1>로그인</h1><p>로그인하면 담아 둔 피정과 글이 다른 기기에서도 이어집니다.</p></section>' + note +
      '<div class="cm-login"><a class="cm-sso kakao" href="#login">카카오로 시작하기</a><a class="cm-sso naver" href="#login">네이버로 시작하기</a><a class="cm-sso" href="#login">이메일로 로그인</a>' +
      '<p class="cm-login-sub">수도회·피정의 집 담당자이신가요? <a href="../legacy.html#convent-register">기관 번호로 로그인</a></p></div>';
  }

  function convents() {
    var data = window.CM_CONVENTS || [];
    var kinds = [['all', '전체'], ['m', '남자 수도회'], ['f', '여자 수도회']];
    var ig = '<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="4" width="20" height="20" rx="6"/><circle cx="14" cy="14" r="4.6"/><circle cx="19.6" cy="8.4" r="1.1" class="dot"/></svg>';
    var rows = data.map(function (r) {
      var name = safe(r.n), hay = safe((r.n + ' ' + (r.e || '') + ' ' + (r.r || '') + ' ' + (r.d || '')).toLowerCase());
      var meta = (r.s === 'm' ? '남자 수도회' : '여자 수도회') + (r.r ? '<i></i>' + safe(r.r) : '') + (r.c ? '<i></i>국내 공동체 ' + r.c + '곳' : '');
      var main = r.h
        ? '<a class="cm-cvl-main" href="' + safe(r.h) + '" target="_blank" rel="noopener noreferrer" aria-label="' + name + ' 홈페이지 (새 창)">'
        : '<span class="cm-cvl-main cm-cvl-nolink">';
      return '<li data-s="' + r.s + '" data-q="' + hay + '">' + main +
        '<span class="cm-cvl-body"><strong>' + name + '</strong><span class="cm-meta">' + meta + '</span></span>' +
        '<span class="cm-cvl-go">' + (r.h ? '홈페이지 ↗' : '홈페이지 없음') + '</span>' + (r.h ? '</a>' : '</span>') +
        (r.i ? '<a class="cm-cvl-ig" href="' + safe(r.i) + '" target="_blank" rel="noopener noreferrer" aria-label="' + name + ' 인스타그램 (새 창)">' + ig + '</a>' : '') + '</li>';
    }).join('');
    return back() +
      '<section class="cm-page-head"><h1>수도회 소개</h1><p>한국 천주교 주교회의 주소록에 오른 남자·여자 수도회와 선교회입니다. 이름을 누르면 각 공동체의 공식 홈페이지가 새 창으로 열립니다.</p></section>' +
      '<div class="cm-pills" data-cv-kinds>' + kinds.map(function (k, i) { return '<button type="button" data-k="' + k[0] + '" aria-pressed="' + (i === 0) + '">' + k[1] + '</button>'; }).join('') + '</div>' +
      '<label class="cm-cv-search">수도회 이름이나 지역으로 찾기<input type="search" data-cv-q placeholder="예: 베네딕도, 수원, 가르멜"></label>' +
      '<p class="cm-cv-count" data-cv-count>' + data.length + '곳</p>' +
      '<ul class="cm-cvl">' + rows + '</ul>' +
      '<p class="cm-cv-none" data-cv-none hidden>찾는 수도회가 없습니다. 다른 이름으로 검색해 보세요.</p>' +
      '<p class="cm-c-foot">출처: 한국 천주교 주교회의 온라인 주소록(' + (window.CM_CONVENTS_DATE || '') + ' 확인). 홈페이지 주소가 바뀌었거나 빠진 곳은 게시판으로 알려 주세요.</p>';
  }

  function cvFilter() {
    var on = document.querySelector('[data-cv-kinds] [aria-pressed="true"]');
    var k = on ? on.getAttribute('data-k') : 'all';
    var qi = document.querySelector('[data-cv-q]');
    var words = (qi ? qi.value : '').toLowerCase().split(/\s+/).filter(Boolean);
    var n = 0;
    document.querySelectorAll('.cm-cvl li').forEach(function (li) {
      var q = li.getAttribute('data-q');
      var ok = (k === 'all' || li.getAttribute('data-s') === k) && words.every(function (w) { return q.indexOf(w) > -1; });
      li.hidden = !ok; if (ok) n++;
    });
    var c = document.querySelector('[data-cv-count]'); if (c) c.textContent = n + '곳';
    var none = document.querySelector('[data-cv-none]'); if (none) none.hidden = n > 0;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-cv-kinds] button');
    if (!b) return;
    b.parentNode.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    cvFilter();
  });
  document.addEventListener('input', function (e) { if (e.target.matches && e.target.matches('[data-cv-q]')) cvFilter(); });

  function post() {
    var n = Number(location.hash.split('/')[1]) || 0;
    var p = n === 0 ? ['공지', '게시판 이용 안내와 지켜 주실 약속', '운영자', '[날짜]', 0, 0, 3] : (posts[n - 1] || posts[0]);
    return '<a class="back-link" href="#board">← 게시판 목록으로</a>' + note +
      '<article class="cm-read"><span class="cm-cv-kind">' + p[0] + '</span><h1>' + p[1] + '</h1>' +
      '<p class="cm-meta">' + p[2] + '<i></i>' + p[3] + '<i></i>조회 ' + p[4] + '<i></i>추천 ' + p[5] + '</p>' +
      '<div class="cm-reader"><p>[글 본문이 들어갑니다. 사진도 함께 올릴 수 있습니다.]</p></div>' +
      '<div class="cm-like"><button type="button">추천 ' + p[5] + '</button><button type="button">신고</button></div>' +
      '<section class="cm-comments"><h2>댓글 ' + p[6] + '</h2><ul><li><b>[닉네임]</b><p>[댓글 예시]</p><span class="cm-meta">[시간]</span></li><li><b>[닉네임]</b><p>[댓글 예시]</p><span class="cm-meta">[시간]</span></li></ul>' +
      '<a class="cm-sso" href="#login">로그인하고 댓글 쓰기</a></section>' +
      '<nav class="cm-prevnext" aria-label="이전·다음 글"><a href="#post/' + Math.max(1, n - 1) + '">← 이전 글</a><a href="#board">목록</a><a href="#post/' + Math.min(posts.length, n + 1) + '">다음 글 →</a></nav></article>';
  }

  // 교구 홈페이지: 한국천주교주교회의 온라인 주소록, 각 교구 누리집, Catholic-Hierarchy 등에서 확인한 공식 주소.
  var dioceses = [
    ['seoul', '서울대교구', '서울', 'capital', 'https://www.catholic.or.kr'],
    ['incheon', '인천교구', '인천·경기 서부', 'capital', 'https://www.caincheon.or.kr'],
    ['suwon', '수원교구', '경기 남부', 'capital', 'https://www.casuwon.or.kr'],
    ['uijeongbu', '의정부교구', '경기 북부', 'capital', 'https://www.ucatholic.or.kr'],
    ['chuncheon', '춘천교구', '강원', 'gangwon', 'https://www.cccatholic.or.kr'],
    ['wonju', '원주교구', '강원', 'gangwon', 'https://www.wjcatholic.or.kr'],
    ['daejeon', '대전교구', '대전·세종·충남', 'chung', 'https://www.djcatholic.or.kr'],
    ['cheongju', '청주교구', '충북', 'chung', 'https://www.cdcj.or.kr'],
    ['daegu', '대구대교구', '대구·경북', 'gyeong', 'https://www.daegu-archdiocese.or.kr'],
    ['andong', '안동교구', '경북 북부', 'gyeong', 'https://www.acatholic.or.kr'],
    ['busan', '부산교구', '부산·울산·경남 일부', 'gyeong', 'https://www.catholicbusan.or.kr'],
    ['masan', '마산교구', '경남', 'gyeong', 'http://www.cathms.or.kr'],
    ['gwangju', '광주대교구', '광주·전남', 'jeolla', 'https://www.gjcatholic.or.kr'],
    ['jeonju', '전주교구', '전북', 'jeolla', 'https://www.jcatholic.or.kr'],
    ['jeju', '제주교구', '제주', 'jeju', 'https://www.diocesejeju.or.kr'],
    ['military', '군종교구', '군인과 가족', 'military', 'https://www.gunjong.or.kr']
  ];
  var dioRegions = [['all', '전체'], ['capital', '서울·경기·인천'], ['gangwon', '강원'], ['chung', '충청'], ['gyeong', '경상'], ['jeolla', '전라'], ['jeju', '제주'], ['military', '군종']];
  function diocesesPage() {
    var r = location.hash.slice(1).split('/')[1] || 'all';
    var list = dioceses.filter(function (d) { return r === 'all' || d[3] === r; });
    var groups = dioRegions.slice(1).filter(function (g) { return list.some(function (d) { return d[3] === g[0]; }); });
    return back() +
      '<section class="cm-page-head"><h1>교구</h1><p>전국 16개 교구입니다. 누르면 각 교구의 공식 홈페이지로 이동합니다.</p></section>' +
      '<div class="cm-board-cats cm-kind-tabs">' + dioRegions.map(function (g) { return '<a href="#dioceses/' + g[0] + '" aria-current="' + (g[0] === r ? 'page' : 'false') + '">' + g[1] + '</a>'; }).join('') + '</div>' +
      groups.map(function (g) {
        return '<section class="cm-dio-group"><h2>' + g[1] + '</h2><div class="cm-dio-grid">' +
          list.filter(function (d) { return d[3] === g[0]; }).map(function (d) {
            var inner = '<span class="cm-dio-mark" aria-hidden="true">' + d[1].charAt(0) + '</span><span class="cm-dio-body"><strong>' + d[1] + '</strong><span>' + d[2] + '</span></span>';
            return d[4]
              ? '<a class="cm-dio" href="' + d[4] + '" target="_blank" rel="noopener noreferrer" aria-label="' + d[1] + ' 홈페이지 (새 창)">' + inner + '<span class="cm-dio-go">홈페이지 ↗</span></a>'
              : '<div class="cm-dio cm-dio-off">' + inner + '<span class="cm-dio-go">주소 확인 중</span></div>';
          }).join('') + '</div></section>';
      }).join('') +
      '<p class="cm-c-foot">교구 홈페이지 주소는 한국천주교주교회의 온라인 주소록과 각 교구 공식 자료로 확인했습니다.</p>';
  }

  window.CM_PAGES = { dioceses: diocesesPage, board: board, post: post, contents: contents, webtoon: function () { location.replace('#contents/webtoon'); return ''; }, login: login, convents: convents };

  function mark() {
    var page = location.hash.slice(1).split('/')[0] || 'home';
    var map = { search: 'paths', post: 'board', webtoon: 'contents', themes: 'paths', calendar: 'paths', places: 'paths', discover: 'paths', retreat: 'paths', 'quiz-result': 'paths' };
    var key = map[page] || page;
    document.querySelectorAll('.cm-menubar a').forEach(function (a) {
      if (a.getAttribute('data-cm') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cm-search-toggle]'); if (!t) return;
    var bar = document.getElementById('cm-searchbar'), open = bar.hidden;
    bar.hidden = !open; t.setAttribute('aria-expanded', String(open));
    if (open) bar.querySelector('input').focus();
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-cm-search]'); if (!f) return;
    e.preventDefault();
    var q = (f.querySelector('input[name=q]').value || '').trim(); if (!q) return;
    var bar = document.getElementById('cm-searchbar'); bar.hidden = true;
    var tg = document.querySelector('[data-cm-search-toggle]'); if (tg) tg.setAttribute('aria-expanded', 'false');
    location.hash = '#search/' + encodeURIComponent(q);
  });
  window.addEventListener('hashchange', mark);
  document.addEventListener('DOMContentLoaded', mark);
})();
