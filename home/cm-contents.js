/* 가뭄 콘텐츠: 웹툰·웹소설·영상·묵상글·오디오. 관리자는 작품과 회차를 올리고 고칠 수 있습니다. */
(function () {
  var A = window.CM_API; if (!A) return;
  var rpc = A.rpc, safe = A.safe, token = A.token, me = A.me;
  var KINDS = [['webtoon', '웹툰'], ['novel', '웹소설'], ['video', '영상'], ['essay', '묵상글'], ['audio', '오디오']];
  function kname(k) { var f = KINDS.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : '콘텐츠'; }
  function admin() { var m = me(); return !!(m && (m.is_author || m.is_admin)); }
  function slot(id) { return '<div id="' + id + '" class="cm-async"><p class="cm-loading">불러오는 중…</p></div>'; }
  function fill(id, h) { var el = document.getElementById(id); if (el) el.innerHTML = h; }
  function fail(id) { return function (e) { fill(id, '<p class="cm-error">' + safe(e.message) + '</p>'); }; }
  function day(d) { var t = new Date(d); return t.getFullYear() + '.' + (t.getMonth() + 1) + '.' + t.getDate(); }
  function para(s) { return safe(s).split(/\n{2,}/).map(function (b) { return '<p>' + b.replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  function yt(u) { var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : null; }
  function hidden(p) { return p ? '' : ' <em class="cm-hidden-badge">비공개</em>'; }

  function tabs(kind) {
    return '<div class="cm-seg" role="tablist">' + KINDS.map(function (k) { return '<a role="tab" href="#contents/' + k[0] + '" aria-selected="' + (k[0] === kind) + '">' + k[1] + '</a>'; }).join('') + '</div>';
  }
  var sortBy = 'update', DAYS = ['월','화','수','목','금','토','일'];
  var today = DAYS[(new Date().getDay() + 6) % 7], dayTab = today;
  function serial(kind) { return kind === 'webtoon' || kind === 'novel'; }
  function dayTabs() {
    return '<div class="cm-days" role="tablist">' + DAYS.concat(['전체']).map(function (d) {
      return '<button type="button" role="tab" data-day="' + d + '" aria-selected="' + (d === dayTab) + '">' + (d === today ? '<em>오늘</em>' : '') + d + '</button>';
    }).join('') + '</div>';
  }
  function isNew(d) { return d && (Date.now() - new Date(d).getTime()) < 3 * 864e5; }
  function grid(all, kind) {
    var list = serial(kind) && dayTab !== '전체' ? all.filter(function (w) { return (w.days || []).indexOf(dayTab) > -1; }) : all;
    var rows = list.slice().sort(function (a, b) {
      return sortBy === 'views' ? (b.views - a.views) : (new Date(b.last_at || b.updated_at) - new Date(a.last_at || a.updated_at));
    });
    return (serial(kind) ? dayTabs() : '') + '<div class="cm-grid-head"><span>' + (serial(kind) && dayTab !== '전체' ? dayTab + '요일' : '전체') + ' <b>' + list.length + '</b></span><span class="cm-grid-tools">' +
      (admin() ? '<a class="cm-up-btn" href="#cedit/work/new/' + kind + '">＋ 작품 올리기</a>' : '') +
      '<select data-sort aria-label="정렬"><option value="update"' + (sortBy === 'update' ? ' selected' : '') + '>업데이트순</option><option value="views"' + (sortBy === 'views' ? ' selected' : '') + '>인기순</option></select></span></div>' +
      (list.length ? '<ul class="cm-grid">' + rows.map(function (w) {
        return '<li><a href="#contents/' + kind + '/' + w.id + '"><span class="cm-grid-cover">' + (w.cover_url ? '<img src="' + safe(w.cover_url) + '" alt="" loading="lazy">' : '<i>' + safe(w.title) + '</i>') +
          (isNew(w.last_at) ? '<b class="cm-upb">UP</b>' : '') + (w.published ? '' : '<b class="cm-hideb">비공개</b>') + '</span>' +
          '<strong>' + safe(w.title) + '</strong><span>' + safe(w.author || '가뭄') + '</span></a></li>';
      }).join('') + '</ul>' : '<p class="cm-empty">' + (all.length ? dayTab + '요일에 연재하는 작품이 없습니다.' : '아직 올라온 ' + kname(kind) + ' 작품이 없습니다.<br>곧 첫 작품으로 찾아뵙겠습니다.') + '</p>');
  }
  var cache = {};
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-day]'); if (!b) return;
    dayTab = b.getAttribute('data-day'); var k = (location.hash.slice(1).split('/')[1] || 'webtoon');
    if (cache[k]) fill('cm-works', grid(cache[k], k));
  });
  document.addEventListener('change', function (e) {
    if (!(e.target.matches && e.target.matches('[data-sort]'))) return;
    sortBy = e.target.value; var k = (location.hash.slice(1).split('/')[1] || 'webtoon');
    if (cache[k]) fill('cm-works', grid(cache[k], k));
  });
  function contents() {
    var p = location.hash.slice(1).split('/'), kind = p[1] || 'webtoon';
    if (p[3]) return episodePage(Number(p[3]));
    if (p[2]) return workPage(Number(p[2]));
    setTimeout(function () {
      rpc('cm_works', { p_kind: kind, p_token: token() }).then(function (list) { cache[kind] = list; fill('cm-works', grid(list, kind)); }).catch(fail('cm-works'));
    });
    return '<h1 class="cm-sr">콘텐츠</h1>' + tabs(kind) + slot('cm-works');
  }

  function workPage(id) {
    setTimeout(function () {
      rpc('cm_work', { p_id: id, p_token: token() }).then(function (w) {
        if (!w) return fill('cm-work', '<p class="cm-empty">없거나 아직 공개되지 않은 작품입니다.</p>');
        var eps = w.episodes;
        fill('cm-work', '<a class="back-link" href="#contents/' + w.kind + '">← ' + kname(w.kind) + ' 목록으로</a>' +
          '<section class="cm-work-head">' + (w.cover_url ? '<img src="' + safe(w.cover_url) + '" alt="">' : '') + '<div><span class="cm-cv-kind">' + kname(w.kind) + '</span><h1>' + safe(w.title) + hidden(w.published) + '</h1><p class="cm-meta">' + safe(w.author || '가뭄') + '<i></i>' + eps.length + '편</p>' + (w.intro ? '<div class="cm-work-intro-full">' + para(w.intro) + '</div>' : '') +
          (eps.length ? '<a class="cm-btn cm-first" href="#contents/' + w.kind + '/' + w.id + '/' + eps[0].id + '">첫 화 보기</a>' : '') + '</div></section>' +
          (w.mine ? '<div class="cm-admin-bar"><a class="cm-btn" href="#cedit/ep/' + w.id + '/new">＋ 회차 올리기</a><a class="cm-btn cm-btn-line" href="#cedit/work/' + w.id + '">작품 고치기</a></div>' : '') +
          (eps.length ? '<ul class="cm-eps">' + eps.slice().reverse().map(function (e) {
            return '<li><a href="#contents/' + w.kind + '/' + w.id + '/' + e.id + '">' + (w.kind === 'webtoon' ? '<span class="cm-ep-thumb">' + (e.thumb ? '<img src="' + safe(e.thumb) + '" alt="" loading="lazy">' : '') + '</span>' : '') +
              '<span class="cm-work-body"><strong>' + e.no + '화 · ' + safe(e.title) + hidden(e.published) + '</strong><span class="cm-meta">' + (e.ref ? safe(e.ref) + '<i></i>' : '') + day(e.created_at) + '</span></span></a></li>';
          }).join('') + '</ul>' : '<p class="cm-empty">아직 올라온 회차가 없습니다.</p>'));
      }).catch(fail('cm-work'));
    });
    return slot('cm-work');
  }

  function episodePage(id) {
    setTimeout(function () {
      rpc('cm_episode', { p_id: id, p_token: token() }).then(function (e) {
        if (!e) return fill('cm-ep', '<p class="cm-empty">없거나 아직 공개되지 않은 회차입니다.</p>');
        var base = '#contents/' + e.kind + '/' + e.work_id + '/';
        var v = yt(e.video_url), body = '';
        if (e.images && e.images.length) body += '<div class="cm-toon">' + e.images.map(function (u, i) { return '<img src="' + safe(u) + '" alt="' + (i + 1) + '번째 컷" loading="' + (i < 2 ? 'eager' : 'lazy') + '">'; }).join('') + '</div>';
        if (v) body += '<div class="cm-yt"><iframe src="https://www.youtube-nocookie.com/embed/' + v + '" title="' + safe(e.title) + '" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>';
        if (e.body) body += '<div class="cm-reader">' + para(e.body) + '</div>';
        var nav = '<nav class="cm-prevnext" aria-label="이전·다음 화">' + (e.prev ? '<a href="' + base + e.prev + '">← 이전 화</a>' : '<span></span>') + '<a href="#contents/' + e.kind + '/' + e.work_id + '">목록</a>' + (e.next ? '<a href="' + base + e.next + '">다음 화 →</a>' : '<span></span>') + '</nav>';
        fill('cm-ep', '<a class="back-link" href="#contents/' + e.kind + '/' + e.work_id + '">← ' + safe(e.work_title) + '</a>' +
          '<article class="cm-read cm-ep-read"><span class="cm-cv-kind">' + safe(e.work_title) + '</span><h1>' + e.no + '화 · ' + safe(e.title) + hidden(e.published) + '</h1>' +
          '<p class="cm-meta">' + (e.ref ? '<b>' + safe(e.ref) + '</b><i></i>' : '') + safe(e.author || '가뭄') + '<i></i>' + day(e.created_at) + '<i></i>조회 ' + e.views + '</p>' +
          (e.mine ? '<div class="cm-admin-bar"><a class="cm-btn cm-btn-line" href="#cedit/ep/' + e.work_id + '/' + e.id + '">이 회차 고치기</a></div>' : '') +
          body + nav + '</article>');
      }).catch(fail('cm-ep'));
    });
    return slot('cm-ep');
  }

  /* 관리자: 그림 올리기 */
  function shrink(file, maxW) {
    return new Promise(function (ok) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return ok(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w <= maxW && file.size < 1.5e6) return ok(file);
        var s = Math.min(1, maxW / w), cw = Math.round(w * s), ch = Math.round(h * s);
        if (ch > 16000) return ok(file);
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        c.toBlob(function (b) { ok(b && b.size < file.size ? new File([b], 'img.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
      img.src = url;
    });
  }
  function upload(files, maxW, onStep) {
    return Promise.all(files.map(function (f) { return shrink(f, maxW); })).then(function (fs) {
      return fetch(A.url + '/functions/v1/cm-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: A.key },
        body: JSON.stringify({ token: token(), files: fs.map(function (f) { return { type: f.type }; }) }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.message || '올리지 못했습니다.'); return d.uploads; }); })
        .then(function (ups) {
          var done = 0;
          return Promise.all(ups.map(function (u, i) {
            return fetch(u.signedUrl, { method: 'PUT', headers: { 'Content-Type': fs[i].type }, body: fs[i] }).then(function (r) {
              if (!r.ok) throw new Error((i + 1) + '번째 그림을 올리지 못했습니다.');
              done++; if (onStep) onStep(done, ups.length); return u.publicUrl;
            });
          }));
        });
    });
  }

  function cedit() {
    if (!admin()) { return '<a class="back-link" href="#contents">← 콘텐츠로</a><p class="cm-empty">작가만 쓸 수 있는 화면입니다. <a href="#login">로그인</a></p>'; }
    var p = location.hash.slice(1).split('/');
    return p[1] === 'ep' ? epForm(Number(p[2]), p[3] === 'new' ? 0 : Number(p[3])) : workForm(p[2] === 'new' ? 0 : Number(p[2]), p[3] || 'webtoon');
  }
  function workForm(id, kind) {
    if (id) setTimeout(function () {
      rpc('cm_work', { p_id: id, p_token: token() }).then(function (w) {
        var f = document.querySelector('[data-work-form]'); if (!f || !w) return;
        f.elements.kind.value = w.kind; f.elements.title.value = w.title; f.elements.author.value = w.author; f.elements.intro.value = w.intro;
        f.elements.cover.value = w.cover_url || ''; f.elements.pub.checked = w.published; preview(f.elements.cover.value);
        f.querySelectorAll('[name=day]').forEach(function (c) { c.checked = (w.days || []).indexOf(c.value) > -1; });
      });
    });
    return '<a class="back-link" href="' + (id ? '#contents/x/' + id : '#contents/' + kind) + '">← 돌아가기</a><section class="cm-page-head"><h1>' + (id ? '작품 고치기' : '작품 올리기') + '</h1></section>' +
      '<form class="cm-form cm-wform" data-work-form="' + id + '">' +
      '<label>종류<select name="kind">' + KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (k[0] === kind ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></label>' +
      '<label>작품 제목<input name="title" required maxlength="80"></label>' +
      '<label>작가<input name="author" maxlength="40" placeholder="예: 가뭄 편집부"></label>' +
      '<label>작품 소개<textarea name="intro" rows="4" maxlength="1000"></textarea></label>' +
      '<fieldset class="cm-dayset"><legend>연재 요일 (웹툰·웹소설)</legend>' + DAYS.map(function (d) { return '<label><input type="checkbox" name="day" value="' + d + '"> ' + d + '</label>'; }).join('') + '</fieldset>' +
      '<div class="cm-upbox"><span>표지 그림 (가로 3 : 세로 4 비율 권장)</span><div class="cm-cover-prev" data-cover-prev></div><input type="hidden" name="cover"><label class="cm-btn cm-btn-line cm-filebtn">표지 고르기<input type="file" accept="image/*" data-cover-file hidden></label><p class="cm-form-note" data-up-msg hidden></p></div>' +
      '<label class="cm-check"><input type="checkbox" name="pub"> <span>공개하기 (끄면 작가와 관리자에게만 보입니다)</span></label>' +
      '<button class="cm-btn" type="submit">저장</button><p class="cm-error" data-wmsg hidden></p>' +
      (id ? '<button class="cm-btn cm-btn-danger" type="button" data-work-del="' + id + '">작품 지우기 (회차도 모두 지워집니다)</button>' : '') + '</form>';
  }
  function preview(u) { var b = document.querySelector('[data-cover-prev]'); if (b) b.innerHTML = u ? '<img src="' + safe(u) + '" alt="표지 미리보기">' : ''; }

  function epForm(workId, id) {
    setTimeout(function () {
      rpc('cm_work', { p_id: workId, p_token: token() }).then(function (w) {
        var f = document.querySelector('[data-ep-form]'); if (!f || !w) return;
        f.setAttribute('data-kind', w.kind);
        document.querySelector('[data-ep-work]').textContent = w.title + ' · ' + kname(w.kind);
        f.querySelectorAll('[data-for]').forEach(function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(w.kind) < 0; });
        if (!id) f.elements.no.value = (w.episodes.reduce(function (m, e) { return Math.max(m, e.no); }, 0) + 1);
      });
      if (id) rpc('cm_episode', { p_id: id, p_token: token() }).then(function (e) {
        var f = document.querySelector('[data-ep-form]'); if (!f || !e) return;
        f.elements.no.value = e.no; f.elements.title.value = e.title; f.elements.ref.value = e.ref; f.elements.body.value = e.body;
        f.elements.video.value = e.video_url || ''; f.elements.pub.checked = e.published; imgs = e.images.slice(); drawImgs();
      });
    });
    imgs = [];
    return '<a class="back-link" href="#contents/x/' + workId + '">← 작품으로</a><section class="cm-page-head"><h1>' + (id ? '회차 고치기' : '회차 올리기') + '</h1><p data-ep-work></p></section>' +
      '<form class="cm-form cm-wform" data-ep-form="' + id + '" data-work="' + workId + '">' +
      '<div class="cm-guest-row"><label>몇 화<input name="no" type="number" min="0" required></label><label>성경 구절 (선택)<input name="ref" maxlength="60" placeholder="예: 루카 14,16-24"></label></div>' +
      '<label>회차 제목<input name="title" required maxlength="80"></label>' +
      '<div class="cm-upbox" data-for="webtoon essay novel"><span>그림 (웹툰은 위에서 아래 순서대로 붙습니다)</span><div class="cm-imgs" data-imgs></div>' +
      '<label class="cm-btn cm-btn-line cm-filebtn">그림 고르기 (여러 장 가능)<input type="file" accept="image/*" multiple data-ep-files hidden></label><p class="cm-form-note" data-up-msg hidden></p></div>' +
      '<label data-for="video audio">유튜브 주소<input name="video" placeholder="https://youtu.be/..."></label>' +
      '<label data-for="novel essay webtoon video audio">글 (선택 · 웹소설과 묵상글은 본문)<textarea name="body" rows="10" maxlength="50000"></textarea></label>' +
      '<label class="cm-check"><input type="checkbox" name="pub"> <span>공개하기 (끄면 작가와 관리자에게만 보입니다)</span></label>' +
      '<button class="cm-btn" type="submit">저장</button><p class="cm-error" data-wmsg hidden></p>' +
      (id ? '<button class="cm-btn cm-btn-danger" type="button" data-ep-del="' + id + '">이 회차 지우기</button>' : '') + '</form>';
  }
  var imgs = [];
  function drawImgs() {
    var b = document.querySelector('[data-imgs]'); if (!b) return;
    b.innerHTML = imgs.map(function (u, i) {
      return '<figure><img src="' + safe(u) + '" alt=""><figcaption>' + (i + 1) + '</figcaption><div><button type="button" data-img-up="' + i + '" aria-label="앞으로">↑</button><button type="button" data-img-down="' + i + '" aria-label="뒤로">↓</button><button type="button" data-img-del="' + i + '" aria-label="빼기">✕</button></div></figure>';
    }).join('');
  }
  function upMsg(t) { var m = document.querySelector('[data-up-msg]'); if (m) { m.textContent = t; m.hidden = !t; } }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches && t.matches('[data-cover-file]') && t.files[0]) {
      upMsg('표지를 올리는 중…');
      upload([t.files[0]], 900).then(function (u) { document.querySelector('[data-work-form]').elements.cover.value = u[0]; preview(u[0]); upMsg(''); }).catch(function (err) { upMsg(err.message); });
    }
    if (t.matches && t.matches('[data-ep-files]') && t.files.length) {
      var fs = Array.prototype.slice.call(t.files).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
      upMsg('그림 ' + fs.length + '장을 올리는 중…');
      upload(fs, 1080, function (d, n) { upMsg('그림 올리는 중… ' + d + ' / ' + n); }).then(function (us) { imgs = imgs.concat(us); drawImgs(); upMsg(fs.length + '장을 올렸습니다. 저장을 눌러야 회차에 반영됩니다.'); t.value = ''; })
        .catch(function (err) { upMsg(err.message); });
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-img-up],[data-img-down],[data-img-del],[data-work-del],[data-ep-del]'); if (!b) return;
    if (b.hasAttribute('data-img-del')) { imgs.splice(Number(b.getAttribute('data-img-del')), 1); return drawImgs(); }
    if (b.hasAttribute('data-img-up') || b.hasAttribute('data-img-down')) {
      var i = Number(b.getAttribute('data-img-up') || b.getAttribute('data-img-down')), j = b.hasAttribute('data-img-up') ? i - 1 : i + 1;
      if (j < 0 || j >= imgs.length) return; var x = imgs[i]; imgs[i] = imgs[j]; imgs[j] = x; return drawImgs();
    }
    if (b.hasAttribute('data-work-del')) {
      if (!window.confirm('작품과 모든 회차를 지울까요? 되돌릴 수 없습니다.')) return;
      rpc('cm_work_delete', { p_token: token(), p_id: Number(b.getAttribute('data-work-del')) }).then(function () { location.hash = '#contents'; }).catch(function (err) { window.alert(err.message); });
      return;
    }
    if (!window.confirm('이 회차를 지울까요?')) return;
    var w = document.querySelector('[data-ep-form]').getAttribute('data-work');
    rpc('cm_episode_delete', { p_token: token(), p_id: Number(b.getAttribute('data-ep-del')) }).then(function () { location.hash = '#contents/x/' + w; }).catch(function (err) { window.alert(err.message); });
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-work-form],[data-ep-form]'); if (!f) return;
    e.preventDefault();
    var btn = f.querySelector('button[type=submit]'), msg = f.querySelector('[data-wmsg]'); btn.disabled = true;
    var call;
    if (f.hasAttribute('data-work-form')) {
      var id = Number(f.getAttribute('data-work-form')) || null;
      call = rpc('cm_work_save', { p_token: token(), p_id: id, p_kind: f.elements.kind.value, p_title: f.elements.title.value, p_author: f.elements.author.value, p_intro: f.elements.intro.value, p_cover_url: f.elements.cover.value, p_published: f.elements.pub.checked,
        p_days: Array.prototype.filter.call(f.querySelectorAll('[name=day]'), function (c) { return c.checked; }).map(function (c) { return c.value; }) })
        .then(function (nid) { location.hash = '#contents/' + f.elements.kind.value + '/' + nid; });
    } else {
      var eid = Number(f.getAttribute('data-ep-form')) || null, wid = Number(f.getAttribute('data-work'));
      call = rpc('cm_episode_save', { p_token: token(), p_id: eid, p_work: wid, p_no: Number(f.elements.no.value), p_title: f.elements.title.value, p_ref: f.elements.ref.value, p_body: f.elements.body.value, p_video_url: f.elements.video.value, p_images: imgs, p_published: f.elements.pub.checked })
        .then(function (nid) { location.hash = '#contents/' + (f.getAttribute('data-kind') || 'webtoon') + '/' + wid + '/' + nid; });
    }
    call.catch(function (err) { btn.disabled = false; msg.textContent = err.message; msg.hidden = false; });
  });

  var P = window.CM_PAGES = window.CM_PAGES || {};
  P.contents = contents; P.cedit = cedit;
})();
