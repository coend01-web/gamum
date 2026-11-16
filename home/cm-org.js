/* 가톨릭 머뭄: 수도회·피정의 집 담당자 화면(받은 문의·피정 올리기), 신자 문의, 관리자 승인 */
(function () {
  var A = window.CM_API; if (!A) return;
  var rpc = A.rpc, safe = A.safe, token = A.token, me = A.me, dialog = window.CM_DIALOG;
  var REGIONS = ['서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '부산', '울산', '제주'];
  var TAGS = ['침묵', '말씀', '쉼', '치유', '기도', '성체', '성모', '청년', '부부', '가족', '성소', '봉사'];
  var AUD = ['누구나', '청년', '부부', '가족', '여성', '남성', '수도자', '예비신자'];
  function fill(id, h) { var el = document.getElementById(id); if (el) el.innerHTML = h; }
  function fail(id) { return function (e) { fill(id, '<p class="cm-error">' + safe(e.message) + '</p>'); }; }
  function err(e) { dialog({ text: e.message }); }
  function d(v) { if (!v) return ''; var t = new Date(v); return (t.getMonth() + 1) + '월 ' + t.getDate() + '일'; }
  function dt(v) { var t = new Date(v), p = function (x) { return (x < 10 ? '0' : '') + x; }; return (t.getMonth() + 1) + '.' + t.getDate() + ' ' + p(t.getHours()) + ':' + p(t.getMinutes()); }
  function range(a, b) { return a === b ? d(a) : d(a) + ' ~ ' + d(b); }
  function won(n) { return n == null ? '문의' : n === 0 ? '무료' : n.toLocaleString('ko-KR') + '원'; }
  var STATUS = { pending: ['검토 중', 'cm-st-wait'], approved: ['공개 중', 'cm-st-on'], rejected: ['다시 확인 필요', 'cm-st-no'] };
  var home = null;

  /* ── 담당자 첫 화면 ── */
  function orgPage() {
    var m = me(); if (!m) { location.replace('#login'); return ''; }
    if (!m.is_org) return '<a class="back-link" href="#home">← 처음으로</a><p class="cm-empty">수도회·피정의 집 담당자 계정으로 로그인해 주세요.</p>';
    var parts = location.hash.slice(1).split('/'), view = parts[1] || 'inbox';
    if (view === 'new' || view === 'edit') return formPage(view === 'edit' ? Number(parts[2]) : 0, parts[3] === 'copy');
    setTimeout(function () {
      rpc('cm_org_home', { p_token: token() }).then(function (h) {
        home = h;
        var unread = h.messages.filter(function (x) { return !x.read; }).length, waiting = h.messages.filter(function (x) { return !x.reply; }).length;
        fill('cm-org-sum', '<a class="cm-org-card' + (view === 'inbox' ? ' on' : '') + '" href="#org/inbox"><span>받은 문의</span><b>' + h.messages.length + '</b><em>' + (unread ? '새 문의 ' + unread : waiting ? '답장 기다림 ' + waiting : '모두 답장함') + '</em></a>' +
          '<a class="cm-org-card' + (view === 'retreats' ? ' on' : '') + '" href="#org/retreats"><span>우리 피정</span><b>' + h.retreats.length + '</b><em>' + h.retreats.filter(function (r) { return r.status === 'approved'; }).length + '개 공개 중</em></a>');
        fill('cm-org-body', view === 'retreats' ? retreatList(h.retreats) : inbox(h.messages));
      }).catch(fail('cm-org-body'));
    });
    return '<section class="cm-org-head"><p>' + safe(m.org_name || m.nickname) + '</p><h1>찬미 예수님, 반갑습니다.</h1></section>' +
      '<div id="cm-org-sum" class="cm-org-sum"></div><a class="cm-btn cm-org-new" href="#org/new">＋ 피정 올리기</a>' +
      '<div id="cm-org-body" class="cm-async"><p class="cm-loading">불러오는 중…</p></div>';
  }
  function inbox(list) {
    if (!list.length) return '<h2 class="cm-org-h">받은 문의</h2><p class="cm-empty">아직 받은 문의가 없습니다.<br>피정을 올리면 신자들이 이곳으로 문의를 보냅니다.</p>';
    return '<h2 class="cm-org-h">받은 문의</h2><ul class="cm-dm">' + list.map(function (x) {
      return '<li class="' + (x.read ? '' : 'new') + '"><details data-dm="' + x.id + '"' + (x.reply ? '' : '') + '><summary><span class="cm-dm-who"><b>' + safe(x.from_name) + '</b>' + (x.retreat ? '<i>' + safe(x.retreat) + '</i>' : '') + '</span>' +
        '<span class="cm-dm-snip">' + safe(x.body) + '</span><span class="cm-dm-meta">' + dt(x.created_at) + (x.reply ? ' · 답장함' : ' · <strong>답장 전</strong>') + '</span></summary>' +
        '<div class="cm-dm-open"><p class="cm-dm-q">' + safe(x.body).replace(/\n/g, '<br>') + '</p>' +
        (x.reply ? '<p class="cm-dm-a"><span>보낸 답장 · ' + dt(x.replied_at) + '</span>' + safe(x.reply).replace(/\n/g, '<br>') + '</p>' : '') +
        '<form data-reply="' + x.id + '"><textarea name="r" rows="3" maxlength="2000" placeholder="' + (x.reply ? '답장을 고쳐 다시 보내기' : '답장을 적어 주세요') + '" required></textarea><button class="cm-btn" type="submit">' + (x.reply ? '다시 보내기' : '답장 보내기') + '</button></form></div></details></li>';
    }).join('') + '</ul>';
  }
  function retreatList(list) {
    if (!list.length) return '<h2 class="cm-org-h">우리 피정</h2><p class="cm-empty">아직 올린 피정이 없습니다.<br>위의 ‘피정 올리기’를 눌러 시작해 보세요.</p>';
    return '<h2 class="cm-org-h">우리 피정</h2><ul class="cm-myr">' + list.map(function (r) {
      var st = STATUS[r.status] || STATUS.pending;
      return '<li><div class="cm-myr-top"><em class="' + st[1] + '">' + st[0] + '</em>' + (r.closed ? '<em class="cm-st-close">모집 마감</em>' : '') + '</div>' +
        '<strong>' + safe(r.title) + '</strong><p class="cm-meta">' + range(r.start_date, r.end_date) + '<i></i>' + safe(r.place || r.region) + '<i></i>' + won(r.fee) + '</p>' +
        (r.status === 'rejected' && r.review_note ? '<p class="cm-myr-note">관리자 메모: ' + safe(r.review_note) + '</p>' : '') +
        (r.status === 'pending' ? '<p class="cm-myr-note soft">가톨릭 머뭄에서 확인한 뒤 공개됩니다. 보통 하루 안에 공개됩니다.</p>' : '') +
        '<div class="cm-myr-btns"><a href="#org/edit/' + r.id + '">고치기</a><a href="#org/edit/' + r.id + '/copy">같은 피정 다른 날짜</a>' +
        '<button type="button" data-rset="' + r.id + ':' + (r.closed ? 'open' : 'close') + '">' + (r.closed ? '모집 다시 열기' : '모집 마감') + '</button>' +
        '<button type="button" class="cm-danger" data-rset="' + r.id + ':delete">지우기</button></div></li>';
    }).join('') + '</ul>';
  }

  /* ── 피정 올리기 (한 화면) ── */
  var photo = '';
  function formPage(id, copy) {
    photo = '';
    var f = '<a class="back-link" href="#org/retreats">← 우리 피정으로</a><section class="cm-page-head"><h1>' + (id && !copy ? '피정 고치기' : '피정 올리기') + '</h1><p>별표(*)만 채워도 올릴 수 있습니다. 나머지는 나중에 고쳐도 됩니다.</p></section>' +
      '<form class="cm-form cm-rform" data-rform="' + (copy ? 0 : id) + '">' +
      '<label>피정 이름 *<input name="title" required maxlength="80" placeholder="예: 침묵 속에 머무는 1박 2일"></label>' +
      '<div class="cm-guest-row"><label>시작하는 날 *<input name="start_date" type="date" required></label><label>끝나는 날<input name="end_date" type="date"></label></div>' +
      '<label>피정의 집·장소 *<input name="place" required maxlength="80" placeholder="예: OO 피정의 집"></label>' +
      '<div class="cm-guest-row"><label>지역 *<select name="region" required><option value="">고르기</option>' + REGIONS.map(function (r) { return '<option>' + r + '</option>'; }).join('') + '</select></label>' +
      '<label>참가비 (원)<input name="fee" type="number" min="0" step="1000" inputmode="numeric" placeholder="무료면 0"></label></div>' +
      '<fieldset class="cm-chips"><legend>누구를 위한 피정인가요?</legend>' + AUD.map(function (a, i) { return '<label><input type="radio" name="audience" value="' + a + '"' + (i ? '' : ' checked') + '><span>' + a + '</span></label>'; }).join('') + '</fieldset>' +
      '<fieldset class="cm-chips"><legend>주제 (여러 개 골라도 됩니다)</legend>' + TAGS.map(function (t) { return '<label><input type="checkbox" name="tags" value="' + t + '"><span>' + t + '</span></label>'; }).join('') + '</fieldset>' +
      '<div class="cm-guest-row"><label>신청 링크<input name="apply_url" inputmode="url" placeholder="신청 페이지 주소"></label><label>문의 전화<input name="phone" inputmode="tel" placeholder="031-000-0000"></label></div>' +
      '<div class="cm-guest-row"><label>신청 마감일<input name="apply_end" type="date"></label><label>정원<input name="capacity" type="number" min="1" inputmode="numeric" placeholder="명"></label></div>' +
      '<label>주소<input name="address" maxlength="160" placeholder="찾아오는 길에 쓸 주소"></label>' +
      '<label>피정 소개<textarea name="description" rows="6" maxlength="4000" placeholder="일정, 준비물, 이런 분께 권해요 등을 편하게 적어 주세요."></textarea></label>' +
      '<div class="cm-upbox"><span>대표 사진 (선택)</span><div data-rphoto-prev class="cm-cover-prev"></div><label class="cm-btn cm-btn-line cm-filebtn">사진 고르기<input type="file" accept="image/*" data-rphoto hidden></label><p class="cm-form-note" data-up-msg hidden></p></div>' +
      '<button class="cm-btn cm-big" type="submit">' + (id && !copy ? '고친 내용 저장' : '피정 올리기') + '</button><p class="cm-error" data-rmsg hidden></p></form>';
    if (id) setTimeout(function () {
      var load = home ? Promise.resolve(home) : rpc('cm_org_home', { p_token: token() });
      load.then(function (h) {
        home = h; var r = h.retreats.filter(function (x) { return x.id === id; })[0], fm = document.querySelector('[data-rform]'); if (!r || !fm) return;
        ['title', 'place', 'region', 'fee', 'apply_url', 'phone', 'capacity', 'address', 'description'].forEach(function (k) { if (r[k] != null) fm.elements[k].value = r[k]; });
        if (!copy) { fm.elements.start_date.value = r.start_date; fm.elements.end_date.value = r.end_date; if (r.apply_end) fm.elements.apply_end.value = r.apply_end; }
        fm.querySelectorAll('[name=audience]').forEach(function (c) { c.checked = c.value === r.audience; });
        fm.querySelectorAll('[name=tags]').forEach(function (c) { c.checked = (r.tags || []).indexOf(c.value) > -1; });
        photo = r.photo_url || ''; showPhoto();
        if (copy) fm.elements.start_date.focus();
      });
    });
    return f;
  }
  function showPhoto() { var b = document.querySelector('[data-rphoto-prev]'); if (b) b.innerHTML = photo ? '<img src="' + safe(photo) + '" alt="대표 사진"><button type="button" class="cm-linkbtn" data-rphoto-x>사진 빼기</button>' : ''; }
  function upMsg(t) { var m = document.querySelector('[data-up-msg]'); if (m) { m.textContent = t; m.hidden = !t; } }
  function uploadOne(file) {
    return new Promise(function (ok) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url); var s = Math.min(1, 1280 / img.naturalWidth), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { ok(b || file); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
      img.src = url;
    }).then(function (blob) {
      return fetch(A.url + '/functions/v1/cm-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: A.key }, body: JSON.stringify({ token: token(), files: [{ type: blob.type || 'image/jpeg' }] }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || '사진을 올리지 못했습니다.'); return j.uploads[0]; }); })
        .then(function (u) { return fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob }).then(function (r) { if (!r.ok) throw new Error('사진을 올리지 못했습니다.'); return u.publicUrl; }); });
    });
  }
  document.addEventListener('change', function (e) {
    if (!(e.target.matches && e.target.matches('[data-rphoto]')) || !e.target.files[0]) return;
    upMsg('사진을 올리는 중…');
    uploadOne(e.target.files[0]).then(function (u) { photo = u; showPhoto(); upMsg(''); }).catch(function (x) { upMsg(x.message); });
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-rform]'); if (!f) return;
    e.preventDefault();
    var id = Number(f.getAttribute('data-rform')) || null, b = f.querySelector('[type=submit]'), msg = f.querySelector('[data-rmsg]'), v = function (k) { return f.elements[k].value.trim(); };
    if (v('end_date') && v('end_date') < v('start_date')) { msg.textContent = '끝나는 날이 시작하는 날보다 빠릅니다.'; msg.hidden = false; return; }
    b.disabled = true;
    var data = { title: v('title'), start_date: v('start_date'), end_date: v('end_date'), place: v('place'), region: v('region'), fee: v('fee'), audience: (f.querySelector('[name=audience]:checked') || {}).value || '누구나',
      tags: Array.prototype.filter.call(f.querySelectorAll('[name=tags]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      apply_url: v('apply_url'), phone: v('phone'), apply_end: v('apply_end'), capacity: v('capacity'), address: v('address'), description: f.elements.description.value, photo_url: photo };
    rpc('cm_org_retreat_save', { p_token: token(), p_id: id, p: data }).then(function () {
      home = null; location.hash = '#org/retreats';
      setTimeout(function () { dialog({ text: id ? '저장했습니다.' : '피정을 올렸습니다. 가톨릭 머뭄에서 확인한 뒤 공개됩니다.' }); }, 300);
    }).catch(function (x) { b.disabled = false; msg.textContent = x.message; msg.hidden = false; });
  });
  document.addEventListener('click', function (e) {
    var x = e.target.closest && e.target.closest('[data-rphoto-x],[data-rset]'); if (!x) return;
    if (x.hasAttribute('data-rphoto-x')) { photo = ''; showPhoto(); return; }
    var a = x.getAttribute('data-rset').split(':'), go = function () { rpc('cm_org_retreat_set', { p_token: token(), p_id: Number(a[0]), p_action: a[1] }).then(function () { home = null; window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href })); }).catch(err); };
    if (a[1] === 'delete') dialog({ text: '이 피정을 지울까요? 되돌릴 수 없습니다.', ok: '지우기', danger: true }).then(function (ok) { if (ok) go(); });
    else go();
  });
  /* 문의 열면 읽음, 답장 */
  document.addEventListener('toggle', function (e) {
    var dEl = e.target; if (!dEl.matches || !dEl.matches('[data-dm]') || !dEl.open) return;
    var li = dEl.closest('li'); if (li && li.classList.contains('new')) { li.classList.remove('new'); rpc('cm_org_read', { p_token: token(), p_id: Number(dEl.getAttribute('data-dm')) }).catch(function () {}); }
  }, true);
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-reply]'); if (!f) return;
    e.preventDefault(); var b = f.querySelector('button'); b.disabled = true;
    rpc('cm_org_reply', { p_token: token(), p_id: Number(f.getAttribute('data-reply')), p_reply: f.elements.r.value }).then(function () {
      window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: location.href, newURL: location.href }));
    }).catch(function (x) { b.disabled = false; err(x); });
  });

  /* ── 신자: 피정 화면에서 문의하기, 내 문의 ── */
  function addAskBox() {
    var m = location.hash.match(/^#retreat\/approved\/cmr-(\d+)/); if (!m) return;
    var main = document.getElementById('main'); if (!main || main.querySelector('.cm-ask')) return;
    var box = document.createElement('section'); box.className = 'cm-ask';
    box.innerHTML = '<h2>주최 수도회에 문의하기</h2><p>궁금한 점을 남기면 담당 수녀님·수사님이 답장을 보내 드립니다. 답장은 ‘내 정보 → 내 문의’에서 볼 수 있습니다.</p>' +
      (me() ? '<form data-ask="' + m[1] + '"><textarea name="b" rows="3" maxlength="2000" required placeholder="예: 혼자 가도 괜찮을까요? 주차가 되나요?"></textarea><button class="cm-btn" type="submit">문의 보내기</button></form>'
        : '<a class="cm-btn" href="#login">로그인하고 문의하기</a>');
    main.appendChild(box);
  }
  window.addEventListener('hashchange', function () { setTimeout(addAskBox, 400); setTimeout(addAskBox, 1500); });
  setTimeout(addAskBox, 1500);
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-ask]'); if (!f) return;
    e.preventDefault(); var b = f.querySelector('button'); b.disabled = true;
    rpc('cm_ask', { p_token: token(), p_retreat: Number(f.getAttribute('data-ask')), p_body: f.elements.b.value }).then(function () {
      f.outerHTML = '<p class="cm-ok-box">문의를 보냈습니다. 답장이 오면 ‘내 정보 → 내 문의’에서 볼 수 있습니다.</p>';
    }).catch(function (x) { b.disabled = false; err(x); });
  });
  function myQuestions() {
    if (!me()) { location.replace('#login'); return ''; }
    setTimeout(function () {
      rpc('cm_my_questions', { p_token: token() }).then(function (l) {
        fill('cm-myq', l.length ? '<ul class="cm-dm">' + l.map(function (x) {
          return '<li><div class="cm-dm-open"><p class="cm-meta"><b>' + safe(x.org_name) + '</b>' + (x.retreat ? '<i></i>' + safe(x.retreat) : '') + '<i></i>' + dt(x.created_at) + '</p>' +
            '<p class="cm-dm-q">' + safe(x.body).replace(/\n/g, '<br>') + '</p>' +
            (x.reply ? '<p class="cm-dm-a"><span>답장 · ' + dt(x.replied_at) + '</span>' + safe(x.reply).replace(/\n/g, '<br>') + '</p>' : '<p class="cm-meta">아직 답장을 기다리고 있습니다.</p>') + '</div></li>';
        }).join('') + '</ul>' : '<p class="cm-empty">보낸 문의가 없습니다.<br>피정 화면에서 주최 수도회에 문의할 수 있습니다.</p>');
      }).catch(fail('cm-myq'));
    });
    return '<a class="back-link" href="#me">← 내 정보로</a><section class="cm-page-head"><h1>내 문의</h1></section><div id="cm-myq" class="cm-async"><p class="cm-loading">불러오는 중…</p></div>';
  }

  /* 새 문의·답장 알림 점 */
  function badge() {
    var m = me(), t = token(); if (!m || !t) return;
    rpc('cm_unread', { p_token: t }).then(function (u) {
      var n = (u.org || 0) + (u.user || 0), a = document.querySelector('.cm-tool[href="#me"],.cm-tool[href="#org"]'); if (!a) return;
      if (m.is_org) a.setAttribute('href', '#org');
      a.classList.toggle('cm-has-new', n > 0); a.setAttribute('data-new', n > 9 ? '9+' : String(n));
      var row = document.querySelector('[data-myq-count]'); if (row) row.textContent = u.user ? '새 답장 ' + u.user + ' ›' : '›';
    }).catch(function () {});
  }
  setTimeout(badge, 1200); setInterval(badge, 120000); window.addEventListener('hashchange', function () { setTimeout(badge, 600); });

  var P = window.CM_PAGES = window.CM_PAGES || {};
  P.org = orgPage; P.questions = myQuestions;
  window.CM_ORG = { REGIONS: REGIONS };
})();
