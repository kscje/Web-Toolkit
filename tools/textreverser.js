var TextReverserTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _manualText = '';
  var _currentType = 'reverse_all';

  var REVERSE_TYPES = [
    { id: 'reverse_all',      nameKey: 'tools.textreverser.type_reverse_all',      label: '全部反转' },
    { id: 'reverse_words',    nameKey: 'tools.textreverser.type_reverse_words',    label: '单词反转' },
    { id: 'reverse_internal', nameKey: 'tools.textreverser.type_reverse_internal', label: '单词内反转' },
    { id: 'reverse_mirror',   nameKey: 'tools.textreverser.type_reverse_mirror',   label: '镜像反转' }
  ];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function splitByWhitespace(text) {
    var parts = text.match(/\S+/g);
    return parts || [];
  }

  function reverseAll(text) {
    return text.split('').reverse().join('');
  }

  function reverseWords(text) {
    var words = splitByWhitespace(text);
    return words.reverse().join(' ');
  }

  function reverseInternal(text) {
    var words = splitByWhitespace(text);
    for (var i = 0; i < words.length; i++) {
      words[i] = words[i].split('').reverse().join('');
    }
    return words.join(' ');
  }

  function reverseMirror(text) {
    return reverseWords(reverseInternal(text));
  }

  var reverseFnMap = {
    'reverse_all': reverseAll,
    'reverse_words': reverseWords,
    'reverse_internal': reverseInternal,
    'reverse_mirror': reverseMirror
  };

  function getSourceText() {
    if (_currentMode === 'manual') {
      return _manualText;
    }
    if (_currentData && _currentData.sourceText) {
      return _currentData.sourceText;
    }
    return '';
  }

  function reverse(type) {
    var text = getSourceText();
    if (!text) {
      return Promise.reject(new Error(_('tools.textreverser.error_no_text', 'No text to reverse')));
    }

    var fn = reverseFnMap[type];
    if (!fn) {
      return Promise.reject(new Error('Unknown reverse type: ' + type));
    }

    _currentType = type;
    var result = fn(text);

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
        return reverse(_currentType);
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
          requestId: 'tr_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            var msg = chrome.runtime.lastError.message || '';
            if (msg.indexOf('Receiving end does not exist') !== -1) {
              reject(new Error(_('tools.textreverser.error_content_script', 'Cannot access this page. Content script not loaded.')));
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

          reverse(_currentType).then(function (data) {
            resolve(data);
          }).catch(reject);
        });
      });
    });
  }

  function executeLocal() {
    var sampleText = 'hello world, this is a test';
    _currentData = {
      sourceText: sampleText,
      resultText: '',
      type: _currentType,
      mode: 'local',
      pageTitle: _('errors.local_test', 'Local Test'),
      pageURL: 'http://localhost'
    };
    _currentMode = 'selected';
    return reverse(_currentType);
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

  function copyToClipboard() {
    if (!_currentData || !_currentData.resultText) {
      return Promise.reject(new Error(_('tools.textreverser.error_no_result', 'No result to copy')));
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

  function getReverseTypes() {
    return REVERSE_TYPES;
  }

  function getCurrentType() {
    return _currentType;
  }

  return {
    execute: execute,
    executeLocal: executeLocal,
    reverse: reverse,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setManualText: setManualText,
    copyToClipboard: copyToClipboard,
    getReverseTypes: getReverseTypes,
    getCurrentType: getCurrentType,
    getSourceText: getSourceText
  };
})();
