(function () {
  'use strict';

  var FEATURE_BLOCKS = [
    { id: 'wordcount', icon: '📊', color: 'blue', i18nKey: 'settings.feature_wordcount', defaultName: '字数统计' },
    { id: 'plaintext', icon: '📋', color: 'teal', i18nKey: 'settings.feature_plaintext', defaultName: '纯文本提取' },
    { id: 'textdedup', icon: '📑', color: 'pink', i18nKey: 'settings.feature_textdedup', defaultName: '去重/排序' },
    { id: 'markdown', icon: '📝', color: 'purple', i18nKey: 'settings.feature_markdown', defaultName: '导出Markdown' },
    { id: 'caseconverter', icon: '🔤', color: 'green', i18nKey: 'settings.feature_caseconverter', defaultName: '大小写/风格转换' },
    { id: 'textreverser', icon: '🔄', color: 'orange', i18nKey: 'settings.feature_textreverser', defaultName: '文本反转' },
    { id: 'qrcode', icon: '🔲', color: 'orange', i18nKey: 'settings.feature_qrcode', defaultName: '二维码生成' },
    { id: 'emojiconverter', icon: '😄', color: 'orange', i18nKey: 'settings.feature_emojiconverter', defaultName: 'Emoji转换' },
    { id: 'suggestion', icon: '💡', color: 'pink', i18nKey: 'settings.feature_suggestion', defaultName: '用户建议' }
  ];

  var featureStates = {};
  var featureOrder = [];
  var isDirty = false;
  var toastTimer = null;

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function showToast(message) {
    var toast = $('#toast');
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = 'toastIn 0.3s ease';
    toastTimer = setTimeout(function () {
      toast.style.display = 'none';
    }, 2500);
  }

  function getFeatureState(featureId) {
    return StorageManager.getToolState(featureId);
  }

  function setFeatureState(featureId, enabled) {
    return StorageManager.setToolState(featureId, enabled);
  }

  function getFeatureOrder() {
    return ConfigManager.get('feature_block_order').then(function (order) {
      if (order && Array.isArray(order) && order.length === FEATURE_BLOCKS.length) {
        var allValid = order.every(function (id) {
          return FEATURE_BLOCKS.some(function (b) { return b.id === id; });
        });
        if (allValid) return order;
      }
      return FEATURE_BLOCKS.map(function (b) { return b.id; });
    });
  }

  function setFeatureOrder(order) {
    return ConfigManager.update('feature_block_order', order);
  }

  function loadFeatureSettings() {
    var statePromises = FEATURE_BLOCKS.map(function (block) {
      return getFeatureState(block.id).then(function (enabled) {
        featureStates[block.id] = enabled;
      });
    });

    return Promise.all(statePromises).then(function () {
      return getFeatureOrder().then(function (order) {
        featureOrder = order;
      });
    });
  }

  function renderFeatureList() {
    var list = $('#featureList');
    list.innerHTML = '';

    featureOrder.forEach(function (blockId, index) {
      var block = FEATURE_BLOCKS.find(function (b) { return b.id === blockId; });
      if (!block) return;

      var enabled = featureStates[blockId] !== false;
      var name = I18n.t(block.i18nKey) || block.defaultName;
      var stateText = enabled
        ? I18n.t('settings.enabled')
        : I18n.t('settings.disabled');
      var disabledClass = enabled ? '' : 'disabled';

      var item = document.createElement('div');
      item.className = 'feature-item ' + disabledClass;
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-feature-id', blockId);

      item.innerHTML =
        '<span class="sort-num">' + (index + 1) + '</span>' +
        '<span class="drag-handle">≡</span>' +
        '<span class="feat-icon ' + block.color + '">' + block.icon + '</span>' +
        '<span class="feat-info">' +
          '<span class="feat-name">' + name + '</span>' +
          '<span class="feat-state">' + stateText + '</span>' +
        '</span>' +
        '<label class="toggle feat-toggle">' +
          '<input type="checkbox" ' + (enabled ? 'checked' : '') + '>' +
          '<span class="slider"></span>' +
        '</label>';

      var toggleInput = item.querySelector('input[type="checkbox"]');
      toggleInput.addEventListener('change', function () {
        var checked = this.checked;
        var fid = item.getAttribute('data-feature-id');
        featureStates[fid] = checked;
        isDirty = true;
        updateItemUI(item, fid, checked);
        updateSaveStatus();
      });

      item.addEventListener('dragstart', function (e) {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', blockId);
      });

      item.addEventListener('dragend', function () {
        item.classList.remove('dragging');
        var items = list.querySelectorAll('.feature-item');
        Array.prototype.forEach.call(items, function (el) {
          el.classList.remove('drag-over');
        });
      });

      item.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!item.classList.contains('dragging')) {
          item.classList.add('drag-over');
        }
      });

      item.addEventListener('dragleave', function () {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', function (e) {
        e.preventDefault();
        item.classList.remove('drag-over');
        var sourceId = e.dataTransfer.getData('text/plain');
        var targetId = blockId;
        if (sourceId === targetId) return;

        var sourceIndex = featureOrder.indexOf(sourceId);
        var targetIndex = featureOrder.indexOf(targetId);
        if (sourceIndex === -1 || targetIndex === -1) return;

        featureOrder.splice(sourceIndex, 1);
        featureOrder.splice(targetIndex, 0, sourceId);
        isDirty = true;
        renderFeatureList();
        updateSaveStatus();
      });

      list.appendChild(item);
    });
  }

  function updateItemUI(item, featureId, enabled) {
    var block = FEATURE_BLOCKS.find(function (b) { return b.id === featureId; });
    if (!block) return;

    var stateText = enabled
      ? (I18n.getLanguage() === 'zh' ? '已启用' : 'Enabled')
      : (I18n.getLanguage() === 'zh' ? '已禁用' : 'Disabled');
    var stateEl = item.querySelector('.feat-state');
    if (stateEl) stateEl.textContent = stateText;

    if (enabled) {
      item.classList.remove('disabled');
    } else {
      item.classList.add('disabled');
    }
  }

  function updateSaveStatus() {
    var statusEl = $('#saveStatus');
    if (isDirty) {
      statusEl.textContent = '● ' + I18n.t('settings.unsaved_changes');
      statusEl.className = 'save-status error';
    } else {
      statusEl.textContent = '✓ ' + I18n.t('settings.saved_toast');
      statusEl.className = 'save-status saved';
    }
  }

  function updateLangUI(lang) {
    var zhBtn = $('#optLangZh');
    var enBtn = $('#optLangEn');
    if (zhBtn && enBtn) {
      zhBtn.classList.toggle('active', lang === 'zh');
      enBtn.classList.toggle('active', lang === 'en');
    }
  }

  function saveAllSettings() {
    var btn = $('#btnSave');
    btn.classList.add('saving');
    btn.textContent = '⏳ ' + I18n.t('settings.saving');

    var savePromises = [];

    FEATURE_BLOCKS.forEach(function (block) {
      savePromises.push(setFeatureState(block.id, featureStates[block.id] !== false));
    });

    savePromises.push(setFeatureOrder(featureOrder));

    return Promise.all(savePromises).then(function () {
      isDirty = false;
      updateSaveStatus();
      btn.classList.remove('saving');
      btn.textContent = '💾 ' + I18n.t('settings.save_settings');
    });
  }

  function getPageInfoForSuggestion() {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      return new Promise(function (resolve) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs && tabs.length > 0) {
            resolve({ title: tabs[0].title || '', url: tabs[0].url || '' });
          } else {
            resolve({ title: '', url: '' });
          }
        });
      });
    }
    return Promise.resolve({ title: '', url: '' });
  }

  function suggestionInit() {
    var input = $('#optionsSuggestionInput');
    var charCount = $('#optionsCharCount');
    var submitBtn = $('#optionsSubmitSuggestionBtn');

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
      submitBtn.textContent = I18n.getLanguage() === 'zh' ? '⏳ 提交中...' : '⏳ Submitting...';

      getPageInfoForSuggestion().then(function (pageInfo) {
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

  function init() {
    I18n.init().then(function () {
      updateLangUI(I18n.getLanguage());

      loadFeatureSettings().then(function () {
        renderFeatureList();
        updateSaveStatus();
      });

      suggestionInit();

      $('#optLangZh').addEventListener('click', function () {
        if (this.classList.contains('active')) return;
        I18n.setLanguage('zh').then(function () {
          updateLangUI('zh');
          renderFeatureList();
          updateSaveStatus();
          showToast('✓ ' + I18n.t('settings.language_zh'));
        });
      });

      $('#optLangEn').addEventListener('click', function () {
        if (this.classList.contains('active')) return;
        I18n.setLanguage('en').then(function () {
          updateLangUI('en');
          renderFeatureList();
          updateSaveStatus();
          showToast('✓ ' + I18n.t('settings.language_en'));
        });
      });

      $('#btnSave').addEventListener('click', function () {
        saveAllSettings().then(function () {
          showToast('✓ ' + I18n.t('settings.saved_toast'));
        }).catch(function () {
          showToast('✗ ' + I18n.t('settings.save_failed'));
        });
      });
    });
  }

  init();
})();
