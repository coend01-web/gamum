/* 가뭄 회원(아이디+비밀번호)·피정담기 동기화·게시판. Supabase 함수(rpc)로만 통신합니다. */
(function () {
  var URL_ = 'https://qzxdxqrdulkfoktkmkly.supabase.co';
  var KEY = 'sb_publishable__Gjo9F1m0TXdxPH_yMEBiA_b91a2xBr';
  var TK = 'camum-token', MK = 'camum-member', SHELF = 'camum-design-shelf';
  var CATS = ['공지', '자유', '피정 후기', '질문', '기도 지향', '묵상·필사', '정보'];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function safe(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function token() { return ls(TK) || null; }
  function me() { try { return JSON.parse(ls(MK) || 'null'); } catch (e) { return null; } }
  function rpc(fn, args) {
    return fetch(URL_ + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var d = t ? JSON.parse(t) : null; if (!r.ok) throw new Error((d && d.message) || '잠시 후 다시 시도해 주세요.'); return d; }); });
  }
  function when(d) {
    var t = new Date(d), n = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    return t.toDateString() === n.toDateString() ? p(t.getHours()) + ':' + p(t.getMinutes()) : (t.getFullYear() !== n.getFullYear() ? t.getFullYear() + '.' : '') + p(t.getMonth() + 1) + '.' + p(t.getDate());
  }
  function para(s) { return safe(s).split(/\n{2,}/).map(function (b) { return '<p>' + b.replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  function back(h, t) { return '<a class="back-link" href="' + (h || '#home') + '">← ' + (t || '가뭄으로 돌아가기') + '</a>'; }
  function head(t, s) { return '<section class="cm-page-head"><h1>' + t + '</h1>' + (s ? '<p>' + s + '</p>' : '') + '</section>'; }
  function slot(id) { return '<div id="' + id + '" class="cm-async" aria-live="polite"><p class="cm-loading">불러오는 중…</p></div>'; }
  function fill(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function fail(id) { return function (e) { fill(id, '<p class="cm-error">' + safe(e.message) + '</p>'); }; }
  function hdr() {
    var m = me(), a = document.querySelector('.cm-tool[href="#login"], .cm-tool[href="#me"]');
    if (!a) return;
    a.setAttribute('href', m ? '#me' : '#login');
    a.setAttribute('aria-label', m ? '내 정보 (' + m.nickname + ')' : '로그인');
    a.classList.toggle('cm-in', !!m);
  }
  function setSession(d) { ls(TK, d.token); ls(MK, JSON.stringify(d.member)); hdr(); }
  function clearSession() { ls(TK, null); ls(MK, null); hdr(); }

  /* 피정담기: 로그인하면 이 기기의 서랍과 계정 서랍을 합치고, 바뀔 때마다 계정에 반영 */
  function shelf() { try { var v = JSON.parse(ls(SHELF) || 'null'); return v && Array.isArray(v.programs) && Array.isArray(v.spaces) ? v : { programs: [], spaces: [] }; } catch (e) { return { programs: [], spaces: [] }; } }
  function flat(s) { return s.programs.map(function (x) { return 'p:' + x; }).concat(s.spaces.map(function (x) { return 's:' + x; })); }
  function unflat(a) { return { programs: a.filter(function (x) { return x.indexOf('p:') === 0; }).map(function (x) { return x.slice(2); }), spaces: a.filter(function (x) { return x.indexOf('s:') === 0; }).map(function (x) { return x.slice(2); }) }; }
  var synced = null;
  function syncShelf(reload) {
    if (!token()) return Promise.resolve();
    return rpc('cm_saved_merge', { p_token: token(), p_items: flat(shelf()) }).then(function (list) {
      var before = JSON.stringify(flat(shelf()).sort());
      ls(SHELF, JSON.stringify(unflat(list))); synced = list.slice();
      if (reload && before !== JSON.stringify(list.slice().sort())) location.reload();
    }).catch(function (e) { if (/로그인/.test(e.message)) clearSession(); });
  }
  function pushShelf() {
    if (!token() || !synced) return;
    var now = flat(shelf()), add = now.filter(function (x) { return synced.indexOf(x) < 0; }), del = synced.filter(function (x) { return now.indexOf(x) < 0; });
    synced = now;
    add.forEach(function (x) { rpc('cm_saved_set', { p_token: token(), p_item: x, p_on: true }).catch(function () {}); });
    del.forEach(function (x) { rpc('cm_saved_set', { p_token: token(), p_item: x, p_on: false }).catch(function () {}); });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-save],[data-save-space],[data-remove-space]')) setTimeout(pushShelf, 50);
  });

  /* 로그인·가입·복구 */
  function loginPage() {
    if (me()) { location.replace('#me'); return ''; }
    var tab = location.hash.split('/')[1] || 'in';
    var tabs = '<div class="cm-board-cats cm-kind-tabs">' + [['in', '로그인'], ['join', '가입하기'], ['find', '비밀번호 찾기']].map(function (t) { return '<a href="#login/' + t[0] + '" aria-current="' + (t[0] === tab ? 'page' : 'false') + '">' + t[1] + '</a>'; }).join('') + '</div>';
    var f = {
      'in': '<form class="cm-form" data-auth="in"><label>아이디<input name="u" autocomplete="username" required></label><label>비밀번호<input name="p" type="password" autocomplete="current-password" required></label><button class="cm-btn" type="submit">로그인</button></form>',
      join: '<form class="cm-form" data-auth="join"><p class="cm-form-note">이름·전화번호·이메일은 받지 않습니다. 아이디와 비밀번호, 닉네임만 정해 주세요.</p><label>아이디<input name="u" autocomplete="username" required pattern="[a-z0-9_]{4,20}" placeholder="영문 소문자·숫자 4~20자"></label><label>비밀번호<input name="p" type="password" autocomplete="new-password" required minlength="6" placeholder="6자 이상"></label><label>닉네임<input name="n" required minlength="2" maxlength="12" placeholder="게시판에 보이는 이름"></label><label class="cm-check"><input type="checkbox" name="agree" required> <span><a href="#privacy" target="_blank">개인정보 처리방침</a>과 <a href="#terms" target="_blank">이용약관</a>에 동의합니다.</span></label><button class="cm-btn" type="submit">가입하기</button></form>',
      find: '<form class="cm-form" data-auth="find"><p class="cm-form-note">가입할 때 받은 복구 코드로 비밀번호를 새로 정합니다. 복구 코드가 없으면 게시판 공지의 안내에 따라 관리자에게 문의해 주세요.</p><label>아이디<input name="u" autocomplete="username" required></label><label>복구 코드<input name="r" required placeholder="예: 7K2M-9QXP" autocapitalize="characters"></label><label>새 비밀번호<input name="p" type="password" autocomplete="new-password" required minlength="6"></label><button class="cm-btn" type="submit">비밀번호 바꾸기</button></form>'
    }[tab] || '';
    return back() + head('로그인', '로그인하면 담아 둔 피정이 휴대폰과 PC에서 함께 보입니다. 로그인하지 않아도 피정 찾기와 담기는 그대로 쓸 수 있습니다.') + tabs +
      '<div class="cm-login">' + f + '<p class="cm-error" data-auth-msg hidden></p>' +
      '<p class="cm-login-sub">수도회·피정의 집 담당자이신가요? <a href="../legacy.html#convent-register">기관 번호로 로그인</a></p></div>';
  }
  function recoveryBox(code, title) {
    return back() + head(title, '') + '<div class="cm-login"><div class="cm-recovery"><p>비밀번호를 잊었을 때 쓰는 <b>복구 코드</b>입니다. 이 화면을 캡처하거나 적어 두세요. 다시 보여 드리지 않습니다.</p><strong>' + safe(code) + '</strong></div><a class="cm-btn" href="#home">확인했습니다</a></div>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-auth]'); if (!f) return;
    e.preventDefault();
    var k = f.getAttribute('data-auth'), v = function (n) { return (f.elements[n] && f.elements[n].value || '').trim(); };
    var msg = f.parentNode.querySelector('[data-auth-msg]'), btn = f.querySelector('button[type=submit]');
    btn.disabled = true; if (msg) msg.hidden = true;
    var call = k === 'in' ? rpc('cm_login', { p_username: v('u'), p_password: f.elements.p.value })
      : k === 'join' ? rpc('cm_register', { p_username: v('u'), p_password: f.elements.p.value, p_nickname: v('n') })
      : rpc('cm_recover', { p_username: v('u'), p_recovery: v('r'), p_new_password: f.elements.p.value });
    call.then(function (d) {
      setSession(d);
      var main = document.getElementById('main') || document.querySelector('main');
      return syncShelf(false).then(function () {
        if (d.recovery) { main.innerHTML = recoveryBox(d.recovery, k === 'join' ? '가입했습니다, ' + safe(d.member.nickname) + '님' : '비밀번호를 바꿨습니다'); window.scrollTo(0, 0); }
        else { location.hash = '#me'; location.reload(); }
      });
    }).catch(function (err) { btn.disabled = false; if (msg) { msg.textContent = err.message; msg.hidden = false; } });
  });

  /* 내 정보 */
  function mePage() {
    var m = me(); if (!m) { location.replace('#login'); return ''; }
    var s = shelf();
    return back() + head(safe(m.nickname) + '님', '아이디 ' + safe(m.username)) +
      '<div class="cm-login"><a class="cm-me-row" href="#shelf"><span>피정담기</span><b>' + (s.programs.length + s.spaces.length) + '개 ›</b></a>' +
      '<form class="cm-form" data-me="nick"><h2>닉네임 바꾸기</h2><label>새 닉네임<input name="n" value="' + safe(m.nickname) + '" required minlength="2" maxlength="12"></label><button class="cm-btn cm-btn-line" type="submit">바꾸기</button></form>' +
      '<form class="cm-form" data-me="pw"><h2>비밀번호 바꾸기</h2><label>지금 비밀번호<input name="o" type="password" autocomplete="current-password" required></label><label>새 비밀번호<input name="p" type="password" autocomplete="new-password" required minlength="6"></label><button class="cm-btn cm-btn-line" type="submit">바꾸기</button></form>' +
      (m.is_admin ? '<form class="cm-form" data-author-form><h2>작가 지정 (관리자)</h2><p class="cm-form-note">작가로 지정한 회원만 콘텐츠에 작품을 올릴 수 있고, 자기 작품만 고칠 수 있습니다.</p><label>회원 아이디<input name="u" required></label><div class="cm-guest-row"><button class="cm-btn" type="submit" name="on" value="1">작가로 지정</button><button class="cm-btn cm-btn-line" type="submit" name="on" value="0">작가 해제</button></div><div data-authors class="cm-form-note">작가 목록을 불러오는 중…</div></form>' : '') +
      '<p class="cm-error" data-me-msg hidden></p>' +
      '<button class="cm-btn cm-btn-line" type="button" data-logout>로그아웃</button>' +
      '<details class="cm-leave"><summary>회원 탈퇴</summary><form class="cm-form" data-me="leave"><p class="cm-form-note">탈퇴하면 계정과 계정에 담긴 피정이 바로 지워집니다. 쓴 글은 남고 닉네임만 표시됩니다.</p><label>비밀번호<input name="p" type="password" required></label><button class="cm-btn cm-btn-danger" type="submit">탈퇴하기</button></form></details></div>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-me]'); if (!f) return;
    e.preventDefault();
    var k = f.getAttribute('data-me'), msg = document.querySelector('[data-me-msg]');
    var show = function (t, ok) { msg.textContent = t; msg.hidden = false; msg.classList.toggle('cm-ok', !!ok); };
    var call = k === 'nick' ? rpc('cm_update_profile', { p_token: token(), p_nickname: f.elements.n.value, p_old_password: null, p_new_password: null })
      : k === 'pw' ? rpc('cm_update_profile', { p_token: token(), p_nickname: null, p_old_password: f.elements.o.value, p_new_password: f.elements.p.value })
      : rpc('cm_delete_account', { p_token: token(), p_password: f.elements.p.value });
    call.then(function (d) {
      if (k === 'leave') { clearSession(); location.hash = '#home'; return; }
      ls(MK, JSON.stringify(d)); hdr(); f.reset();
      if (k === 'nick') { var h = document.querySelector('.cm-page-head h1'); if (h) h.textContent = d.nickname + '님'; f.elements.n.value = d.nickname; }
      show(k === 'nick' ? '닉네임을 바꿨습니다.' : '비밀번호를 바꿨습니다.', true);
    }).catch(function (err) { show(err.message); });
  });
  document.addEventListener('click', function (e) {
    if (!(e.target.closest && e.target.closest('[data-logout]'))) return;
    rpc('cm_logout', { p_token: token() }).catch(function () {});
    clearSession(); location.hash = '#home';
  });

  function loadAuthors() {
    var box = document.querySelector('[data-authors]'); if (!box) return;
    rpc('cm_authors', { p_token: token() }).then(function (l) { box.textContent = l.length ? '지금 작가: ' + l.map(function (a) { return a.nickname + '(' + a.username + ')'; }).join(', ') : '아직 지정한 작가가 없습니다.'; }).catch(function (e) { box.textContent = e.message; });
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-author-form]'); if (!f) return;
    e.preventDefault();
    var on = e.submitter ? e.submitter.value === '1' : true, msg = document.querySelector('[data-me-msg]');
    rpc('cm_set_author', { p_token: token(), p_username: f.elements.u.value, p_on: on }).then(function (r) {
      msg.textContent = r.nickname + '(' + r.username + ') 님을 ' + (r.is_author ? '작가로 지정했습니다.' : '작가에서 해제했습니다.'); msg.hidden = false; msg.classList.add('cm-ok'); f.reset(); loadAuthors();
    }).catch(function (err) { msg.textContent = err.message; msg.hidden = false; msg.classList.remove('cm-ok'); });
  });

  /* 게시판 */
  function boardPage() {
    var parts = location.hash.slice(1).split('/'), cat = decodeURIComponent(parts[1] || ''), q = decodeURIComponent(parts[2] || ''), page = Math.max(1, Number(parts[3]) || 1);
    var catsHtml = '<div class="cm-board-cats">' + ['전체'].concat(CATS).map(function (c) {
      var on = (c === '전체' && !cat) || c === cat;
      return '<a href="#board/' + (c === '전체' ? '' : encodeURIComponent(c)) + '" aria-current="' + (on ? 'page' : 'false') + '">' + c + '</a>';
    }).join('') + '</div>';
    setTimeout(function () {
      rpc('cm_posts', { p_category: cat || null, p_q: q || null, p_page: page }).then(function (d) {
        if (!d.rows.length) return fill('cm-board', '<p class="cm-empty">' + (q ? '찾는 글이 없습니다.' : '아직 글이 없습니다. 첫 글을 남겨 주세요.') + '</p>');
        fill('cm-board', '<ul class="cm-board-list">' + d.rows.map(function (p) {
          if (p.category === '공지') return '<li class="cm-notice"><span class="cm-badge">공지</span><a href="#post/' + p.id + '">' + safe(p.title) + '</a>' + (p.ncom ? '<span class="cm-cmt">' + p.ncom + '</span>' : '') + '</li>';
          return '<li><a href="#post/' + p.id + '" class="cm-post"><strong>' + safe(p.title) + '</strong><span class="cm-meta">' + safe(p.category) + '<i></i>' + safe(p.nickname) + (p.member ? '' : ' <em class="cm-guest">비회원</em>') + '<i></i>' + when(p.created_at) + '<i></i>조회 ' + p.views + '<i></i>추천 ' + p.likes + '</span></a><span class="cm-cmt" aria-label="댓글 ' + p.ncom + '개">' + p.ncom + '</span></li>';
        }).join('') + '</ul>' + pager(d.total, page, cat, q));
      }).catch(fail('cm-board'));
    });
    return back() + head('게시판', '피정 이야기와 기도 지향을 함께 나누는 곳입니다. 가입하지 않아도 닉네임과 비밀번호로 글을 쓸 수 있습니다.') + catsHtml +
      '<form class="cm-board-search" data-board-search><input name="q" type="search" value="' + safe(q) + '" placeholder="제목·내용·닉네임 검색" aria-label="게시판 검색"><button type="submit">검색</button></form>' +
      slot('cm-board') + '<a class="cm-write" href="#write" aria-label="글쓰기"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 23l1.2-5L18 6.2l3.8 3.8L10 21.8z"/><path d="M15.5 8.7l3.8 3.8"/></svg></a>';
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-board-search]'); if (!f) return;
    e.preventDefault();
    var cat = decodeURIComponent(location.hash.slice(1).split('/')[1] || '');
    location.hash = '#board/' + encodeURIComponent(cat) + '/' + encodeURIComponent(f.elements.q.value.trim());
  });

  function pager(total, page, cat, q) {
    var last = Math.max(1, Math.ceil(total / 30)); if (last === 1) return '';
    var from = Math.max(1, Math.min(page - 2, last - 4)), to = Math.min(last, from + 4), h = function (n) { return '#board/' + encodeURIComponent(cat) + '/' + encodeURIComponent(q) + '/' + n; };
    var out = '<nav class="cm-pager" aria-label="게시판 쪽">' + (page > 1 ? '<a href="' + h(page - 1) + '" aria-label="이전 쪽">‹</a>' : '<span></span>');
    for (var i = from; i <= to; i++) out += i === page ? '<b aria-current="page">' + i + '</b>' : '<a href="' + h(i) + '">' + i + '</a>';
    return out + (page < last ? '<a href="' + h(page + 1) + '" aria-label="다음 쪽">›</a>' : '<span></span>') + '</nav>';
  }
  function guestFields(label) {
    return me() ? '' : '<div class="cm-guest-row"><label>닉네임<input name="nick" required minlength="2" maxlength="12"></label><label>' + label + '<input name="gpw" type="password" required minlength="4" autocomplete="new-password"></label></div>';
  }
  function postPage() {
    var id = Number(location.hash.split('/')[1]);
    setTimeout(function () {
      rpc('cm_post', { p_id: id }).then(function (p) {
        if (!p) return fill('cm-post', '<p class="cm-empty">지워졌거나 없는 글입니다.</p>');
        fill('cm-post', '<article class="cm-read"><span class="cm-cv-kind">' + safe(p.category) + '</span><h1>' + safe(p.title) + '</h1>' +
          '<p class="cm-meta">' + safe(p.nickname) + (p.member ? '' : ' <em class="cm-guest">비회원</em>') + '<i></i>' + when(p.created_at) + (p.updated_at ? ' (고침)' : '') + '<i></i>조회 ' + p.views + '<i></i>추천 <span data-likes>' + p.likes + '</span></p>' +
          '<div class="cm-reader">' + para(p.body) + '</div>' +
          '<div class="cm-like"><button type="button" data-like="' + p.id + '">추천</button><a href="#write/' + p.id + '">고치기</a><button type="button" data-del="' + p.id + '">지우기</button></div>' +
          '<section class="cm-comments"><h2>댓글 ' + p.comments.length + '</h2><ul>' + p.comments.map(function (c) {
            return '<li><b>' + safe(c.nickname) + (c.member ? '' : ' <em class="cm-guest">비회원</em>') + '</b><p>' + safe(c.body) + '</p><span class="cm-meta">' + when(c.created_at) + '<i></i><button type="button" class="cm-linkbtn" data-cdel="' + c.id + '">지우기</button></span></li>';
          }).join('') + '</ul>' +
          '<form class="cm-form cm-cform" data-comment="' + p.id + '">' + guestFields('댓글 비밀번호') + '<textarea name="body" required maxlength="1000" rows="3" placeholder="따뜻한 댓글을 남겨 주세요"></textarea><button class="cm-btn" type="submit">댓글 쓰기</button><p class="cm-error" data-cmsg hidden></p></form></section>' +
          '<nav class="cm-prevnext" aria-label="이전·다음 글">' + (p.prev ? '<a href="#post/' + p.prev + '">← 이전 글</a>' : '<span></span>') + '<a href="#board">목록</a>' + (p.next ? '<a href="#post/' + p.next + '">다음 글 →</a>' : '<span></span>') + '</nav></article>');
      }).catch(fail('cm-post'));
    });
    return back('#board', '게시판 목록으로') + slot('cm-post');
  }
  /* 비밀번호·확인 창 (브라우저 기본 창 대신: 비밀번호가 가려지고 디자인이 맞음) */
  function dialog(opt) {
    return new Promise(function (done) {
      var d = document.createElement('div'); d.className = 'cm-modal'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = '<form class="cm-modal-box"><p>' + safe(opt.text) + '</p>' + (opt.pw ? '<input type="password" name="pw" required minlength="4" autocomplete="off" placeholder="비밀번호">' : '') +
        '<p class="cm-error" hidden></p><div class="cm-modal-btns"><button type="button" class="cm-btn cm-btn-line" data-x>취소</button><button type="submit" class="cm-btn' + (opt.danger ? ' cm-btn-danger' : '') + '">' + safe(opt.ok || '확인') + '</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('form'), close = function (v) { d.remove(); done(v); };
      d.addEventListener('click', function (e) { if (e.target === d || e.target.hasAttribute('data-x')) close(null); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(null); });
      f.addEventListener('submit', function (e) { e.preventDefault(); close(opt.pw ? f.elements.pw.value : true); });
      (f.elements.pw || f.querySelector('[type=submit]')).focus();
    });
  }
  window.CM_DIALOG = dialog;
  function askDelete(what) {
    return me() ? dialog({ text: '이 ' + what + '을(를) 지울까요?', ok: '지우기', danger: true }).then(function (v) { return v ? '' : null; })
      : dialog({ text: what + '을(를) 쓸 때 정한 비밀번호를 넣어 주세요.', pw: true, ok: '지우기', danger: true });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-like],[data-del],[data-cdel]'); if (!t) return;
    if (t.hasAttribute('data-like')) {
      rpc('cm_post_like', { p_id: Number(t.getAttribute('data-like')) }).then(function (n) { var s = document.querySelector('[data-likes]'); if (s && n) s.textContent = n; t.disabled = true; t.textContent = '추천했습니다'; })
        .catch(function () { t.disabled = true; t.textContent = '이미 추천했습니다'; });
      return;
    }
    if (t.hasAttribute('data-del')) {
      askDelete('글').then(function (pw) {
        if (pw === null) return;
        rpc('cm_post_delete', { p_id: Number(t.getAttribute('data-del')), p_token: token(), p_guest_pw: pw }).then(function () { location.hash = '#board'; })
          .catch(function (err) { dialog({ text: err.message }); });
      });
      return;
    }
    askDelete('댓글').then(function (pw) {
      if (pw === null) return;
      rpc('cm_comment_delete', { p_id: Number(t.getAttribute('data-cdel')), p_token: token(), p_guest_pw: pw }).then(function () { window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href })); })
        .catch(function (err) { dialog({ text: err.message }); });
    });
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-comment]'); if (!f) return;
    e.preventDefault();
    var b = f.querySelector('button'), msg = f.querySelector('[data-cmsg]'); b.disabled = true;
    rpc('cm_comment_write', { p_post: Number(f.getAttribute('data-comment')), p_token: token(), p_nickname: f.elements.nick ? f.elements.nick.value : null, p_guest_pw: f.elements.gpw ? f.elements.gpw.value : null, p_body: f.elements.body.value })
      .then(function () { window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href })); })
      .catch(function (err) { b.disabled = false; msg.textContent = err.message; msg.hidden = false; });
  });

  function writePage() {
    var id = Number(location.hash.split('/')[1]) || 0, m = me();
    var cats = CATS.filter(function (c) { return c !== '공지' || (m && m.is_admin); });
    var form = '<form class="cm-form cm-wform" data-write="' + id + '">' +
      '<label>말머리<select name="cat">' + cats.map(function (c) { return '<option' + (c === '자유' ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label>' +
      (id ? (m ? '' : '<label>글 비밀번호<input name="gpw" type="password" required minlength="4"></label>') : guestFields('글 비밀번호')) +
      '<label>제목<input name="title" required minlength="2" maxlength="80"></label>' +
      '<label>내용<textarea name="body" required minlength="2" maxlength="10000" rows="14"></textarea></label>' +
      (m ? '' : '<p class="cm-form-note">비회원 글은 이 비밀번호로만 고치거나 지울 수 있습니다.</p>') +
      '<button class="cm-btn" type="submit">' + (id ? '고친 글 올리기' : '글 올리기') + '</button><p class="cm-error" data-wmsg hidden></p></form>';
    if (id) setTimeout(function () {
      rpc('cm_post', { p_id: id }).then(function (p) {
        var f = document.querySelector('[data-write]'); if (!f || !p) return;
        f.elements.title.value = p.title; f.elements.body.value = p.body; f.elements.cat.value = p.category;
      });
    });
    return back(id ? '#post/' + id : '#board', id ? '글로 돌아가기' : '게시판 목록으로') + head(id ? '글 고치기' : '글쓰기', '') + form;
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-write]'); if (!f) return;
    e.preventDefault();
    var id = Number(f.getAttribute('data-write')), b = f.querySelector('button[type=submit]'), msg = f.querySelector('[data-wmsg]'); b.disabled = true;
    var gpw = f.elements.gpw ? f.elements.gpw.value : null;
    var call = id ? rpc('cm_post_edit', { p_id: id, p_token: token(), p_guest_pw: gpw, p_category: f.elements.cat.value, p_title: f.elements.title.value, p_body: f.elements.body.value }).then(function () { return id; })
      : rpc('cm_post_write', { p_token: token(), p_nickname: f.elements.nick ? f.elements.nick.value : null, p_guest_pw: gpw, p_category: f.elements.cat.value, p_title: f.elements.title.value, p_body: f.elements.body.value });
    call.then(function (nid) { location.hash = '#post/' + nid; }).catch(function (err) { b.disabled = false; msg.textContent = err.message; msg.hidden = false; });
  });

  function privacyPage() {
    return back() + head('개인정보 처리방침', '') + '<div class="cm-reader cm-policy">' +
      '<h2>1. 받는 정보</h2><p>가뭄(가톨릭 머뭄)은 회원가입 때 아이디, 비밀번호, 닉네임만 받습니다. 이름·전화번호·이메일·생년월일은 받지 않습니다. 비밀번호와 복구 코드는 되돌릴 수 없는 방식으로 바꾸어 저장하므로 운영자도 알 수 없습니다.</p>' +
      '<h2>2. 쓰는 곳</h2><p>로그인 유지, 피정담기 목록을 여러 기기에서 함께 보기, 게시판 글과 댓글의 작성자 표시에만 씁니다. 광고나 제3자 제공에 쓰지 않습니다.</p>' +
      '<h2>3. 비회원 글</h2><p>비회원으로 글이나 댓글을 쓰면 닉네임과 글 비밀번호(바꾸어 저장)만 남습니다. 도배와 광고를 막기 위해 접속 주소를 하루 동안만 임시로 확인하고 지웁니다.</p>' +
      '<h2>4. 보관과 삭제</h2><p>회원 정보는 탈퇴할 때까지 보관하며, 내 정보 화면에서 탈퇴하면 계정과 담아 둔 피정이 바로 지워집니다. 쓴 글은 게시판 흐름을 위해 남고 닉네임만 표시됩니다. 글은 언제든 직접 지울 수 있습니다.</p>' +
      '<h2>5. 저장 위치</h2><p>정보는 클라우드 데이터베이스(Supabase)에 저장됩니다. 로그인하지 않고 담은 피정은 이용자의 브라우저에만 저장됩니다.</p>' +
      '<h2>6. 문의</h2><p>개인정보 관련 문의는 게시판 공지에 안내한 연락처로 해 주세요.</p>' +
      '<p class="cm-meta">시행일: 2026년 11월</p></div>';
  }
  function termsPage() {
    return back() + head('이용약관', '') + '<div class="cm-reader cm-policy">' +
      '<h2>1. 서비스</h2><p>가뭄은 전국 가톨릭 피정 정보를 모아 소개하고, 각 수도회·피정의 집의 공식 신청처로 연결합니다. 피정 신청과 비용 납부는 각 주최 기관에서 이루어집니다.</p>' +
      '<h2>2. 게시판</h2><p>서로를 존중하는 글을 부탁드립니다. 다른 사람을 비방하는 글, 광고, 개인정보를 드러내는 글, 교회 가르침을 왜곡하거나 조롱하는 글은 알리지 않고 지울 수 있습니다.</p>' +
      '<h2>3. 계정</h2><p>아이디와 비밀번호, 복구 코드는 본인이 관리합니다. 복구 코드를 잃어버리면 비밀번호를 찾기 어려울 수 있습니다.</p>' +
      '<h2>4. 정보의 정확성</h2><p>피정 일정과 수도회 정보는 공개 자료와 각 기관의 안내를 바탕으로 하며, 바뀐 내용이 늦게 반영될 수 있습니다. 신청 전 주최 기관에 꼭 확인해 주세요.</p>' +
      '<p class="cm-meta">시행일: 2026년 11월</p></div>';
  }

  function aboutPage() {
    return back() +
      '<section class="cm-about">' +
      '<p class="cm-about-kicker">가톨릭 머뭄 · CAMUM</p>' +
      '<h1>복음과 카리스마가<br>세상에 닿도록</h1>' +
      '<p class="cm-about-lead">가뭄은 전국의 가톨릭 피정을 한곳에서 찾고, 각 수도회와 피정의 집이 정성껏 준비한 피정으로 신자들을 이어 드리는 곳입니다.</p>' +
      '<blockquote class="cm-about-quote">“요즘 기도도 잘 안 되고 마음이 너무 지칩니다. 이번 주말에 갈 수 있는 피정이 있을까요?”</blockquote>' +
      '<p>이렇게 묻는 사람에게 필요한 것은 긴 검색 결과가 아니라 하느님과 다시 만나는 시간입니다. 그런데 막상 피정 하나를 찾으려 하면 교구 주보와 본당 공지, 수도회 누리집과 따로 마련된 신청 링크를 차례로 뒤져야 하고, 날짜와 대상과 비용을 하나씩 견주다 보면 정작 내가 갈 수 있는 피정이 어디에 있는지 알기 어려워집니다.</p>' +
      '<p>우리 교회에는 말씀과 침묵, 환대와 자비, 식별과 봉사처럼 각 수도회가 오랜 세월 지켜 온 영성이 있고 그 영성을 나누려는 피정도 많습니다. 모자란 것은 피정이 아니라, 피정을 찾는 사람과 피정을 준비한 공동체가 서로 만나는 길이라고 생각했습니다.</p>' +
      '<h2>네 가지 길로 피정을 찾습니다</h2>' +
      '<ul class="cm-about-ways">' +
      '<li><a href="#discover"><b>나를 찾아가는 피정</b><span>몇 가지 물음에 답하면 지금의 나에게 맞는 피정을 추천합니다.</span></a></li>' +
      '<li><a href="#themes"><b>주제로 찾는 피정</b><span>말씀, 침묵, 청년, 가족처럼 마음이 가는 주제에서 시작합니다.</span></a></li>' +
      '<li><a href="#calendar"><b>날짜로 찾는 피정</b><span>갈 수 있는 날과 모집 상태를 먼저 봅니다.</span></a></li>' +
      '<li><a href="#places"><b>장소로 찾는 피정</b><span>가까운 지역의 피정의 집과 일정을 살핍니다.</span></a></li>' +
      '</ul>' +
      '<p>피정을 처음 찾는 사람도, 수도회를 잘 모르는 사람도 지금 서 있는 곳에서 바로 시작할 수 있도록 만들었습니다.</p>' +
      '<h2>수도회와 피정의 집께</h2>' +
      '<p>가뭄은 수도회를 대신하는 곳이 아니라, 수도회가 간직한 보화로 들어가는 문을 조금 더 넓히려는 곳입니다. 이미 준비하신 피정을 소개해 주시면 신자들이 찾아보고 비교할 수 있도록 안내하고, 신청과 참가비, 환불은 지금처럼 각 공동체가 정한 방식으로 공식 신청처에서 이루어집니다. 새로운 사도직을 하나 더 얹어 드리려는 것이 아니라 이미 하고 계신 일이 더 많은 사람에게 닿도록 돕고 싶습니다.</p>' +
      '<p>기관 등록은 무료이며, 참여 방법은 <a href="#board/%EA%B3%B5%EC%A7%80">게시판 공지</a>로 안내해 드리겠습니다.</p>' +
      '<figure class="cm-about-verse"><blockquote>“너희는 온 세상에 가서 모든 피조물에게 복음을 선포하여라.”</blockquote><figcaption>마르 16,15</figcaption></figure>' +
      '<p class="cm-about-end">수도회의 사명을 바꾸려는 것이 아니라, 복음과 창립자의 카리스마가 더 많은 삶에 닿도록 그 길을 함께 열고자 합니다.</p>' +
      '<div class="cm-about-cta"><a class="cm-btn" href="#paths">피정 찾아보기</a><a class="cm-btn cm-btn-line" href="#convents">수도회 소개 보기</a></div>' +
      '</section>';
  }

  window.CM_API = { rpc: rpc, safe: safe, token: token, me: me, url: URL_, key: KEY };
  var P = window.CM_PAGES = window.CM_PAGES || {};
  P.login = loginPage; P.me = function () { setTimeout(loadAuthors); return mePage(); }; P.board = boardPage; P.post = postPage; P.write = writePage; P.privacy = privacyPage; P.terms = termsPage; P.about = aboutPage;

  function start() {
    hdr();
    if (!token()) return;
    rpc('cm_me', { p_token: token() }).then(function (m) { if (m) { ls(MK, JSON.stringify(m)); hdr(); syncShelf(true); } else clearSession(); }).catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
