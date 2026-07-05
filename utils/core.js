var TextFlow = (function () {
  'use strict';

  function isChromeExtension() {
    return typeof chrome !== 'undefined' && chrome.tabs;
  }

  function isChromeStorageAvailable() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  }

  function copyToClipboard(text) {
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

  function downloadFile(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    isChromeExtension: isChromeExtension,
    isChromeStorageAvailable: isChromeStorageAvailable,
    copyToClipboard: copyToClipboard,
    downloadFile: downloadFile
  };
})();

var ConfigManager = (function () {
  'use strict';

  var DEFAULTS = {
    default_export_format: 'markdown',
    content_filter_enabled: true,
    display_mode: 'card',
    auto_detect_selection: true,
    language: 'zh_CN'
  };

  function get(key) {
    return StorageManager.getUserPreferences().then(function (prefs) {
      prefs = prefs || {};
      return prefs[key] !== undefined ? prefs[key] : DEFAULTS[key];
    });
  }

  function getAll() {
    return StorageManager.getUserPreferences().then(function (prefs) {
      return Object.assign({}, DEFAULTS, prefs || {});
    });
  }

  function update(key, value) {
    return StorageManager.setUserPreference(key, value);
  }

  return {
    get: get,
    getAll: getAll,
    update: update,
    DEFAULTS: DEFAULTS
  };
})();

var StorageManager = (function () {
  'use strict';

	  var KEYS = {
	    USER_PREFERENCES: 'user_preferences',
	    TOOL_SETTINGS: 'tool_settings',
	    TOOL_STATES: 'tool_states',
	    USAGE_STATS: 'usage_stats',
	    USER_SUGGESTIONS: 'user_suggestions',
	    SAVED_CLIPS: 'saved_clips'
	  };

  var DEFAULTS = {
    user_preferences: {
      default_export_format: 'markdown',
      content_filter_enabled: true,
      display_mode: 'card',
      auto_detect_selection: true,
      language: 'zh_CN'
    },
    tool_settings: {},
    tool_states: {
      wordcount: true,
      markdown: true
    },
	    usage_stats: {},
	    user_suggestions: [],
	    saved_clips: []
	  };

	  var MAX_CLIPS = 200;

	  function createClipId() {
	    return 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
	  }

  function storageGet(keys) {
    if (TextFlow.isChromeStorageAvailable()) {
      return new Promise(function (resolve) {
        chrome.storage.local.get(keys, function (result) {
          resolve(result);
        });
      });
    }
    return Promise.resolve(JSON.parse(localStorage.getItem('textflow') || '{}'));
  }

  function storageSet(items) {
    if (TextFlow.isChromeStorageAvailable()) {
      return new Promise(function (resolve) {
        chrome.storage.local.set(items, function () {
          resolve();
        });
      });
    }
    var data = JSON.parse(localStorage.getItem('textflow') || '{}');
    Object.assign(data, items);
    localStorage.setItem('textflow', JSON.stringify(data));
    return Promise.resolve();
  }

  function init() {
    return storageGet(Object.keys(DEFAULTS)).then(function (current) {
      var toSet = {};
      Object.keys(DEFAULTS).forEach(function (key) {
        if (current[key] === undefined) {
          toSet[key] = DEFAULTS[key];
        }
      });
      if (Object.keys(toSet).length > 0) {
        return storageSet(toSet);
      }
    });
  }

  function get(key) {
    return storageGet([key]).then(function (result) {
      return result[key] !== undefined ? result[key] : DEFAULTS[key];
    });
  }

  function set(key, value) {
    var items = {};
    items[key] = value;
    return storageSet(items);
  }

  function addSuggestion(content) {
    if (typeof content !== 'string') {
      return Promise.reject(new Error('Invalid content'));
    }
    return get(KEYS.USER_SUGGESTIONS).then(function (suggestions) {
      suggestions = suggestions || [];
      var newSuggestion = {
        id: 'sug_' + Date.now(),
        content: content.trim(),
        timestamp: new Date().toISOString(),
        page_url: '',
        page_title: '',
        status: 'pending'
      };
      suggestions.push(newSuggestion);
      if (suggestions.length > 50) {
        suggestions = suggestions.slice(suggestions.length - 50);
      }
      return set(KEYS.USER_SUGGESTIONS, suggestions);
    });
  }

	  function getSuggestions() {
	    return get(KEYS.USER_SUGGESTIONS).then(function (suggestions) {
	      return suggestions || [];
	    });
	  }

	  function normalizeClip(clip) {
	    var now = new Date().toISOString();
	    var url = clip.url || '';
	    var domain = clip.domain || '';
	    if (!domain && url) {
	      try {
	        domain = new URL(url).hostname;
	      } catch (e) {}
	    }
	    return {
	      id: clip.id || createClipId(),
	      type: clip.type === 'selection' ? 'selection' : 'page',
	      title: clip.title || domain || 'Untitled Page',
	      url: url,
	      domain: domain,
	      text: clip.text || '',
	      tags: Array.isArray(clip.tags) ? clip.tags : [],
	      note: clip.note || '',
	      created_at: clip.created_at || now,
	      updated_at: clip.updated_at || now
	    };
	  }

	  function sortClips(clips) {
	    return (clips || []).slice().sort(function (a, b) {
	      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
	    });
	  }

	  function addClip(clip) {
	    return get(KEYS.SAVED_CLIPS).then(function (clips) {
	      clips = Array.isArray(clips) ? clips : [];
	      clips.push(normalizeClip(clip || {}));
	      clips = sortClips(clips).slice(0, MAX_CLIPS);
	      return set(KEYS.SAVED_CLIPS, clips).then(function () {
	        return clips[0];
	      });
	    });
	  }

	  function getClips() {
	    return get(KEYS.SAVED_CLIPS).then(function (clips) {
	      return sortClips(Array.isArray(clips) ? clips : []);
	    });
	  }

	  function deleteClip(id) {
	    return get(KEYS.SAVED_CLIPS).then(function (clips) {
	      clips = Array.isArray(clips) ? clips : [];
	      clips = clips.filter(function (clip) {
	        return clip.id !== id;
	      });
	      return set(KEYS.SAVED_CLIPS, clips);
	    });
	  }

	  function clearClips() {
	    return set(KEYS.SAVED_CLIPS, []);
	  }

  function getToolState(toolId) {
    return get(KEYS.TOOL_STATES).then(function (states) {
      return states && states[toolId] !== undefined ? states[toolId] : true;
    });
  }

  function setToolState(toolId, enabled) {
    return get(KEYS.TOOL_STATES).then(function (states) {
      states = states || DEFAULTS.tool_states;
      states[toolId] = enabled;
      return set(KEYS.TOOL_STATES, states);
    });
  }

  function setAllToolStates(states) {
    return set(KEYS.TOOL_STATES, states);
  }

  function getUserPreferences() {
    return get(KEYS.USER_PREFERENCES);
  }

  function setUserPreference(key, value) {
    return get(KEYS.USER_PREFERENCES).then(function (prefs) {
      prefs = prefs || DEFAULTS.user_preferences;
      prefs[key] = value;
      return set(KEYS.USER_PREFERENCES, prefs);
    });
  }

  return {
    init: init,
    get: get,
    set: set,
	    addSuggestion: addSuggestion,
	    getSuggestions: getSuggestions,
	    addClip: addClip,
	    getClips: getClips,
	    deleteClip: deleteClip,
	    clearClips: clearClips,
	    getToolState: getToolState,
    setToolState: setToolState,
    setAllToolStates: setAllToolStates,
    getUserPreferences: getUserPreferences,
    setUserPreference: setUserPreference,
    KEYS: KEYS,
    DEFAULTS: DEFAULTS
  };
})();

