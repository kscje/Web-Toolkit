var WordCountTool = (function () {
  'use strict';

  var _currentResult = null;
  var _currentMode = 'selected';
  var _listeners = [];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function sendToActiveTab(msg) {
    return new Promise(function (resolve, reject) {
      if (!TextFlow.isChromeExtension()) {
        return reject(new Error(_('errors.not_extension', '非 Chrome 扩展环境')));
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          return reject(new Error(_('errors.no_active_tab', '无活动标签页')));
        }
        chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  function analyzeWordText(text) {
    if (!text || text.trim().length === 0) {
      return {
        totalChars: 0,
        charsNoSpaces: 0,
        chineseChars: 0,
        englishWords: 0,
        paragraphs: 0,
        sentences: 0,
        lines: 0,
        images: 0,
        videos: 0,
        links: 0
      };
    }

    var chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length;
    var englishWords = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ').match(/[a-zA-Z0-9]+/g);
    var wordCount = englishWords ? englishWords.length : 0;
    var totalChars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var paragraphs = text.split(/\n+/).filter(function (p) { return p.trim().length > 0; }).length;
    var sentences = (text.match(/[。！？.!?\n]+/g) || []).length;
    var lines = text.split('\n').filter(function (l) { return l.trim().length > 0; }).length;

    return {
      totalChars: totalChars,
      charsNoSpaces: charsNoSpaces,
      chineseChars: chineseChars,
      englishWords: wordCount,
      paragraphs: paragraphs,
      sentences: sentences,
      lines: lines,
      images: 0,
      videos: 0,
      links: 0
    };
  }

  function mergeStats(stats, contentStats) {
    return {
      totalChars: stats.charWithSpaces || stats.totalChars || 0,
      charsNoSpaces: stats.charWithoutSpaces || stats.charsNoSpaces || 0,
      chineseChars: stats.chineseCount || stats.chineseChars || 0,
      englishWords: stats.englishWordCount || stats.englishWords || 0,
      paragraphs: stats.paragraphCount || stats.paragraphs || 0,
      sentences: stats.sentences || 0,
      lines: stats.lines || 0,
      images: stats.imageCount || stats.images || 0,
      videos: stats.videoCount || stats.videos || 0,
      links: stats.linkCount || stats.links || 0
    };
  }

  function executeLocal(text) {
    var result = analyzeWordText(text);
    result.mode = 'local';
    _currentResult = result;
    _currentMode = 'selected';
    notifyListeners(result);
    return Promise.resolve(result);
  }

  function execute(mode) {
    if (typeof mode === 'undefined') mode = _currentMode || 'selected';

    if (!TextFlow.isChromeExtension()) {
      return executeLocal('This is sample text for local testing. Hello World! It contains both Chinese and English content. 中英文混合内容测试。\n\nSecond paragraph with more test data. 第二段落，包含更多测试数据。');
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
          action: 'wordCount',
          payload: { mode: mode },
          requestId: 'wc_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response ? response.error : _('errors.content_script_no_response', '内容脚本无响应')));
            return;
          }
          var result = mergeStats(response.data);
          result.mode = mode;
          _currentResult = result;
          _currentMode = mode;
          notifyListeners(result);
          resolve(result);
        });
      });
    });
  }

  function getResult() {
    return _currentResult;
  }

  function setMode(mode) {
    _currentMode = mode;
  }

  function getMode() {
    return _currentMode;
  }

  function onChange(callback) {
    _listeners.push(callback);
  }

  function notifyListeners(result) {
    _listeners.forEach(function (fn) {
      try { fn(result); } catch (e) {}
    });
  }

  function formatCount(count) {
    if (count >= 10000) {
      var lang = (typeof I18n !== 'undefined' && I18n.getLanguage) ? I18n.getLanguage() : 'zh';
      if (lang === 'zh') {
        return (count / 10000).toFixed(1) + '万';
      }
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toLocaleString();
  }

  return {
    execute: execute,
    executeLocal: executeLocal,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    onChange: onChange,
    formatCount: formatCount
  };
})();
