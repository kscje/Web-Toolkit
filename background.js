importScripts('utils/core.js', 'utils/i18n.js');

function createContextMenus() {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: 'wordCountSelected',
      title: I18n.t('context_menu.wordcount'),
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'saveMarkdownSelected',
      title: I18n.t('context_menu.save_markdown'),
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'extractPlainTextSelected',
      title: I18n.t('context_menu.extract_plaintext'),
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'qrCodeSelected',
      title: I18n.t('context_menu.qrcode'),
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'textReverseSelected',
      title: I18n.t('context_menu.textreverse'),
      contexts: ['selection']
    });
	    chrome.contextMenus.create({
	      id: 'emojiConvertSelected',
	      title: I18n.t('context_menu.emoji_convert'),
	      contexts: ['selection']
	    });
	    StorageManager.getToolState('webclip').then(function (enabled) {
	      if (enabled === false) return;
	      chrome.contextMenus.create({
	        id: 'saveWebClipSelected',
	        title: I18n.t('context_menu.save_webclip'),
	        contexts: ['selection']
	      });
	    });
	  });
	}

	function getDomain(url) {
	  try {
	    return new URL(url || '').hostname;
	  } catch (e) {
	    return '';
	  }
	}

	function saveSelectionAsWebClip(info, tab) {
	  return StorageManager.getToolState('webclip').then(function (enabled) {
	    if (enabled === false) return null;

	    var selectionText = (info.selectionText || '').trim();
	    var tabInfo = {
	      title: (tab && tab.title) || '',
	      url: (tab && tab.url) || '',
	      domain: getDomain((tab && tab.url) || '')
	    };

	    function saveClip(pageInfo) {
	      pageInfo = pageInfo || {};
	      var url = pageInfo.url || tabInfo.url;
	      var domain = pageInfo.domain || tabInfo.domain || getDomain(url);
	      var text = selectionText;
	      var now = new Date().toISOString();
	      if (text.length > 10000) {
	        text = text.substring(0, 10000);
	      }
	      return StorageManager.addClip({
	        id: 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 100000),
	        type: 'selection',
	        title: pageInfo.title || tabInfo.title || domain || 'Untitled Page',
	        url: url,
	        domain: domain,
	        text: text,
	        tags: [],
	        note: '',
	        created_at: now,
	        updated_at: now
	      });
	    }

	    if (!tab || !tab.id) {
	      return saveClip(tabInfo);
	    }

	    return new Promise(function (resolve) {
	      chrome.tabs.sendMessage(tab.id, {
	        action: 'getPageInfo',
	        payload: {},
	        requestId: 'ctx_webclip_' + Date.now()
	      }, function (response) {
	        if (chrome.runtime.lastError || !response || !response.success) {
	          resolve(tabInfo);
	          return;
	        }
	        resolve(response.data || tabInfo);
	      });
	    }).then(saveClip).then(function (clip) {
	      chrome.storage.local.set({ lastWebClipSaved: { id: clip.id, at: new Date().toISOString() } });
	      if (chrome.action && chrome.action.openPopup) {
	        var popupResult = chrome.action.openPopup();
	        if (popupResult && popupResult.catch) {
	          popupResult.catch(function () {});
	        }
	      }
	      return clip;
	    });
	  });
	}

I18n.init().then(function () {
  createContextMenus();

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.user_preferences) {
      var newPrefs = changes.user_preferences.newValue || {};
      var oldPrefs = changes.user_preferences.oldValue || {};
      var newLang = newPrefs.language === 'en_US' ? 'en' : 'zh';
	      var oldLang = oldPrefs.language === 'en_US' ? 'en' : 'zh';
	      if (newLang !== oldLang) {
	        I18n.setLanguage(newLang).then(function () {
	          createContextMenus();
	        });
	      }
	    } else if (namespace === 'local' && changes.tool_states) {
	      createContextMenus();
	    }
	  });
	});

chrome.runtime.onInstalled.addListener(function () {
  StorageManager.init().then(function () {
    console.log('[TextFlow] Extension installed, storage initialized.');
  });
});

chrome.runtime.onStartup.addListener(function () {
  console.log('[TextFlow] Extension started.');
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'wordCountSelected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'wordCount',
      payload: { mode: 'selected' },
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success) {
        var data = response.data;
        chrome.action.openPopup();
        chrome.storage.local.set({ lastWordCountResult: data });
      }
    });
  } else if (info.menuItemId === 'saveMarkdownSelected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'saveMarkdown',
      payload: { mode: 'selected' },
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success) {
        chrome.storage.local.set({ lastMarkdownData: response.data });
        chrome.action.openPopup();
      }
    });
  } else if (info.menuItemId === 'extractPlainTextSelected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'extractPlainText',
      payload: { mode: 'selected', keepLinkURLs: false },
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success) {
        chrome.storage.local.set({ lastPlainTextData: response.data });
        chrome.action.openPopup();
      }
    });
  } else if (info.menuItemId === 'qrCodeSelected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'getSelection',
      payload: {},
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success && response.data.hasSelection) {
        chrome.storage.local.set({ lastQRCodeText: response.data.text });
        chrome.action.openPopup();
      }
    });
  } else if (info.menuItemId === 'textReverseSelected') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'getSelection',
      payload: {},
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success && response.data.hasSelection) {
        chrome.storage.local.set({ lastTextReverseData: response.data.text });
        chrome.action.openPopup();
      }
    });
	  } else if (info.menuItemId === 'emojiConvertSelected') {
	    chrome.tabs.sendMessage(tab.id, {
	      action: 'getSelection',
      payload: {},
      requestId: 'ctx_' + Date.now()
    }, function (response) {
      if (response && response.success && response.data.hasSelection) {
        chrome.storage.local.set({ lastEmojiConvertData: response.data.text });
	        chrome.action.openPopup();
	      }
	    });
	  } else if (info.menuItemId === 'saveWebClipSelected') {
	    saveSelectionAsWebClip(info, tab).catch(function (err) {
	      console.warn('[TextFlow] Failed to save web clip:', err);
	    });
	  }
	});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'updatePreference') {
    ConfigManager.update(request.payload.key, request.payload.value).then(function () {
      sendResponse({ success: true, requestId: request.requestId });
    });
    return true;
  }

  if (request.action === 'getPreference') {
    ConfigManager.get(request.payload.key).then(function (value) {
      sendResponse({ success: true, data: { key: request.payload.key, value: value }, requestId: request.requestId });
    });
    return true;
  }

  if (request.action === 'getConfig') {
    ConfigManager.getAll().then(function (config) {
      sendResponse({ success: true, data: config, requestId: request.requestId });
    });
    return true;
  }

  if (request.action === 'submitSuggestion') {
    StorageManager.addSuggestion(request.payload.content, request.payload).then(function () {
      sendResponse({ success: true, requestId: request.requestId });
    }).catch(function (err) {
      sendResponse({ success: false, error: err.message, requestId: request.requestId });
    });
    return true;
  }

  if (request.action === 'getSuggestions') {
    StorageManager.getSuggestions().then(function (suggestions) {
      sendResponse({ success: true, data: suggestions, requestId: request.requestId });
    });
    return true;
  }
});
