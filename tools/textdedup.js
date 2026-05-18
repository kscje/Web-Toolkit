var TextDedupTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _manualText = '';
  var _currentType = 'dedup';
  var _ignoreBlankLines = false;

  var OPERATION_TYPES = [
    { id: 'dedup',           nameKey: 'tools.textdedup.type_dedup',           label: '去重' },
    { id: 'sort_asc',        nameKey: 'tools.textdedup.type_sort_asc',        label: '升序 A→Z' },
    { id: 'sort_desc',       nameKey: 'tools.textdedup.type_sort_desc',       label: '降序 Z→A' },
    { id: 'dedup_sort_asc',  nameKey: 'tools.textdedup.type_dedup_sort_asc',  label: '去重+升序' },
    { id: 'dedup_sort_desc', nameKey: 'tools.textdedup.type_dedup_sort_desc', label: '去重+降序' }
  ];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function getLines(text) {
    if (!text) return [];
    return text.split('\n');
  }

  function joinLines(lines) {
    return lines.join('\n');
  }

  function filterBlankLines(lines) {
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0) {
        result.push(lines[i]);
      }
    }
    return result;
  }

  function deduplicateLines(lines) {
    var seen = {};
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!seen[line]) {
        seen[line] = true;
        result.push(line);
      }
    }
    return result;
  }

  function sortLinesAsc(lines) {
    var sorted = lines.slice();
    sorted.sort(function (a, b) {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
    return sorted;
  }

  function sortLinesDesc(lines) {
    var sorted = lines.slice();
    sorted.sort(function (a, b) {
      return b.localeCompare(a, undefined, { sensitivity: 'base' });
    });
    return sorted;
  }

  function process(type, text) {
    if (!text) return '';

    var lines = getLines(text);

    switch (type) {
      case 'dedup':
        if (_ignoreBlankLines) lines = filterBlankLines(lines);
        lines = deduplicateLines(lines);
        break;
      case 'sort_asc':
        lines = sortLinesAsc(lines);
        break;
      case 'sort_desc':
        lines = sortLinesDesc(lines);
        break;
      case 'dedup_sort_asc':
        if (_ignoreBlankLines) lines = filterBlankLines(lines);
        lines = deduplicateLines(lines);
        lines = sortLinesAsc(lines);
        break;
      case 'dedup_sort_desc':
        if (_ignoreBlankLines) lines = filterBlankLines(lines);
        lines = deduplicateLines(lines);
        lines = sortLinesDesc(lines);
        break;
    }

    return joinLines(lines);
  }

  function getSourceText() {
    if (_currentMode === 'manual') {
      return _manualText;
    }
    if (_currentData && _currentData.sourceText) {
      return _currentData.sourceText;
    }
    return '';
  }

  function processType(type) {
    var text = getSourceText();
    if (!text) {
      return Promise.reject(new Error(_('tools.textdedup.error_no_text', 'No text to process')));
    }

    _currentType = type;
    var result = process(type, text);

    _currentData = {
      sourceText: text,
      resultText: result,
      type: type,
      mode: _currentMode,
      pageTitle: _currentData ? _currentData.pageTitle : '',
      pageURL: _currentData ? _currentData.pageURL : ''
    };

    return Promise.resolve(_currentData);
  }

  function execute(mode) {
    if (typeof mode === 'undefined') mode = _currentMode || 'selected';

    if (mode === 'manual') {
      _currentMode = 'manual';
      if (_manualText) {
        return processType(_currentType);
      }
      _currentData = {
        sourceText: '',
        resultText: '',
        type: _currentType,
        mode: 'manual',
        pageTitle: '',
        pageURL: ''
      };
      return Promise.resolve(_currentData);
    }

    if (!TextFlow.isChromeExtension()) {
      return executeLocal();
    }

    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          return reject(new Error(_('errors.no_active_tab', 'No active tab')));
        }
        var tab = tabs[0];
        var url = tab.url || '';

        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
          reject(new Error(_('errors.unsupported_page', 'This page does not support this operation')));
          return;
        }

        chrome.tabs.sendMessage(tab.id, {
          action: 'getSelection',
          payload: {},
          requestId: 'td_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            var msg = chrome.runtime.lastError.message || '';
            if (msg.indexOf('Receiving end does not exist') !== -1) {
              reject(new Error(_('tools.textdedup.error_content_script', 'Cannot access this page. Content script not loaded.')));
            } else {
              reject(new Error(msg));
            }
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response ? response.error : _('errors.content_script_no_response', 'Content script not responding')));
            return;
          }
          var text = response.data.text || '';
          if (!text || text.trim().length === 0) {
            _currentData = {
              sourceText: '',
              resultText: '',
              type: _currentType,
              mode: 'selected',
              pageTitle: tab.title || '',
              pageURL: tab.url || ''
            };
            _currentMode = 'selected';
            resolve(_currentData);
            return;
          }

          _currentData = {
            sourceText: text,
            resultText: '',
            type: _currentType,
            mode: 'selected',
            pageTitle: tab.title || '',
            pageURL: tab.url || ''
          };
          _currentMode = 'selected';

          processType(_currentType).then(function (data) {
            resolve(data);
          }).catch(reject);
        });
      });
    });
  }

  function executeLocal() {
    var sampleText = 'banana\napple\ncherry\nbanana\ndate\napple';
    _currentData = {
      sourceText: sampleText,
      resultText: '',
      type: _currentType,
      mode: 'local',
      pageTitle: _('errors.local_test', 'Local Test'),
      pageURL: 'http://localhost'
    };
    _currentMode = 'selected';
    return processType(_currentType);
  }

  function setManualText(text) {
    _manualText = text;
    if (_currentMode === 'manual') {
      _currentData = {
        sourceText: _manualText,
        resultText: '',
        type: _currentType,
        mode: 'manual',
        pageTitle: '',
        pageURL: ''
      };
    }
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

  function setIgnoreBlankLines(ignore) {
    _ignoreBlankLines = !!ignore;
  }

  function getIgnoreBlankLines() {
    return _ignoreBlankLines;
  }

  function copyToClipboard() {
    if (!_currentData || !_currentData.resultText) {
      return Promise.reject(new Error(_('tools.textdedup.error_no_result', 'No result to copy')));
    }
    var text = _currentData.resultText;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve();
    }
    return navigator.clipboard.writeText(text).then(function () {
      return true;
    }).catch(function () {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    });
  }

  function getOperationTypes() {
    return OPERATION_TYPES;
  }

  function getCurrentType() {
    return _currentType;
  }

  return {
    execute: execute,
    executeLocal: executeLocal,
    processType: processType,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setManualText: setManualText,
    setIgnoreBlankLines: setIgnoreBlankLines,
    getIgnoreBlankLines: getIgnoreBlankLines,
    copyToClipboard: copyToClipboard,
    getOperationTypes: getOperationTypes,
    getCurrentType: getCurrentType,
    getSourceText: getSourceText
  };
})();
