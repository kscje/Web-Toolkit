(function () {
  'use strict';

  const CONTENT_FILTER_SELECTORS = [
    'nav', '[role="navigation"]', '.navbar', '.nav', '.header',
    'aside', '[role="complementary"]', '.sidebar', '.side',
    'footer', '.footer', '.copyright',
    '[role="dialog"]', '.modal', '.popup', '.overlay',
    '[class~="ad"]', '[class~="ads"]', '[class^="ad-"]', '[class*=" ad-"]', '[class$="-ad"]',
    '[id="ad"]', '[id="ads"]', '[id^="ad-"]', '[id$="-ad"]',
    '[class*="advert"]', '[id*="advert"]', '[class*="adsbygoogle"]', '[id*="adsbygoogle"]',
    '[class*="banner"]',
    '[class*="comment"]', '[class*="disqus"]', '[class*="discussion"]',
    '[class*="share"]', '[class*="social"]',
    'model-response-disclaimers', 'hallucination-disclaimer',
    'script', 'style', 'noscript', 'iframe'
  ];

  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;
    return selection.toString();
  }

  function getSelectedHTML() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  }

  function getPageTitle() {
    return document.title || window.location.hostname || 'Untitled Page';
  }

  function getPageURL() {
    return window.location.href;
  }

  function countChineseChars(text) {
    const matches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g);
    return matches ? matches.length : 0;
  }

  function countEnglishWords(text) {
    const cleaned = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf]/g, ' ');
    const words = cleaned.match(/[a-zA-Z0-9]+/g);
    return words ? words.length : 0;
  }

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;
  }

  function getVisibleText(element) {
    if (!element) return '';
    if (element.nodeType === Node.TEXT_NODE) {
      return element.textContent || '';
    }
    if (element.nodeType !== Node.ELEMENT_NODE) return '';

    if (!isElementVisible(element)) return '';

    const tag = element.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'iframe') return '';

    let text = '';
    for (const child of element.childNodes) {
      text += getVisibleText(child);
    }
    return text;
  }

  function getFullPageText() {
    const body = document.body;
    if (!body) return '';
    return getVisibleText(body);
  }

  function getFullPageHTML() {
    const clone = document.body.cloneNode(true);
    removeFilteredContent(clone);
    return clone.innerHTML;
  }

  function removeFilteredContent(root) {
    if (!root) return;
    CONTENT_FILTER_SELECTORS.forEach(function (selector) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(function (el) { el.remove(); });
      } catch (e) {}
    });
  }

  function countPageImages() {
    const imgs = document.querySelectorAll('img');
    let count = 0;
    imgs.forEach(function (img) {
      if (isElementVisible(img)) count++;
    });
    return count;
  }

  function countPageVideos() {
    const videos = document.querySelectorAll('video');
    const iframeVideos = document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="bilibili"]');
    let count = 0;
    videos.forEach(function (v) { if (isElementVisible(v)) count++; });
    count += iframeVideos.length;
    return count;
  }

  function countPageLinks() {
    const links = document.querySelectorAll('a[href]');
    return links.length;
  }

  function countParagraphs(text) {
    const paragraphs = text.split(/\n+/).filter(function (p) { return p.trim().length > 0; });
    return paragraphs.length;
  }

  function analyzeText(text) {
    return {
      charWithSpaces: text.length,
      charWithoutSpaces: text.replace(/\s/g, '').length,
      chineseCount: countChineseChars(text),
      englishWordCount: countEnglishWords(text),
      paragraphCount: countParagraphs(text)
    };
  }

  function analyzeFullPage() {
    const fullText = getFullPageText();
    const stats = analyzeText(fullText);
    stats.imageCount = countPageImages();
    stats.videoCount = countPageVideos();
    stats.linkCount = countPageLinks();
    return stats;
  }

  function analyzeSelectedText(text) {
    return analyzeText(text);
  }

  const CONVERSATION_TURN_SELECTOR = [
    '[data-testid^="conversation-turn-"]',
    'article[data-testid^="conversation-turn"]',
    'user-query',
    'model-response'
  ].join(', ');

  function filterOutermostTurns(turns, selector) {
    return turns.filter(function (el) {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        try {
          if (parent.matches(selector)) return false;
        } catch (e) {}
        parent = parent.parentElement;
      }
      return true;
    });
  }

  function getConversationTurns() {
    let turns = [];
    try {
      turns = Array.from(document.querySelectorAll(CONVERSATION_TURN_SELECTOR));
    } catch (e) {}

    if (turns.length > 0) {
      return { elements: filterOutermostTurns(turns, CONVERSATION_TURN_SELECTOR), minLength: 1 };
    }

    const messages = document.querySelectorAll('[data-message-author-role]');
    if (messages.length >= 2) {
      return { elements: Array.from(messages), minLength: 1 };
    }

    const secondarySelectors = ['[data-message-id]', '.ds-message'];
    for (let i = 0; i < secondarySelectors.length; i++) {
      let candidates = [];
      try {
        candidates = Array.from(document.querySelectorAll(secondarySelectors[i]));
      } catch (e) {}
      if (candidates.length >= 2) {
        return { elements: filterOutermostTurns(candidates, secondarySelectors[i]), minLength: 100 };
      }
    }

    const articles = document.querySelectorAll('article');
    if (articles.length >= 2) {
      return { elements: Array.from(articles), minLength: 100 };
    }

    return null;
  }

  function findCommonAncestor(elements) {
    if (!elements || elements.length === 0) return null;

    const path = [];
    let node = elements[0];
    while (node && node !== document.body) {
      path.push(node);
      node = node.parentElement;
    }
    const inPath = new Set(path);

    for (let i = 1; i < elements.length; i++) {
      let current = elements[i];
      let shared = null;
      while (current && current !== document.body) {
        if (inPath.has(current)) { shared = current; break; }
        current = current.parentElement;
      }
      if (!shared) return null;
      path.length = path.indexOf(shared) + 1;
      inPath.clear();
      path.forEach(function (p) { inPath.add(p); });
    }
    return path[path.length - 1];
  }

  function findConversationContainer() {
    const turns = getConversationTurns();
    if (!turns || turns.elements.length === 0) return null;

    const container = findCommonAncestor(turns.elements);
    if (!container || container === document.body) return null;

    const textLength = (container.textContent || '').trim().length;
    if (textLength <= (turns.minLength || 100)) return null;

    return container;
  }

  function paragraphTextLength(el) {
    let len = 0;
    el.querySelectorAll('p').forEach(function (p) {
      len += (p.textContent || '').trim().length;
    });
    return len;
  }

  function linkTextLength(el) {
    let len = 0;
    el.querySelectorAll('a').forEach(function (a) {
      len += (a.textContent || '').trim().length;
    });
    return len;
  }

  function pickArticleBody(candidates) {
    let bestBody = null;
    let bestParagraphLength = 0;
    candidates.forEach(function (el) {
      if (el === document.body || el === document.documentElement) return;
      const total = (el.textContent || '').trim().length;
      if (total < 200) return;
      const paragraphLength = paragraphTextLength(el);
      if (paragraphLength < 150) return;
      if (paragraphLength / total <= 0.55) return;
      if (linkTextLength(el) / total > 0.3) return;
      if (paragraphLength > bestParagraphLength) {
        bestBody = el;
        bestParagraphLength = paragraphLength;
      }
    });
    return bestBody;
  }

  function getPageMainContentHTML() {
    const conversationContainer = findConversationContainer();
    if (conversationContainer) {
      const conversationClone = conversationContainer.cloneNode(true);
      CONTENT_FILTER_SELECTORS.forEach(function (s) {
        try {
          conversationClone.querySelectorAll(s).forEach(function (child) { child.remove(); });
        } catch (e) {}
      });
      return conversationClone.innerHTML;
    }

    const selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '#content', '.content'];
    const candidates = [];
    let best = null;
    let bestLength = 0;
    for (let i = 0; i < selectors.length; i++) {
      const matches = document.querySelectorAll(selectors[i]);
      matches.forEach(function (el) {
        if (!isElementVisible(el)) return;
        candidates.push(el);
        const textLength = (el.textContent || '').trim().length;
        if (textLength > bestLength) {
          best = el;
          bestLength = textLength;
        }
      });
    }

    if (!best || bestLength < 100) {
      const blockCandidates = document.querySelectorAll('article, main, section, [role="main"], div');
      blockCandidates.forEach(function (el) {
        if (!isElementVisible(el)) return;
        candidates.push(el);
        const textLength = (el.textContent || '').trim().length;
        if (textLength > bestLength && textLength < (document.body.textContent || '').length * 0.95) {
          best = el;
          bestLength = textLength;
        }
      });
    }

    const articleBody = pickArticleBody(candidates);
    const target = articleBody || (best && bestLength >= 100 ? best : null);
    if (target) {
      const clone = target.cloneNode(true);
      removeFilteredContent(clone);
      return clone.innerHTML;
    }
    return getFullPageHTML();
  }

  function resolveURL(src) {
    if (!src) return src;
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
    try {
      return new URL(src, window.location.href).href;
    } catch (e) {
      return src;
    }
  }

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    const action = request.action;
    const payload = request.payload || {};

    switch (action) {
      case 'getSelection': {
        const text = getSelectedText();
        const html = getSelectedHTML();
        sendResponse({
          success: true,
          data: {
            hasSelection: text !== null && text.trim().length > 0,
            text: text || '',
            html: html || ''
          },
          requestId: request.requestId
        });
        break;
      }

      case 'getPageInfo': {
        sendResponse({
          success: true,
	          data: {
	            title: getPageTitle(),
	            url: getPageURL(),
	            domain: window.location.hostname
	          },
          requestId: request.requestId
        });
        break;
      }

      case 'wordCount': {
        const mode = payload.mode || 'selected';
        const selectedText = getSelectedText();

        if (mode === 'selected' && selectedText && selectedText.trim().length > 0) {
          const stats = analyzeSelectedText(selectedText);
          sendResponse({
            success: true,
            data: Object.assign({}, stats, {
              mode: 'selected',
              imageCount: 0,
              videoCount: 0,
              linkCount: 0
            }),
            requestId: request.requestId
          });
        } else if (mode === 'full' || !selectedText || selectedText.trim().length === 0) {
          const stats = analyzeFullPage();
          sendResponse({
            success: true,
            data: Object.assign({}, stats, { mode: 'full' }),
            requestId: request.requestId
          });
        } else {
          sendResponse({
            success: true,
            data: Object.assign({}, analyzeSelectedText(''), {
              mode: 'selected',
              imageCount: 0,
              videoCount: 0,
              linkCount: 0
            }),
            requestId: request.requestId
          });
        }
        break;
      }

      case 'saveMarkdown': {
        const mdMode = payload.mode === 'full' ? 'full' : 'selected';
        const selectedHTML = getSelectedHTML();
        const hasSelection = selectedHTML !== null && selectedHTML.trim().length > 0;

        let sourceMode = mdMode;
        if (mdMode === 'selected' && !hasSelection) {
          sourceMode = 'full';
        }

        const sourceHTML = sourceMode === 'full' ? getPageMainContentHTML() : selectedHTML;
        const htmlContent = resolveImageURLs(sourceHTML);
        const textLength = stripHTMLToText(htmlContent).trim().length;

        sendResponse({
          success: true,
          data: {
            html: htmlContent,
            mode: sourceMode,
            pageTitle: getPageTitle(),
            pageURL: getPageURL(),
            isShortContent: mdMode === 'full' && textLength > 0 && textLength < 50
          },
          requestId: request.requestId
        });
        break;
      }

      case 'extractPlainText': {
        var ptMode = payload.mode || 'selected';
        var keepURLs = payload.keepLinkURLs === true;
        var selectedHTML = getSelectedHTML();
        var hasSelection = selectedHTML !== null && selectedHTML.trim().length > 0;

        var htmlContent = '';
        var contentMode = '';

        if (ptMode === 'selected' && hasSelection) {
          htmlContent = selectedHTML;
          contentMode = 'selected';
        } else {
          htmlContent = getPageMainContentHTML();
          contentMode = 'full';
        }

        htmlContent = resolveImageURLs(htmlContent);

        var plainText;
        if (keepURLs && contentMode === 'selected') {
          plainText = processHTMLWithURLs(htmlContent);
        } else {
          plainText = stripHTMLToText(htmlContent);
        }

        sendResponse({
          success: true,
          data: {
            text: plainText,
            mode: contentMode,
            pageTitle: getPageTitle(),
            pageURL: getPageURL()
          },
          requestId: request.requestId
        });
        break;
      }

      default:
        sendResponse({
          success: false,
          error: 'Unknown action: ' + action,
          requestId: request.requestId
        });
    }

    return true;
  });

  function stripHTMLToText(html) {
    if (!html) return '';

    var text = html;

    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    text = text.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n');

    var blockTags = 'div|p|h[1-6]|li|tr|section|article|header|footer|aside|nav|main|figure|figcaption|blockquote|pre|table|ul|ol|dl|form|fieldset|details|summary';
    text = text.replace(new RegExp('</(' + blockTags + ')[^>]*>', 'gi'), '\n');
    text = text.replace(new RegExp('<(' + blockTags + ')[^>]*>', 'gi'), '');

    text = text.replace(/<[^>]+>/g, '');

    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&#?\w+;/g, '');

    text = text.replace(/[\u200B-\u200F\u00AD\u200E\u200F\u2028\u2029\u202A-\u202E\uFEFF]/g, '');

    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');

    return text;
  }

  function processHTMLWithURLs(html) {
    if (!html) return '';

    var linkMap = {};
    var index = 0;

    html = html.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, function (_, href, inner) {
      var placeholder = '___LINK_' + (index++) + '___';
      var innerText = inner.replace(/<[^>]+>/g, '').trim();
      linkMap[placeholder] = { text: innerText, url: href };
      return placeholder;
    });

    var text = stripHTMLToText(html);

    Object.keys(linkMap).forEach(function (key) {
      var info = linkMap[key];
      var replacement = info.text;
      if (info.url && !/^(#|javascript:)/i.test(info.url)) {
        if (info.text && info.text !== info.url) {
          replacement = info.text + ' [' + info.url + ']';
        } else if (!info.text) {
          replacement = info.url;
        }
      }
      text = text.replace(key, replacement);
    });

    return text;
  }

  function resolveImageURLs(html) {
    if (!html) return html;
    const div = document.createElement('div');
    div.innerHTML = html;
    const imgs = div.querySelectorAll('img');
    imgs.forEach(function (img) {
      const src = img.getAttribute('src');
      if (src) img.setAttribute('src', resolveURL(src));
      const srcset = img.getAttribute('srcset');
      if (srcset) img.removeAttribute('srcset');
    });
    const links = div.querySelectorAll('a');
    links.forEach(function (a) {
      const href = a.getAttribute('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        a.setAttribute('href', resolveURL(href));
      }
    });
    return div.innerHTML;
  }

})();
