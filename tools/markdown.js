var MarkdownTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _preserveIndent = false;
  var _listeners = [];

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function decodeHTMLEntities(text) {
    if (!text) return '';
    var textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([\\*_{}\[\]()#+\-.!`])/g, '\\$1');
  }

  function trimEmptyLines(text) {
    return text.replace(/^[\n\r]+|[\n\r]+$/g, '');
  }

  function convertHTMLToMarkdown(html, baseURL) {
    if (!html || html.trim().length === 0) return '';

    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    var markdown = processNode(wrapper);

    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#39;/g, "'");
    markdown = markdown.replace(/&nbsp;/g, ' ');

    if (!_preserveIndent) {
      markdown = removeLeadingIndent(markdown);
    }

    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();

    return markdown;
  }

  function processNode(node) {
    if (!node) return '';

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    var tag = node.tagName.toLowerCase();

    switch (tag) {
      case 'h1':
        return '\n\n# ' + processChildren(node).trim() + '\n\n';
      case 'h2':
        return '\n\n## ' + processChildren(node).trim() + '\n\n';
      case 'h3':
        return '\n\n### ' + processChildren(node).trim() + '\n\n';
      case 'h4':
        return '\n\n#### ' + processChildren(node).trim() + '\n\n';
      case 'h5':
        return '\n\n##### ' + processChildren(node).trim() + '\n\n';
      case 'h6':
        return '\n\n###### ' + processChildren(node).trim() + '\n\n';

      case 'p':
        return '\n\n' + processChildren(node).trim() + '\n\n';

      case 'br':
        return '\n';

      case 'hr':
        return '\n\n---\n\n';

      case 'strong':
      case 'b':
        return '**' + processChildren(node) + '**';

      case 'em':
      case 'i':
        return '*' + processChildren(node) + '*';

      case 'del':
      case 's':
      case 'strike':
        return '~~' + processChildren(node) + '~~';

      case 'mark':
        return '==' + processChildren(node) + '==';

      case 'a': {
        var href = node.getAttribute('href') || '';
        var text = processChildren(node).trim();
        if (!text) text = href;
        if (text === href) return '\n' + href + '\n';
        return '[' + text + '](' + href + ')';
      }

      case 'img': {
        var src = node.getAttribute('src') || '';
        var alt = node.getAttribute('alt') || '';
        return '![' + (alt || _('tools.markdown.image_alt', 'Image')) + '](' + src + ')';
      }

      case 'code': {
        var parentTag = node.parentNode && node.parentNode.tagName ? node.parentNode.tagName.toLowerCase() : '';
        if (parentTag === 'pre') {
          return processChildren(node);
        }
        var codeText = processChildren(node);
        codeText = codeText.replace(/`/g, '\\`');
        return '`' + codeText + '`';
      }

      case 'pre': {
        var codeNode = node.querySelector('code');
        var codeText = codeNode ? processNode(codeNode) : processChildren(node);
        codeText = codeText.replace(/<br\s*\/?>/gi, '\n');
        codeText = codeText.replace(/<[^>]+>/g, '');
        return '\n```\n' + codeText.trim() + '\n```\n';
      }

      case 'ul': {
        var items = [];
        for (var i = 0; i < node.children.length; i++) {
          var li = node.children[i];
          if (li.tagName.toLowerCase() === 'li') {
            items.push('- ' + processListItem(li));
          }
        }
        return '\n' + items.join('\n') + '\n';
      }

      case 'ol': {
        var orderedItems = [];
        var index = 1;
        for (var j = 0; j < node.children.length; j++) {
          var oli = node.children[j];
          if (oli.tagName.toLowerCase() === 'li') {
            orderedItems.push(index + '. ' + processListItem(oli));
            index++;
          }
        }
        return '\n' + orderedItems.join('\n') + '\n';
      }

      case 'li': {
        return processListItem(node);
      }

      case 'blockquote': {
        var bqContent = processChildren(node).trim();
        var lines = bqContent.split('\n');
        return '\n' + lines.map(function (l) { return '> ' + l; }).join('\n') + '\n';
      }

      case 'table': {
        return processTable(node);
      }

      case 'div':
      case 'section':
      case 'article':
      case 'header':
      case 'footer':
      case 'main':
      case 'aside':
      case 'figure':
      case 'figcaption':
      case 'nav':
        var blockContent = processChildren(node).trim();
        if (!blockContent) return '';
        return '\n\n' + blockContent + '\n\n';

      case 'span':
      case 'small':
      case 'big':
      case 'sub':
      case 'sup':
      case 'time':
      case 'label':
        return processChildren(node);

      case 'script':
      case 'style':
      case 'noscript':
      case 'iframe':
      case 'meta':
      case 'link':
        return '';

      default:
        return processChildren(node);
    }
  }

  function processChildren(node) {
    var result = '';
    for (var i = 0; i < node.childNodes.length; i++) {
      result += processNode(node.childNodes[i]);
    }
    return result;
  }

  function processListItem(li) {
    var result = '';
    for (var i = 0; i < li.childNodes.length; i++) {
      var child = li.childNodes[i];
      if (child.nodeType === Node.ELEMENT_NODE) {
        var tag = child.tagName.toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
          result += '\n' + processNode(child).trim().replace(/^/gm, '  ');
        } else if (tag === 'p' || tag === 'div') {
          result += processChildren(child).trim() + '\n';
        } else {
          result += processNode(child);
        }
      } else {
        result += child.textContent || '';
      }
    }
    return result.trim();
  }

  function processTable(table) {
    var rows = [];
    var trs = table.querySelectorAll('tr');
    for (var i = 0; i < trs.length; i++) {
      var cells = [];
      var tds = trs[i].querySelectorAll('td, th');
      for (var j = 0; j < tds.length; j++) {
        cells.push(processChildren(tds[j]).replace(/<[^>]+>/g, '').trim());
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return '';

    var md = '\n| ' + rows[0].join(' | ') + ' |\n';
    md += '|' + rows[0].map(function () { return '---'; }).join('|') + '|\n';
    for (var r = 1; r < rows.length; r++) {
      md += '| ' + rows[r].join(' | ') + ' |\n';
    }
    return md + '\n';
  }

  function removeLeadingIndent(markdown) {
    var lines = markdown.split('\n');
    var inCodeBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var trimmed = lines[i].trim();
      if (/^```/.test(trimmed)) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (!inCodeBlock) {
        if (!/^\s+([-*+]|\d+\.)\s/.test(lines[i])) {
          lines[i] = lines[i].replace(/^\s+/, '');
        }
      }
    }
    return lines.join('\n');
  }

  function execute(mode) {
    mode = mode === 'full' ? 'full' : 'selected';

    if (!TextFlow.isChromeExtension()) {
      return executeLocal(mode);
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
          action: 'saveMarkdown',
          payload: { mode: mode },
          requestId: 'md_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.success) {
            reject(new Error(response ? response.error : _('errors.content_script_no_response', '内容脚本无响应')));
            return;
          }
          var data = response.data;
          var markdown = convertHTMLToMarkdown(data.html);
          _currentData = {
            html: data.html,
            markdown: markdown,
            pageTitle: data.pageTitle,
            pageURL: data.pageURL,
            mode: data.mode,
            isShortContent: data.isShortContent === true
          };
          _currentMode = mode;
          notifyListeners(_currentData);
          resolve(_currentData);
        });
      });
    });
  }

  function executeLocal(mode) {
    mode = mode === 'full' ? 'full' : 'selected';
    var sampleHTML = '<h1>Sample Title</h1><p>This is <b>bold</b> text, and this is <i>italic</i> text.</p><p>Contains a <a href="https://example.com">link</a>.</p><ul><li>Item one</li><li>Item two</li></ul><pre><code>console.log("Hello");</code></pre>';
    var markdown = convertHTMLToMarkdown(sampleHTML);
    _currentData = {
      html: sampleHTML,
      markdown: markdown,
      pageTitle: _('errors.local_test', 'Local Test'),
      pageURL: 'http://localhost/test',
      mode: mode,
      isShortContent: false
    };
    _currentMode = mode;
    notifyListeners(_currentData);
    return Promise.resolve(_currentData);
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

  function setPreserveIndent(val) {
    _preserveIndent = !!val;
  }

  function getPreserveIndent() {
    return _preserveIndent;
  }

  function onChange(callback) {
    _listeners.push(callback);
  }

  function notifyListeners(data) {
    _listeners.forEach(function (fn) {
      try { fn(data); } catch (e) {}
    });
  }

  return {
    execute: execute,
    executeLocal: executeLocal,
    getResult: getResult,
    setMode: setMode,
    getMode: getMode,
    setPreserveIndent: setPreserveIndent,
    getPreserveIndent: getPreserveIndent,
    onChange: onChange,
    convertHTMLToMarkdown: convertHTMLToMarkdown,
    copyToClipboard: TextFlow.copyToClipboard,
    downloadFile: TextFlow.downloadFile
  };
})();
