/* 미리보기: 웹툰·게시판·로그인·수도회 화면. 실제 데이터 연결 전 화면 틀입니다. */
(function () {
  var note = '<p class="cm-preview-note">화면 미리보기입니다. 아래 글과 이름은 모두 예시이며 실제 자료가 아닙니다.</p>';
  function back() { return '<a class="back-link" href="#home">← 가뭄으로 돌아가기</a>'; }

  function board() {
    var cats = ['전체', '공지', '자유', '피정 후기', '질문', '기도 지향', '묵상·필사', '정보'];
    var posts = [
      ['피정 후기', '첫 침묵 피정을 다녀왔어요 (예시 글)', '머뭄이', '19:00', 12, 3, 4],
      ['질문', '부부 피정은 보통 며칠 일정인가요? (예시 글)', '요셉', '18:44', 32, 0, 2],
      ['기도 지향', '수험생 아들을 위해 함께 기도해 주세요 (예시 글)', '모니카', '18:41', 27, 5, 6],
      ['정보', '묵주기도 각 단에 맞춘 성경 구절 정리 (예시 글)', '말씀지기', '18:27', 30, 2, 2],
      ['묵상·필사', '오늘 복음 필사 나눕니다 (예시 글)', '루치아', '17:32', 19, 1, 0],
      ['자유', '처음 가입했어요, 잘 부탁드립니다 (예시 글)', '안드레아', '17:05', 31, 0, 1]
    ];
    return back() +
      '<section class="cm-page-head"><h1>게시판</h1><p>피정 이야기와 기도 지향을 함께 나누는 곳입니다.</p></section>' + note +
      '<div class="cm-board-tabs" role="tablist"><button role="tab" aria-selected="true">전체</button><button role="tab" aria-selected="false">인기글</button><button role="tab" aria-selected="false">공지</button><label class="cm-board-count"><select aria-label="한 화면 글 수"><option>30개</option><option>50개</option></select></label></div>' +
      '<div class="cm-board-cats">' + cats.map(function (c, i) { return '<button aria-pressed="' + (i === 0) + '">' + c + '</button>'; }).join('') + '</div>' +
      '<ul class="cm-board-list">' +
      '<li class="cm-notice"><span class="cm-badge">공지</span><a href="#board">게시판 이용 안내와 지켜 주실 약속</a><span class="cm-cmt">3</span></li>' +
      posts.map(function (p) {
        return '<li><a href="#board" class="cm-post"><strong>' + p[1] + '</strong><span class="cm-meta">' + p[0] + '<i></i>' + p[2] + '<i></i>' + p[3] + '<i></i>조회 ' + p[4] + '<i></i>추천 ' + p[5] + '</span></a><span class="cm-cmt" aria-label="댓글 ' + p[6] + '개">' + p[6] + '</span></li>';
      }).join('') + '</ul>' +
      '<a class="cm-write" href="#login" aria-label="글쓰기"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23l1.2-5L18 6.2l3.8 3.8L10 21.8z"/><path d="M15.5 8.7l3.8 3.8"/></svg></a>';
  }

  function webtoon() {
    var authors = ['[작가 이름]', '[작가 이름]', '[작가 이름]', '[작가 이름]', '[작가 이름]'];
    return back() +
      '<section class="cm-page-head"><h1>웹툰</h1><p>말씀과 신앙 이야기를 그림으로 만납니다.</p></section>' + note +
      '<div class="cm-pills"><button aria-pressed="true">작가별</button><button aria-pressed="false">성경별</button><button aria-pressed="false">저작권 안내</button><button aria-pressed="false">연재 문의</button></div>' +
      '<div class="cm-sort"><button aria-pressed="true">✓ 업데이트순</button><span aria-hidden="true">|</span><button aria-pressed="false">가나다순</button></div>' +
      '<div class="cm-authors">' + authors.map(function (a, i) { return '<a href="#webtoon" class="cm-author"><span class="cm-avatar">' + (i < 3 ? '<i class="cm-new" aria-label="새 회차"></i>' : '') + '그림</span>' + a + '</a>'; }).join('') + '</div>' +
      '<article class="cm-episode"><span class="cm-ref">루카 14,16-24</span><div class="cm-episode-art">웹툰 이미지 자리</div><h2>[웹툰 제목] · 큰 잔치의 비유</h2><p>[작가 이름] · 최신 회차</p></article>';
  }

  function login() {
    return back() +
      '<section class="cm-page-head"><h1>로그인</h1><p>로그인하면 담아 둔 피정과 글이 다른 기기에서도 이어집니다.</p></section>' + note +
      '<div class="cm-login"><a class="cm-sso kakao" href="#login">카카오로 시작하기</a><a class="cm-sso naver" href="#login">네이버로 시작하기</a><a class="cm-sso" href="#login">이메일로 로그인</a>' +
      '<p class="cm-login-sub">수도회·피정의 집 담당자이신가요? <a href="../legacy.html#convent-register">기관 번호로 로그인</a></p></div>';
  }

  function convents() {
    var kinds = ['전체', '남자 수도회', '여자 수도회', '피정의 집', '재속회'];
    var ig = '<svg viewBox="0 0 28 28" aria-hidden="true"><rect x="4" y="4" width="20" height="20" rx="6"/><circle cx="14" cy="14" r="4.6"/><circle cx="19.6" cy="8.4" r="1.1" class="dot"/></svg>';
    var rows = [['[수도회 이름]', '남자 수도회'], ['[수녀회 이름]', '여자 수도회'], ['[피정의 집 이름]', '피정의 집'], ['[수도원 이름]', '남자 수도회'], ['[수녀회 이름]', '여자 수도회'], ['[재속회 이름]', '재속회']];
    return back() +
      '<section class="cm-page-head"><h1>수도회 소개</h1><p>피정을 여는 수도회와 피정의 집입니다. 누르면 각 공동체의 공식 홈페이지로 이동합니다.</p></section>' + note +
      '<div class="cm-pills">' + kinds.map(function (k, i) { return '<button aria-pressed="' + (i === 0) + '">' + k + '</button>'; }).join('') + '</div>' +
      '<label class="cm-cv-search">공동체 이름이나 지역으로 찾기<input type="search" placeholder="예: 수원, 베네딕도"></label>' +
      '<ul class="cm-cvl">' + rows.map(function (r) {
        return '<li><a class="cm-cvl-main" href="#convents" target="_blank" rel="noopener noreferrer" aria-label="' + r[0] + ' 공식 홈페이지 (새 창)">' +
          '<span class="cm-cvl-thumb" aria-hidden="true">사진</span>' +
          '<span class="cm-cvl-body"><strong>' + r[0] + '</strong><span class="cm-cvl-line">[한 줄 소개: 공동체의 영성이나 사도직]</span><span class="cm-meta">' + r[1] + '<i></i>[지역]<i></i>피정 [n]개</span></span>' +
          '<span class="cm-cvl-go">홈페이지 ↗</span></a>' +
          '<a class="cm-cvl-ig" href="#convents" target="_blank" rel="noopener noreferrer" aria-label="' + r[0] + ' 인스타그램 (새 창)">' + ig + '</a></li>';
      }).join('') + '</ul>' +
      '<p class="cm-c-foot">각 공동체의 공식 홈페이지와 인스타그램으로 연결됩니다. 연결 주소는 수도회가 기관 운영실에서 직접 등록합니다.</p>';
  }

  window.CM_PAGES = { board: board, webtoon: webtoon, login: login, convents: convents };

  function mark() {
    var page = location.hash.slice(1).split('/')[0] || 'home';
    var map = { themes: 'paths', calendar: 'paths', places: 'paths', discover: 'paths', retreat: 'paths', 'quiz-result': 'paths' };
    var key = map[page] || page;
    document.querySelectorAll('.cm-menubar a').forEach(function (a) {
      if (a.getAttribute('data-cm') === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', mark);
  document.addEventListener('DOMContentLoaded', mark);
})();
