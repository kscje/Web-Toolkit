var WebClipTool = (function () {
  'use strict';

  var MAX_TEXT_LENGTH = 10000;
  var MAX_NOTE_LENGTH = 500;
  var MAX_TAGS = 10;
  var MAX_TAG_LENGTH = 20;
  var _currentContext = null;

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function isUnsupportedURL(url) {
    return !url || url.indexOf('chrome://') === 0 || url.indexOf('chrome-extension://') === 0 || url.indexOf('about:') === 0;
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return '';
    }
  }

  function normalizeURL(url) {
    return url || '';
  }

  function queryActiveTab() {
    if (!TextFlow.isChromeExtension()) {
      return Promise.resolve({
        id: null,
        title: _('errors.local_test', 'Local Test'),
        url: 'http://localhost/test'
      });
    }

    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          reject(new Error(_('errors.no_active_tab', 'No active tab')));
          return;
        }
        resolve(tabs[0]);
      });
    });
  }

  function sendToContent(tabId, action) {
    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(tabId, {
        action: action,
        payload: {},
        requestId: 'webclip_' + Date.now()
      }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.success) {
          reject(new Error(response ? response.error : _('errors.content_script_no_response', 'Content script not responding')));
          return;
        }
        resolve(response.data || {});
      });
    });
  }

  function buildContextFromTab(tab, selectionData, pageData, supported) {
    var url = normalizeURL((pageData && pageData.url) || tab.url || '');
    var domain = (pageData && pageData.domain) || getDomain(url);
    var title = (pageData && pageData.title) || tab.title || domain || _('errors.unknown_page', 'Unknown page');
    var selectionText = selectionData && selectionData.hasSelection ? (selectionData.text || '').trim() : '';
    var mode = selectionText ? 'selection' : 'page';

    return {
      supported: supported !== false,
      mode: mode,
      title: title,
      url: url,
      domain: domain,
      selectionText: selectionText,
      text: selectionText || title || url
    };
  }

  function loadContext() {
    if (!TextFlow.isChromeExtension()) {
      _currentContext = buildContextFromTab({
        title: _('errors.local_test', 'Local Test'),
        url: 'http://localhost/test'
      }, { hasSelection: true, text: 'Sample selected text for web clipping.' }, null, true);
      return Promise.resolve(_currentContext);
    }

    return queryActiveTab().then(function (tab) {
      if (isUnsupportedURL(tab.url || '')) {
        _currentContext = buildContextFromTab(tab, null, null, false);
        return _currentContext;
      }

      return Promise.all([
        sendToContent(tab.id, 'getSelection').catch(function () { return { hasSelection: false, text: '' }; }),
        sendToContent(tab.id, 'getPageInfo').catch(function () { return null; })
      ]).then(function (results) {
        _currentContext = buildContextFromTab(tab, results[0], results[1], true);
        return _currentContext;
      });
    });
  }

  function parseTags(value) {
    if (!value) return [];
    var seen = {};
    return value.split(',')
      .map(function (tag) { return tag.trim(); })
      .filter(function (tag) { return tag.length > 0; })
      .map(function (tag) { return tag.substring(0, MAX_TAG_LENGTH); })
      .filter(function (tag) {
        var key = tag.toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .slice(0, MAX_TAGS);
  }

	  function buildClip(payload) {
    var context = payload.context || _currentContext || {};
	    var type = payload.type === 'selection' && context.selectionText ? 'selection' : 'page';
	    var pageText = (context.title || '') + (context.url ? '\n' + context.url : '');
	    var text = type === 'selection' ? (context.selectionText || '') : (pageText || context.title || context.url || '');
    var truncated = false;

    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
    }

	    var now = new Date().toISOString();
	    return {
	      clip: {
	        id: 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
        type: type,
        title: context.title || context.domain || _('errors.unknown_page', 'Unknown page'),
        url: context.url || '',
        domain: context.domain || getDomain(context.url || ''),
        text: text,
        tags: parseTags(payload.tags || ''),
        note: (payload.note || '').trim().substring(0, MAX_NOTE_LENGTH),
        created_at: now,
        updated_at: now
      },
      truncated: truncated
    };
  }

  function saveClip(payload) {
    payload = payload || {};
    var context = payload.context || _currentContext;
    if (!context || context.supported === false) {
      return Promise.reject(new Error(_('tools.webclip.status_unavailable', 'Cannot access this page. Please check if you are on a regular web page.')));
    }

    var result = buildClip(payload);
    return StorageManager.addClip(result.clip).then(function (clip) {
      return {
        clip: clip,
        truncated: result.truncated
      };
    });
  }

  function getRecentClips(limit) {
    return StorageManager.getClips().then(function (clips) {
      return clips.slice(0, limit || 5);
    });
  }

  function getAllClips() {
    return StorageManager.getClips();
  }

  function deleteClip(id) {
    return StorageManager.deleteClip(id);
  }

  function findClip(id) {
    return StorageManager.getClips().then(function (clips) {
      for (var i = 0; i < clips.length; i++) {
        if (clips[i].id === id) return clips[i];
      }
      return null;
    });
  }

  function getClipCopyText(clip) {
    if (!clip) return '';
    if (clip.text && clip.text.trim()) return clip.text;
    return (clip.title || '') + (clip.url ? '\n' + clip.url : '');
  }

  function copyClip(id) {
    return findClip(id).then(function (clip) {
      if (!clip) {
        throw new Error(_('tools.webclip.error_not_found', 'Clip not found'));
      }
      return TextFlow.copyToClipboard(getClipCopyText(clip));
    });
  }

  function formatDate(iso) {
    var date = iso ? new Date(iso) : new Date();
    if (isNaN(date.getTime())) date = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function dateStamp() {
    var date = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function escapeMarkdown(text) {
    return (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  function buildMarkdown(clips) {
    var lines = ['# ' + _('tools.webclip.export_title', 'My Web Clips'), ''];
    clips.forEach(function (clip) {
      lines.push('## ' + escapeMarkdown(clip.title || _('errors.unknown_page', 'Unknown page')));
      lines.push('');
      lines.push(_('tools.webclip.export_source', 'Source') + ': ' + (clip.url || ''));
      lines.push(_('tools.webclip.export_time', 'Time') + ': ' + formatDate(clip.created_at));
      if (clip.tags && clip.tags.length) {
        lines.push(_('tools.webclip.export_tags', 'Tags') + ': ' + clip.tags.join(', '));
      }
      if (clip.note) {
        lines.push(_('tools.webclip.export_note', 'Note') + ': ' + escapeMarkdown(clip.note));
      }
      lines.push('');
      lines.push(escapeMarkdown(clip.text || clip.url || ''));
      lines.push('');
    });
    return lines.join('\n');
  }

  function buildText(clips) {
    var blocks = [];
    clips.forEach(function (clip) {
      var lines = [
        clip.title || _('errors.unknown_page', 'Unknown page'),
        _('tools.webclip.export_source', 'Source') + ': ' + (clip.url || ''),
        _('tools.webclip.export_time', 'Time') + ': ' + formatDate(clip.created_at)
      ];
      if (clip.tags && clip.tags.length) {
        lines.push(_('tools.webclip.export_tags', 'Tags') + ': ' + clip.tags.join(', '));
      }
      if (clip.note) {
        lines.push(_('tools.webclip.export_note', 'Note') + ': ' + clip.note);
      }
      lines.push('');
      lines.push(clip.text || clip.url || '');
      blocks.push(lines.join('\n'));
    });
    return blocks.join('\n\n---\n\n');
  }

  function exportMarkdown() {
    return getAllClips().then(function (clips) {
      if (!clips.length) {
        throw new Error(_('tools.webclip.empty', 'No clips yet'));
      }
      TextFlow.downloadFile(buildMarkdown(clips), 'textflow-clips-' + dateStamp() + '.md', 'text/markdown;charset=utf-8');
      return clips.length;
    });
  }

  function exportText() {
    return getAllClips().then(function (clips) {
      if (!clips.length) {
        throw new Error(_('tools.webclip.empty', 'No clips yet'));
      }
      TextFlow.downloadFile(buildText(clips), 'textflow-clips-' + dateStamp() + '.txt', 'text/plain;charset=utf-8');
      return clips.length;
    });
  }

  function getCurrentContext() {
    return _currentContext;
  }

  return {
    loadContext: loadContext,
    saveClip: saveClip,
    getRecentClips: getRecentClips,
    getAllClips: getAllClips,
    deleteClip: deleteClip,
    copyClip: copyClip,
    exportMarkdown: exportMarkdown,
    exportText: exportText,
    parseTags: parseTags,
    getCurrentContext: getCurrentContext
  };
})();
