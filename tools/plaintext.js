var PlainTextTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _mergeBlankLines = true;
  var _keepLinkURLs = false;
  var _manualText = '';
  var _listeners = [];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function stripHTML(html) {
    var text = html;

    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

    var blockTags = 'div|p|h[1-6]|li|tr|section|article|header|footer|aside|nav|main|figure|figcaption|blockquote|pre|table|ul|ol|dl|form|fieldset|details|summary';
    text = text.replace(new RegExp('</(' + blockTags + ')[^>]*>', 'gi'), '\n');
    text = text.replace(new RegExp('<(' + blockTags + ')[^>]*>', 'gi'), '');

    text = text.replace(/<[^>]+>/g, '');

    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&#?\w+;/g, '');

    text = text.replace(/[\u200B-\u200F\u00AD\u200E\u200F\u2028\u2029\u202A-\u202E\uFEFF]/g, '');

    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');

    return text;
  }

  function postProcess(text, options) {
    if (!text) return '';

    if (options.mergeBlankLines !== false) {
      text = text.replace(/\n{3,}/g, '\n\n');
    }

    text = text.replace(/[ \t]+$/gm, '');

    text = text.trim();

    return text;
  }

  function processWithURLs(html) {
    var linkMap = {};
    var index = 0;

    html = html.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, function (_, href, inner) {
      var placeholder = '___LINK_' + (index++) + '___';
      var innerText = inner.replace(/<[^>]+>/g, '').trim();
      linkMap[placeholder] = { text: innerText, url: href };
      return placeholder;
    });

    var text = stripHTML(html);

    Object.keys(linkMap).forEach(function (key) {
      var info = linkMap[key];
      var replacement = info.text;
      if (info.url && !/^(#|javascript:)/i.test(info.url)) {
        if (info.text && info.text !== info.url) {
          replacement = info.text + ' [' + info.url + ']';
        } else if (!info.text) {
          replacement = info.url;
        }
      }
      text = text.replace(key, replacement);
    });

    return text;
  }

  function processPlain(html) {
    return stripHTML(html);
  }

  function execute(mode) {
    if (typeof mode === 'undefined') mode = _currentMode || 'selected';

    if (mode === 'manual') {
      return executeManual(_manualText);
    }

    if (!TextFlow.isChromeExtension()) {
      return executeLocal();
    }

    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          return reject(new Error(_('errors.no_active_tab', '无活动标签页')));
        }
        var tab = tabs[0];
        var url = tab.url || '';

        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
          reject(new Error(_('errors.unsupported_injection', '此页面不支持内容脚本注入')));
          return;
        }

        chrome.tabs.sendMessage(tab.id, {
          action: 'extractPlainText',
          payload: { mode: mode, keepLinkURLs: _keepLinkURLs },
          requestId: 'pt_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response ? response.error : _('errors.content_script_no_response', '内容脚本无响应')));
            return;
          }
          var data = response.data;
          var text = postProcess(data.text, { mergeBlankLines: _mergeBlankLines });
          _currentData = {
            text: text,
            pageTitle: data.pageTitle,
            pageURL: data.pageURL,
            mode: data.mode
          };
          _currentMode = data.mode || mode;
          notifyListeners(_currentData);
          resolve(_currentData);
        });
      });
    });
  }

  function executeLocal() {
    var sampleHTML = '<h1>Sample Title</h1><p>This is <b>bold</b> text with a <a href="https://example.com">link</a>.</p><p>Second paragraph with Chinese: 你好世界。</p><ul><li>Item one</li><li>Item two</li></ul>';
    var text = _keepLinkURLs ? processWithURLs(sampleHTML) : processPlain(sampleHTML);
    text = postProcess(text, { mergeBlankLines: _mergeBlankLines });
    _currentData = {
      text: text,
      pageTitle: _('errors.local_test', 'Local Test'),
      pageURL: 'http://localhost/test',
      mode: 'local'
    };
    _currentMode = 'selected';
    notifyListeners(_currentData);
    return Promise.resolve(_currentData);
  }

  function executeManual(text) {
    _manualText = text || '';
    var processedText = _keepLinkURLs ? processWithURLs(_manualText) : processPlain(_manualText);
    processedText = postProcess(processedText, { mergeBlankLines: _mergeBlankLines });
    _currentData = {
      text: processedText,
      pageTitle: _('tools.plaintext.mode_manual', '手动输入'),
      pageURL: '',
      mode: 'manual'
    };
    _currentMode = 'manual';
    notifyListeners(_currentData);
    return Promise.resolve(_currentData);
  }

  function getResult() {
    return _currentData;
  }

  function setMode(mode) {
    _currentMode = mode;
  }

  function getMode() {
    return _currentMode;
  }

  function setMergeBlankLines(enabled) {
    _mergeBlankLines = enabled;
  }

  function isMergeBlankLines() {
    return _mergeBlankLines;
  }

  function setKeepLinkURLs(enabled) {
    _keepLinkURLs = enabled;
  }

  function isKeepLinkURLs() {
    return _keepLinkURLs;
  }

  function setManualText(text) {
    _manualText = text || '';
    if (_currentMode === 'manual') {
      return executeManual(_manualText);
    }
    return Promise.resolve(_currentData);
  }

  function getManualText() {
    return _manualText;
  }

  function onChange(callback) {
    _listeners.push(callback);
  }

  function notifyListeners(data) {
    _listeners.forEach(function (fn) {
      try { fn(data); } catch (e) {}
    });
  }

  return {
    execute: execute,
    executeManual: executeManual,
    executeLocal: executeLocal,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setMergeBlankLines: setMergeBlankLines,
    isMergeBlankLines: isMergeBlankLines,
    setKeepLinkURLs: setKeepLinkURLs,
    isKeepLinkURLs: isKeepLinkURLs,
    setManualText: setManualText,
    getManualText: getManualText,
    onChange: onChange,
    copyToClipboard: TextFlow.copyToClipboard,
    downloadFile: TextFlow.downloadFile
  };
})();
