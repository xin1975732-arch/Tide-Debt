(function() {
  var DEFAULT_CONFIG = {
    enabled: false,
    apiBase: '',
    bookId: 'weitu',
    chapterId: 'chapter-01',
    nicknameStorageKey: 'wt_comment_nickname',
    emailStorageKey: 'wt_comment_email'
  };

  var cfg = Object.assign({}, DEFAULT_CONFIG, window.WT_COMMENT_CONFIG || {});
  var panelState = {
    activeParagraphId: null,
    previousFocus: null
  };

  function safeText(value) {
    return String(value == null ? '' : value).trim();
  }

  function escapeHtml(value) {
    return safeText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeSelector(value) {
    return String(value).replace(/([\\\[\]#.:!\+\>\*\~\=\^\$\|\s])/g, '\\$1');
  }

  function isMobile() {
    return window.matchMedia('(max-width: 700px)').matches;
  }

  function ensureStyles() {
    if (document.getElementById('wt-comment-styles')) {
      return;
    }
    var style = document.createElement('style');
    style.id = 'wt-comment-styles';
    style.textContent = [
      '.wt-paragraph { position: relative; margin: 0 0 1.2em; padding: 8px 12px 8px 8px; border-radius: 12px; transition: background .18s ease, box-shadow .18s ease; scroll-margin-top: 96px; }',
      '.wt-paragraph:hover, .wt-paragraph:focus-within { background: rgba(233,176,74,.05); box-shadow: inset 0 0 0 1px rgba(233,176,74,.22); }',
      '.wt-paragraph[data-has-comments="true"]::after { content: attr(data-comment-count); position: absolute; right: 10px; top: 10px; min-width: 1.5em; height: 1.5em; display: grid; place-items: center; padding: 0 .45em; border-radius: 999px; background: rgba(233,176,74,.12); border: 1px solid rgba(233,176,74,.26); color: var(--lamp, #E9B04A); font: 12px/1.2 var(--sans, sans-serif); letter-spacing: .02em; }',
      '.wt-paragraph[data-has-comments="false"]::after { content: ""; }',
      '.wt-comment-button { position: absolute; right: 12px; top: 10px; width: 24px; height: 24px; border-radius: 999px; border: 1px solid rgba(233,176,74,.3); background: rgba(233,176,74,.12); color: var(--lamp, #E9B04A); cursor: pointer; opacity: 0; transform: translateY(-4px); transition: opacity .16s ease, transform .16s ease; z-index: 10; }',
      '.wt-paragraph:hover .wt-comment-button, .wt-paragraph:focus-within .wt-comment-button, .wt-comment-button:focus-visible { opacity: 1; transform: none; }',
      '.wt-comment-button[aria-pressed="true"] { opacity: 1; transform: none; }',
      '.wt-panel { position: fixed; inset: auto 0 0 0; z-index: 110; display: grid; pointer-events: none; opacity: 0; transition: opacity .22s ease; }',
      '.wt-panel.open { opacity: 1; pointer-events: auto; }',
      '.wt-panel-shell { width: min(100vw, 480px); height: min(82vh, 760px); margin-left: auto; background: rgba(17,21,23,.98); border: 1px solid rgba(233,176,74,.18); border-radius: 18px 18px 0 0; box-shadow: 0 -18px 30px -20px rgba(0,0,0,.88); display: grid; grid-template-rows: auto 1fr auto; overflow: hidden; }',
      '@media (min-width: 760px) { .wt-panel { inset: 0 0 0 auto; } .wt-panel-shell { width: min(420px, 34vw); height: 100vh; border-radius: 20px 0 0 20px; } }',
      '.wt-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px 12px; border-bottom: 1px solid rgba(233,176,74,.12); }',
      '.wt-panel-kicker { font: 10px/1.2 var(--sans, sans-serif); letter-spacing: .18em; color: var(--ink-3, #7F8684); text-transform: uppercase; }',
      '.wt-panel-title { font-size: .98rem; color: var(--ink, #E3DED2); letter-spacing: .08em; }',
      '.wt-close-btn { width: 34px; height: 34px; border: 1px solid rgba(233,176,74,.2); border-radius: 999px; background: transparent; color: var(--ink, #E3DED2); cursor: pointer; }',
      '.wt-panel-body { overflow: auto; padding: 14px 16px; display: grid; gap: 14px; }',
      '.wt-quote-box { background: rgba(255,255,255,.02); border: 1px solid rgba(233,176,74,.12); border-radius: 12px; padding: 10px 12px; }',
      '.wt-quote-label { font: 10px/1.2 var(--sans, sans-serif); letter-spacing: .18em; color: var(--ink-3, #7F8684); text-transform: uppercase; margin-bottom: 8px; }',
      '.wt-quote-text { white-space: pre-wrap; word-break: break-word; color: var(--ink-2, #B3AEA2); font-size: .94rem; line-height: 1.8; }',
      '.wt-comment-list { display: grid; gap: 10px; }',
      '.wt-comment-item { border: 1px solid rgba(233,176,74,.12); border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,.015); }',
      '.wt-comment-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; color: var(--ink-3, #7F8684); font: 10px/1.2 var(--sans, sans-serif); letter-spacing: .08em; }',
      '.wt-comment-author { color: var(--ink, #E3DED2); font-weight: 700; }',
      '.wt-comment-body { white-space: pre-wrap; word-break: break-word; color: var(--ink, #E3DED2); font-size: .92rem; line-height: 1.75; }',
      '.wt-panel-form { border-top: 1px solid rgba(233,176,74,.12); padding: 14px 16px 18px; display: grid; gap: 10px; }',
      '.wt-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }',
      '.wt-field { display: grid; gap: 6px; font: 10px/1.2 var(--sans, sans-serif); letter-spacing: .1em; color: var(--ink-3, #7F8684); }',
      '.wt-field input, .wt-field textarea { width: 100%; border: 1px solid rgba(233,176,74,.2); background: rgba(255,255,255,.02); border-radius: 10px; color: var(--ink, #E3DED2); padding: 10px 12px; resize: vertical; }',
      '.wt-field textarea { min-height: 126px; }',
      '.wt-submit-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }',
      '.wt-submit-info { font: 10px/1.5 var(--sans, sans-serif); letter-spacing: .05em; color: var(--ink-3, #7F8684); }',
      '.wt-submit-btn { padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(233,176,74,.35); background: rgba(233,176,74,.1); color: var(--ink, #E3DED2); cursor: pointer; }',
      '.wt-status-box { border: 1px dashed rgba(233,176,74,.22); border-radius: 12px; padding: 12px; color: var(--ink-2, #B3AEA2); background: rgba(255,255,255,.015); font-size: .9rem; line-height: 1.8; }',
      '.wt-empty-state { border: 1px dashed rgba(233,176,74,.24); border-radius: 12px; padding: 12px; color: var(--ink-3, #7F8684); font-size: .9rem; line-height: 1.7; }',
      '.wt-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.36); opacity: 0; pointer-events: none; transition: opacity .2s ease; z-index: 100; }',
      '.wt-panel-overlay.visible { opacity: 1; pointer-events: auto; }',
      '@media (max-width: 500px) { .wt-field-row { grid-template-columns: 1fr; } }'
    ].join('');
    document.head.appendChild(style);
  }

  function ensurePanel() {
    var existing = document.getElementById('wt-comment-panel');
    if (existing) {
      return existing;
    }

    var overlay = document.createElement('div');
    overlay.className = 'wt-panel-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    var panel = document.createElement('aside');
    panel.id = 'wt-comment-panel';
    panel.className = 'wt-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-label', '段落评论');
    panel.hidden = true;
    panel.innerHTML = [
      '<div class="wt-panel-shell">',
      '  <div class="wt-panel-header">',
      '    <div>',
      '      <div class="wt-panel-kicker">段落评论</div>',
      '      <div class="wt-panel-title">正文留言</div>',
      '    </div>',
      '    <button type="button" class="wt-close-btn" aria-label="关闭评论面板">×</button>',
      '  </div>',
      '  <div class="wt-panel-body">',
      '    <div class="wt-quote-box">',
      '      <div class="wt-quote-label">原文</div>',
      '      <div class="wt-quote-text"></div>',
      '    </div>',
      '    <div class="wt-comment-list"></div>',
      '  </div>',
      '  <div class="wt-panel-form">',
      '    <div class="wt-field-row">',
      '      <label class="wt-field"><span>昵称</span><input type="text" name="nickname" maxlength="24" placeholder="自填署名" /></label>',
      '      <label class="wt-field"><span>邮箱（可选，不公开）</span><input type="email" name="email" maxlength="64" placeholder="仅用于管理员联系" /></label>',
      '    </div>',
      '    <label class="wt-field"><span>留言</span><textarea name="content" maxlength="500" placeholder="请勿透露后续章节情节"></textarea></label>',
      '    <div class="wt-submit-row">',
      '      <div class="wt-submit-info">昵称仅为自填署名，不等于实名或已验证身份</div>',
      '      <button type="button" class="wt-submit-btn">提交留言</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    panel.querySelector('.wt-close-btn').addEventListener('click', function() {
      closePanel();
    });
    overlay.addEventListener('click', function() {
      closePanel();
    });
    panel.querySelector('.wt-submit-btn').addEventListener('click', submitComment);
    panel.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closePanel();
      }
    });

    return panel;
  }

  function setPanelOpen(open) {
    var panel = ensurePanel();
    panel.classList.toggle('open', !!open);
    panel.hidden = !open;
    var overlay = document.querySelector('.wt-panel-overlay');
    if (overlay) {
      overlay.classList.toggle('visible', !!open);
    }
    if (open) {
      setTimeout(function() {
        var nicknameInput = panel.querySelector('input[name="nickname"]');
        if (nicknameInput) {
          nicknameInput.focus();
        }
      }, 80);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    if (panelState.previousFocus && panelState.previousFocus.focus) {
      panelState.previousFocus.focus();
    }
    panelState.activeParagraphId = null;
  }

  function renderCommentList(items) {
    var panel = ensurePanel();
    var list = panel.querySelector('.wt-comment-list');
    if (!items || !items.length) {
      list.innerHTML = '<div class="wt-empty-state">暂无留言，先写下你的看法。</div>';
      return;
    }

    list.innerHTML = items.map(function(item) {
      var replies = Array.isArray(item.replies) ? item.replies : [];
      var replyHtml = replies.length ? '<div class="wt-reply-list">' + replies.map(function(reply) {
        return '<div class="wt-comment-item"><div class="wt-comment-head"><span class="wt-comment-author">' + escapeHtml(reply.nickname || '读者') + '</span><span>' + escapeHtml(reply.createdAt || '') + '</span></div><div class="wt-comment-body">' + escapeHtml(reply.content || '') + '</div></div>';
      }).join('') + '</div>' : '';
      return '<div class="wt-comment-item">' +
        '<div class="wt-comment-head"><span class="wt-comment-author">' + escapeHtml(item.nickname || '读者') + '</span><span>' + escapeHtml(item.createdAt || '') + '</span></div>' +
        '<div class="wt-comment-body">' + escapeHtml(item.content || '') + '</div>' + replyHtml +
      '</div>';
    }).join('');
  }

  function showServiceUnavailable(message) {
    var panel = ensurePanel();
    var list = panel.querySelector('.wt-comment-list');
    list.innerHTML = '<div class="wt-status-box">' + escapeHtml(message || '评论服务尚未配置') + '</div>';
  }

  function fetchComments(paragraphId) {
    var panel = ensurePanel();
    var list = panel.querySelector('.wt-comment-list');
    list.innerHTML = '<div class="wt-empty-state">正在加载评论…</div>';

    if (!cfg.enabled || !cfg.apiBase) {
      showServiceUnavailable('评论服务尚未配置。请先配置后端 API。');
      return;
    }

    var url = cfg.apiBase.replace(/\/$/, '') + '/api/books/' + encodeURIComponent(cfg.bookId) + '/comments?chapterId=' + encodeURIComponent(cfg.chapterId) + '&paragraphId=' + encodeURIComponent(paragraphId) + '&type=paragraph';

    fetch(url, {
      headers: { 'Content-Type': 'application/json' }
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('load failed');
      }
      return response.json();
    }).then(function(payload) {
      if (!payload || !Array.isArray(payload.items)) {
        renderCommentList([]);
        return;
      }
      renderCommentList(payload.items);
    }).catch(function() {
      list.innerHTML = '<div class="wt-status-box">评论加载失败。请检查评论后端是否在线，或稍后重试。</div>';
    });
  }

  function openPanel(paragraphId, text, button) {
    var panel = ensurePanel();
    if (button && button.focus) {
      panelState.previousFocus = button;
    }
    panelState.activeParagraphId = paragraphId;
    panel.querySelector('.wt-panel-title').textContent = '正文留言';
    panel.querySelector('.wt-quote-text').textContent = text || '原段落已调整';
    panel.querySelector('input[name="nickname"]').value = safeText(localStorage.getItem(cfg.nicknameStorageKey) || '');
    panel.querySelector('input[name="email"]').value = safeText(localStorage.getItem(cfg.emailStorageKey) || '');
    panel.querySelector('textarea[name="content"]').value = '';

    if (!cfg.enabled || !cfg.apiBase) {
      showServiceUnavailable('评论服务尚未配置。页面仍可阅读，但留言功能需要后端启用后才可提交。');
    } else {
      fetchComments(paragraphId);
    }

    setPanelOpen(true);
  }

  function submitComment() {
    var panel = ensurePanel();
    var nickname = safeText(panel.querySelector('input[name="nickname"]').value) || '读者';
    var email = safeText(panel.querySelector('input[name="email"]').value);
    var content = safeText(panel.querySelector('textarea[name="content"]').value);

    if (!cfg.enabled || !cfg.apiBase) {
      alert('评论服务尚未配置');
      return;
    }
    if (!content) {
      alert('请填写留言内容');
      return;
    }

    localStorage.setItem(cfg.nicknameStorageKey, nickname);
    if (email) {
      localStorage.setItem(cfg.emailStorageKey, email);
    }

    var payload = {
      bookId: cfg.bookId,
      chapterId: cfg.chapterId,
      paragraphId: panelState.activeParagraphId,
      type: 'paragraph',
      nickname: nickname,
      email: email,
      content: content,
      quoteText: panel.querySelector('.wt-quote-text').textContent
    };

    var button = panel.querySelector('.wt-submit-btn');
    button.disabled = true;
    button.textContent = '提交中…';

    fetch(cfg.apiBase.replace(/\/$/, '') + '/api/books/' + encodeURIComponent(cfg.bookId) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(response) {
      if (!response.ok) {
        return response.json().then(function(data) {
          throw new Error((data && data.message) || '提交失败');
        });
      }
      return response.json();
    }).then(function() {
      panel.querySelector('textarea[name="content"]').value = '';
      fetchComments(panelState.activeParagraphId);
    }).catch(function(error) {
      alert((error && error.message) || '提交失败，请稍后重试');
    }).then(function() {
      button.disabled = false;
      button.textContent = '提交留言';
    });
  }

  function attachParagraphButtons() {
    var paragraphNodes = document.querySelectorAll('p, .text p, .doc p, .chapter-text p, .reader-body p');
    Array.prototype.forEach.call(paragraphNodes, function(node) {
      var id = node.getAttribute('data-paragraph-id');
      if (!id) {
        id = 'para-' + cfg.chapterId + '-' + (node.dataset && node.dataset.index ? node.dataset.index : (Array.prototype.indexOf.call(paragraphNodes, node) + 1));
      }
      node.setAttribute('data-paragraph-id', id);
      node.classList.add('wt-paragraph');
      node.setAttribute('data-has-comments', 'false');
      node.setAttribute('data-comment-count', '0');

      if (!node.querySelector('.wt-comment-button')) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'wt-comment-button';
        button.setAttribute('aria-label', '段落评论');
        button.textContent = '💬';
        button.addEventListener('click', function(event) {
          event.preventDefault();
          event.stopPropagation();
          openPanel(id, node.textContent || '原文已调整', button);
        });
        node.appendChild(button);
      }
    });
  }

  function updateParagraphCommentCount(paragraphId, count) {
    var target = document.querySelector('[data-paragraph-id="' + escapeSelector(paragraphId) + '"]');
    if (!target) { return; }
    target.setAttribute('data-has-comments', count > 0 ? 'true' : 'false');
    target.setAttribute('data-comment-count', String(count));
  }

  function addChapterDiscussionToggle() {
    var blocks = document.querySelectorAll('.chapter-discussion, [data-chapter-thread], .chapter-thread');
    Array.prototype.forEach.call(blocks, function(block) {
      var button = block.querySelector('[data-toggle-thread]') || block.querySelector('button');
      var content = block.querySelector('.thread-content, [data-thread-content]');
      if (!button || !content) { return; }
      button.setAttribute('aria-expanded', 'false');
      content.hidden = true;
      button.addEventListener('click', function() {
        var open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        content.hidden = open;
      });
      if (!cfg.enabled || !cfg.apiBase) {
        var notice = document.createElement('div');
        notice.className = 'wt-status-box';
        notice.style.marginTop = '12px';
        notice.textContent = '评论服务尚未配置：本章讨论在后台配置后会显示真实留言。';
        content.appendChild(notice);
      }
    });
  }

  function addReviewBlock() {
    var review = document.querySelector('.reading-review, .final-review, [data-review-block]');
    if (!review) { return; }
    var button = review.querySelector('[data-toggle-review]') || review.querySelector('button');
    var content = review.querySelector('.review-content, [data-review-content]');
    if (!button || !content) { return; }
    review.setAttribute('data-open', 'false');
    content.hidden = true;
    button.addEventListener('click', function() {
      var open = review.getAttribute('data-open') === 'true';
      review.setAttribute('data-open', String(!open));
      content.hidden = open;
    });
    if (!cfg.enabled || !cfg.apiBase) {
      content.insertAdjacentHTML('beforeend', '<div class="wt-status-box">评论服务尚未配置：读后感需启用真实评论后端后才可保存全书交流。</div>');
    }
  }

  function bootstrap() {
    ensureStyles();
    attachParagraphButtons();
    addChapterDiscussionToggle();
    addReviewBlock();
    ensurePanel();

    if (!cfg.enabled || !cfg.apiBase) {
      var notice = document.createElement('div');
      notice.className = 'wt-status-box';
      notice.style.margin = '18px 0';
      notice.textContent = '评论服务尚未配置：当前仅保留阅读内容，真实评论功能需要后端启用后才会显示。';
      var anchors = document.querySelectorAll('.text, .doc, .chapter-text, article, .reader-main');
      if (anchors.length) {
        anchors[0].appendChild(notice);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }

  window.WT_COMMENT = {
    config: cfg,
    openPanel: openPanel,
    closePanel: closePanel,
    updateParagraphCommentCount: updateParagraphCommentCount
  };
})();
