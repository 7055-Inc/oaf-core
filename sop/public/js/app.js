(function () {
  const STORAGE_KEY = 'sop_session';
  const mainContent = document.getElementById('main-content');
  const sopNav = document.getElementById('sop-nav');

  function getDefaultLoginUrl() {
    var host = typeof window !== 'undefined' && window.location.hostname;
    if (!host) return 'https://brakebee.com/login';
    var base = host.replace(/^sop\./, '');
    return 'https://' + base + '/login';
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setSession(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function isTop() {
    var s = getSession();
    return s && s.user_type === 'top';
  }

  function renderLoginGate() {
    mainContent.innerHTML = `
      <div class="sop-login-card">
        <h1>Sign in with Brakebee</h1>
        <p>You must be logged in at Brakebee and enrolled in the SOP Catalog.</p>
        <a href="#" id="sop-login-link" class="sop-login-link">Sign in at Brakebee</a>
      </div>
    `;
    sopNav.innerHTML = '';

    fetch('/api/config', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        const loginUrl = (data.data && data.data.loginUrl) || getDefaultLoginUrl();
        const returnTo = encodeURIComponent(window.location.href);
        document.getElementById('sop-login-link').href = loginUrl + (loginUrl.indexOf('?') >= 0 ? '&' : '?') + 'returnTo=' + returnTo;
      })
      .catch(function () {
        document.getElementById('sop-login-link').href = getDefaultLoginUrl();
      });
  }

  var currentFolderId = null;
  var currentSopId = null;

  // URL routing helpers
  function updateUrl(view, id) {
    var path = '/';
    if (view === 'catalog') path = '/catalog' + (currentFolderId ? '/folder/' + currentFolderId : '');
    else if (view === 'sop-view' && id) path = '/sop/' + id;
    else if (view === 'sop-form' && id) path = '/sop/' + id + '/edit';
    else if (view === 'sop-form') path = '/sop/new';
    else if (view === 'manage-users') path = '/users';
    else if (view === 'dashboard') path = '/';
    if (window.location.pathname !== path) {
      history.pushState({ view: view, id: id, folderId: currentFolderId }, '', path);
    }
  }

  function parseUrl() {
    var path = window.location.pathname;
    if (path.match(/^\/sop\/(\d+)\/edit$/)) {
      var id = parseInt(path.match(/^\/sop\/(\d+)\/edit$/)[1], 10);
      return { view: 'sop-form', id: id };
    }
    if (path.match(/^\/sop\/new$/)) {
      return { view: 'sop-form', id: null };
    }
    if (path.match(/^\/sop\/(\d+)$/)) {
      var id = parseInt(path.match(/^\/sop\/(\d+)$/)[1], 10);
      return { view: 'sop-view', id: id };
    }
    if (path.match(/^\/catalog\/folder\/(\d+)$/)) {
      var fid = parseInt(path.match(/^\/catalog\/folder\/(\d+)$/)[1], 10);
      currentFolderId = fid;
      return { view: 'catalog', id: null };
    }
    if (path.match(/^\/catalog$/)) {
      return { view: 'catalog', id: null };
    }
    if (path.match(/^\/users$/)) {
      return { view: 'manage-users', id: null };
    }
    return { view: 'dashboard', id: null };
  }

  // Handle browser back/forward
  window.addEventListener('popstate', function (e) {
    if (e.state) {
      currentFolderId = e.state.folderId || null;
      showViewInternal(e.state.view, e.state.id);
    } else {
      var parsed = parseUrl();
      showViewInternal(parsed.view, parsed.id);
    }
  });

  function renderNav() {
    var html = '<a href="/" data-view="dashboard">Dashboard</a>';
    html += ' <a href="/catalog" data-view="catalog">Catalog</a>';
    if (isTop()) html += ' <a href="/users" data-view="manage-users">Manage users</a>';
    html += ' <a href="#" id="sop-logout">Sign out</a>';
    sopNav.innerHTML = html;
    sopNav.querySelectorAll('[data-view]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        showView(a.getAttribute('data-view'));
      });
    });
    document.getElementById('sop-logout').addEventListener('click', function (e) {
      e.preventDefault();
      clearSession();
      history.pushState({}, '', '/');
      checkAuth();
    });
  }

  function showViewInternal(view, id) {
    if (view === 'dashboard') renderDashboard();
    else if (view === 'manage-users') renderManageUsers();
    else if (view === 'catalog') renderCatalog();
    else if (view === 'sop-view' && id) renderSopView(id);
    else if (view === 'sop-form') renderSopForm(id || null);
  }

  function showView(view, id) {
    updateUrl(view, id);
    showViewInternal(view, id);
  }

  function renderDashboard() {
    mainContent.innerHTML = `
      <div class="sop-dashboard">
        <h1>Dashboard</h1>
        <p>Welcome to the SOP Catalog.</p>
        <ul class="sop-dashboard-links">
          <li><a href="#" data-view="catalog">Browse catalog</a></li>
          <li><a href="#" data-view="manage-users">Manage users</a> <span class="sop-meta">(Top only)</span></li>
        </ul>
      </div>
    `;
    if (!isTop()) mainContent.querySelector('[data-view="manage-users"]').closest('li').style.display = 'none';
    mainContent.querySelectorAll('[data-view]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); showView(a.getAttribute('data-view')); });
    });
    renderNav();
  }

  function renderBlockContent(content) {
    var blocks = [];
    if (content && typeof content === 'object' && content.blocks) blocks = content.blocks;
    else if (content && typeof content === 'string') {
      try {
        var p = JSON.parse(content);
        if (p && p.blocks) blocks = p.blocks;
      } catch (e) {
        if (content.trim()) return '<p class="sop-block-p">' + escapeHtml(content) + '</p>';
      }
    }
    if (!blocks.length) return '';
    return blocks.map(function (b) {
      var type = b.type;
      var data = b.data || {};
      switch (type) {
        case 'paragraph':
          return data.text ? '<p class="sop-block-p">' + data.text + '</p>' : '';
        case 'header':
          var level = data.level || 2;
          var tag = 'h' + level;
          return data.text ? '<' + tag + ' class="sop-block-h' + level + '">' + data.text + '</' + tag + '>' : '';
        case 'list':
          var listTag = data.style === 'ordered' ? 'ol' : 'ul';
          var items = (data.items || []).map(function (item) {
            var text = typeof item === 'string' ? item : (item.content || '');
            return '<li>' + text + '</li>';
          }).join('');
          return '<' + listTag + ' class="sop-block-list">' + items + '</' + listTag + '>';
        case 'quote':
          return data.text ? '<blockquote class="sop-block-quote"><p>' + data.text + '</p>' + (data.caption ? '<cite>— ' + escapeHtml(data.caption) + '</cite>' : '') + '</blockquote>' : '';
        case 'warning':
          return (data.title || data.message) ? '<div class="sop-block-warning">' + (data.title ? '<div class="sop-block-warning-title">' + escapeHtml(data.title) + '</div>' : '') + (data.message ? '<div class="sop-block-warning-msg">' + data.message + '</div>' : '') + '</div>' : '';
        case 'code':
          return data.code ? '<pre class="sop-block-code"><code>' + escapeHtml(data.code) + '</code></pre>' : '';
        case 'delimiter':
          return '<hr class="sop-block-delimiter">';
        case 'warning':
          return (data.title || data.message) ? '<div class="sop-block-warning">' + (data.title ? '<div class="sop-block-warning-title">' + escapeHtml(data.title) + '</div>' : '') + (data.message ? '<div class="sop-block-warning-msg">' + data.message + '</div>' : '') + '</div>' : '';
        default:
          return data.text ? '<p class="sop-block-p">' + data.text + '</p>' : '';
      }
    }).filter(Boolean).join('');
  }

  function renderCatalog() {
    renderNav();
    mainContent.innerHTML = `
      <div class="sop-catalog">
        <aside class="sop-catalog-sidebar">
          <h2>Folders</h2>
          <p><a href="#" class="sop-tree-folder sop-tree-root" data-folder-id="">Root</a></p>
          <div id="sop-tree-container">Loading…</div>
          ${isTop() ? '<p><button type="button" class="sop-btn-small sop-add-folder" data-parent-id="">+ Add folder (root)</button></p>' : ''}
        </aside>
        <div class="sop-catalog-main">
          <h2 class="sop-sop-list-title">SOPs</h2>
          <div id="sop-list-container">Loading…</div>
          ${isTop() ? '<p><a href="#" class="sop-btn" data-view="sop-form" data-id="">New SOP</a></p>' : '<p><a href="#" class="sop-btn" data-view="sop-form">Propose new SOP</a></p>'}
        </div>
      </div>
    `;
    var rootLink = mainContent.querySelector('.sop-tree-root');
    if (rootLink) {
      rootLink.addEventListener('click', function (e) {
        e.preventDefault();
        currentFolderId = null;
        updateUrl('catalog', null);
        loadSopList(null);
        rootLink.classList.add('sop-tree-active');
        mainContent.querySelectorAll('.sop-tree-folder:not(.sop-tree-root)').forEach(function (a) { a.classList.remove('sop-tree-active'); });
      });
    }

    // Bind the root "Add folder" button in the sidebar (outside tree container)
    var sidebarAddBtn = mainContent.querySelector('.sop-catalog-sidebar > p > .sop-add-folder');
    if (sidebarAddBtn) {
      sidebarAddBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var title = prompt('Folder title:');
        if (!title) return;
        fetch('/api/folders', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), parent_id: null })
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.success) renderCatalog();
            else alert(data.error || 'Failed');
          });
      });
    }

    function bindContentLinks() {
      mainContent.querySelectorAll('[data-view]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var view = el.getAttribute('data-view');
          var id = el.getAttribute('data-id');
          showView(view, id ? parseInt(id, 10) : null);
        });
      });
    }

    fetch('/api/folders', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var container = document.getElementById('sop-tree-container');
        if (!data.success || !data.data.length) {
          container.innerHTML = '<p class="sop-muted">No folders.</p>';
          if (isTop()) container.innerHTML += '<p><button type="button" class="sop-btn-small sop-add-folder" data-parent-id="">+ Add folder</button></p>';
          bindTreeActions(container);
          bindContentLinks();
          loadSopList(currentFolderId);
          return;
        }
        container.innerHTML = '<ul class="sop-tree">' + renderTree(data.data, null) + '</ul>';
        bindTreeActions(container);
        bindContentLinks();
      })
      .catch(function () {
        document.getElementById('sop-tree-container').innerHTML = '<p class="sop-error">Failed to load folders.</p>';
      });

    function renderTree(nodes, parentId) {
      return nodes.map(function (node) {
        var parentIdStr = parentId === undefined ? '' : (parentId || '');
        var isActive = currentFolderId === node.id;
        var sub = node.children && node.children.length ? '<ul>' + renderTree(node.children, node.id) + '</ul>' : '';
        var actions = isTop() ? '<span class="sop-tree-actions"><button class="sop-edit-folder" data-id="' + node.id + '" data-title="' + escapeHtml(node.title) + '" data-parent-id="' + (node.parent_id || '') + '">Edit</button><button class="sop-delete-folder" data-id="' + node.id + '">Delete</button><button class="sop-add-folder" data-parent-id="' + node.id + '">+</button></span>' : '';
        return '<li><a href="#" class="sop-tree-folder ' + (isActive ? 'sop-tree-active' : '') + '" data-folder-id="' + node.id + '">' + escapeHtml(node.title) + '</a>' + actions + sub + '</li>';
      }).join('');
    }

    function bindTreeActions(container) {
      if (!container) return;
      var selectFolder = function (folderId) {
        currentFolderId = folderId;
        updateUrl('catalog', null);
        renderCatalog();
      };
      container.querySelectorAll('.sop-tree-folder').forEach(function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var fid = a.getAttribute('data-folder-id');
          selectFolder(fid ? parseInt(fid, 10) : null);
        });
      });
      container.querySelectorAll('.sop-add-folder').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          var parentId = btn.getAttribute('data-parent-id');
          var title = prompt('Folder title:');
          if (!title) return;
          fetch('/api/folders', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim(), parent_id: parentId || null })
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) renderCatalog();
              else alert(data.error || 'Failed');
            });
        });
      });
      container.querySelectorAll('.sop-edit-folder').forEach(function (btn) {
        btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', function (e) {
          var id = btn.getAttribute('data-id');
          var title = prompt('Folder title:', btn.getAttribute('data-title'));
          if (title === null) return;
          fetch('/api/folders/' + id, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim() })
          })
            .then(function (r) { return r.json(); })
            .then(function (data) {
              if (data.success) renderCatalog();
              else alert(data.error || 'Failed');
            });
        });
      });
      container.querySelectorAll('.sop-delete-folder').forEach(function (btn) {
        btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
        btn.addEventListener('click', function (e) {
          if (!confirm('Delete this folder? SOPs inside will move to root.')) return;
          fetch('/api/folders/' + btn.getAttribute('data-id'), { method: 'DELETE', credentials: 'include' })
            .then(function (r) {
              if (r.status === 204) renderCatalog();
              else r.json().then(function (d) { alert(d.error || 'Failed'); });
            });
        });
      });
    }

    function loadSopList(folderId) {
      var url = '/api/sops?limit=100';
      url += '&folder_id=' + (folderId != null ? folderId : '');
      fetch(url, { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var el = document.getElementById('sop-list-container');
          if (!el) return;
          if (!data.success) { el.innerHTML = '<p class="sop-error">Failed to load SOPs.</p>'; return; }
          var list = data.data || [];
          if (!list.length) { el.innerHTML = '<p class="sop-muted">No SOPs in this folder.</p>'; return; }
          el.innerHTML = '<table class="sop-table"><thead><tr><th>Title</th><th>Status</th><th>Updated</th><th></th></tr></thead><tbody></tbody></table>';
          var tbody = el.querySelector('tbody');
          list.forEach(function (s) {
            var tr = document.createElement('tr');
            var updated = s.updated_at ? new Date(s.updated_at).toLocaleDateString() : '—';
            tr.innerHTML = '<td>' + escapeHtml(s.title) + '</td><td><span class="sop-status sop-status-' + (s.status || 'draft') + '">' + escapeHtml(s.status || 'draft') + '</span></td><td>' + updated + '</td><td><a href="#" data-view="sop-view" data-id="' + s.id + '">View</a>' + (isTop() ? ' <a href="#" data-view="sop-form" data-id="' + s.id + '">Edit</a>' : ' <a href="#" data-view="sop-form" data-id="' + s.id + '">Propose edit</a>') + '</td>';
            tbody.appendChild(tr);
          });
          mainContent.querySelectorAll('[data-view][data-id]').forEach(function (a) {
            a.addEventListener('click', function (e) {
              e.preventDefault();
              showView(a.getAttribute('data-view'), parseInt(a.getAttribute('data-id'), 10));
            });
          });
        })
        .catch(function () {
          var el = document.getElementById('sop-list-container');
          if (el) el.innerHTML = '<p class="sop-error">Failed to load SOPs.</p>';
        });
    }

    loadSopList(currentFolderId);
    if (currentFolderId === null && rootLink) rootLink.classList.add('sop-tree-active');
  }

  function renderSopView(id) {
    renderNav();
    mainContent.innerHTML = '<div class="sop-view"><p class="sop-view-breadcrumb">Loading…</p></div>';
    fetch('/api/sops/' + id, { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success || !data.data) {
          mainContent.innerHTML = '<div class="sop-view"><p class="sop-error">SOP not found.</p></div>';
          return;
        }
        var sop = data.data;
        var breadcrumb = data.breadcrumb || [];
        var bcHtml = '<a href="#" data-view="catalog">Catalog</a>';
        breadcrumb.forEach(function (f) {
          bcHtml += ' / <a href="#" data-view="catalog" data-folder-id="' + f.id + '">' + escapeHtml(f.title) + '</a>';
        });
        bcHtml += ' / ' + escapeHtml(sop.title);
        var block = function (label, val) {
          if (val == null || val === '') return '';
          var content = Array.isArray(val) ? renderBlockContent(val) : escapeHtml(String(val));
          return '<div class="sop-view-section"><h3>' + escapeHtml(label) + '</h3><div class="sop-block-content">' + content + '</div></div>';
        };
        var html = '<div class="sop-view">' +
          '<p class="sop-view-breadcrumb">' + bcHtml + '</p>' +
          '<h1>' + escapeHtml(sop.title) + '</h1>' +
          '<p class="sop-view-meta">Status: <span class="sop-status sop-status-' + (sop.status || 'draft') + '">' + escapeHtml(sop.status || 'draft') + '</span> · Last updated: ' + (sop.updated_at ? new Date(sop.updated_at).toLocaleString() : '—') + '</p>' +
          block('Owner role', sop.owner_role) +
          block('Change notes', sop.change_notes) +
          block('Purpose / Expected outcome', sop.purpose_expected_outcome) +
          block('When to use', sop.when_to_use) +
          block('When not to use', sop.when_not_to_use) +
          block('Standard workflow', sop.standard_workflow) +
          block('Exit points', sop.exit_points) +
          block('Escalation', sop.escalation) +
          block('Transfer', sop.transfer) +
          (sop.related_sop_ids && sop.related_sop_ids.length ? block('Related SOPs', sop.related_sop_ids.join(', ')) : '') +
          block('Additional information', sop.additional_information) +
          '<div class="sop-view-actions">' +
          '<a href="#" class="sop-btn" data-view="sop-form" data-id="' + id + '">' + (isTop() ? 'Edit' : 'Propose edit') + '</a>' +
          ' <a href="#" class="sop-btn-small" data-view="catalog">Back to catalog</a>' +
          '</div></div>';
        mainContent.innerHTML = html;
        mainContent.querySelectorAll('[data-view]').forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var view = a.getAttribute('data-view');
            var fid = a.getAttribute('data-id');
            var folderId = a.getAttribute('data-folder-id');
            if (view === 'catalog' && folderId !== null && folderId !== '') {
              currentFolderId = folderId ? parseInt(folderId, 10) : null;
              showView('catalog');
            } else {
              showView(view, fid ? parseInt(fid, 10) : null);
            }
          });
        });
      })
      .catch(function () {
        mainContent.innerHTML = '<div class="sop-view"><p class="sop-error">Failed to load SOP.</p></div>';
      });
  }

  function renderSopForm(sopId) {
    renderNav();
    var isNew = !sopId;
    mainContent.innerHTML = '<div class="sop-form"><p>Loading…</p></div>';
    function renderForm(sop, folders) {
      var rootSelected = (!sop || sop.folder_id == null) ? ' selected' : '';
      var folderOptions = '<option value=""' + rootSelected + '>— Root —</option>';
      (folders || []).forEach(function (f) {
        folderOptions += '<option value="' + f.id + '"' + (sop && sop.folder_id === f.id ? ' selected' : '') + '>' + escapeHtml(f.title) + '</option>';
      });
      var statusOpts = ['draft', 'proposed', 'active', 'deprecated', 'deleted'].map(function (s) {
        return '<option value="' + s + '"' + (sop && sop.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      var json = function (v) {
        if (v == null) return '';
        if (Array.isArray(v)) return JSON.stringify(v, null, 2);
        return typeof v === 'string' ? v : JSON.stringify(v);
      };
      var val = function (key, def) {
        return (sop && sop[key] != null) ? sop[key] : (def || '');
      };
      var blockFieldNames = ['standard_workflow', 'exit_points', 'escalation', 'transfer', 'additional_information'];
      var blockEditorHolders = blockFieldNames.map(function (k) {
        return '<label>' + (k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); })) + '</label><div id="sop-editor-' + k + '" class="sop-block-editor-holder"></div>';
      }).join('');
      mainContent.innerHTML = '<div class="sop-form">' +
        '<h1>' + (isNew ? 'New SOP' : (isTop() ? 'Edit SOP' : 'Propose edit')) + '</h1>' +
        '<form id="sop-form">' +
        '<label>Title</label><input type="text" name="title" value="' + escapeHtml(val('title')) + '" required>' +
        '<label>Folder</label><select name="folder_id">' + folderOptions + '</select>' +
        (isTop() ? '<label>Status</label><select name="status">' + statusOpts + '</select>' : '') +
        '<label>Owner role</label><input type="text" name="owner_role" value="' + escapeHtml(val('owner_role')) + '">' +
        '<label>Change notes</label><textarea name="change_notes">' + escapeHtml(val('change_notes')) + '</textarea>' +
        '<label>Purpose / Expected outcome</label><textarea name="purpose_expected_outcome">' + escapeHtml(val('purpose_expected_outcome')) + '</textarea>' +
        '<label>When to use</label><textarea name="when_to_use">' + escapeHtml(val('when_to_use')) + '</textarea>' +
        '<label>When not to use</label><textarea name="when_not_to_use">' + escapeHtml(val('when_not_to_use')) + '</textarea>' +
        blockEditorHolders +
        '<label>Related SOP IDs (comma-separated)</label><input type="text" name="related_sop_ids" value="' + escapeHtml(Array.isArray(val('related_sop_ids')) ? val('related_sop_ids').join(', ') : val('related_sop_ids')) + '" placeholder="e.g. 1, 2, 3">' +
        '<div class="sop-form-actions">' +
        '<button type="submit" class="sop-btn">' + (isNew ? (isTop() ? 'Create SOP' : 'Propose new SOP') : (isTop() ? 'Save' : 'Propose edit')) + '</button>' +
        ' <a href="#" class="sop-btn-small" id="sop-form-cancel">Cancel</a>' +
        '</div></form></div>';
      var blockEditors = {};
      if (window.SOPBlockEditor && window.SOPBlockEditor.init) {
        blockFieldNames.forEach(function (k) {
          var holder = document.getElementById('sop-editor-' + k);
          if (holder) {
            var initial = val(k);
            blockEditors[k] = window.SOPBlockEditor.init(holder, initial, { minHeight: 200 });
          }
        });
      }
      var form = document.getElementById('sop-form');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(form);
        var relatedRaw = (fd.get('related_sop_ids') || '').trim();
        var related = relatedRaw ? relatedRaw.split(',').map(function (x) { return parseInt(x.trim(), 10); }).filter(function (n) { return !isNaN(n); }) : [];
        var payload = {
          title: fd.get('title'),
          folder_id: fd.get('folder_id') || null,
          owner_role: fd.get('owner_role') || null,
          change_notes: fd.get('change_notes') || null,
          purpose_expected_outcome: fd.get('purpose_expected_outcome') || null,
          when_to_use: fd.get('when_to_use') || null,
          when_not_to_use: fd.get('when_not_to_use') || null,
          related_sop_ids: related
        };
        if (isTop()) payload.status = fd.get('status') || 'draft';
        ['standard_workflow', 'exit_points', 'escalation', 'transfer', 'additional_information'].forEach(function (k) {
          if (!payload[k]) payload[k] = null;
        });
        var savePromises = Object.keys(blockEditors).map(function (k) {
          return blockEditors[k].save().then(function (out) { return [k, out]; });
        });
        Promise.all(savePromises).then(function (results) {
          results.forEach(function (r) { payload[r[0]] = r[1]; });
          var url = isNew ? '/api/sops' : '/api/sops/' + sopId;
          var method = isNew ? 'POST' : 'PUT';
          fetch(url, {
            method: method,
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (result) {
              if (result.ok && result.data.success) {
                showView('sop-view', result.data.data.id);
              } else {
                alert(result.data.error || 'Save failed');
              }
            })
            .catch(function () { alert('Save failed'); });
        }).catch(function (err) {
          alert('Save failed: ' + (err && err.message ? err.message : 'editor save error'));
        });
      });
      document.getElementById('sop-form-cancel').addEventListener('click', function (e) {
        e.preventDefault();
        if (isNew) showView('catalog');
        else showView('sop-view', sopId);
      });
    }
    if (isNew) {
      fetch('/api/folders?flat=1', { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          renderForm(null, data.success ? data.data : []);
        })
        .catch(function () { renderForm(null, []); });
    } else {
      Promise.all([
        fetch('/api/sops/' + sopId, { credentials: 'include' }).then(function (r) { return r.json(); }),
        fetch('/api/folders?flat=1', { credentials: 'include' }).then(function (r) { return r.json(); })
      ]).then(function (results) {
        var sopData = results[0].success ? results[0].data : null;
        var foldersData = results[1].success ? results[1].data : [];
        renderForm(sopData, foldersData);
      }).catch(function () {
        mainContent.innerHTML = '<div class="sop-form"><p class="sop-error">Failed to load.</p></div>';
      });
    }
  }

  function renderManageUsers() {
    if (!isTop()) {
      mainContent.innerHTML = '<div class="sop-dashboard"><p>You need Top access to manage users.</p></div>';
      renderNav();
      return;
    }
    mainContent.innerHTML = `
      <div class="sop-dashboard">
        <h1>Manage users</h1>
        <p>Enrolled users can access the SOP Catalog. Add users from Brakebee (requires Brakebee admin).</p>
        <section class="sop-section">
          <h2>Enrolled users</h2>
          <div id="enrolled-list">Loading…</div>
        </section>
        <section class="sop-section">
          <h2>Search Brakebee & add</h2>
          <input type="text" id="brakebee-search" placeholder="Search by email or name" class="sop-input">
          <button type="button" id="brakebee-search-btn" class="sop-btn">Search</button>
          <div id="brakebee-results" class="sop-results"></div>
        </section>
      </div>
    `;
    renderNav();

    fetch('/api/users', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var el = document.getElementById('enrolled-list');
        if (!data.success || !data.data.length) {
          el.innerHTML = '<p class="sop-muted">No enrolled users yet.</p>';
          return;
        }
        el.innerHTML = '<table class="sop-table"><thead><tr><th>Email</th><th>Type</th><th>Actions</th></tr></thead><tbody></tbody></table>';
        var tbody = el.querySelector('tbody');
        data.data.forEach(function (u) {
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + escapeHtml(u.email) + '</td><td>' + escapeHtml(u.user_type) + '</td><td><select class="sop-type-select" data-id="' + u.id + '"><option value="frontline"' + (u.user_type === 'frontline' ? ' selected' : '') + '>Frontline</option><option value="manage"' + (u.user_type === 'manage' ? ' selected' : '') + '>Manage</option><option value="top"' + (u.user_type === 'top' ? ' selected' : '') + '>Top</option></select> <button type="button" class="sop-btn-small sop-remove" data-id="' + u.id + '">Remove</button></td>';
          tbody.appendChild(tr);
          tr.querySelector('.sop-type-select').addEventListener('change', function () {
            updateUserType(this.getAttribute('data-id'), this.value);
          });
          tr.querySelector('.sop-remove').addEventListener('click', function () {
            if (confirm('Remove this user from SOP?')) removeUser(this.getAttribute('data-id'));
          });
        });
      })
      .catch(function () {
        document.getElementById('enrolled-list').innerHTML = '<p class="sop-error">Failed to load users.</p>';
      });

    document.getElementById('brakebee-search-btn').addEventListener('click', function () {
      var q = document.getElementById('brakebee-search').value.trim();
      var resultsEl = document.getElementById('brakebee-results');
      if (!q) { resultsEl.innerHTML = ''; return; }
      resultsEl.innerHTML = 'Searching…';
      fetch('/api/config', { credentials: 'include' })
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
          var apiUrl = (cfg.data && cfg.data.brakebeeApiUrl) || '';
          if (!apiUrl) { resultsEl.innerHTML = '<p class="sop-muted">Brakebee API URL not configured.</p>'; return; }
          return fetch(apiUrl + '/api/v2/users?search=' + encodeURIComponent(q) + '&limit=20', { credentials: 'include' });
        })
        .then(function (r) {
          if (!r) return;
          return r.json().then(function (data) {
            if (!r.ok) {
              resultsEl.innerHTML = '<p class="sop-muted">Search failed (e.g. need Brakebee admin).</p>';
              return;
            }
            var users = (data.data || []);
            if (!users.length) { resultsEl.innerHTML = '<p class="sop-muted">No users found.</p>'; return; }
            resultsEl.innerHTML = '<table class="sop-table"><thead><tr><th>Email</th><th>Add</th></tr></thead><tbody></tbody></table>';
            var tbody = resultsEl.querySelector('tbody');
            users.forEach(function (u) {
            var email = (u.email || u.username || '').trim();
            if (!email) return;
              var tr = document.createElement('tr');
              tr.innerHTML = '<td>' + escapeHtml(email) + '</td><td><button type="button" class="sop-btn-small sop-add" data-email="' + escapeHtml(email) + '" data-id="' + (u.id || '') + '">Add</button></td>';
              tbody.appendChild(tr);
              tr.querySelector('.sop-add').addEventListener('click', function () {
                addUser(this.getAttribute('data-email'), this.getAttribute('data-id') || null);
              });
            });
          });
        })
        .catch(function () {
          document.getElementById('brakebee-results').innerHTML = '<p class="sop-muted">Search failed.</p>';
        });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function updateUserType(id, user_type) {
    fetch('/api/users/' + id, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_type: user_type })
    })
      .then(function (r) {
        if (!r.ok) alert('Update failed');
      });
  }

  function removeUser(id) {
    fetch('/api/users/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) {
        if (r.ok) renderManageUsers();
        else alert('Remove failed');
      });
  }

  function addUser(email, brakebee_user_id) {
    fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, brakebee_user_id: brakebee_user_id || null, user_type: 'frontline' })
    })
      .then(function (r) {
        return r.json().then(function (data) {
          if (r.ok) renderManageUsers();
          else alert(data.error || 'Add failed');
        });
      });
  }

  function navigateFromUrl() {
    var parsed = parseUrl();
    showViewInternal(parsed.view, parsed.id);
  }

  function checkAuth() {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(function (res) {
        return res.json().then(function (data) {
          if (res.ok && data.success && data.data) {
            setSession(data.data);
            navigateFromUrl();
          } else {
            clearSession();
            renderLoginGate();
          }
        });
      })
      .catch(function () {
        clearSession();
        renderLoginGate();
      });
  }

  function init() {
    if (isAuthenticated()) {
      fetch('/api/auth/me', { credentials: 'include' })
        .then(function (res) {
          return res.json().then(function (data) {
            if (res.ok && data.success && data.data) {
              setSession(data.data);
              navigateFromUrl();
            } else {
              clearSession();
              checkAuth();
            }
          });
        })
        .catch(function () {
          clearSession();
          checkAuth();
        });
    } else {
      checkAuth();
    }
  }

  init();
})();
