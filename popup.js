(function () {
  'use strict';

  var currentView = 'home';
  var wcMode = 'selected';
  var mdMode = 'selected';
  var ptMode = 'selected';
  var toastTimer = null;
  var dom = {};
  var _selectionCache = { hasSelection: false, text: '', html: '' };

  var moduleLoaded = {
    wordcount: false,
    markdown: false,
    plaintext: false,
    qrcode: false,
    caseconverter: false,
	    textreverser: false,
	    textdedup: false,
	    emojiconverter: false,
	    webclip: false
	  };

  var moduleLoadQueue = {};

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $$(selector, parent) {
    return (parent || document).querySelectorAll(selector);
  }

  function loadScript(src) {
    if (moduleLoadQueue[src]) {
      return moduleLoadQueue[src];
    }
    moduleLoadQueue[src] = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        reject(new Error('Failed to load: ' + src));
      };
      document.head.appendChild(script);
    });
    return moduleLoadQueue[src];
  }

  function ensureModule(name) {
    if (moduleLoaded[name]) {
      return Promise.resolve();
    }
    var srcMap = {
      wordcount: 'tools/wordcount.js',
      markdown: 'tools/markdown.js',
      plaintext: 'tools/plaintext.js',
      qrcode: 'tools/qrcode.js',
      caseconverter: 'tools/caseconverter.js',
	      textreverser: 'tools/textreverser.js',
	      textdedup: 'tools/textdedup.js',
	      emojiconverter: 'tools/emoji_converter.js',
	      webclip: 'tools/webclip.js'
	    };
    var promise = loadScript(srcMap[name]).then(function () {
      moduleLoaded[name] = true;
    });
    if (name === 'qrcode') {
      promise = promise.then(function () {
        return loadScript('libs/qrcode.min.js');
      });
    }
    return promise;
  }

  function cacheDOM() {
    dom.viewHome = $('#viewHome');
    dom.viewWordCount = $('#viewWordCount');
    dom.viewMarkdown = $('#viewMarkdown');
	    dom.viewPlainText = $('#viewPlainText');
	    dom.viewSettings = $('#viewSettings');
	    dom.viewWebClip = $('#viewWebClip');
	    dom.contentArea = $('#contentArea');
    dom.statusText = $('#statusText');
    dom.toast = $('#toast');
    dom.wcResultArea = $('#wcResultArea');
    dom.wcPageExtras = $('#wcPageExtras');
    dom.wcManualPanel = $('#wcManualPanel');
    dom.wcManualInput = $('#wcManualInput');
    dom.wcManualCharCount = $('#wcManualCharCount');
    dom.mdResultArea = $('#mdResultArea');
    dom.mdPreview = $('#mdPreview');
    dom.mdNoSelectionBanner = $('#mdNoSelectionBanner');
    dom.mdSourceTag = $('#mdSourceTag');
    dom.ptResultArea = $('#ptResultArea');
    dom.ptPreview = $('#ptPreview');
    dom.ptManualPanel = $('#ptManualPanel');
    dom.ptManualInput = $('#ptManualInput');
    dom.ptManualCharCount = $('#ptManualCharCount');
    dom.btnConvertText = $('#viewMarkdown .btn-text');
    dom.btnOpenFullSettings = $('#btnOpenFullSettings');
    dom.toolGrid = $('#toolGrid');

    dom.cardWordCount = $('#cardWordCount');
    dom.cardMarkdown = $('#cardMarkdown');
    dom.cardPlainText = $('#cardPlainText');
    dom.cardQRCode = $('#cardQRCode');
    dom.qrContentText = $('#qrContentText');
    dom.qrImage = $('#qrImage');
    dom.btnCopyQR = $('#btnCopyQR');
    dom.btnDownloadQR = $('#btnDownloadQR');
    dom.cardCaseConverter = $('#cardCaseConverter');
    dom.ccInputArea = $('#ccInputArea');
    dom.ccManualInput = $('#ccManualInput');
    dom.ccCharCount = $('#ccCharCount');
    dom.ccSourceText = $('#ccSourceText');
    dom.ccSourceLabel = $('#ccSourceLabel');
    dom.ccSourcePanel = $('#ccSourcePanel');
    dom.ccConvertGrid = $('#ccConvertGrid');
    dom.ccResultText = $('#ccResultText');
    dom.btnCopyCC = $('#btnCopyCC');
    dom.viewQRCode = $('#viewQRCode');
    dom.viewCaseConverter = $('#viewCaseConverter');
    dom.viewTextReverser = $('#viewTextReverser');
    dom.cardTextReverser = $('#cardTextReverser');
    dom.trInputArea = $('#trInputArea');
    dom.trManualInput = $('#trManualInput');
    dom.trCharCount = $('#trCharCount');
    dom.trSourceText = $('#trSourceText');
    dom.trSourceLabel = $('#trSourceLabel');
    dom.trSourcePanel = $('#trSourcePanel');
    dom.trReverseGrid = $('#trReverseGrid');
    dom.trResultText = $('#trResultText');
    dom.btnCopyTR = $('#btnCopyTR');
    dom.viewTextDedup = $('#viewTextDedup');
    dom.cardTextDedup = $('#cardTextDedup');
    dom.tdInputArea = $('#tdInputArea');
    dom.tdManualInput = $('#tdManualInput');
    dom.tdCharCount = $('#tdCharCount');
    dom.tdSourceText = $('#tdSourceText');
    dom.tdSourceLabel = $('#tdSourceLabel');
    dom.tdSourcePanel = $('#tdSourcePanel');
    dom.tdOperationGrid = $('#tdOperationGrid');
    dom.tdResultText = $('#tdResultText');
    dom.btnCopyTD = $('#btnCopyTD');
    dom.viewEmojiConverter = $('#viewEmojiConverter');
	    dom.cardEmojiConverter = $('#cardEmojiConverter');
	    dom.cardWebClip = $('#cardWebClip');
	    dom.ecInputArea = $('#ecInputArea');
    dom.ecManualInput = $('#ecManualInput');
    dom.ecCharCount = $('#ecCharCount');
    dom.ecSourceText = $('#ecSourceText');
    dom.ecSourceLabel = $('#ecSourceLabel');
    dom.ecSourcePanel = $('#ecSourcePanel');
    dom.ecConvertGrid = $('#ecConvertGrid');
    dom.ecResultText = $('#ecResultText');
    dom.btnCopyEC = $('#btnCopyEC');
    dom.headerBackBtn = $('#headerBackBtn');
    dom.headerTitle = $('#headerTitle');
	    dom.popupSuggestionInput = $('#popupSuggestionInput');
	    dom.popupCharCount = $('#popupCharCount');
	    dom.popupSubmitSuggestionBtn = $('#popupSubmitSuggestionBtn');
	    dom.webClipModeSelection = $('#webClipModeSelection');
	    dom.webClipModePage = $('#webClipModePage');
	    dom.webClipUnavailable = $('#webClipUnavailable');
	    dom.webClipSourceTitle = $('#webClipSourceTitle');
	    dom.webClipSourceMeta = $('#webClipSourceMeta');
	    dom.webClipPreview = $('#webClipPreview');
	    dom.webClipTags = $('#webClipTags');
	    dom.webClipNote = $('#webClipNote');
	    dom.btnSaveWebClip = $('#btnSaveWebClip');
	    dom.webClipList = $('#webClipList');
	    dom.btnExportWebClipMD = $('#btnExportWebClipMD');
	    dom.btnExportWebClipTXT = $('#btnExportWebClipTXT');
	  }

  var viewTitleKeys = {
    home: 'app.title',
    settings: 'settings.title',
    wordcount: 'tools.wordcount.name',
    markdown: 'tools.markdown.name',
    plaintext: 'tools.plaintext.name',
    qrcode: 'tools.qrcode.name',
    caseconverter: 'tools.caseconverter.name',
	    textreverser: 'tools.textreverser.name',
	    textdedup: 'tools.textdedup.name',
	    emojiconverter: 'tools.emoji_converter.name',
	    webclip: 'tools.webclip.name'
	  };

  function updateHeader(viewName) {
    var key = viewTitleKeys[viewName] || 'app.title';
    var title = I18n.t(key);
    if (dom.headerTitle) {
      dom.headerTitle.textContent = title;
    }
    if (dom.headerBackBtn) {
      dom.headerBackBtn.style.display = viewName === 'home' ? 'none' : 'flex';
    }
  }

  function showView(name) {
    currentView = name;
    var viewMap = {
      home: dom.viewHome,
      settings: dom.viewSettings,
      wordcount: dom.viewWordCount,
      markdown: dom.viewMarkdown,
      plaintext: dom.viewPlainText,
      qrcode: dom.viewQRCode,
      caseconverter: dom.viewCaseConverter,
	      textreverser: dom.viewTextReverser,
	      textdedup: dom.viewTextDedup,
	      emojiconverter: dom.viewEmojiConverter,
	      webclip: dom.viewWebClip
	    };
    for (var key in viewMap) {
      if (viewMap[key]) {
        viewMap[key].classList.toggle('active', key === name);
      }
    }

    dom.contentArea.scrollTop = 0;
    setStatus(I18n.t('app.status_ready'));
    updateHeader(name);
  }

  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.style.display = 'block';
    dom.toast.style.animation = 'none';
    void dom.toast.offsetWidth;
    dom.toast.style.animation = 'toastIn 0.3s ease';
    toastTimer = setTimeout(function () {
      dom.toast.style.display = 'none';
    }, 2000);
  }

  function setStatus(text) {
    dom.statusText.textContent = text;
  }

  function setLoading(el, loading) {
    if (loading) {
      el.classList.add('loading');
      el.disabled = true;
    } else {
      el.classList.remove('loading');
      el.disabled = false;
    }
  }

  function sendToContent(action, payload) {
    return new Promise(function (resolve, reject) {
      if (!TextFlow.isChromeExtension()) {
        return reject(new Error(I18n.t('errors.not_extension')));
      }
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (!tabs || tabs.length === 0) {
          return reject(new Error(I18n.t('errors.no_active_tab')));
        }
        var tab = tabs[0];
        var url = tab.url || '';
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
          return reject(new Error(I18n.t('errors.unsupported_page')));
        }
        chrome.tabs.sendMessage(tab.id, {
          action: action,
          payload: payload || {},
          requestId: 'popup_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    });
  }

  function sanitizeURL(url) {
    try {
      var u = new URL(url);
      return u.origin + u.pathname;
    } catch (e) {
      return '';
    }
  }

  function getPageInfo() {
    if (!TextFlow.isChromeExtension()) return Promise.resolve({ title: I18n.t('errors.local_test'), url: 'http://localhost' });
    return sendToContent('getPageInfo').then(function (resp) {
      return {
        title: resp.data.title || '',
        url: sanitizeURL(resp.data.url || '')
      };
    }).catch(function () {
      return { title: I18n.t('errors.unknown_page'), url: '' };
    });
  }

  function homeViewInit() {
    $('#cardWordCount').addEventListener('click', function () {
      showView('wordcount');
      document.querySelector('#viewWordCount .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewWordCount .mode-pill[data-mode="manual"]').classList.remove('active');
      document.querySelector('#viewWordCount .mode-pill[data-mode="full"]').classList.remove('active');
      wcMode = 'selected';

      ensureModule('wordcount').then(function () {
        WordCountTool.setMode('selected');
        wordCountViewInit();
      });
    });

    $('#cardMarkdown').addEventListener('click', function () {
      showView('markdown');

      ensureModule('markdown').then(function () {
        markdownViewInit();
      });
    });

    $('#cardPlainText').addEventListener('click', function () {
      showView('plaintext');
      document.querySelector('#viewPlainText .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewPlainText .mode-pill[data-mode="manual"]').classList.remove('active');
      document.querySelector('#viewPlainText .mode-pill[data-mode="full"]').classList.remove('active');
      ptMode = 'selected';

      ensureModule('plaintext').then(function () {
        PlainTextTool.setMode('selected');
        PlainTextTool.setMergeBlankLines(true);
        PlainTextTool.setKeepLinkURLs(false);
        $('#ptMergeLinesToggle').checked = true;
        $('#ptKeepURLsToggle').checked = false;
        plainTextViewInit();
        executePlainTextExtract();
      });
    });

    dom.cardQRCode.addEventListener('click', function () {
      showView('qrcode');
      document.querySelector('#viewQRCode .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewQRCode .mode-pill[data-mode="full"]').classList.remove('active');

      ensureModule('qrcode').then(function () {
        QRCodeTool.setMode('selected');
        qrCodeViewInit();
      });
    });

    dom.cardCaseConverter.addEventListener('click', function () {
      showView('caseconverter');
      document.querySelector('#viewCaseConverter .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewCaseConverter .mode-pill[data-mode="manual"]').classList.remove('active');

      ensureModule('caseconverter').then(function () {
        CaseConverterTool.setMode('selected');
        ccController.init();
      }).catch(function () {
        showToast(I18n.t('tools.caseconverter.status_failed'));
      });
    });

    dom.cardTextReverser.addEventListener('click', function () {
      showView('textreverser');
      document.querySelector('#viewTextReverser .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewTextReverser .mode-pill[data-mode="manual"]').classList.remove('active');

      ensureModule('textreverser').then(function () {
        TextReverserTool.setMode('selected');
        trController.init();
      }).catch(function () {
        showToast(I18n.t('tools.textreverser.status_failed'));
      });
    });

    dom.cardTextDedup.addEventListener('click', function () {
      showView('textdedup');
      document.querySelector('#viewTextDedup .mode-pill[data-mode="selected"]').classList.add('active');
      document.querySelector('#viewTextDedup .mode-pill[data-mode="manual"]').classList.remove('active');

      ensureModule('textdedup').then(function () {
        TextDedupTool.setMode('selected');
        tdController.init();
      }).catch(function () {
        showToast(I18n.t('tools.textdedup.status_failed'));
      });
    });

	    dom.cardEmojiConverter.addEventListener('click', function () {
	      showView('emojiconverter');
	      document.querySelector('#viewEmojiConverter .mode-pill[data-mode="selected"]').classList.add('active');
	      document.querySelector('#viewEmojiConverter .mode-pill[data-mode="manual"]').classList.remove('active');

      ensureModule('emojiconverter').then(function () {
        EmojiConverterTool.setMode('selected');
        ecController.init();
      }).catch(function () {
	        showToast(I18n.t('tools.emoji_converter.status_failed'));
	      });
	    });

	    dom.cardWebClip.addEventListener('click', function () {
	      showView('webclip');
	      ensureModule('webclip').then(function () {
	        webClipViewInit();
	      }).catch(function () {
	        showToast(I18n.t('tools.webclip.status_failed'));
	      });
	    });
	  }

  function executeWordCount() {
    setStatus(I18n.t('tools.wordcount.status_loading'));

    var run = wcMode === 'manual'
      ? WordCountTool.executeManual(dom.wcManualInput ? dom.wcManualInput.value : '')
      : WordCountTool.execute(wcMode);

    run.then(function (result) {
      $('#wcTotalChars').textContent = WordCountTool.formatCount(result.totalChars);
      $('#wcCharsNoSpace').textContent = WordCountTool.formatCount(result.charsNoSpaces);
      $('#wcChinese').textContent = WordCountTool.formatCount(result.chineseChars);
      $('#wcEnglish').textContent = WordCountTool.formatCount(result.englishWords);

      $('#wcImages').textContent = WordCountTool.formatCount(result.images);
      $('#wcVideos').textContent = WordCountTool.formatCount(result.videos);
      $('#wcLinks').textContent = WordCountTool.formatCount(result.links);

      var showMedia = result.mode === 'full' || result.images > 0 || result.videos > 0 || result.links > 0;
      $('#wcCardImages').style.display = showMedia ? '' : 'none';
      $('#wcCardVideos').style.display = showMedia ? '' : 'none';
      $('#wcCardLinks').style.display = showMedia ? '' : 'none';

      $('#wcParagraphs').textContent = WordCountTool.formatCount(result.paragraphs);
      $('#wcSentences').textContent = WordCountTool.formatCount(result.sentences);

      var statusKey = result.mode === 'full'
        ? 'tools.wordcount.status_done_full'
        : (result.mode === 'manual' ? 'tools.wordcount.status_done_manual' : 'tools.wordcount.status_done_selected');
      setStatus(I18n.t(statusKey));
    }).catch(function (err) {
      showToast(I18n.t('tools.wordcount.error_failed') + ': ' + err.message);
      setStatus(I18n.t('tools.wordcount.status_failed'));
    });
  }

  var _wcEventsBound = false;
  function updateWordCountModeUI() {
    if (dom.wcManualPanel) {
      dom.wcManualPanel.style.display = wcMode === 'manual' ? '' : 'none';
    }
    if (wcMode === 'manual' && dom.wcManualInput) {
      dom.wcManualCharCount.textContent = WordCountTool.formatCount(dom.wcManualInput.value.length);
      dom.wcManualInput.focus();
    }
  }

  function wordCountViewInit() {
    updateWordCountModeUI();

    if (!_wcEventsBound) {
      _wcEventsBound = true;
      $$('#viewWordCount .mode-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          $$('#viewWordCount .mode-pill').forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
          wcMode = pill.dataset.mode;
          WordCountTool.setMode(wcMode);
          updateWordCountModeUI();
          executeWordCount();
        });
      });

      if (dom.wcManualInput) {
        dom.wcManualInput.addEventListener('input', function () {
          if (wcMode !== 'manual') return;
          dom.wcManualCharCount.textContent = WordCountTool.formatCount(this.value.length);
          executeWordCount();
        });
      }
    }

    executeWordCount();
  }

  var _mdEventsBound = false;
  function markdownViewInit() {
    MarkdownTool.setPreserveIndent(false);
    $('#mdPreserveIndentToggle').checked = false;

    if (!_mdEventsBound) {
      _mdEventsBound = true;
      $('#mdPreserveIndentToggle').addEventListener('change', function () {
        MarkdownTool.setPreserveIndent(this.checked);
        if (mdMode === 'full' || dom.mdNoSelectionBanner.style.display === 'none') {
          executeMarkdown();
        }
      });

      $$('#viewMarkdown .mode-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          $$('#viewMarkdown .mode-pill').forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
          mdMode = pill.dataset.mode;
          MarkdownTool.setMode(mdMode);
          if (mdMode === 'full') {
            dom.mdNoSelectionBanner.style.display = 'none';
            dom.mdResultArea.classList.add('show');
            executeMarkdown();
          } else {
            checkSelectionAndExecute(false);
          }
        });
      });

      $$('#viewMarkdown .preview-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          $$('#viewMarkdown .preview-tab').forEach(function (t) { t.classList.remove('active'); });
          tab.classList.add('active');
          var data = MarkdownTool.getResult();
          if (!data) return;
          var tabType = tab.dataset.tab;
          if (tabType === 'source') {
            dom.mdPreview.textContent = data.markdown;
            dom.mdPreview.classList.remove('rendered');
          } else {
            dom.mdPreview.innerHTML = markedPreview(data.markdown);
            dom.mdPreview.classList.add('rendered');
          }
        });
      });

      $('#btnCopyMD').addEventListener('click', function () {
        var data = MarkdownTool.getResult();
        if (!data || !data.markdown) {
          showToast(I18n.t('tools.markdown.toast_no_content'));
          return;
        }
        MarkdownTool.copyToClipboard(data.markdown).then(function () {
          showToast(I18n.t('tools.markdown.toast_copy_success'));
        }).catch(function () {
          showToast(I18n.t('tools.markdown.toast_copy_failed'));
        });
      });

      $('#btnDownloadMD').addEventListener('click', function () {
        var data = MarkdownTool.getResult();
        if (!data || !data.markdown) {
          showToast(I18n.t('tools.markdown.toast_no_content'));
          return;
        }
        var filename = (data.pageTitle || 'export').replace(/[\\/:*?"<>|]/g, '_').substring(0, 60) + '.md';
        MarkdownTool.downloadFile(data.markdown, filename);
        showToast(I18n.t('tools.markdown.toast_download_started'));
      });
    }

    function markedPreview(md) {
      var html = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<strong>$1</strong>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '<br><br>');
      return html;
    }

    function executeMarkdown() {
      setStatus(I18n.t('tools.markdown.status_converting'));

      MarkdownTool.execute(mdMode).then(function (data) {
        dom.mdPreview.textContent = data.markdown;
        dom.mdPreview.classList.remove('rendered');
        updateMarkdownSourceTag(data.mode === 'full' ? 'full' : mdMode);

        $('#viewMarkdown .preview-tab[data-tab="source"]').classList.add('active');
        $('#viewMarkdown .preview-tab[data-tab="rendered"]').classList.remove('active');

        setStatus(I18n.t('tools.markdown.status_done'));
        if (data.isShortContent) {
          showToast(I18n.t('tools.markdown.toast_short_content'));
        }
      }).catch(function (err) {
        showToast(I18n.t('tools.markdown.error_failed') + ': ' + err.message);
        setStatus(I18n.t('tools.markdown.status_failed'));
      });
    }

    function setMarkdownMode(mode) {
      mdMode = mode;
      MarkdownTool.setMode(mdMode);
      $$('#viewMarkdown .mode-pill').forEach(function (pill) {
        pill.classList.toggle('active', pill.dataset.mode === mode);
      });
    }

    function updateMarkdownSourceTag(mode) {
      if (!dom.mdSourceTag) return;
      var key = mode === 'full' ? 'tools.markdown.tag_full' : 'tools.markdown.tag_selected';
      dom.mdSourceTag.textContent = I18n.t(key);
    }

    function checkSelectionAndExecute(allowAutoFull) {
      allowAutoFull = allowAutoFull !== false;
      if (TextFlow.isChromeExtension()) {
        var cache = getSelectionCache();
        if (cache.hasSelection) {
          setMarkdownMode('selected');
          dom.mdNoSelectionBanner.style.display = 'none';
          dom.mdResultArea.classList.add('show');
          executeMarkdown();
        } else {
          sendToContent('getSelection').then(function (resp) {
            if (resp && resp.success && resp.data && resp.data.hasSelection) {
              _selectionCache.hasSelection = true;
              _selectionCache.text = resp.data.text || '';
              _selectionCache.html = resp.data.html || '';
              setMarkdownMode('selected');
              dom.mdNoSelectionBanner.style.display = 'none';
              dom.mdResultArea.classList.add('show');
              executeMarkdown();
            } else {
              if (allowAutoFull) {
                setMarkdownMode('full');
                dom.mdNoSelectionBanner.style.display = 'none';
                dom.mdResultArea.classList.add('show');
                executeMarkdown();
              } else {
                dom.mdNoSelectionBanner.style.display = 'flex';
                dom.mdResultArea.classList.remove('show');
                setStatus(I18n.t('tools.markdown.status_no_selection'));
              }
            }
          }).catch(function () {
            setMarkdownMode('full');
            dom.mdNoSelectionBanner.style.display = 'none';
            dom.mdResultArea.classList.add('show');
            executeMarkdown();
          });
        }
      } else {
        setMarkdownMode('selected');
        dom.mdNoSelectionBanner.style.display = 'none';
        dom.mdResultArea.classList.add('show');
        executeMarkdown();
      }
    }

    checkSelectionAndExecute(true);
  }

  function executePlainTextExtract() {
    setStatus(I18n.t('tools.plaintext.status_extracting'));
    dom.ptPreview.textContent = ptMode === 'manual' ? '' : I18n.t('tools.plaintext.placeholder_loading');
    dom.ptResultArea.classList.add('show');
    dom.ptPreview.classList.remove('has-content');

    var run = ptMode === 'manual' && dom.ptManualInput
      ? PlainTextTool.executeManual(dom.ptManualInput.value)
      : PlainTextTool.execute(ptMode);

    run.then(function (data) {
      dom.ptPreview.textContent = data.text || '';
      dom.ptPreview.classList.add('has-content');
      setStatus(I18n.t('tools.plaintext.status_done'));
    }).catch(function (err) {
      showToast(I18n.t('tools.plaintext.status_failed') + ': ' + err.message);
      setStatus(I18n.t('tools.plaintext.status_failed'));
    });
  }

  var _ptEventsBound = false;
  function updatePlainTextManualPanel() {
    if (!dom.ptManualPanel) return;
    dom.ptManualPanel.style.display = ptMode === 'manual' ? '' : 'none';
    if (dom.ptManualCharCount && dom.ptManualInput) {
      dom.ptManualCharCount.textContent = String(dom.ptManualInput.value.length);
    }
  }

  function plainTextViewInit() {
    if (!_ptEventsBound) {
      _ptEventsBound = true;
      $$('#viewPlainText .mode-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          $$('#viewPlainText .mode-pill').forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
          ptMode = pill.dataset.mode;
          PlainTextTool.setMode(ptMode);
          updatePlainTextManualPanel();
          executePlainTextExtract();
        });
      });

      if (dom.ptManualInput) {
        dom.ptManualInput.addEventListener('input', function () {
          updatePlainTextManualPanel();
          if (ptMode !== 'manual') return;
          executePlainTextExtract();
        });
      }

      $('#ptMergeLinesToggle').addEventListener('change', function () {
        PlainTextTool.setMergeBlankLines(this.checked);
        executePlainTextExtract();
      });

      $('#ptKeepURLsToggle').addEventListener('change', function () {
        PlainTextTool.setKeepLinkURLs(this.checked);
        executePlainTextExtract();
      });

      $('#btnCopyPT').addEventListener('click', function () {
        var data = PlainTextTool.getResult();
        if (!data || !data.text) {
          showToast(I18n.t('tools.plaintext.toast_no_content'));
          return;
        }
        PlainTextTool.copyToClipboard(data.text).then(function () {
          showToast(I18n.t('tools.plaintext.toast_copy_success'));
        }).catch(function () {
          showToast(I18n.t('tools.plaintext.toast_copy_failed'));
        });
      });

      $('#btnDownloadPT').addEventListener('click', function () {
        var data = PlainTextTool.getResult();
        if (!data || !data.text) {
          showToast(I18n.t('tools.plaintext.toast_no_content'));
          return;
        }
        var filename = (data.pageTitle || 'export').replace(/[\\/:*?"<>|]/g, '_').substring(0, 60) + '.txt';
        PlainTextTool.downloadFile(data.text, filename, 'text/plain;charset=utf-8');
        showToast(I18n.t('tools.plaintext.toast_download_started'));
      });
    }

    updatePlainTextManualPanel();
    executePlainTextExtract();
  }

  function executeQRCode() {
    setStatus(I18n.t('tools.qrcode.status_generating'));

    QRCodeTool.execute().then(function (data) {
      dom.qrContentText.textContent = data.displayText;
      dom.qrImage.src = data.dataURL;
      setStatus(I18n.t('tools.qrcode.status_done'));
    }).catch(function (err) {
      showToast(I18n.t('tools.qrcode.error_failed') + ': ' + err.message);
      setStatus(I18n.t('tools.qrcode.status_failed'));
    });
  }

	  var _qrEventsBound = false;
	  function qrCodeViewInit() {
    if (!_qrEventsBound) {
      _qrEventsBound = true;
      $$('#viewQRCode .mode-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          $$('#viewQRCode .mode-pill').forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
          QRCodeTool.setMode(pill.dataset.mode);
          executeQRCode();
        });
      });

      dom.btnCopyQR.addEventListener('click', function () {
        QRCodeTool.copyQRImageToClipboard().then(function () {
          showToast(I18n.t('tools.qrcode.toast_copy_success'));
        }).catch(function () {
          showToast(I18n.t('tools.qrcode.toast_copy_failed'));
        });
      });

      dom.btnDownloadQR.addEventListener('click', function () {
        var data = QRCodeTool.getResult();
        if (!data || !data.dataURL) {
          showToast(I18n.t('tools.qrcode.toast_no_content'));
          return;
        }
        var filename = 'QRCode_' + Date.now() + '.png';
        QRCodeTool.downloadFile(filename).then(function () {
          showToast(I18n.t('tools.qrcode.toast_download_started'));
        });
      });
    }

	    executeQRCode();
	  }

	  var _webClipEventsBound = false;
	  var _webClipContext = null;
	  var _webClipMode = 'page';

	  function formatClipTime(iso) {
	    var date = iso ? new Date(iso) : new Date();
	    if (isNaN(date.getTime())) date = new Date();
	    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
	    return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
	  }

	  function setWebClipMode(mode) {
	    if (mode === 'selection' && (!_webClipContext || !_webClipContext.selectionText)) {
	      mode = 'page';
	    }
	    _webClipMode = mode;
	    $$('#viewWebClip .mode-pill').forEach(function (pill) {
	      pill.classList.toggle('active', pill.dataset.mode === mode);
	    });
	    updateWebClipPreview();
	  }

	  function updateWebClipPreview() {
	    if (!_webClipContext) {
	      dom.webClipPreview.textContent = I18n.t('tools.webclip.status_loading');
	      return;
	    }

	    dom.webClipSourceTitle.textContent = _webClipContext.title || I18n.t('errors.unknown_page');
	    dom.webClipSourceMeta.textContent = (_webClipContext.domain || '') + (_webClipContext.url ? ' · ' + _webClipContext.url : '');

	    if (_webClipContext.supported === false) {
	      dom.webClipUnavailable.style.display = 'block';
	      dom.btnSaveWebClip.disabled = true;
	      dom.webClipPreview.textContent = I18n.t('tools.webclip.status_unavailable');
	      return;
	    }

	    dom.webClipUnavailable.style.display = 'none';
	    dom.btnSaveWebClip.disabled = false;

	    if (_webClipMode === 'selection') {
	      dom.webClipPreview.textContent = _webClipContext.selectionText || '';
	    } else {
	      dom.webClipPreview.textContent = _webClipContext.title + '\n' + _webClipContext.url;
	    }
	  }

	  function renderWebClipList() {
	    if (typeof WebClipTool === 'undefined' || !dom.webClipList) return Promise.resolve();
	    return WebClipTool.getRecentClips(5).then(function (clips) {
	      dom.webClipList.innerHTML = '';

	      if (!clips.length) {
	        var empty = document.createElement('div');
	        empty.className = 'webclip-empty';
	        empty.textContent = I18n.t('tools.webclip.empty');
	        dom.webClipList.appendChild(empty);
	        return;
	      }

	      clips.forEach(function (clip) {
	        var item = document.createElement('div');
	        item.className = 'webclip-item';

	        var title = document.createElement('div');
	        title.className = 'webclip-item-title';
	        title.textContent = clip.title || I18n.t('errors.unknown_page');

	        var text = document.createElement('div');
	        text.className = 'webclip-item-text';
	        text.textContent = clip.text || clip.url || '';

	        var meta = document.createElement('div');
	        meta.className = 'webclip-item-meta';
	        meta.textContent = (clip.domain || '') + ' · ' + formatClipTime(clip.created_at);

	        var tags = null;
	        if (clip.tags && clip.tags.length) {
	          tags = document.createElement('div');
	          tags.className = 'webclip-item-tags';
	          clip.tags.forEach(function (tagText) {
	            var tag = document.createElement('span');
	            tag.className = 'webclip-tag';
	            tag.textContent = tagText;
	            tags.appendChild(tag);
	          });
	        }

	        var note = null;
	        if (clip.note) {
	          note = document.createElement('div');
	          note.className = 'webclip-item-note';
	          note.textContent = clip.note;
	        }

	        var actions = document.createElement('div');
	        actions.className = 'webclip-actions';

	        var copyBtn = document.createElement('button');
	        copyBtn.type = 'button';
	        copyBtn.textContent = I18n.t('tools.webclip.btn_copy');
	        copyBtn.addEventListener('click', function () {
	          WebClipTool.copyClip(clip.id).then(function () {
	            showToast(I18n.t('tools.webclip.toast_copy_success'));
	          }).catch(function (err) {
	            showToast(err.message || I18n.t('tools.webclip.toast_copy_failed'));
	          });
	        });

	        var openBtn = document.createElement('button');
	        openBtn.type = 'button';
	        openBtn.textContent = I18n.t('tools.webclip.btn_open');
	        openBtn.addEventListener('click', function () {
	          if (!clip.url) return;
	          if (TextFlow.isChromeExtension() && chrome.tabs && chrome.tabs.create) {
	            chrome.tabs.create({ url: clip.url });
	          } else {
	            window.open(clip.url, '_blank');
	          }
	        });

	        var deleteBtn = document.createElement('button');
	        deleteBtn.type = 'button';
	        deleteBtn.className = 'danger';
	        deleteBtn.textContent = I18n.t('tools.webclip.btn_delete');
	        deleteBtn.addEventListener('click', function () {
	          WebClipTool.deleteClip(clip.id).then(function () {
	            showToast(I18n.t('tools.webclip.status_deleted'));
	            renderWebClipList();
	          });
	        });

	        actions.appendChild(copyBtn);
	        actions.appendChild(openBtn);
	        actions.appendChild(deleteBtn);

	        item.appendChild(title);
	        item.appendChild(text);
	        item.appendChild(meta);
	        if (tags) item.appendChild(tags);
	        if (note) item.appendChild(note);
	        item.appendChild(actions);
	        dom.webClipList.appendChild(item);
	      });
	    });
	  }

	  function loadWebClipContext() {
	    setStatus(I18n.t('tools.webclip.status_loading'));
	    dom.webClipPreview.textContent = I18n.t('tools.webclip.status_loading');

	    return WebClipTool.loadContext().then(function (context) {
	      _webClipContext = context;
	      dom.webClipModeSelection.disabled = !context.selectionText;
	      setWebClipMode(context.mode === 'selection' ? 'selection' : 'page');
	      setStatus(I18n.t('app.status_ready'));
	    }).catch(function (err) {
	      _webClipContext = {
	        supported: false,
	        title: I18n.t('errors.unknown_page'),
	        url: '',
	        domain: '',
	        selectionText: '',
	        mode: 'page'
	      };
	      updateWebClipPreview();
	      setStatus(I18n.t('tools.webclip.status_failed'));
	      showToast(err.message || I18n.t('tools.webclip.status_unavailable'));
	    });
	  }

	  function webClipViewInit() {
	    if (!_webClipEventsBound) {
	      _webClipEventsBound = true;

	      $$('#viewWebClip .mode-pill').forEach(function (pill) {
	        pill.addEventListener('click', function () {
	          if (pill.disabled) return;
	          setWebClipMode(pill.dataset.mode);
	        });
	      });

	      dom.btnSaveWebClip.addEventListener('click', function () {
	        setLoading(dom.btnSaveWebClip, true);
	        WebClipTool.saveClip({
	          context: _webClipContext,
	          type: _webClipMode,
	          tags: dom.webClipTags.value,
	          note: dom.webClipNote.value
	        }).then(function (result) {
	          dom.webClipTags.value = '';
	          dom.webClipNote.value = '';
	          showToast(I18n.t(result.truncated ? 'tools.webclip.toast_too_long' : 'tools.webclip.status_saved'));
	          return renderWebClipList();
	        }).catch(function (err) {
	          showToast(err.message || I18n.t('tools.webclip.status_failed'));
	        }).then(function () {
	          setLoading(dom.btnSaveWebClip, false);
	        });
	      });

	      dom.btnExportWebClipMD.addEventListener('click', function () {
	        WebClipTool.exportMarkdown().then(function () {
	          showToast(I18n.t('tools.webclip.toast_export_started'));
	        }).catch(function (err) {
	          showToast(err.message || I18n.t('tools.webclip.empty'));
	        });
	      });

	      dom.btnExportWebClipTXT.addEventListener('click', function () {
	        WebClipTool.exportText().then(function () {
	          showToast(I18n.t('tools.webclip.toast_export_started'));
	        }).catch(function (err) {
	          showToast(err.message || I18n.t('tools.webclip.empty'));
	        });
	      });
	    }

	    loadWebClipContext();
	    renderWebClipList();
	  }

	  function createToolViewController(config) {
    var viewId = config.viewId;
    var getTool = config.getTool;
    var getEls = config.getEls;
    var i18nPrefix = config.i18nPrefix;
    var btnClass = config.btnClass;
    var defaultType = config.defaultType;
    var getTypes = config.getTypes;
    var processFn = config.processFn;
    var extraInit = config.extraInit;

    function renderButtons(activeType) {
      var els = getEls();
      var tool = getTool();
      var types = getTypes();
      els.btnGrid.innerHTML = '';
      types.forEach(function (type) {
        var btn = document.createElement('button');
        btn.className = btnClass;
        if (type.id === activeType) {
          btn.classList.add('active');
        }
        btn.textContent = type.nameKey ? I18n.t(type.nameKey) : type.label;
        btn.addEventListener('click', function () {
          var sourceText = tool.getSourceText();
          if (!sourceText) {
            showToast(I18n.t(i18nPrefix + '.toast_no_text'));
            return;
          }
          processFn(type.id).then(function () {
            updateResult();
          }).catch(function (err) {
            els.resultText.textContent = err.message || I18n.t(i18nPrefix + '.status_failed');
            showToast(err.message);
          });
        });
        els.btnGrid.appendChild(btn);
      });
    }

    function updateResult() {
      var els = getEls();
      var tool = getTool();
      var data = tool.getResult();
      if (data && data.resultText) {
        els.resultText.textContent = data.resultText;
      } else {
        els.resultText.textContent = '';
      }
      if (data && data.sourceText) {
        els.sourceText.textContent = data.sourceText;
      } else if (tool.getMode() === 'selected') {
        els.sourceText.textContent = I18n.t(i18nPrefix + '.toast_no_text');
      } else {
        els.sourceText.textContent = I18n.t(i18nPrefix + '.placeholder_input');
      }
      renderButtons(data ? data.type : defaultType);
    }

    function execute() {
      var els = getEls();
      var tool = getTool();
      setStatus(I18n.t(i18nPrefix + '.status_loading'));

      tool.execute().then(function () {
        updateResult();
        setStatus(I18n.t(i18nPrefix + '.status_done'));
      }).catch(function (err) {
        els.sourceText.textContent = err.message || I18n.t(i18nPrefix + '.status_failed');
        els.resultText.textContent = '';
        setStatus(I18n.t(i18nPrefix + '.status_failed'));
        renderButtons(tool.getCurrentType());
      });
    }

    var _eventsBound = false;

    function bindEvents() {
      if (_eventsBound) return;
      _eventsBound = true;

      var els = getEls();
      var tool = getTool();

      $$('#' + viewId + ' .mode-pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          $$('#' + viewId + ' .mode-pill').forEach(function (p) { p.classList.remove('active'); });
          pill.classList.add('active');
          var mode = pill.dataset.mode;
          tool.setMode(mode);

          if (mode === 'manual') {
            els.inputArea.style.display = 'block';
            els.sourceLabel.style.display = 'none';
            els.sourcePanel.style.display = 'none';
            var manualText = els.manualInput.value.trim();
            tool.setManualText(manualText);
            if (manualText) {
              updateResult();
            } else {
              els.sourceText.textContent = I18n.t(i18nPrefix + '.placeholder_input');
              els.resultText.textContent = '';
              renderButtons(tool.getCurrentType());
            }
            setStatus(I18n.t('app.status_ready'));
          } else {
            els.inputArea.style.display = 'none';
            els.sourceLabel.style.display = '';
            els.sourcePanel.style.display = '';
            execute();
          }
        });
      });

      els.manualInput.addEventListener('input', function () {
        var len = this.value.length;
        els.charCount.textContent = len + ' / 5000';
        tool.setManualText(this.value);
        if (this.value.trim()) {
          processFn(tool.getCurrentType()).then(function () {
            updateResult();
          }).catch(function (err) {
            els.resultText.textContent = err.message || I18n.t(i18nPrefix + '.status_failed');
          });
        } else {
          els.sourceText.textContent = I18n.t(i18nPrefix + '.placeholder_input');
          els.resultText.textContent = '';
          renderButtons(tool.getCurrentType());
        }
      });

      els.copyBtn.addEventListener('click', function () {
        tool.copyToClipboard().then(function () {
          showToast(I18n.t(i18nPrefix + '.toast_copy_success'));
        }).catch(function (err) {
          showToast(err.message || I18n.t(i18nPrefix + '.toast_copy_failed'));
        });
      });

      if (extraInit) {
        extraInit();
      }
    }

    function init() {
      bindEvents();

      var els = getEls();
      var tool = getTool();
      var currentMode = tool.getMode() || 'selected';
      if (currentMode === 'manual') {
        els.inputArea.style.display = 'block';
        els.sourceLabel.style.display = 'none';
        els.sourcePanel.style.display = 'none';
        var manualText = els.manualInput.value.trim();
        tool.setManualText(manualText);
        if (manualText) {
          updateResult();
        } else {
          els.sourceText.textContent = I18n.t(i18nPrefix + '.placeholder_input');
          els.resultText.textContent = '';
          renderButtons(tool.getCurrentType());
          setStatus(I18n.t('app.status_ready'));
        }
      } else {
        els.inputArea.style.display = 'none';
        els.sourceLabel.style.display = '';
        els.sourcePanel.style.display = '';
        execute();
      }
    }

    return {
      init: init,
      renderButtons: renderButtons,
      updateResult: updateResult,
      execute: execute
    };
  }

  var ccController = createToolViewController({
    viewId: 'viewCaseConverter',
    getTool: function () { return CaseConverterTool; },
    getEls: function () { return {
      inputArea: dom.ccInputArea,
      sourceLabel: dom.ccSourceLabel,
      sourcePanel: dom.ccSourcePanel,
      manualInput: dom.ccManualInput,
      charCount: dom.ccCharCount,
      sourceText: dom.ccSourceText,
      resultText: dom.ccResultText,
      copyBtn: dom.btnCopyCC,
      btnGrid: dom.ccConvertGrid
    }; },
    i18nPrefix: 'tools.caseconverter',
    btnClass: 'case-convert-btn',
    defaultType: 'lowercase',
    getTypes: function () { return CaseConverterTool.getConvertTypes(); },
    processFn: function (type) { return CaseConverterTool.convert(type); },
    extraInit: null
  });

  var trController = createToolViewController({
    viewId: 'viewTextReverser',
    getTool: function () { return TextReverserTool; },
    getEls: function () { return {
      inputArea: dom.trInputArea,
      sourceLabel: dom.trSourceLabel,
      sourcePanel: dom.trSourcePanel,
      manualInput: dom.trManualInput,
      charCount: dom.trCharCount,
      sourceText: dom.trSourceText,
      resultText: dom.trResultText,
      copyBtn: dom.btnCopyTR,
      btnGrid: dom.trReverseGrid
    }; },
    i18nPrefix: 'tools.textreverser',
    btnClass: 'reverse-btn',
    defaultType: 'reverse_all',
    getTypes: function () { return TextReverserTool.getReverseTypes(); },
    processFn: function (type) { return TextReverserTool.reverse(type); },
    extraInit: null
  });

  var tdController = createToolViewController({
    viewId: 'viewTextDedup',
    getTool: function () { return TextDedupTool; },
    getEls: function () { return {
      inputArea: dom.tdInputArea,
      sourceLabel: dom.tdSourceLabel,
      sourcePanel: dom.tdSourcePanel,
      manualInput: dom.tdManualInput,
      charCount: dom.tdCharCount,
      sourceText: dom.tdSourceText,
      resultText: dom.tdResultText,
      copyBtn: dom.btnCopyTD,
      btnGrid: dom.tdOperationGrid
    }; },
    i18nPrefix: 'tools.textdedup',
    btnClass: 'dedup-btn',
    defaultType: 'dedup',
    getTypes: function () { return TextDedupTool.getOperationTypes(); },
    processFn: function (type) { return TextDedupTool.processType(type); },
    extraInit: function () {
      $('#tdIgnoreBlankToggle').addEventListener('change', function () {
        TextDedupTool.setIgnoreBlankLines(this.checked);
        var sourceText = TextDedupTool.getSourceText();
        if (sourceText) {
          TextDedupTool.processType(TextDedupTool.getCurrentType()).then(function () {
            tdController.updateResult();
          }).catch(function (err) {
            dom.tdResultText.textContent = err.message || I18n.t('tools.textdedup.status_failed');
          });
        }
      });
    }
  });

  var ecController = createToolViewController({
    viewId: 'viewEmojiConverter',
    getTool: function () { return EmojiConverterTool; },
    getEls: function () { return {
      inputArea: dom.ecInputArea,
      sourceLabel: dom.ecSourceLabel,
      sourcePanel: dom.ecSourcePanel,
      manualInput: dom.ecManualInput,
      charCount: dom.ecCharCount,
      sourceText: dom.ecSourceText,
      resultText: dom.ecResultText,
      copyBtn: dom.btnCopyEC,
      btnGrid: dom.ecConvertGrid
    }; },
    i18nPrefix: 'tools.emoji_converter',
    btnClass: 'emoji-convert-btn',
    defaultType: 'keywords',
    getTypes: function () { return EmojiConverterTool.getConvertTypes(); },
    processFn: function (type) { return EmojiConverterTool.convert(type); },
    extraInit: null
  });

  function openOptionsPage() {
    if (TextFlow.isChromeExtension() && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }

  function popupSuggestionInit() {
    var input = dom.popupSuggestionInput;
    var charCount = dom.popupCharCount;
    var submitBtn = dom.popupSubmitSuggestionBtn;

    if (!input || !charCount || !submitBtn) return;

    input.addEventListener('input', function () {
      var len = this.value.length;
      charCount.textContent = len + ' / 500';
      charCount.classList.toggle('warn', len >= 450);
      submitBtn.disabled = len === 0;
    });

    submitBtn.addEventListener('click', function () {
      var content = input.value.trim();
      if (!content) return;
      submitBtn.disabled = true;
      submitBtn.textContent = I18n.t('suggestion.btn_submitting');

      getPageInfo().then(function (pageInfo) {
        return SuggestionTool.submit(content, pageInfo);
      }).then(function () {
        input.value = '';
        charCount.textContent = '0 / 500';
        charCount.classList.remove('warn');
        submitBtn.textContent = I18n.t('suggestion.btn_submitted');
        submitBtn.classList.add('done');
        setTimeout(function () {
          submitBtn.textContent = I18n.t('suggestion.btn_submit');
          submitBtn.classList.remove('done');
          submitBtn.disabled = true;
        }, 2000);
        showToast(I18n.t('suggestion.toast_thanks'));
      }).catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = I18n.t('suggestion.btn_submit');
        showToast(err.message || I18n.t('suggestion.toast_failed'));
      });
    });
  }

  function settingsInit() {

    $('#settingsBtn').addEventListener('click', function () {
      showView('settings');
    });

    $('#btnOpenFullSettings').addEventListener('click', function () {
      openOptionsPage();
    });

    popupSuggestionInit();
  }

	  function refreshAllDynamicText() {
	    updateHeader(currentView);
	    if (currentView === 'webclip' && typeof WebClipTool !== 'undefined') {
	      updateWebClipPreview();
	      renderWebClipList();
	    }
	  }

  function headerInit() {
    dom.headerBackBtn.addEventListener('click', function () {
      showView('home');
    });
  }

	  function checkSelection() {
	    if (!TextFlow.isChromeExtension()) return;
	    sendToContent('getSelection').then(function (resp) {
      if (resp && resp.success && resp.data) {
        _selectionCache.hasSelection = !!resp.data.hasSelection;
        _selectionCache.text = resp.data.text || '';
        _selectionCache.html = resp.data.html || '';
        if (_selectionCache.hasSelection) {
          showToast(I18n.t('status.selection_detected'));
        }
      }
    }).catch(function () {});
  }

	  function getSelectionCache() {
	    return _selectionCache;
	  }

	  function consumeLastWebClipSaved() {
	    if (!TextFlow.isChromeExtension() || !chrome.storage || !chrome.storage.local) return;
	    chrome.storage.local.get(['lastWebClipSaved'], function (result) {
	      if (!result || !result.lastWebClipSaved) return;
	      chrome.storage.local.remove(['lastWebClipSaved']);
	      showView('webclip');
	      ensureModule('webclip').then(function () {
	        webClipViewInit();
	        showToast(I18n.t('tools.webclip.status_saved'));
	      });
	    });
	  }

  function preloadToolModules() {
    var priorityModules = ['wordcount', 'markdown', 'plaintext'];
    var deferredModules = ['qrcode', 'caseconverter', 'textreverser', 'textdedup', 'emojiconverter'];

    priorityModules.forEach(function (name) {
      ensureModule(name).catch(function () {});
    });

    var scheduleIdle = typeof requestIdleCallback === 'function'
      ? requestIdleCallback
      : function (fn) { setTimeout(fn, 300); };

    scheduleIdle(function () {
      deferredModules.forEach(function (name) {
        ensureModule(name).catch(function () {});
      });
    });
  }

  function syncToolCardVisibility() {
    return StorageManager.get(StorageManager.KEYS.TOOL_STATES).then(function (states) {
      states = states || StorageManager.DEFAULTS.tool_states;
      var cards = $$('.tool-card[data-tool]');
      cards.forEach(function (card) {
        var toolId = card.getAttribute('data-tool');
        var enabled = states[toolId] !== false;
        card.style.display = enabled ? '' : 'none';
      });
    });
  }

  function init() {
    cacheDOM();
    homeViewInit();
    settingsInit();
    headerInit();

    syncToolCardVisibility();

    I18n.onChange(function () {
      refreshAllDynamicText();
    });

	    I18n.init().then(function () {
	      setStatus(I18n.t('app.status_ready'));
	      checkSelection();
	      consumeLastWebClipSaved();
	      preloadToolModules();
	    });
  }

  init();
})();
