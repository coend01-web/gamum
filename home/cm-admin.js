/* 가톨릭 머뭄: 게시판 신고와 관리자 화면(신고 처리·최근 글·회원 관리) */
(function () {
  var A = window.CM_API; if (!A) return;
  var rpc = A.rpc, safe = A.safe, token = A.token, me = A.me, dialog = window.CM_DIALOG;
  var REASONS = ['광고·도배', '욕설·비방', '개인정보 노출', '음란·불쾌한 내용', '교회 가르침 왜곡·조롱', '기타'];
  function when(d) { var t = new Date(d), p = function (x) { return (x < 10 ? '0' : '') + x; }; return (t.getMonth() + 1) + '.' + t.getDate() + ' ' + p(t.getHours()) + ':' + p(t.getMinutes()); }
  function fill(id, h) { var el = document.getElementById(id); if (el) el.innerHTML = h; }
  function fail(id) { return function (e) { fill(id, '<p class="cm-error">' + safe(e.message) + '</p>'); }; }
  function err(e) { dialog({ text: e.message }); }

  /* 신고하기 */
  function reportDialog(type, id) {
    return new Promise(function (done) {
      var d = document.createElement('div'); d.className = 'cm-modal'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
      d.innerHTML = '<form class="cm-modal-box"><p><b>' + (type === 'post' ? '이 글' : '이 댓글') + '을 신고합니다</b></p>' +
        '<div class="cm-reasons">' + REASONS.map(function (r, i) { return '<label><input type="radio" name="r" value="' + r + '"' + (i ? '' : ' required') + '> ' + r + '</label>'; }).join('') + '</div>' +
        '<textarea name="d" rows="2" maxlength="300" placeholder="자세한 내용 (선택)"></textarea>' +
        '<p class="cm-form-note">신고는 관리자에게만 보입니다. 여러 사람이 신고한 글은 확인 전까지 자동으로 가려집니다.</p>' +
        '<div class="cm-modal-btns"><button type="button" class="cm-btn cm-btn-line" data-x>취소</button><button type="submit" class="cm-btn cm-btn-danger">신고하기</button></div></form>';
      document.body.appendChild(d);
      var f = d.querySelector('form'), close = function (v) { d.remove(); done(v); };
      d.addEventListener('click', function (e) { if (e.target === d || e.target.hasAttribute('data-x')) close(null); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(null); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var b = f.querySelector('[type=submit]'); b.disabled = true;
        rpc('cm_report', { p_token: token(), p_type: type, p_id: id, p_reason: f.elements.r.value, p_detail: f.elements.d.value })
          .then(close).catch(function (x) { close(null); err(x); });
      });
      f.querySelector('input').focus();
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-report]'); if (!b) return;
    var v = b.getAttribute('data-report').split(':');
    reportDialog(v[0], Number(v[1])).then(function (r) {
      if (r) dialog({ text: r === 'dup' ? '이미 신고하셨습니다. 관리자가 확인하겠습니다.' : '신고했습니다. 관리자가 확인하겠습니다.' });
    });
  });

  /* 관리자 화면 */
  function adminPage() {
    var m = me(); if (!m || !m.is_admin) { location.replace('#login'); return ''; }
    var tab = location.hash.split('/')[1] || 'retreats';
    var tabs = '<div class="cm-board-cats">' + [['retreats', '피정 승인'], ['orgs', '기관 계정'], ['reports', '신고'], ['recent', '최근 글'], ['members', '회원']].map(function (t) {
      return '<a href="#admin/' + t[0] + '" aria-current="' + (t[0] === tab ? 'page' : 'false') + '">' + t[1] + '</a>'; }).join('') + '</div>';
    setTimeout(function () {
      if (tab === 'reports') loadReports();
      if (tab === 'recent') loadRecent();
      if (tab === 'members') loadMembers('');
      if (tab === 'retreats') loadRetreats();
      if (tab === 'orgs') loadOrgs();
    });
    return '<a class="back-link" href="#me">← 내 정보로</a><section class="cm-page-head"><h1>관리자 화면</h1><p>피정 승인, 기관 계정, 신고 처리, 회원 관리를 합니다.</p></section>' + tabs +
      (tab === 'orgs' ? orgForm() : '') + (tab === 'members' ? '<form class="cm-board-search" data-msearch><input name="q" type="search" placeholder="아이디·닉네임 찾기" aria-label="회원 찾기"><button type="submit">찾기</button></form>' : '') +
      '<div id="cm-admin" class="cm-async"><p class="cm-loading">불러오는 중…</p></div>';
  }
  function loadReports() {
    rpc('cm_admin_reports', { p_token: token() }).then(function (l) {
      if (!l.length) return fill('cm-admin', '<p class="cm-empty">처리할 신고가 없습니다.</p>');
      fill('cm-admin', '<ul class="cm-adm-list">' + l.map(function (r) {
        var t = r.target || {}, kinds = {};
        r.items.forEach(function (i) { kinds[i.reason] = (kinds[i.reason] || 0) + 1; });
        return '<li><div class="cm-adm-top"><span class="cm-badge">' + (r.target_type === 'post' ? '글' : '댓글') + '</span><b>신고 ' + r.n + '건</b>' + (t.hidden ? '<em class="cm-hidden-badge">자동 가림</em>' : '') + (t.deleted ? '<em class="cm-hidden-badge">지워짐</em>' : '') + '</div>' +
          '<strong>' + safe(t.title || '(지워짐)') + '</strong><p>' + safe(t.body || '') + '</p>' +
          '<p class="cm-meta">' + safe(t.nickname || '') + '<i></i>' + Object.keys(kinds).map(function (k) { return safe(k) + ' ' + kinds[k]; }).join(', ') + '<i></i>' + when(r.last_at) + '</p>' +
          r.items.filter(function (i) { return i.detail; }).map(function (i) { return '<p class="cm-adm-detail">“' + safe(i.detail) + '”</p>'; }).join('') +
          '<div class="cm-adm-btns">' + (t.post_id && !t.hidden ? '<a class="cm-btn cm-btn-line" href="#post/' + t.post_id + '">글 보기</a>' : '') +
          '<button class="cm-btn cm-btn-line" data-resolve="' + r.target_type + ':' + r.target_id + ':0">문제 없음</button>' +
          '<button class="cm-btn cm-btn-danger" data-resolve="' + r.target_type + ':' + r.target_id + ':1">지우기</button></div></li>';
      }).join('') + '</ul>');
    }).catch(fail('cm-admin'));
  }
  function loadRecent() {
    rpc('cm_admin_recent', { p_token: token() }).then(function (d) {
      fill('cm-admin', '<h2 class="cm-adm-h">최근 글</h2><ul class="cm-adm-rows">' + (d.posts.length ? d.posts.map(function (p) {
        return '<li><a href="#post/' + p.id + '"><b>' + safe(p.title) + '</b><span class="cm-meta">' + safe(p.category) + '<i></i>' + safe(p.nickname) + (p.member ? '' : ' (비회원)') + '<i></i>' + when(p.created_at) + (p.reports ? '<i></i><span class="cm-danger">신고 ' + p.reports + '</span>' : '') + (p.hidden ? '<i></i>가려짐' : '') + '</span></a><button class="cm-linkbtn cm-danger" data-adel="post:' + p.id + '">지우기</button></li>';
      }).join('') : '<li class="cm-empty">글이 없습니다.</li>') + '</ul><h2 class="cm-adm-h">최근 댓글</h2><ul class="cm-adm-rows">' + (d.comments.length ? d.comments.map(function (c) {
        return '<li><a href="#post/' + c.post_id + '"><b>' + safe(c.body) + '</b><span class="cm-meta">' + safe(c.nickname) + (c.member ? '' : ' (비회원)') + '<i></i>' + when(c.created_at) + (c.hidden ? '<i></i>가려짐' : '') + '</span></a><button class="cm-linkbtn cm-danger" data-adel="comment:' + c.id + '">지우기</button></li>';
      }).join('') : '<li class="cm-empty">댓글이 없습니다.</li>') + '</ul>');
    }).catch(fail('cm-admin'));
  }
  function loadMembers(q) {
    rpc('cm_admin_members', { p_token: token(), p_q: q || null }).then(function (l) {
      fill('cm-admin', '<p class="cm-cv-count">회원 ' + l.length + '명' + (l.length >= 200 ? ' (최근 200명)' : '') + '</p><ul class="cm-adm-rows">' + l.map(function (u) {
        return '<li><div><b>' + safe(u.nickname) + '</b><span class="cm-meta">' + safe(u.username) + (u.is_admin ? '<i></i>관리자' : u.is_author ? '<i></i>작가' : '') + '</span>' +
          '<span class="cm-meta">가입 ' + when(u.created_at) + '<i></i>글 ' + u.posts + '<i></i>댓글 ' + u.comments + (u.last_seen ? '<i></i>최근 ' + when(u.last_seen) : '') + '</span></div>' +
          (u.is_admin ? '' : '<div class="cm-adm-mbtns"><button class="cm-linkbtn" data-mact="author:' + safe(u.username) + ':' + (u.is_author ? 0 : 1) + '">' + (u.is_author ? '작가 해제' : '작가 지정') + '</button>' +
          '<button class="cm-linkbtn" data-mact="reset:' + safe(u.username) + '">비밀번호 초기화</button><button class="cm-linkbtn cm-danger" data-mact="remove:' + safe(u.username) + '">내보내기</button></div>') + '</li>';
      }).join('') + '</ul>');
    }).catch(fail('cm-admin'));
  }
  function won(n) { return n == null ? '참가비 문의' : n === 0 ? '무료' : n.toLocaleString('ko-KR') + '원'; }
  function loadRetreats() {
    rpc('cm_admin_retreats', { p_token: token(), p_status: null }).then(function (l) {
      if (!l.length) return fill('cm-admin', '<p class="cm-empty">수도회에서 올린 피정이 아직 없습니다.</p>');
      var order = { pending: 0, rejected: 1, approved: 2 }; l.sort(function (a, b) { return order[a.status] - order[b.status]; });
      fill('cm-admin', '<ul class="cm-adm-list">' + l.map(function (r) {
        var st = { pending: '검토 기다림', approved: '공개 중', rejected: '반려' }[r.status];
        return '<li><div class="cm-adm-top"><span class="cm-badge">' + st + '</span><b>' + safe(r.org_name) + '</b></div><strong>' + safe(r.title) + '</strong>' +
          '<p class="cm-meta">' + safe(r.start_date) + (r.end_date !== r.start_date ? ' ~ ' + safe(r.end_date) : '') + '<i></i>' + safe(r.place) + ' · ' + safe(r.region) + '<i></i>' + won(r.fee) + '<i></i>' + safe(r.audience) + '</p>' +
          (r.description ? '<p>' + safe(r.description.slice(0, 220)) + (r.description.length > 220 ? '…' : '') + '</p>' : '') +
          '<p class="cm-meta">신청: ' + (r.apply_url ? '<a href="' + safe(r.apply_url) + '" target="_blank" rel="noopener">링크</a>' : '없음') + '<i></i>전화: ' + safe(r.phone || '없음') + (r.review_note ? '<i></i>메모: ' + safe(r.review_note) : '') + '</p>' +
          '<div class="cm-adm-btns">' + (r.status !== 'approved' ? '<button class="cm-btn" data-rev="' + r.id + ':1">승인·공개</button>' : '<a class="cm-btn cm-btn-line" href="#retreat/approved/cmr-' + r.id + '">공개 화면 보기</a>') +
          '<button class="cm-btn cm-btn-line" data-rev="' + r.id + ':0">' + (r.status === 'approved' ? '공개 내리기' : '반려') + '</button></div></li>';
      }).join('') + '</ul>');
    }).catch(fail('cm-admin'));
  }
  function orgForm() {
    return '<form class="cm-form cm-adm-orgform" data-orgnew><h2 class="cm-adm-h">기관 계정 만들기</h2><p class="cm-form-note">수도회·피정의 집 담당자가 쓸 아이디를 만들어 드립니다. 만든 아이디와 비밀번호를 담당자께 전해 주세요. 담당자는 로그인 뒤 내 정보에서 비밀번호를 바꿀 수 있습니다.</p>' +
      '<label>수도회·피정의 집 이름<input name="o" required maxlength="60" placeholder="예: 성 베네딕도회 요셉 수도원"></label>' +
      '<div class="cm-guest-row"><label>아이디<input name="u" required pattern="[a-z0-9_]{4,20}" placeholder="영문 소문자·숫자"></label><label>처음 비밀번호<input name="p" required minlength="6"></label></div>' +
      '<button class="cm-btn" type="submit">기관 계정 만들기</button></form><div id="cm-admin" class="cm-async"></div>';
  }
  function loadOrgs() {
    rpc('cm_admin_orgs', { p_token: token() }).then(function (l) {
      fill('cm-admin', '<h2 class="cm-adm-h">기관 계정 ' + l.length + '곳</h2>' + (l.length ? '<ul class="cm-adm-rows">' + l.map(function (o) {
        return '<li><div><b>' + safe(o.org_name) + '</b><span class="cm-meta">' + safe(o.username) + '<i></i>피정 ' + o.retreats + '<i></i>답장 기다리는 문의 ' + o.waiting + (o.last_seen ? '<i></i>최근 ' + when(o.last_seen) : '<i></i>아직 로그인 전') + '</span></div>' +
          '<div class="cm-adm-mbtns"><button class="cm-linkbtn" data-mact="reset:' + safe(o.username) + '">비밀번호 초기화</button></div></li>';
      }).join('') + '</ul>' : '<p class="cm-empty">아직 만든 기관 계정이 없습니다.</p>'));
    }).catch(fail('cm-admin'));
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-orgnew]'); if (!f) return; e.preventDefault();
    rpc('cm_admin_create_org', { p_token: token(), p_org_name: f.elements.o.value, p_username: f.elements.u.value, p_password: f.elements.p.value }).then(function (r) {
      dialog({ text: r.org_name + ' 기관 계정을 만들었습니다. 아이디: ' + r.username + ' / 비밀번호: 방금 넣으신 처음 비밀번호' }); f.reset(); loadOrgs();
    }).catch(err);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-rev]'); if (!b) return;
    var v = b.getAttribute('data-rev').split(':'), ok = v[1] === '1';
    if (ok) return rpc('cm_admin_review_retreat', { p_token: token(), p_id: Number(v[0]), p_approve: true, p_note: '' }).then(loadRetreats).catch(err);
    var d = document.createElement('div'); d.className = 'cm-modal';
    d.innerHTML = '<form class="cm-modal-box"><p>담당자께 남길 메모 (무엇을 고치면 되는지)</p><textarea name="n" rows="3" maxlength="300" placeholder="예: 날짜를 다시 확인해 주세요"></textarea><div class="cm-modal-btns"><button type="button" class="cm-btn cm-btn-line" data-x>취소</button><button class="cm-btn cm-btn-danger" type="submit">반려·내리기</button></div></form>';
    document.body.appendChild(d);
    d.addEventListener('click', function (x) { if (x.target === d || x.target.hasAttribute('data-x')) d.remove(); });
    d.querySelector('form').addEventListener('submit', function (x) { x.preventDefault(); var n = d.querySelector('textarea').value; d.remove();
      rpc('cm_admin_review_retreat', { p_token: token(), p_id: Number(v[0]), p_approve: false, p_note: n }).then(loadRetreats).catch(err); });
  });
  function q() { var i = document.querySelector('[data-msearch] [name=q]'); return i ? i.value.trim() : ''; }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-msearch]'); if (!f) return; e.preventDefault(); loadMembers(q());
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-resolve],[data-adel],[data-mact]'); if (!b) return;
    if (b.hasAttribute('data-resolve')) {
      var v = b.getAttribute('data-resolve').split(':'), del = v[2] === '1', what = v[0] === 'post' ? '글' : '댓글';
      dialog({ text: del ? '이 ' + what + '을 지우고 신고를 마칠까요?' : '문제 없음으로 처리할까요? 가려져 있었다면 다시 보입니다.', ok: del ? '지우기' : '처리', danger: del }).then(function (ok) {
        if (ok) rpc('cm_admin_resolve', { p_token: token(), p_type: v[0], p_id: Number(v[1]), p_delete: del }).then(loadReports).catch(err);
      });
      return;
    }
    if (b.hasAttribute('data-adel')) {
      var w = b.getAttribute('data-adel').split(':');
      dialog({ text: '바로 지울까요?', ok: '지우기', danger: true }).then(function (ok) {
        if (ok) rpc('cm_admin_delete', { p_token: token(), p_type: w[0], p_id: Number(w[1]) }).then(loadRecent).catch(err);
      });
      return;
    }
    var a = b.getAttribute('data-mact').split(':');
    if (a[0] === 'author') rpc('cm_set_author', { p_token: token(), p_username: a[1], p_on: a[2] === '1' }).then(function () { loadMembers(q()); }).catch(err);
    if (a[0] === 'reset') dialog({ text: a[1] + ' 님의 비밀번호를 새로 만들까요? 새 비밀번호를 그분께 직접 알려 주셔야 합니다.', ok: '초기화' }).then(function (ok) {
      if (ok) rpc('cm_admin_reset', { p_token: token(), p_username: a[1] }).then(function (pw) { dialog({ text: '새 비밀번호: ' + pw + '  (이 창을 닫으면 다시 볼 수 없습니다)' }); }).catch(err);
    });
    if (a[0] === 'remove') dialog({ text: a[1] + ' 님을 내보낼까요? 계정과 피정담기가 지워지고, 쓴 글은 닉네임만 남습니다.', ok: '내보내기', danger: true }).then(function (ok) {
      if (ok) rpc('cm_admin_remove_member', { p_token: token(), p_username: a[1] }).then(function () { loadMembers(q()); }).catch(err);
    });
  });

  var P = window.CM_PAGES = window.CM_PAGES || {};
  P.admin = adminPage;
})();
