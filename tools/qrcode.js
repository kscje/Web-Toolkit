var QRCodeTool = (function () {
  'use strict';

  var _currentMode = 'selected';
  var _currentData = null;
  var _manualText = '';

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  // 库默认按 charCode & 0xff 编码，中文会被截成乱码，切换为 UTF-8
  if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }

  function generateQRCode(text) {
    if (!text || text.trim().length === 0) {
      return Promise.reject(new Error(_('tools.qrcode.error_no_selection', 'No content selected')));
    }
    try {
      var qr = qrcode(0, 'M');
      qr.addData(text.trim());
      qr.make();
      var imgTag = qr.createImgTag(4, 4);
      var match = imgTag.match(/src="([^"]+)"/);
      if (match && match[1]) {
        return Promise.resolve({ dataURL: match[1], displayText: text });
      } else {
        return Promise.reject(new Error(_('tools.qrcode.error_failed', 'QR code generation failed')));
      }
    } catch (e) {
      var msg = (e && e.message) ? e.message : String(e);
      if (msg.indexOf('code length overflow') !== -1) {
        msg = _('tools.qrcode.error_too_long', 'Content too long for a QR code');
      }
      return Promise.reject(new Error(_('tools.qrcode.error_failed', 'QR code generation failed: ') + msg));
    }
  }

  function getSelectionText() {
    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          return reject(new Error(_('errors.no_active_tab', 'No active tab')));
        }
        var tab = tabs[0];
        var url = tab.url || '';
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
          reject(new Error(_('errors.unsupported_page', 'Unsupported page')));
          return;
        }
        chrome.tabs.sendMessage(tab.id, {
          action: 'getSelection',
          payload: {},
          requestId: 'qr_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response && response.success ? response.data : { hasSelection: false, text: '' });
        });
      });
    });
  }

  function executeManual(text) {
    _manualText = text || '';
    if (!_manualText.trim()) {
      _currentData = null;
      return Promise.reject(new Error(_('tools.qrcode.error_empty_input', 'Please enter content first')));
    }
    var trimmed = _manualText.trim();
    var displayText = trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed;
    return generateQRCode(trimmed).then(function (qrData) {
      _currentData = { dataURL: qrData.dataURL, displayText: displayText, mode: 'manual' };
      return _currentData;
    });
  }

  function execute(mode) {
    if (typeof mode === 'undefined') mode = _currentMode || 'selected';
    _currentMode = mode;

    if (mode === 'manual') {
      return executeManual(_manualText);
    }

    if (!TextFlow.isChromeExtension()) {
      return generateQRCode('https://example.com').then(function (qrData) {
        _currentData = { dataURL: qrData.dataURL, displayText: 'https://example.com', mode: 'local' };
        return _currentData;
      });
    }

    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs[0];
        var pageURL = tab.url || '';

        if (mode === 'full') {
          generateQRCode(pageURL).then(function (qrData) {
            _currentData = { dataURL: qrData.dataURL, displayText: pageURL, mode: 'full' };
            resolve(_currentData);
          }).catch(reject);
          return;
        }

        getSelectionText().then(function (selData) {
          var text = (selData && selData.text) ? selData.text.trim() : '';
          if (text) {
            var displayText = text.length > 50 ? text.substring(0, 50) + '...' : text;
            generateQRCode(text).then(function (qrData) {
              _currentData = { dataURL: qrData.dataURL, displayText: displayText, mode: 'selected' };
              resolve(_currentData);
            }).catch(reject);
          } else {
            generateQRCode(pageURL).then(function (qrData) {
              _currentData = { dataURL: qrData.dataURL, displayText: pageURL, mode: 'full' };
              resolve(_currentData);
            }).catch(reject);
          }
        }).catch(function () {
          generateQRCode(pageURL).then(function (qrData) {
            _currentData = { dataURL: qrData.dataURL, displayText: pageURL, mode: 'full' };
            resolve(_currentData);
          }).catch(reject);
        });
      });
    });
  }

  function getResult() {
    return _currentData;
  }

  function setMode(mode) {
    _currentMode = mode;
  }

  function setManualText(text) {
    _manualText = text || '';
  }

  function getManualText() {
    return _manualText;
  }

  function getMode() {
    return _currentMode;
  }

  function copyQRImageToClipboard() {
    if (!_currentData || !_currentData.dataURL) {
      return Promise.reject(new Error(_('tools.qrcode.toast_no_content', 'Please generate QR code first')));
    }
    return fetch(_currentData.dataURL)
      .then(function (res) { return res.blob(); })
      .then(function (blob) {
        return navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      }).catch(function () {
        var img = document.createElement('img');
        img.src = _currentData.dataURL;
        document.body.appendChild(img);
        var range = document.createRange();
        range.selectNode(img);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(img);
      });
  }

  function downloadFile(filename) {
    if (!_currentData || !_currentData.dataURL) {
      return Promise.reject(new Error(_('tools.qrcode.toast_no_content', 'Please generate QR code first')));
    }
    var a = document.createElement('a');
    a.href = _currentData.dataURL;
    a.download = filename || ('QRCode_' + Date.now() + '.png');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return Promise.resolve();
  }

  return {
    execute: execute,
    executeManual: executeManual,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setManualText: setManualText,
    getManualText: getManualText,
    copyQRImageToClipboard: copyQRImageToClipboard,
    downloadFile: downloadFile
  };
})();
