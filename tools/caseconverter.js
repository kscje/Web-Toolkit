var CaseConverterTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _manualText = '';
  var _currentType = 'lowercase';

  var CONVERT_TYPES = [
    { id: 'uppercase',     nameKey: 'tools.caseconverter.type_uppercase',     label: '全大写' },
    { id: 'lowercase',     nameKey: 'tools.caseconverter.type_lowercase',     label: '全小写' },
    { id: 'sentence',      nameKey: 'tools.caseconverter.type_sentence',      label: '句首大写' },
    { id: 'title',         nameKey: 'tools.caseconverter.type_title',         label: '单词首字母大写' },
    { id: 'camelcase',     nameKey: 'tools.caseconverter.type_camelcase',     label: '驼峰命名' },
    { id: 'pascalcase',    nameKey: 'tools.caseconverter.type_pascalcase',    label: '帕斯卡命名' },
    { id: 'snakecase',     nameKey: 'tools.caseconverter.type_snakecase',     label: '下划线命名' },
    { id: 'kebabcase',     nameKey: 'tools.caseconverter.type_kebabcase',     label: '短横线命名' },
    { id: 'constantcase',  nameKey: 'tools.caseconverter.type_constantcase',  label: '常量命名' }
  ];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function toTitleCase(str) {
    return str.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function toCamelCase(str) {
    var words = str.replace(/[-_\s]+/g, ' ').trim().split(/\s+/);
    if (words.length === 0 || !words[0]) return '';
    var result = words[0].toLowerCase();
    for (var i = 1; i < words.length; i++) {
      if (words[i]) {
        result += words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
      }
    }
    return result;
  }

  function toPascalCase(str) {
    var words = str.replace(/[-_\s]+/g, ' ').trim().split(/\s+/);
    var result = '';
    for (var i = 0; i < words.length; i++) {
      if (words[i]) {
        result += words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
      }
    }
    return result;
  }

  function toSnakeCase(str) {
    return str.replace(/[\s-]+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
      .replace(/_+/g, '_').replace(/^_|_$/g, '');
  }

  function toKebabCase(str) {
    return str.replace(/[\s_]+/g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
      .replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function toConstantCase(str) {
    return toSnakeCase(str).toUpperCase();
  }

  function toSentenceCase(str) {
    if (!str) return '';
    var sentences = str.split(/(?<=[.!?])\s+/);
    for (var i = 0; i < sentences.length; i++) {
      sentences[i] = sentences[i].charAt(0).toUpperCase() + sentences[i].slice(1).toLowerCase();
    }
    return sentences.join(' ');
  }

  var convertFnMap = {
    'uppercase': function (text) { return text.toUpperCase(); },
    'lowercase': function (text) { return text.toLowerCase(); },
    'sentence': toSentenceCase,
    'title': toTitleCase,
    'camelcase': toCamelCase,
    'pascalcase': toPascalCase,
    'snakecase': toSnakeCase,
    'kebabcase': toKebabCase,
    'constantcase': toConstantCase
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

  function convert(type) {
    var text = getSourceText();
    if (!text) {
      return Promise.reject(new Error(_('tools.caseconverter.error_no_text', 'No text to convert')));
    }

    var fn = convertFnMap[type];
    if (!fn) {
      return Promise.reject(new Error('Unknown convert type: ' + type));
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
    _currentMode = mode;

    if (mode === 'manual') {
      if (_manualText) {
        return convert(_currentType);
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
          reject(new Error(_('tools.caseconverter.error_content_script', 'Cannot access this page')));
          return;
        }

        chrome.tabs.sendMessage(tab.id, {
          action: 'getSelection',
          payload: {},
          requestId: 'cc_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            var msg = chrome.runtime.lastError.message || '';
            if (msg.indexOf('Receiving end does not exist') !== -1) {
              reject(new Error(_('tools.caseconverter.error_content_script', 'Cannot access this page. Content script not loaded.')));
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

          convert(_currentType).then(function (data) {
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
    return convert(_currentType);
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
      return Promise.reject(new Error(_('tools.caseconverter.error_no_result', 'No result to copy')));
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

  function getConvertTypes() {
    return CONVERT_TYPES;
  }

  function getCurrentType() {
    return _currentType;
  }

  return {
    execute: execute,
    executeLocal: executeLocal,
    convert: convert,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setManualText: setManualText,
    copyToClipboard: copyToClipboard,
    getConvertTypes: getConvertTypes,
    getCurrentType: getCurrentType,
    getSourceText: getSourceText
  };
})();
