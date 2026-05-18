var EmojiConverterTool = (function () {
  'use strict';

  var _currentData = null;
  var _currentMode = 'selected';
  var _manualText = '';
  var _currentType = 'keywords';

  var CONVERT_TYPES = [
    { id: 'keywords',      nameKey: 'tools.emoji_converter.type_keywords',      label: '关键词替换' },
    { id: 'regional',      nameKey: 'tools.emoji_converter.type_regional',      label: '区域指示符' },
    { id: 'circled',       nameKey: 'tools.emoji_converter.type_circled',       label: '带圈字母' },
    { id: 'number_emoji',  nameKey: 'tools.emoji_converter.type_number_emoji',  label: '数字Emoji' },
    { id: 'emoji_art',     nameKey: 'tools.emoji_converter.type_emoji_art',     label: 'Emoji装饰' }
  ];

  var EMOJI_DICT = {
    // 表情符号
    ':)': '\uD83D\uDE0A', ':-)': '\uD83D\uDE0A', '=)': '\uD83D\uDE04',
    ':(': '\uD83D\uDE1E', ':-(': '\uD83D\uDE1E',
    ':D': '\uD83D\uDE04', ':-D': '\uD83D\uDE04',
    ';)': '\uD83D\uDE09', ';-)': '\uD83D\uDE09',
    ':P': '\uD83D\uDE1B', ':-P': '\uD83D\uDE1B', ':p': '\uD83D\uDE1B',
    ':O': '\uD83D\uDE2E', ':-O': '\uD83D\uDE2E',
    ':\'(': '\uD83D\uDE22', ':\'-(': '\uD83D\uDE22',
    ':*': '\uD83D\uDE18', ':-*': '\uD83D\uDE18',
    ':/': '\uD83D\uDE15', ':-/': '\uD83D\uDE15',
    'B)': '\uD83D\uDE0E', 'B-)': '\uD83D\uDE0E',
    ':|': '\uD83D\uDE10', ':-|': '\uD83D\uDE10',
    ':S': '\uD83D\uDE35', ':-S': '\uD83D\uDE35',

    // 正面情绪
    'smile': '\uD83D\uDE0A', 'smiling': '\uD83D\uDE0A',
    'happy': '\uD83D\uDE04', 'joy': '\uD83D\uDE04',
    'laugh': '\uD83D\uDE06', 'laughing': '\uD83D\uDE06', 'haha': '\uD83D\uDE06',
    'love': '\u2764\uFE0F', 'loved': '\u2764\uFE0F',
    'like': '\uD83D\uDC4D', 'liked': '\uD83D\uDC4D',
    'cool': '\uD83D\uDE0E', 'awesome': '\uD83D\uDE0E',
    'amazing': '\uD83D\uDE0E', 'great': '\uD83D\uDC4C',
    'nice': '\uD83D\uDC4C', 'good': '\uD83D\uDC4D',
    'perfect': '\u2714\uFE0F', 'excellent': '\uD83C\uDF1F',
    'wow': '\uD83D\uDE2E', 'amazing': '\uD83D\uDE2E',
    'congrats': '\uD83C\uDF89', 'congratulations': '\uD83C\uDF89',
    'welcome': '\uD83D\uDC4B', 'thanks': '\uD83D\uDE4F', 'thank': '\uD83D\uDE4F',
    'fun': '\uD83C\uDFB6', 'funny': '\uD83D\uDE06',
    'party': '\uD83C\uDF89', 'celebrate': '\uD83C\uDF89',
    'yes': '\u2705', 'yeah': '\u2705', 'yay': '\uD83C\uDF89',
    'agree': '\uD83E\uDD1D', 'deal': '\uD83E\uDD1D',
    'best': '\uD83C\uDF1F', 'wonderful': '\uD83C\uDF1F',

    // 负面情绪
    'sad': '\uD83D\uDE1E', 'unhappy': '\uD83D\uDE1E',
    'cry': '\uD83D\uDE22', 'crying': '\uD83D\uDE22',
    'angry': '\uD83D\uDE20', 'mad': '\uD83D\uDE20', 'rage': '\uD83D\uDE21',
    'sorry': '\uD83D\uDE4F', 'apologize': '\uD83D\uDE4F',
    'no': '\u274C', 'nope': '\u274C',
    'bad': '\uD83D\uDC4E', 'terrible': '\uD83D\uDC4E',
    'hate': '\uD83D\uDE21', 'dislike': '\uD83D\uDC4E',
    'fail': '\uD83D\uDCA5', 'failed': '\uD83D\uDCA5',
    'lost': '\uD83D\uDE2D', 'lose': '\uD83D\uDE2D',
    'worried': '\uD83D\uDE30', 'anxious': '\uD83D\uDE30',
    'confused': '\uD83D\uDE15', 'puzzled': '\uD83D\uDE15',

    // 动物
    'cat': '\uD83D\uDC31', 'cats': '\uD83D\uDC31', 'kitty': '\uD83D\uDC31',
    'dog': '\uD83D\uDC36', 'dogs': '\uD83D\uDC36', 'puppy': '\uD83D\uDC36',
    'bird': '\uD83D\uDC26', 'dove': '\uD83D\uDD4A\uFE0F',
    'fish': '\uD83D\uDC1F', 'shark': '\uD83E\uDD88',
    'whale': '\uD83D\uDC33', 'dolphin': '\uD83D\uDC2C',
    'rabbit': '\uD83D\uDC30', 'bunny': '\uD83D\uDC30',
    'bear': '\uD83D\uDC3B', 'panda': '\uD83D\uDC3C',
    'monkey': '\uD83D\uDC35', 'gorilla': '\uD83E\uDD8D',
    'elephant': '\uD83D\uDC18', 'lion': '\uD83E\uDD81',
    'tiger': '\uD83D\uDC2F', 'fox': '\uD83E\uDD8A',
    'horse': '\uD83D\uDC34', 'unicorn': '\uD83E\uDD84',
    'cow': '\uD83D\uDC2E', 'pig': '\uD83D\uDC37',
    'chicken': '\uD83D\uDC14', 'rooster': '\uD83D\uDC13',
    'frog': '\uD83D\uDC38', 'turtle': '\uD83D\uDC22',
    'snake': '\uD83D\uDC0D', 'dragon': '\uD83D\uDC32',
    'butterfly': '\uD83E\uDD8B', 'bee': '\uD83D\uDC1D',
    'ant': '\uD83D\uDC1C', 'bug': '\uD83D\uDC1B',
    'owl': '\uD83E\uDD89', 'eagle': '\uD83E\uDD85',
    'penguin': '\uD83D\uDC27', 'koala': '\uD83D\uDC28',
    'hamster': '\uD83D\uDC39', 'mouse': '\uD83D\uDC2D',

    // 食物
    'pizza': '\uD83C\uDF55', 'burger': '\uD83C\uDF54', 'hamburger': '\uD83C\uDF54',
    'fries': '\uD83C\uDF5F', 'chips': '\uD83C\uDF5F',
    'coffee': '\u2615', 'tea': '\uD83C\uDF75', 'milk': '\uD83E\uDD5B',
    'beer': '\uD83C\uDF7A', 'wine': '\uD83C\uDF77',
    'cake': '\uD83C\uDF82', 'dessert': '\uD83C\uDF6E',
    'cookie': '\uD83C\uDF6A', 'candy': '\uD83C\uDF6C',
    'ice cream': '\uD83C\uDF68', 'donut': '\uD83C\uDF69',
    'apple': '\uD83C\uDF4E', 'banana': '\uD83C\uDF4C',
    'orange': '\uD83C\uDF4A', 'lemon': '\uD83C\uDF4B',
    'grape': '\uD83C\uDF47', 'watermelon': '\uD83C\uDF49',
    'strawberry': '\uD83C\uDF53', 'cherry': '\uD83C\uDF52',
    'bread': '\uD83C\uDF5E', 'rice': '\uD83C\uDF5A',
    'noodle': '\uD83C\uDF5C', 'pasta': '\uD83C\uDF5D',
    'sushi': '\uD83C\uDF63', 'taco': '\uD83C\uDF2E',
    'egg': '\uD83E\uDD5A', 'cheese': '\uD83E\uDDC0',
    'tomato': '\uD83C\uDF45', 'salad': '\uD83E\uDD57',

    // 自然
    'sun': '\u2600\uFE0F', 'sunny': '\u2600\uFE0F',
    'moon': '\uD83C\uDF19', 'star': '\u2B50', 'stars': '\u2728',
    'rain': '\uD83C\uDF27\uFE0F', 'rainy': '\uD83C\uDF27\uFE0F',
    'snow': '\u2744\uFE0F', 'snowy': '\u2744\uFE0F',
    'cloud': '\u2601\uFE0F', 'cloudy': '\u2601\uFE0F',
    'fire': '\uD83D\uDD25', 'burn': '\uD83D\uDD25',
    'water': '\uD83D\uDCA7', 'wave': '\uD83C\uDF0A',
    'mountain': '\u26F0\uFE0F', 'tree': '\uD83C\uDF33',
    'flower': '\uD83C\uDF3C', 'rose': '\uD83C\uDF39',
    'leaf': '\uD83C\uDF43', 'seed': '\uD83C\uDF31',

    // 动作
    'run': '\uD83C\uDFC3', 'running': '\uD83C\uDFC3',
    'walk': '\uD83D\uDEB6', 'walking': '\uD83D\uDEB6',
    'swim': '\uD83C\uDFCA', 'swimming': '\uD83C\uDFCA',
    'fly': '\u2708\uFE0F', 'flying': '\u2708\uFE0F',
    'sleep': '\uD83D\uDE34', 'sleeping': '\uD83D\uDE34', 'tired': '\uD83D\uDE34',
    'eat': '\uD83C\uDF54', 'eating': '\uD83C\uDF54',
    'drink': '\u2615', 'drinking': '\u2615',
    'read': '\uD83D\uDCDA', 'reading': '\uD83D\uDCDA',
    'write': '\u270D\uFE0F', 'writing': '\u270D\uFE0F',
    'sing': '\uD83C\uDFA4', 'singing': '\uD83C\uDFA4',
    'dance': '\uD83D\uDD7A', 'dancing': '\uD83D\uDD7A',
    'travel': '\u2708\uFE0F', 'traveling': '\u2708\uFE0F',
    'work': '\uD83D\uDCBB', 'working': '\uD83D\uDCBB',
    'play': '\uD83C\uDFBE', 'playing': '\uD83C\uDFBE',
    'think': '\uD83E\uDD14', 'thinking': '\uD83E\uDD14',
    'pray': '\uD83D\uDE4F', 'praying': '\uD83D\uDE4F',
    'win': '\uD83C\uDFC6', 'winner': '\uD83C\uDFC6',

    // 物品
    'book': '\uD83D\uDCD6', 'books': '\uD83D\uDCDA',
    'phone': '\uD83D\uDCF1', 'mobile': '\uD83D\uDCF1',
    'computer': '\uD83D\uDCBB', 'laptop': '\uD83D\uDCBB',
    'key': '\uD83D\uDD11', 'keys': '\uD83D\uDD11',
    'money': '\uD83D\uDCB0', 'cash': '\uD83D\uDCB5',
    'gift': '\uD83C\uDF81', 'present': '\uD83C\uDF81',
    'ring': '\uD83D\uDC8D', 'diamond': '\uD83D\uDC8E',
    'crown': '\uD83D\uDC51', 'medal': '\uD83C\uDFC5',
    'light': '\uD83D\uDCA1', 'bulb': '\uD83D\uDCA1',
    'lock': '\uD83D\uDD12', 'locked': '\uD83D\uDD12',
    'unlock': '\uD83D\uDD13', 'unlocked': '\uD83D\uDD13',
    'bell': '\uD83D\uDD14', 'alarm': '\uD83D\uDEA8',
    'clock': '\uD83D\uDD70\uFE0F', 'time': '\u23F0',
    'map': '\uD83D\uDDFA\uFE0F', 'compass': '\uD83E\uDDED',
    'camera': '\uD83D\uDCF7', 'photo': '\uD83D\uDCF7',
    'tv': '\uD83D\uDCFA', 'movie': '\uD83C\uDFAC', 'film': '\uD83C\uDFAC',
    'music': '\uD83C\uDFB5', 'guitar': '\uD83C\uDFB8',
    'game': '\uD83C\uDFAE', 'gaming': '\uD83C\uDFAE',

    // 标志符号
    'check': '\u2705', 'done': '\u2705', 'complete': '\u2705',
    'cross': '\u274C', 'x': '\u274C',
    'warning': '\u26A0\uFE0F', 'caution': '\u26A0\uFE0F',
    'info': '\u2139\uFE0F', 'information': '\u2139\uFE0F',
    'question': '\u2753', 'help': '\u2753',
    'stop': '\uD83D\uDED1', 'go': '\uD83D\uDEA5',
    'up': '\u2B06\uFE0F', 'down': '\u2B07\uFE0F',
    'left': '\u2B05\uFE0F', 'right': '\u27A1\uFE0F',
    'new': '\uD83C\uDD95', 'hot': '\uD83D\uDD25',
    'top': '\uD83D\uDD1D', 'end': '\uD83D\uDD1A',
    'on': '\uD83D\uDD1B', 'soon': '\uD83D\uDD1C',
    'free': '\uD83C\uDD93', 'pro': '\uD83C\uDD99',
    '100': '\uD83D\uDCAF', 'one': '1\u20E3',
    'first': '\uD83E\uDD47', 'second': '\uD83E\uDD48', 'third': '\uD83E\uDD49',

    // 情感/状态
    'sleepy': '\uD83D\uDE2A', 'yawn': '\uD83E\uDD71',
    'sick': '\uD83E\uDD12', 'ill': '\uD83E\uDD12',
    'healthy': '\uD83C\uDF3F', 'strong': '\uD83D\uDCAA',
    'brave': '\uD83E\uDDB9', 'proud': '\uD83D\uDE0A',
    'shy': '\uD83D\uDE33', 'blush': '\uD83D\uDE0A',
    'surprised': '\uD83D\uDE32', 'shock': '\uD83D\uDE32',
    'embarrassed': '\uD83D\uDE33', 'awkward': '\uD83D\uDE35',
    'bored': '\uD83D\uDE12', 'tired': '\uD83D\uDE2B',
    'excited': '\uD83E\uDD29', 'thrilled': '\uD83E\uDD29',
    'calm': '\uD83E\uDDD8', 'relax': '\uD83C\uDFD6\uFE0F',

    // 天气
    'thunder': '\u26A1', 'lightning': '\u26A1',
    'rainbow': '\uD83C\uDF08', 'wind': '\uD83C\uDF2C\uFE0F',
    'tornado': '\uD83C\uDF2A\uFE0F', 'storm': '\uD83C\uDF2A\uFE0F',
    'cold': '\u2744\uFE0F', 'hot': '\uD83D\uDD25',
    'warm': '\u2600\uFE0F', 'spring': '\uD83C\uDF38',
    'summer': '\u2600\uFE0F', 'autumn': '\uD83C\uDF42', 'fall': '\uD83C\uDF42',
    'winter': '\u2744\uFE0F', 'fog': '\uD83C\uDF2B\uFE0F'
  };

  // For longer phrases that should be matched before single words
  var EMOJI_PHRASE_DICT = {
    'ice cream': '\uD83C\uDF68',
    'pine apple': '\uD83C\uDF4D',
    'thank you': '\uD83D\uDE4F',
    'good luck': '\uD83C\uDF40',
    'good night': '\uD83C\uDF19',
    'good morning': '\u2600\uFE0F',
    'happy birthday': '\uD83C\uDF82',
    'merry christmas': '\uD83C\uDF84',
    'happy new year': '\uD83C\uDF86',
    'see you': '\uD83D\uDC4B',
    'i love you': '\u2764\uFE0F',
    'miss you': '\uD83D\uDE22',
    'no problem': '\uD83D\uDC4D',
    'take care': '\uD83D\uDE4F',
    'well done': '\uD83D\uDC4C',
    'of course': '\u2705',
    'i am': '\uD83D\uDC46',
    'you are': '\uD83D\uDC47'
  };

  var REGIONAL_OFFSET = 0x1F1E6 - 0x41;
  var CIRCLED_OFFSET = {
    'A': '\uD83C\uDD30', 'B': '\uD83C\uDD31', 'C': '\uD83C\uDD32', 'D': '\uD83C\uDD33',
    'E': '\uD83C\uDD34', 'F': '\uD83C\uDD35', 'G': '\uD83C\uDD36', 'H': '\uD83C\uDD37',
    'I': '\uD83C\uDD38', 'J': '\uD83C\uDD39', 'K': '\uD83C\uDD3A', 'L': '\uD83C\uDD3B',
    'M': '\uD83C\uDD3C', 'N': '\uD83C\uDD3D', 'O': '\uD83C\uDD3E', 'P': '\uD83C\uDD3F',
    'Q': '\uD83C\uDD40', 'R': '\uD83C\uDD41', 'S': '\uD83C\uDD42', 'T': '\uD83C\uDD43',
    'U': '\uD83C\uDD44', 'V': '\uD83C\uDD45', 'W': '\uD83C\uDD46', 'X': '\uD83C\uDD47',
    'Y': '\uD83C\uDD48', 'Z': '\uD83C\uDD49',
    '0': '0\u20E3', '1': '1\u20E3', '2': '2\u20E3', '3': '3\u20E3', '4': '4\u20E3',
    '5': '5\u20E3', '6': '6\u20E3', '7': '7\u20E3', '8': '8\u20E3', '9': '9\u20E3'
  };

  var NUMBER_EMOJI_MAP = {
    '0': '0\u20E3', '1': '1\u20E3', '2': '2\u20E3', '3': '3\u20E3', '4': '4\u20E3',
    '5': '5\u20E3', '6': '6\u20E3', '7': '7\u20E3', '8': '8\u20E3', '9': '9\u20E3'
  };

  function _(key, fallback) {
    if (typeof I18n !== 'undefined' && I18n.t) {
      return I18n.t(key) || fallback;
    }
    return fallback;
  }

  function getSourceText() {
    if (_currentMode === 'manual') {
      return _manualText;
    }
    if (_currentData && _currentData.sourceText) {
      return _currentData.sourceText;
    }
    return '';
  }

  function toRegionalIndicator(text) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var upper = ch.toUpperCase();
      if (upper >= 'A' && upper <= 'Z') {
        var code = upper.charCodeAt(0);
        var regional = String.fromCodePoint(REGIONAL_OFFSET + code);
        result += regional;
      } else {
        result += ch;
      }
    }
    return result;
  }

  function toCircled(text) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var upper = ch.toUpperCase();
      if (CIRCLED_OFFSET[upper] !== undefined) {
        result += CIRCLED_OFFSET[upper];
      } else {
        result += ch;
      }
    }
    return result;
  }

  function toNumberEmoji(text) {
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (NUMBER_EMOJI_MAP[ch] !== undefined) {
        result += NUMBER_EMOJI_MAP[ch];
      } else {
        result += ch;
      }
    }
    return result;
  }

  function toKeywordsEmoji(text) {
    if (!text) return '';
    var result = text;

    // First, replace multi-word phrases (sorted by length descending)
    var phrases = Object.keys(EMOJI_PHRASE_DICT).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var p = 0; p < phrases.length; p++) {
      var phrase = phrases[p];
      var emoji = EMOJI_PHRASE_DICT[phrase];
      var regex = new RegExp('\\b' + escapeRegex(phrase) + '\\b', 'gi');
      result = result.replace(regex, emoji);
    }

    // Then replace single words (sorted by length descending to avoid partial matches)
    var words = Object.keys(EMOJI_DICT).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      var e = EMOJI_DICT[word];
      // Skip emoticons that contain non-word chars - handle separately
      if (/^[:;=B8]/.test(word)) continue;
      var re = new RegExp('\\b' + escapeRegex(word) + '\\b', 'gi');
      result = result.replace(re, e);
    }

    // Replace emoticons (they don't have word boundaries)
    var emoticons = Object.keys(EMOJI_DICT).filter(function (k) {
      return /^[:;=B8]/.test(k);
    }).sort(function (a, b) {
      return b.length - a.length;
    });
    for (var em = 0; em < emoticons.length; em++) {
      var emoticon = emoticons[em];
      var emoji = EMOJI_DICT[emoticon];
      var escaper = escapeRegex(emoticon);
      var eregex = new RegExp(escaper.replace(/\\-/g, '-?'), 'g');
      result = result.replace(eregex, emoji);
    }

    return result;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function toEmojiArt(text) {
    if (!text) return '';
    var result = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        result += '  ';
      } else {
        result += ch + ' ';
      }
    }
    return result.trim();
  }

  function emojiArtSurround(text, leftEmoji, rightEmoji) {
    if (!text) return '';
    leftEmoji = leftEmoji || '\u2B50';
    rightEmoji = rightEmoji || '\u2B50';
    var words = text.split(/\s+/);
    var result = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i].trim()) {
        result.push(leftEmoji + words[i] + rightEmoji);
      }
    }
    return result.join(' ');
  }

  var convertFnMap = {
    'keywords': toKeywordsEmoji,
    'regional': toRegionalIndicator,
    'circled': toCircled,
    'number_emoji': toNumberEmoji,
    'emoji_art': toEmojiArt
  };

  function convert(type) {
    var text = getSourceText();
    if (!text) {
      return Promise.reject(new Error(_('tools.emoji_converter.error_no_text', 'No text to convert')));
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
          reject(new Error(_('tools.emoji_converter.error_content_script', 'Cannot access this page')));
          return;
        }

        chrome.tabs.sendMessage(tab.id, {
          action: 'getSelection',
          payload: {},
          requestId: 'ec_' + Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            var msg = chrome.runtime.lastError.message || '';
            if (msg.indexOf('Receiving end does not exist') !== -1) {
              reject(new Error(_('tools.emoji_converter.error_content_script', 'Cannot access this page. Content script not loaded.')));
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
    var sampleText = 'hello world, this is a cool test :)';
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
      return Promise.reject(new Error(_('tools.emoji_converter.error_no_result', 'No result to copy')));
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
