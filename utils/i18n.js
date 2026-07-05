var I18n = (function () {
  'use strict';

  var _currentLang = 'zh';
  var _translations = {};
  var _listeners = [];
  var _initialized = false;
  var _langSrcMap = {
    'zh': 'locales/zh.json',
    'en': 'locales/en.json'
  };

  var _builtinLocales = {
    'zh': {"app":{"title":"文本工具箱","status_ready":"就绪"},"home":{"core_tools":"核心工具","coming_soon":"即将推出","coming_soon_desc":"📋 更多实用工具正在开发中，敬请期待…"},"tools":{"wordcount":{"name":"字数统计","desc":"统计中/英文字数、段落数，支持选中、手动和全页模式","title":"📊 字数统计","mode_selected":"选中内容","mode_manual":"手动输入","mode_full":"整个页面","placeholder_input":"请输入或粘贴要统计的文本…","status_loading":"正在统计…","stat_total_chars":"总字符数","stat_chars_no_space":"不含空格","stat_chinese":"中文字符","stat_english":"英文单词","stat_paragraphs":"段落数","stat_sentences":"句子数","stat_images":"图片数","stat_videos":"视频数","stat_links":"链接数","status_counting":"正在统计…","status_done_full":"统计完成 (全页)","status_done_manual":"统计完成 (手动)","status_done_selected":"统计完成 (选中)","status_failed":"统计失败","error_failed":"统计失败"},"markdown":{"name":"导出Markdown","desc":"将选中内容转换为 Markdown，一键复制或下载 .md 文件","title":"📝 导出Markdown","mode_selected":"选中内容","btn_convert":"转换生成","tab_source":"源码","tab_preview":"预览","btn_copy":"📋 复制源码","btn_download":"💾 下载 .md","tag_selected":"📄 选中内容","status_converting":"正在转换…","status_done":"转换完成","status_failed":"转换失败","status_no_selection":"请先在网页上选中内容","error_failed":"转换失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_content":"请先生成内容","toast_download_started":"下载已开始","image_alt":"图片","option_preserve_indent":"保留段首缩进","option_preserve_indent_desc":"保留原文中的段首缩进格式","no_selection_title":"未选中内容","no_selection_desc":"请先在网页上选中需要导出的文本内容，然后再打开此功能。"},"plaintext":{"name":"纯文本提取","desc":"剥离样式/广告/隐藏字符，提取纯净文本","title":"📋 纯文本提取","mode_selected":"选中内容","mode_full":"整个页面","option_merge_lines":"合并空行","option_merge_lines_desc":"压缩连续空行为单个空行","option_keep_urls":"保留链接 URL","option_keep_urls_desc":"在链接文本后附加原始网址","btn_copy":"📋 复制文本","btn_download":"💾 保存 .txt","status_extracting":"正在提取…","status_done":"提取完成","status_failed":"提取失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_content":"请等待内容提取完成","toast_download_started":"下载已开始","placeholder_loading":"正在提取纯文本…"},"qrcode":{"name":"二维码生成","desc":"为选中内容或当前页面生成二维码，复制或下载","title":"🔲 二维码生成","mode_selected":"选中内容","mode_full":"当前页面","btn_copy":"📋 复制二维码","btn_download":"💾 下载二维码","status_generating":"正在生成二维码…","status_done":"二维码生成完成","status_failed":"二维码生成失败","error_failed":"生成失败","error_no_selection":"请先在页面上选中内容","toast_copy_success":"二维码已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_content":"请先生成二维码","toast_download_started":"下载已开始"},"caseconverter":{"name":"大小写/风格转换","desc":"切换大小写、驼峰、下划线等命名风格","title":"🔤 大小写/风格转换","mode_selected":"选中内容","mode_manual":"手动输入","placeholder_input":"请输入或粘贴文本…","label_source":"源文本","label_convert":"转换方式","label_result":"转换结果","btn_copy":"📋 复制结果","type_uppercase":"全大写","type_lowercase":"全小写","type_sentence":"句首大写","type_title":"单词首字母大写","type_camelcase":"驼峰命名","type_pascalcase":"帕斯卡命名","type_snakecase":"下划线命名","type_kebabcase":"短横线命名","type_constantcase":"常量命名","status_loading":"正在获取文本…","status_done":"转换完成","status_failed":"获取失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_text":"请先输入或选择文本","error_no_text":"没有可转换的文本","error_no_result":"没有可复制的结果","error_content_script":"无法访问当前页面，请检查是否在普通网页上"},"textdedup":{"name":"去重/排序","desc":"对文本按行去重和排序，支持单独或组合操作","title":"📑 去重/排序","mode_selected":"选中内容","mode_manual":"手动输入","placeholder_input":"请输入或粘贴文本（每行一条）…","label_source":"源文本","label_options":"操作选项","label_operation":"处理方式","label_result":"处理结果","btn_copy":"📋 复制结果","type_dedup":"去重","type_sort_asc":"升序 A→Z","type_sort_desc":"降序 Z→A","type_dedup_sort_asc":"去重+升序","type_dedup_sort_desc":"去重+降序","option_ignore_blank":"忽略空白行","option_ignore_blank_desc":"处理前先移除空行","status_loading":"正在处理…","status_done":"处理完成","status_failed":"处理失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_text":"请先输入或选择文本","error_no_text":"没有可处理的文本","error_no_result":"没有可复制的结果","error_content_script":"无法访问当前页面，请检查是否在普通网页上"},"textreverser":{"name":"文本反转","desc":"反转选中文字的字符顺序、单词顺序，或同时反转","title":"🔄 文本反转","mode_selected":"选中内容","mode_manual":"手动输入","placeholder_input":"请输入或粘贴文本…","label_source":"源文本","label_reverse":"反转方式","label_result":"反转结果","btn_copy":"📋 复制结果","type_reverse_all":"全部反转","type_reverse_words":"单词反转","type_reverse_internal":"单词内反转","type_reverse_mirror":"镜像反转","status_loading":"正在获取文本…","status_done":"反转完成","status_failed":"获取失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_text":"请先输入或选择文本","error_no_text":"没有可反转的文本","error_no_result":"没有可复制的结果","error_content_script":"无法访问当前页面，请检查是否在普通网页上"},"emoji_converter":{"name":"Emoji转换","desc":"将文本转换为 Emoji 表情、区域指示符、带圈字母等趣味格式","title":"😄 Emoji转换","mode_selected":"选中内容","mode_manual":"手动输入","placeholder_input":"请输入或粘贴文本…","label_source":"源文本","label_convert":"转换方式","label_result":"转换结果","btn_copy":"📋 复制结果","type_keywords":"关键词替换","type_regional":"区域指示符","type_circled":"带圈字母","type_number_emoji":"数字Emoji","type_emoji_art":"Emoji装饰","status_loading":"正在获取文本…","status_done":"转换完成","status_failed":"获取失败","toast_copy_success":"已复制到剪贴板","toast_copy_failed":"复制失败","toast_no_text":"请先输入或选择文本","error_no_text":"没有可转换的文本","error_no_result":"没有可复制的结果","error_content_script":"无法访问当前页面，请检查是否在普通网页上"}},"suggestion":{"title":"💡 想要新功能？","desc":"告诉我们您需要的工具，我们将优先开发","privacy_note":"提交时将附带当前页面标题和域名，仅用于了解功能需求场景","placeholder":"请输入您的建议（最多500字）…","btn_submit":"提交建议","btn_submitting":"⏳ 提交中...","btn_submitted":"✓ 已提交","toast_thanks":"感谢您的建议！","toast_failed":"提交失败","error_empty":"建议内容不能为空","error_too_long":"建议内容不能超过500字","error_storage_failed":"本地存储失败"},"settings":{"title":"设置","language_label":"界面语言","language_zh":"中文","language_en":"English","coming_soon":"设置功能将在后续版本中开放","open_full_settings":"打开全部设置","full_settings_title":"全部设置 - 文本工具箱","feature_management":"功能块管理","feature_management_desc":"启用/禁用各功能块并调整其显示顺序","language_desc":"选择插件的显示语言","feature_wordcount":"字数统计","feature_markdown":"导出Markdown","feature_plaintext":"纯文本提取","feature_qrcode":"二维码生成","feature_caseconverter":"大小写/风格转换","feature_textreverser":"文本反转","feature_textdedup":"去重/排序","feature_emojiconverter":"Emoji转换","feature_suggestion":"用户建议","sort_order":"显示排序","drag_hint":"拖拽 ≡ 图标调整顺序","save_settings":"保存设置","saved_toast":"设置已保存","enabled":"已启用","disabled":"已禁用","saving":"保存中...","unsaved_changes":"有未保存的更改","save_failed":"保存失败"},"status":{"selection_detected":"检测到文本选中，点击工具开始使用"},"errors":{"not_extension":"非扩展环境","no_active_tab":"无活动标签页","unsupported_page":"此页面不支持操作","unknown_page":"未知页面","local_test":"本地测试","unsupported_injection":"此页面不支持内容脚本注入","content_script_no_response":"内容脚本无响应"},"context_menu":{"wordcount":"统计选中字数","save_markdown":"保存为 Markdown","extract_plaintext":"提取选中纯文本","qrcode":"生成选中内容二维码","textreverse":"反转选中文本","emoji_convert":"Emoji转换选中文本"}},
    'en': {"app":{"title":"TextFlow","status_ready":"Ready"},"home":{"core_tools":"Core Tools","coming_soon":"Coming Soon","coming_soon_desc":"📋 More tools are under development, stay tuned…"},"tools":{"wordcount":{"name":"Word Count","desc":"Count Chinese/English characters, paragraphs. Supports selection, manual input and full page modes","title":"📊 Word Count","mode_selected":"Selection","mode_manual":"Manual Input","mode_full":"Full Page","placeholder_input":"Type or paste text to count…","status_loading":"Counting…","stat_total_chars":"Total Characters","stat_chars_no_space":"No Spaces","stat_chinese":"Chinese Chars","stat_english":"English Words","stat_paragraphs":"Paragraphs","stat_sentences":"Sentences","stat_images":"Images","stat_videos":"Videos","stat_links":"Links","status_counting":"Counting…","status_done_full":"Counting complete (Full Page)","status_done_manual":"Counting complete (Manual)","status_done_selected":"Counting complete (Selection)","status_failed":"Counting failed","error_failed":"Counting failed"},"markdown":{"name":"Markdown Export","desc":"Convert selected content to Markdown, copy or download as .md file","title":"📝 Markdown Export","mode_selected":"Selection","btn_convert":"Convert","tab_source":"Source","tab_preview":"Preview","btn_copy":"📋 Copy Source","btn_download":"💾 Download .md","tag_selected":"📄 Selection","status_converting":"Converting…","status_done":"Conversion complete","status_failed":"Conversion failed","status_no_selection":"Please select content on the page first","error_failed":"Conversion failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_content":"Please generate content first","toast_download_started":"Download started","image_alt":"Image","option_preserve_indent":"Preserve Indentation","option_preserve_indent_desc":"Keep original paragraph indentation","no_selection_title":"No Content Selected","no_selection_desc":"Please select the content you want to export on the web page, then open this tool again."},"plaintext":{"name":"Plain Text Extractor","desc":"Strip styles, ads, hidden chars — pure text only","title":"📋 Plain Text","mode_selected":"Selection","mode_full":"Full Page","option_merge_lines":"Merge Blank Lines","option_merge_lines_desc":"Collapse consecutive blank lines into one","option_keep_urls":"Keep Link URLs","option_keep_urls_desc":"Append original URL after link text","btn_copy":"📋 Copy Text","btn_download":"💾 Save .txt","status_extracting":"Extracting…","status_done":"Extraction complete","status_failed":"Extraction failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_content":"Please wait for extraction to complete","toast_download_started":"Download started","placeholder_loading":"Extracting plain text…"},"qrcode":{"name":"QR Code Generator","desc":"Generate QR codes from selected text or current page URL","title":"🔲 QR Code Generator","mode_selected":"Selection","mode_full":"Current Page","btn_copy":"📋 Copy QR Code","btn_download":"💾 Download QR Code","status_generating":"Generating QR code…","status_done":"QR code generated","status_failed":"QR code generation failed","error_failed":"Generation failed","error_no_selection":"Please select content on the page first","toast_copy_success":"QR code copied to clipboard","toast_copy_failed":"Copy failed","toast_no_content":"Please generate QR code first","toast_download_started":"Download started"},"caseconverter":{"name":"Case Converter","desc":"Switch between uppercase, lowercase, camelCase, snake_case and more","title":"🔤 Case Converter","mode_selected":"Selection","mode_manual":"Manual Input","placeholder_input":"Type or paste text here…","label_source":"Source Text","label_convert":"Convert To","label_result":"Result","btn_copy":"📋 Copy Result","type_uppercase":"Uppercase","type_lowercase":"Lowercase","type_sentence":"Sentence Case","type_title":"Title Case","type_camelcase":"camelCase","type_pascalcase":"PascalCase","type_snakecase":"snake_case","type_kebabcase":"kebab-case","type_constantcase":"CONSTANT_CASE","status_loading":"Fetching text…","status_done":"Conversion complete","status_failed":"Fetch failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_text":"Please enter or select some text first","error_no_text":"No text to convert","error_no_result":"No result to copy","error_content_script":"Cannot access this page. Please check if you are on a regular web page."},"textdedup":{"name":"Text Dedup / Sort","desc":"Deduplicate and sort text lines, supports individual or combined operations","title":"📑 Text Dedup / Sort","mode_selected":"Selection","mode_manual":"Manual Input","placeholder_input":"Type or paste text here (one item per line)…","label_source":"Source Text","label_options":"Options","label_operation":"Operation","label_result":"Result","btn_copy":"📋 Copy Result","type_dedup":"Deduplicate","type_sort_asc":"Sort A→Z","type_sort_desc":"Sort Z→A","type_dedup_sort_asc":"Dedup + A→Z","type_dedup_sort_desc":"Dedup + Z→A","option_ignore_blank":"Ignore Blank Lines","option_ignore_blank_desc":"Remove empty lines before processing","status_loading":"Processing…","status_done":"Processing complete","status_failed":"Processing failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_text":"Please enter or select some text first","error_no_text":"No text to process","error_no_result":"No result to copy","error_content_script":"Cannot access this page. Please check if you are on a regular web page."},"textreverser":{"name":"Text Reverser","desc":"Reverse characters, word order, or mirror the selected text","title":"🔄 Text Reverser","mode_selected":"Selection","mode_manual":"Manual Input","placeholder_input":"Type or paste text here…","label_source":"Source Text","label_reverse":"Reverse Mode","label_result":"Result","btn_copy":"📋 Copy Result","type_reverse_all":"Reverse All","type_reverse_words":"Reverse Words","type_reverse_internal":"Reverse Internal","type_reverse_mirror":"Mirror Reverse","status_loading":"Fetching text…","status_done":"Reversal complete","status_failed":"Fetch failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_text":"Please enter or select some text first","error_no_text":"No text to reverse","error_no_result":"No result to copy","error_content_script":"Cannot access this page. Please check if you are on a regular web page."},"emoji_converter":{"name":"Emoji Converter","desc":"Convert text to emoji keywords, regional indicators, circled letters and more","title":"😄 Emoji Converter","mode_selected":"Selection","mode_manual":"Manual Input","placeholder_input":"Type or paste text here…","label_source":"Source Text","label_convert":"Convert To","label_result":"Result","btn_copy":"📋 Copy Result","type_keywords":"Keywords","type_regional":"Regional Indicator","type_circled":"Circled Letters","type_number_emoji":"Number Emoji","type_emoji_art":"Emoji Art","status_loading":"Fetching text…","status_done":"Conversion complete","status_failed":"Fetch failed","toast_copy_success":"Copied to clipboard","toast_copy_failed":"Copy failed","toast_no_text":"Please enter or select some text first","error_no_text":"No text to convert","error_no_result":"No result to copy","error_content_script":"Cannot access this page. Please check if you are on a regular web page."}},"suggestion":{"title":"💡 Want a new feature?","desc":"Tell us what tools you need, and we'll prioritize development","privacy_note":"Page title & domain will be included to help understand your use case","placeholder":"Enter your suggestion (max 500 characters)…","btn_submit":"Submit","btn_submitting":"⏳ Submitting...","btn_submitted":"✓ Submitted","toast_thanks":"Thank you for your suggestion!","toast_failed":"Submission failed","error_empty":"Suggestion cannot be empty","error_too_long":"Suggestion cannot exceed 500 characters","error_storage_failed":"Local storage failed"},"settings":{"title":"Settings","language_label":"Language","language_zh":"中文","language_en":"English","coming_soon":"Settings will be available in a future version","open_full_settings":"Open Full Settings","full_settings_title":"Full Setting - TextFlow","feature_management":"Feature Management","feature_management_desc":"Enable/disable feature blocks and adjust their display order","language_desc":"Choose the display language for the extension","feature_wordcount":"Word Count","feature_markdown":"Markdown Export","feature_plaintext":"Plain Text","feature_qrcode":"QR Code Generator","feature_caseconverter":"Case Converter","feature_textreverser":"Text Reverser","feature_textdedup":"Text Dedup / Sort","feature_emojiconverter":"Emoji Converter","feature_suggestion":"Suggestions","sort_order":"Display Order","drag_hint":"Drag ≡ icons to reorder","save_settings":"Save Settings","saved_toast":"Settings saved","enabled":"Enabled","disabled":"Disabled","saving":"Saving...","unsaved_changes":"Unsaved changes","save_failed":"Save failed"},"status":{"selection_detected":"Text selection detected, click a tool to get started"},"errors":{"not_extension":"Not in extension environment","no_active_tab":"No active tab","unsupported_page":"This page does not support this operation","unknown_page":"Unknown page","local_test":"Local Test","unsupported_injection":"This page does not support content script injection","content_script_no_response":"Content script not responding"},"context_menu":{"wordcount":"Count Selected Words","save_markdown":"Save as Markdown","extract_plaintext":"Extract Selected Plain Text","qrcode":"Generate QR Code","textreverse":"Reverse Selected Text","emoji_convert":"Emoji Convert Selected Text"}}
  };

  function resolveLanguage() {
    var stored = null;
    try {
      var raw = localStorage.getItem('textflow_lang');
      if (raw) stored = raw;
    } catch (e) {}

    if (!stored && typeof TextFlow !== 'undefined' && TextFlow.isChromeStorageAvailable && TextFlow.isChromeStorageAvailable()) {
      try {
        var data = JSON.parse(localStorage.getItem('textflow') || '{}');
        if (data && data.user_preferences && data.user_preferences.language) {
          stored = data.user_preferences.language === 'en_US' ? 'en' : 'zh';
        }
      } catch (e) {}
    }

    if (stored === 'zh' || stored === 'en') return stored;

    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.indexOf('zh') === 0) return 'zh';
    return 'en';
  }

  function getStorageKey() {
    return 'textflow_lang';
  }

  function persistLanguage(lang) {
    try {
      localStorage.setItem(getStorageKey(), lang);
    } catch (e) {}
    if (typeof TextFlow !== 'undefined' && TextFlow.isChromeStorageAvailable && TextFlow.isChromeStorageAvailable()) {
      try {
        chrome.storage.local.get(['user_preferences'], function (result) {
          var prefs = result.user_preferences || {};
          prefs.language = lang === 'en' ? 'en_US' : 'zh_CN';
          chrome.storage.local.set({ user_preferences: prefs });
        });
      } catch (e) {}
    }
  }

  function loadTranslations(lang) {
    var src = _langSrcMap[lang];
    var fallback = _builtinLocales[lang] || _builtinLocales['zh'] || {};

    if (!src) {
      _translations = fallback;
      return Promise.resolve(_translations);
    }

    return fetch(src)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load locale: ' + lang);
        return res.json();
      })
      .then(function (data) {
        _translations = Object.assign({}, fallback, data);
        return _translations;
      })
      .catch(function (err) {
        console.error('[I18n] Failed to load translations:', err);
        _translations = fallback;
      });
  }

  function t(key) {
    if (!key) return '';
    var parts = key.split('.');
    var value = _translations;
    for (var i = 0; i < parts.length; i++) {
      if (value === null || value === undefined) return key;
      value = value[parts[i]];
    }
    return value !== null && value !== undefined ? value : key;
  }

  function hasDOM() {
    return typeof document !== 'undefined' && document.querySelectorAll;
  }

  function renderDOM() {
    if (!hasDOM()) return;
    var elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      var translation = t(key);
      if (translation !== key) {
        if (attr) {
          el.setAttribute(attr, translation);
        } else {
          el.textContent = translation;
        }
      }
    });

    var placeholders = document.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var translation = t(key);
      if (translation !== key) {
        el.setAttribute('placeholder', translation);
      }
    });

    var titles = document.querySelectorAll('[data-i18n-title]');
    titles.forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var translation = t(key);
      if (translation !== key) {
        el.setAttribute('title', translation);
      }
    });
  }

  function addLoadingClass() {
    if (!hasDOM()) return;
    document.body.classList.add('i18n-transitioning');
  }

  function removeLoadingClass() {
    if (!hasDOM()) return;
    setTimeout(function () {
      document.body.classList.remove('i18n-transitioning');
    }, 100);
  }

  function setLanguage(lang) {
    if (lang === _currentLang && _initialized) return Promise.resolve();

    addLoadingClass();
    _currentLang = lang;
    persistLanguage(lang);

    return loadTranslations(lang).then(function () {
      renderDOM();
      if (hasDOM()) {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      }
      _initialized = true;
      removeLoadingClass();
      notifyListeners(lang);
    });
  }

  function getLanguage() {
    return _currentLang;
  }

  function isChineseMatch() {
    var navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    return navLang.indexOf('zh') === 0;
  }

  function onChange(callback) {
    if (typeof callback === 'function') {
      _listeners.push(callback);
    }
  }

  function notifyListeners(lang) {
    _listeners.forEach(function (fn) {
      try { fn(lang, _translations); } catch (e) {}
    });
  }

  function init() {
    var lang = resolveLanguage();
    return setLanguage(lang);
  }

  function addLocale(langCode, sourcePath) {
    _langSrcMap[langCode] = sourcePath;
  }

  function getSupportedLanguages() {
    return Object.keys(_langSrcMap);
  }

  return {
    t: t,
    init: init,
    setLanguage: setLanguage,
    getLanguage: getLanguage,
    isChineseMatch: isChineseMatch,
    onChange: onChange,
    renderDOM: renderDOM,
    addLocale: addLocale,
    getSupportedLanguages: getSupportedLanguages
  };
})();