var SuggestionTool = (function () {
  'use strict';

  var REMOTE_URL = 'https://textflow-suggestions.kscje-apps.workers.dev/api/suggestions';
  var API_BASE = 'https://textflow-suggestions.kscje-apps.workers.dev/api';

  function isRuntimeAvailable() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage;
  }

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function fetchSubmitToken() {
    return fetch(API_BASE + '/submit-token')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.token && data.timestamp) return data;
        throw new Error('Failed to get submit token');
      });
  }

  function submitRemote(content, pageInfo) {
    if (!REMOTE_URL || REMOTE_URL.indexOf('YOUR_WORKER') !== -1) {
      return Promise.resolve();
    }
    return fetchSubmitToken().then(function (tokenData) {
      return fetch(REMOTE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          page_title: pageInfo.title || '',
          page_url: pageInfo.url || '',
          token: tokenData.token,
          timestamp: tokenData.timestamp
        })
      });
    }).then(function (res) {
      if (!res.ok) throw new Error('Remote submit failed: ' + res.status);
    });
  }

  function saveLocal(content, pageInfo) {
    if (isRuntimeAvailable()) {
      return new Promise(function (resolve, reject) {
        chrome.runtime.sendMessage({
          action: 'submitSuggestion',
          payload: {
            content: content,
            page_title: pageInfo.title || '',
            page_url: pageInfo.url || ''
          },
          requestId: 'sug_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (response && response.success) {
            resolve();
          } else {
            reject(new Error(response ? response.error : _('suggestion.toast_failed', '提交失败')));
          }
        });
      });
    }

    try {
      var data = JSON.parse(localStorage.getItem('textflow') || '{}');
      var suggestions = data.user_suggestions || [];
      suggestions.push({
        id: 'sug_' + Date.now(),
        content: content,
        timestamp: new Date().toISOString(),
        page_url: pageInfo.url || '',
        page_title: pageInfo.title || '',
        status: 'pending'
      });
      if (suggestions.length > 50) {
        suggestions = suggestions.slice(suggestions.length - 50);
      }
      data.user_suggestions = suggestions;
      localStorage.setItem('textflow', JSON.stringify(data));
    } catch (e) {
      return Promise.reject(new Error(_('suggestion.error_storage_failed', '本地存储失败')));
    }
    return Promise.resolve();
  }

  function submit(content, pageInfo) {
    if (typeof content !== 'string') {
      return Promise.reject(new Error(_('suggestion.error_invalid', '无效的建议内容')));
    }
    content = content.trim();
    pageInfo = pageInfo || {};

    if (content.length === 0) {
      return Promise.reject(new Error(_('suggestion.error_empty', '建议内容不能为空')));
    }
    if (content.length > 500) {
      return Promise.reject(new Error(_('suggestion.error_too_long', '建议内容不能超过500字')));
    }

    return submitRemote(content, pageInfo).then(function () {
      console.log('[SuggestionTool] 远程提交成功');
      return saveLocal(content, pageInfo);
    }).catch(function (err) {
      console.error('[SuggestionTool] 远程提交失败:', err.message);
      return saveLocal(content, pageInfo).then(function () {
        throw err;
      });
    });
  }

  return {
    submit: submit
  };
})();
