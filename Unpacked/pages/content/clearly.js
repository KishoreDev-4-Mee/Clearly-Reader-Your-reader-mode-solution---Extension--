/**
 * Public constructor.
 * @param {HTMLDocument} doc     The document to parse.
 * @param {Object}       options The options object.
 */
function Clearly (doc, options, config) {
  // In some older versions, people passed a URI as the first argument. Cope:
  if (options && options.documentElement) {
    doc = options
    options = arguments[2]
  } else if (!doc || !doc.documentElement) {
    throw new Error('First argument to Clearly constructor should be a document object.')
  }
  options = options || {}

  this._doc = doc
  this._articleTitle = null
  this._articleByline = null
  this._articleAuthorName = null
  this._articleDir = null
  this._attempts = []
  this._outlineIndex = 0

  // Process extra config
  if (config && typeof config === 'object') {
    Object.assign(this, config)
    const regexPrefixies = ['REGEXPS', 'LANG_REGEXPS']
    regexPrefixies.forEach(prop => {
      const value = this[prop]
      Object.keys(value).forEach(key => {
        const regex = value[key]
        if (typeof regex === 'string') {
          const matched = regex.match(/^\/(.*)\/([a-z]*)$/)
          if (matched) {
            value[key] = new RegExp(matched[1], matched[2])
          }
        }
      })
    })
  }

  // Configurable options
  this._debug = !!options.debug
  this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE
  this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES
  this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD
  this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || [])
  this._root = options.root
  this.websiteConfig = {}

  // Start with all flags set
  this._flags = this.FLAG_STRIP_UNLIKELYS |
    this.FLAG_WEIGHT_CLASSES |
    this.FLAG_CLEAN_CONDITIONALLY

  // Control whether log messages are sent to the console
  if (this._debug) {
    this.log = function () {
      // eslint-disable-next-line no-caller
      var args = ['[CLEARY/PARSE] ', `(${arguments.callee.caller.name})`].concat(Array.from(arguments))
      console.debug.apply(console, args)
    }
  } else {
    this.log = function () { }
  }
}

Clearly.prototype = {
  FLAG_STRIP_UNLIKELYS: 0x1,
  FLAG_WEIGHT_CLASSES: 0x2,
  FLAG_CLEAN_CONDITIONALLY: 0x4,

  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,

  // Max number of nodes supported by this parser. Default: 0 (no limit)
  DEFAULT_MAX_ELEMS_TO_PARSE: 0,

  // The number of top candidates to consider when analysing how
  // tight the competition is among candidates.
  DEFAULT_N_TOP_CANDIDATES: 5,

  // Element tags to score by default.
  DEFAULT_TAGS_TO_SCORE: 'section,h2,h3,h4,h5,h6,p,td,pre'.toUpperCase().split(','),

  // The default number of chars an article must have in order to return a result
  DEFAULT_CHAR_THRESHOLD: 500,

  // All of the regular expressions in use within Clearly.
  // Defined up here so we don't instantiate them repeatedly in loops.
  REGEXPS: {
    unlikelyCandidates: /-ad-|ad-|-ad|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|foot|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote|advertisement|ads|hierarchie|crumb/i,
    okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
    positive: /article|body|feature|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story|photo|progressive|summary/ig,
    negative: /hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|thumbnail|icon|emoji|widget|avatar|author|small|mini|user|footer|player|controls|button|newsletter|photoviewer-overlay|amphtml-intrinsic-sizer|ads|advertisement/ig,
    extraneous: /print|archive|comment|discuss|e[-]?mail|share|reply|all|login|sign|single|utility/i,
    byline: /byline|author|dateline|writtenby|p-author/i,
    replaceFonts: /<(\/?)font[^>]*>/gi,
    normalize: /\s{2,}/g,
    imagePositive: /hero|presentation|gallary|cover|head|flipboard|slide|post|responsive/ig,
    imageNegative: /icon|logo|button|btn|material|amphtml-intrinsic-sizer/ig,
    videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
    nextLink: /(next|weiter|continue|>([^|]|$)|»([^|]|$))/i,
    prevLink: /(prev|earl|old|new|<|«)/i,
    whitespace: /^\s*$/,
    hasContent: /\S$/
  },

  PRESERVE_ELEM_CLASSES: ['math', 'hljs'],

  DIV_TO_P_ELEMS: ['A', 'BLOCKQUOTE', 'DL', 'DIV', 'IMG', 'OL', 'P', 'PRE', 'TABLE', 'UL', 'SELECT'],

  ALTER_TO_DIV_EXCEPTIONS: ['DIV', 'ARTICLE', 'SECTION', 'P'],

  PICK_ELEMENTS: {
    'span.katex': ['annotation']
  },

  PRESENTATIONAL_ATTRIBUTES: ['align', 'background', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'frame', 'hspace', 'rules', 'style', 'valign', 'vspace'],

  DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ['TABLE', 'TH', 'TD', 'HR', 'PRE'],

  // The commented out elements qualify as phrasing content but tend to be
  // removed by Clearly when put into paragraphs, so we ignore them here.
  PHRASING_ELEMS: [
    'CANVAS', 'IFRAME',
    // , "SVG", "VIDEO",
    'ABBR', 'AUDIO', 'B', 'BDO', 'BR', 'BUTTON', 'CITE', 'CODE', 'DATA',
    'DATALIST', 'DFN', 'EM', 'EMBED', 'I', 'IMG', 'INPUT', 'KBD', 'LABEL',
    'MARK', 'MATH', 'METER', 'NOSCRIPT', 'OBJECT', 'OUTPUT', 'PROGRESS', 'Q',
    'RUBY', 'SAMP', 'SCRIPT', 'SELECT', 'SMALL', 'SPAN', 'STRONG', 'SUB',
    'SUP', 'TEXTAREA', 'TIME', 'VAR', 'WBR'
  ],

  LANG_REGEXPS: {
    en: /(?:\s)[a-zA-Z]+(?:\s)/gi,
    'zh-CN': /[\u4e00-\u9fa5]/gi,
    'zh-TW': /[\u3400-\u4db5]/gi,
    hi: /[\u0900-\u097F]/gi,
    ar: /[\u0621-\u064A\u0660-\u0669]/gi,
    // eslint-disable-next-line no-misleading-character-class
    bn: /[\u0995-\u09B9\u09CE\u09DC-\u09DF\u0985-\u0994\u09BE-\u09CC\u09D7\u09BC]/gi,
    he: /[\u0590-\u05FF]/gi,
    el: /[\u0370-\u03FF\u1F00-\u1FFF]/gi,
    uk: /[а-щА-ЩЬьЮюЯяЇїІіЄєҐґ]+/gi,
    ru: /[аАбБвВгГдДеЕёЁжЖзЗиИйЙкКлЛмМнНоОпПрРсСтТуУфФхХцЦчЧшШщЩъЪыЫьЬэЭюЮяЯ]+/gi,
    ja: /[ぁ-ゔ]|[ァ-ヴー]|[々〆〤ヶ]/gi,
    ko: /[\u3130-\u318F\uAC00-\uD7AF]/gi,
    bg: /[а-ъьюяА-ЪЬЮЯ]+/gi,
    ro: /(?:[a-zA-Z]*[ĂÂÎȘȚăâîșț]+[a-zA-Z]*)+/gi,
    nb: /(?:[a-zA-Z]*[æøåÆØÅ]+[a-zA-Z]*)+/gi,
    sv: /(?:[a-zA-Z]*[äöåÄÖÅ]+[a-zA-Z]*)+/gi,
    it: /(?:[a-zA-Z]*[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]+[a-zA-Z]*)+/gi,
    es: /(?:[a-zA-Z]*[áéíñóúüÁÉÍÑÓÚÜ]+[a-zA-Z]*)+/gi,
    pl: /(?:[a-pr-uwy-zA-PR-UWY-Z]*[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+[a-pr-uwy-zA-PR-UWY-Z]*)+/gi,
    de: /(?:[a-zA-Z]*[äöüßÄÖÜ]+[a-zA-Z]*)+/gi,
    fr: /(?:[a-zA-Z]*[àâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ]+[a-zA-Z]*)+/gi
  },

  WORD_REGEX: /[a-zA-Z-áéíñóúüÁÉÍÑÓÚÜäöüÄÖÜßàèéìíîòóùúÀÈÉÌÍÎÒÓÙÚàâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ]+|[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]|[\u3131-\uD79D]|[ぁ-ゔ]|[ァ-ヴー]|[々〆〤ヶ]|[аАбБвВгГдДеЕёЁжЖзЗиИйЙкКлЛмМнНоОпПрРсСтТуУфФхХцЦчЧшШщЩъЪыЫьЬэЭюЮяЯ]+|[\u0621-\u064A\u0660-\u0669]+/gu,

  DELAY_IMAGE_ATTRIBUTES: ['data-src', 'datasrc', 'data-src', 'data-hi-res-src', 'data-original-src', 'data-origin', 'data-origin-src', 'data-lazyload', 'data-lazyload-src', 'data-lazy-src', 'data-original', 'data-src-medium', 'data-src-large', 'data-src-mini', '_src', 'nitro-lazy-src'],

  // These are the classes that Clearly sets itself.
  CLASSES_TO_PRESERVE: ['page', 'hljs', /^hljs-.*/, /^clearly-.*/],

  /**
   * Run any post-process modifications to article content as necessary.
   *
   * @param Element
   * @return void
  **/
  _postProcessContent: function (articleContent) {
    this.log('_postProcessContent', articleContent)
    // Clearly cannot open relative uris so we convert them to absolute uris.
    this._fixRelativeUris(articleContent)

    // Remove classes.
    // this.log('postProcessContent', articleContent.innerHTML)
    this._processAttributes(articleContent)

    // Remove empty
    this._removeEmptyNodes(articleContent)

    // Remove duplicate
    this._removeDuplicates(articleContent)
  },

  getWebsiteConfig (url) {
    if (!this.WEBSITE_CONFIG) return {}
    const key = Object.keys(this.WEBSITE_CONFIG).find(k => {
      if (k.includes('*')) {
        const regex = new RegExp(k.replace('/', '\\/').replace('.', '\\.').replace('*', '.+?'))
        return regex.test(url)
      }
      return url.includes(k)
    })
    return this.WEBSITE_CONFIG[key] || {}
  },

  /**
   * Remove duplicate elements
   */
  _removeDuplicates: function (articleContent) {
    // TODO: Consider taking into account original contentScore here.
    var imgUrls = []
    this._removeNodes(articleContent.querySelectorAll('img,svg'), (node) => {
      var url = node.getAttribute('src')
      if (url && imgUrls.includes(url) && !url.startsWith('data:')) {
        // Remove full figure
        if (this._hasAncestorTag(node, 'figure', 3)) {
          const ancestors = this._getNodeAncestors(node, 3)
          for (var i = 0; i < ancestors.length; i++) {
            if (ancestors[i].tagName === 'FIGURE') {
              this.log('_removeDuplicates start', ancestors[i].outerHTML)
              ancestors[i].parentNode.removeChild(ancestors[i])
              break
            }
          }
        }
        return true
      }
      imgUrls.push(url)
      return false
    })
  },

  /**
   * Remove empty nodes
   *
   * @param {*} node
   */
  _removeEmptyNodes: function (article) {
    let node = this._getNextNode(article)
    while (node) {
      if (!this._hasContent(node, false, true)) {
        this.log('remove empty', node)
        node = this._removeAndGetNext(node)
      } else {
        node = this._getNextNode(node)
      }
    }

    // let levelNode = article
    // this.log(levelNode)
    // while (levelNode.childNodes.length === 1 && levelNode.childNodes[0].nodeType !== 3) {
    // levelNode.childNodes[0].childNodes.forEach(childNode => levelNode.appendChild(childNode))
    // levelNode.innerHTML = levelNode.childNodes[0].innerHTML
    // levelNode.removeChild(levelNode.childNodes[0])
    // this.log(levelNode)
    // }
    // this.log('_removeEmptyNodes after', article.outerHTML)

    // let levelNode = article
    // this.log('levelNode', levelNode)
    // while (levelNode.childNodes.length === 1 && levelNode.childNodes[0].nodeType !== 3) {
    // levelNode.childNodes[0].childNodes.forEach(childNode => levelNode.appendChild(childNode))
    // levelNode.innerHTML = levelNode.childNodes[0].innerHTML
    // levelNode.removeChild(levelNode.childNodes[0])
    // this.log(levelNode)
    // }
    // this.log('_removeEmptyNodes after', article.outerHTML)
  },

  getPathTo (node) {
    if (node.id !== '') { return 'id("' + node.id + '")' }
    if (node === document.body) { return node.tagName }

    var ix = 0
    var siblings = node.parentNode.childNodes
    for (var i = 0; i < siblings.length; i++) {
      var sibling = siblings[i]
      if (sibling === node) { return this.getPathTo(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']' }
      if (sibling.nodeType === 1 && sibling.tagName === node.tagName) { ix++ }
    }
  },

  getByPath (path) {
    return document.evaluate(path, document, null, window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  },

  _getCoverPhoto () {
    var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
      return '[' + item + ']'
    })).join(',')

    let maxWidth = 0
    let maxHeight = 0
    let maxImg = null
    this.log('_getCoverPhoto', selectors)
    this._forEachNode(this._doc.querySelectorAll(selectors), (node) => {
      const { width: photoWidth, height: photoHeight, realHeight, realWidth, url } = this.getPhotoSize(node)
      const width = Math.max(node.width, node.naturalWidth, node.offsetWidth, photoWidth, realWidth)
      const height = Math.max(node.height, node.naturalHeight, node.offsetHeight, photoHeight, realHeight)
      this.log('_getCoverPhoto', width, realWidth, node)
      if (width > maxWidth) {
        maxWidth = width
        maxHeight = height
        maxImg = url
      }
    })

    if ((maxWidth > 500 || maxHeight > 300) && maxImg) {
      if (maxImg.startsWith('//')) {
        maxImg = this._doc.baseURI.split(':').shift() + ':' + maxImg
      } else if (!maxImg.startsWith('http') && !maxImg.startsWith('data:')) {
        maxImg = this._toAbsoluteURI(maxImg)
      }
      return maxImg
    }
    return false
  },

  /**
   * Iterates over a NodeList, calls `filterFn` for each node and removes node
   * if function returned `true`.
   *
   * If function is not passed, removes all the nodes in node list.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param Function filterFn the function to use as a filter
   * @return void
   */
  _removeNodes: function (nodeList, filterFn) {
    for (var i = nodeList.length - 1; i >= 0; i--) {
      var node = nodeList[i]
      var parentNode = node.parentNode
      if (parentNode) {
        if (!filterFn || filterFn.call(this, node, i, nodeList)) {
          this.log('_removeNodes', node, filterFn)
          parentNode.removeChild(node)
        }
      }
    }
  },

  /**
   * Iterates over a NodeList, and calls _setNodeTag for each node.
   *
   * @param NodeList nodeList The nodes to operate on
   * @param String newTagName the new tag name to use
   * @return void
   */
  _replaceNodeTags: function (nodeList, newTagName) {
    for (var i = nodeList.length - 1; i >= 0; i--) {
      var node = nodeList[i]
      this._setNodeTag(node, newTagName)
    }
  },

  /**
   * Iterate over a NodeList, which doesn't natively fully implement the Array
   * interface.
   *
   * For convenience, the current object context is applied to the provided
   * iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return void
   */
  _forEachNode: function (nodeList, fn) {
    Array.prototype.forEach.call(nodeList, fn, this)
  },

  /**
   * Iterate over a NodeList, return true if any of the provided iterate
   * function calls returns true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _someNode: function (nodeList, fn) {
    return Array.prototype.some.call(nodeList, fn, this)
  },

  /**
   * Iterate over a NodeList, return true if all of the provided iterate
   * function calls return true, false otherwise.
   *
   * For convenience, the current object context is applied to the
   * provided iterate function.
   *
   * @param  NodeList nodeList The NodeList.
   * @param  Function fn       The iterate function.
   * @return Boolean
   */
  _everyNode: function (nodeList, fn) {
    return Array.prototype.every.call(nodeList, fn, this)
  },

  /**
   * Concat all nodelists passed as arguments.
   *
   * @return ...NodeList
   * @return Array
   */
  _concatNodeLists: function () {
    var slice = Array.prototype.slice
    var args = slice.call(arguments)
    var nodeLists = args.map(function (list) {
      return slice.call(list)
    })
    return Array.prototype.concat.apply([], nodeLists)
  },

  _getAllNodesWithTag: function (node, tagNames) {
    if (node.querySelectorAll) {
      return node.querySelectorAll(tagNames.join(','))
    }
    return [].concat.apply([], tagNames.map(function (tag) {
      var collection = node.getElementsByTagName(tag)
      return Array.isArray(collection) ? collection : Array.from(collection)
    }))
  },

  /**
   * Removes the class="" attribute from every element in the given
   * subtree, except those that match CLASSES_TO_PRESERVE and
   * the classesToPreserve array from the options object.
   *
   * @param Element
   * @return void
   */
  _processAttributes: function (node) {
    var className = (node.getAttribute('class') || '')
      .split(/\s+/)
      .filter((cls) => {
        return this._classesToPreserve.indexOf(cls) !== -1 || this._classesToPreserve.some(i => i instanceof RegExp && i.test(cls))
      })
      .join(' ')

    if (['P', 'DIV', 'SPAN', 'STRONG', 'TABLE', 'UL', 'LI', 'ARTICLE', 'MAIN'].includes(node.tagName)) {
      this._cleanAttributes(node)
    }

    if (node.tagName === 'IMG') {
      this._cleanAttributes(node, ['src', 'alt', 'srcset'])
      // node.setAttribute('crossorigin', 'anonymous')
    }

    if (node.tagName === 'A') {
      const href = node.getAttribute('href')
      if (href && href.startsWith('#')) {
        if (!this._preserveIds) this._preserveIds = []
        this._preserveIds.push(href.slice(1))
      }
      this._cleanAttributes(node, ['href', 'title', 'target', 'rel'])
    }

    if (className) {
      node.setAttribute('class', className)
    } else {
      node.removeAttribute('class')
    }

    for (node = node.firstElementChild; node; node = node.nextElementSibling) {
      this._processAttributes(node)
    }
  },

  /**
   * Clean attributes
   *
   * @param {Element} node
   * @param {Array} keeps
   */
  _cleanAttributes: function (node, keeps) {
    this.log('_cleanAttributes', node.tagName, keeps)
    var i = node.attributes.length
    const id = node.getAttribute('id')
    if (id && this._preserveIds && this._preserveIds.includes(id)) {
      keeps = keeps || []
      keeps.push('id')
    }
    while (i--) {
      var attr = node.attributes[i]
      if (!keeps || !keeps.includes(attr.name)) node.removeAttribute(attr.name)
    }
  },

  /**
   * Build tree
   *
   * @param Element
   * @return void
   */
  _buildOutline: function (node) {
    var sections = node.querySelectorAll('h1,h2,h3,h4,h5,h6')
    var outline = []
    this._forEachNode(sections, (section) => {
      section.setAttribute('class', 'ros')
      let id = section.getAttribute('id')
      if (!id) {
        id = 'ros-' + (this._outlineIndex + 1)
        section.setAttribute('id', id)
      }
      outline.push({
        id: id,
        level: parseInt(section.tagName.substr(1), 10),
        type: section.tagName.toLowerCase(),
        title: section.textContent
      })
      this._outlineIndex++
    })
    return outline
  },

  /**
   * Build Links
   *
   * @param Element
   * @return void
   */
  _buildLinks: function (node) {
    var sections = node.querySelectorAll('a')
    var links = []
    this._forEachNode(sections, (node) => {
      const url = node.getAttribute('href')
      const title = (node.textContent && node.textContent.trim()) || ''
      if (
        !url || !title ||
        // Pure link
        title.startsWith('http') ||
        // Not url
        !url.startsWith('http') ||
        // So short
        title.length <= 12 ||
        // Already exists
        links.some(link => link.url.toLowerCase() === url.toLowerCase())
      ) return

      links.push({
        title: node.textContent.trim().replace(/[\u00A0-\u9999<>&]/g, function (i) {
          return '&#' + i.charCodeAt(0) + ';'
        }),
        type: 'text',
        url,
        alt: node.getAttribute('alt')
      })
    })
    return links
  },

  _toAbsoluteURI: function (uri) {
    var baseURI = this._doc.baseURI
    var documentURI = this._doc.documentURI
    // Leave hash links alone if the base URI matches the document URI:
    if (baseURI === documentURI && uri.charAt(0) === '#') {
      return uri
    }
    // Otherwise, resolve against base URI:
    try {
      return new URL(uri, baseURI).href
    } catch (ex) {
      // Something went wrong, just return the original:
    }
    return uri
  },

  /**
   * Converts each <a> and <img> uri in the given element to an absolute URI,
   * ignoring #ref URIs.
   *
   * @param Element
   * @return void
   */
  _fixRelativeUris: function (articleContent) {
    var links = articleContent.getElementsByTagName('a')
    this._forEachNode(links, (link) => {
      var href = link.getAttribute('href')
      if (href) {
        // Replace links with javascript: URIs with text content, since
        // they won't work after scripts have been removed from the page.
        if (href.indexOf('javascript:') === 0) {
          var text = this._doc.createTextNode(link.textContent)
          link.parentNode.replaceChild(text, link)
        } else {
          link.setAttribute('href', this._toAbsoluteURI(href))
        }
      }
    })

    var imgs = articleContent.querySelectorAll('img,picture>source')
    this._forEachNode(imgs, (img) => {
      var src = img.getAttribute('src')
      if (src && !src.startsWith('data:')) {
        img.setAttribute('src', this._toAbsoluteURI(src))
        img.setAttribute('crossorigin', '*')
      }

      for (const attr of this.DELAY_IMAGE_ATTRIBUTES) {
        const value = img.getAttribute(attr)
        if (value && !value.startsWith('data:') && (!src || src.startsWith('data:'))) {
          img.setAttribute('src', this._toAbsoluteURI(value))
          img.setAttribute('crossorigin', '*')
        }
      }

      const imgDataCellOptions = img.getAttribute('data-cell-options')
      if (imgDataCellOptions) {
        try {
          const imgCellData = JSON.parse(imgDataCellOptions)
          if (imgCellData && imgCellData.src) {
            img.setAttribute('src', this._toAbsoluteURI(imgCellData.src))
            img.setAttribute('crossorigin', '*')
          }
          this.log('imgDataCellOptions process ok', img, imgCellData.src)
        } catch (e) {
          this.log('imgDataCellOptions parse error', e)
        }
      }

      if (img.hasAttribute('data-srcset') && !img.hasAttribute('srcset')) {
        img.setAttribute('srcset', img.getAttribute('data-srcset'))
      }

      // Src set url fixed
      const srcset = img.getAttribute('srcset')
      if (srcset) {
        img.setAttribute(
          'srcset',
          srcset.split(', ').map(src => {
            const arr = String(src).trim().split(' ')
            if (arr[0].startsWith('http') || arr[0].startsWith('data:')) return src

            arr[0] = this._toAbsoluteURI(arr[0])
            return arr.join(' ')
          }).join(', ')
        )
      }
    })

    // For zhihu div.data-src
    var imgWrappers = articleContent.querySelectorAll('div[data-src],span[data-original]')
    this._forEachNode(imgWrappers, function (imgWrapper) {
      // @desc data-orignal https://www.theverge.com/2018/11/27/18112685/playstation-classic-review-3d-games
      var src = imgWrapper.getAttribute('data-src') || imgWrapper.getAttribute('data-original')
      if (!imgWrapper.innerHTML && src) {
        var newImg = document.createElement('img')
        newImg.src = src
        newImg.crossorigin = '*'
        imgWrapper.parentNode.replaceChild(newImg, imgWrapper)
      }
    })
  },

  /**
   * Get the article title as an H1.
   *
   * @return void
   **/
  _getArticleTitle: function () {
    // Website config support
    if (this.websiteConfig.titleElem) {
      const titleElem = document.querySelector(this.websiteConfig.titleElem)
      if (titleElem) {
        return titleElem.innerText
      }
    }

    var doc = this._doc
    var curTitle = ''
    var origTitle = ''

    try {
      curTitle = origTitle = String(doc.title || '').trim()

      // If they had an element with id "title" in their HTML
      if (typeof curTitle !== 'string') { curTitle = origTitle = this._getInnerText(doc.getElementsByTagName('title')[0]) }
    } catch (e) { /* ignore exceptions setting the title. */ }

    var titleHadHierarchicalSeparators = false
    function wordCount (str) {
      return str.split(/\s+/).length
    }

    // If there's a separator in the title, first remove the final part
    if ((/ [|\-\\/>»] /).test(curTitle)) {
      titleHadHierarchicalSeparators = / [\\/>»] /.test(curTitle)
      curTitle = origTitle.replace(/(.*)[|\-\\/>»] .*/gi, '$1')

      // If the resulting title is too short (3 words or fewer), remove
      // the first part instead:
      if (wordCount(curTitle) < 3) { curTitle = origTitle.replace(/[^|\-\\/>»]*[|\-\\/>»](.*)/gi, '$1') }
    } else if (curTitle.indexOf(': ') !== -1) {
      // Check if we have an heading containing this exact string, so we
      // could assume it's the full title.
      var headings = this._concatNodeLists(
        doc.getElementsByTagName('h1'),
        doc.getElementsByTagName('h2')
      )
      var trimmedTitle = String(curTitle || '').trim()
      var match = this._someNode(headings, function (heading) {
        return String(heading.textContent || '').trim() === trimmedTitle
      })

      // If we don't, let's extract the title out of the original title string.
      if (!match) {
        curTitle = origTitle.substring(origTitle.lastIndexOf(':') + 1)

        // If the title is now too short, try the first colon instead:
        if (wordCount(curTitle) < 3) {
          curTitle = origTitle.substring(origTitle.indexOf(':') + 1)
          // But if we have too many words before the colon there's something weird
          // with the titles and the H tags so let's just use the original title instead
        } else if (wordCount(origTitle.substr(0, origTitle.indexOf(':'))) > 5) {
          curTitle = origTitle
        }
      }
    } else if (curTitle.length > 150 || curTitle.length < 15) {
      var hOnes = doc.getElementsByTagName('h1')

      if (hOnes.length === 1) { curTitle = this._getInnerText(hOnes[0]) }
    }

    curTitle = String(curTitle || '').trim()
    // If we now have 4 words or fewer as our title, and either no
    // 'hierarchical' separators (\, /, > or ») were found in the original
    // title or we decreased the number of words by more than 1 word, use
    // the original title.
    var curTitleWordCount = wordCount(curTitle)
    if (curTitleWordCount <= 4 &&
      (!titleHadHierarchicalSeparators ||
        curTitleWordCount !== wordCount(origTitle.replace(/[|\-\\/>»]+/g, '')) - 1)) {
      curTitle = origTitle
    }

    return curTitle
  },

  /**
   * Prepare the HTML document for Clearly to scrape it.
   * This includes things like stripping javascript, CSS, and handling terrible markup.
   *
   * @return void
   **/
  _prepDocument: function () {
    var doc = this._doc
    this.websiteConfig = this.getWebsiteConfig(this._doc.baseURI)

    // find author
    this._findAuthor()

    // Remove all style tags in head
    this._removeNodes(doc.getElementsByTagName('style'))

    // Remove
    this._removeUnused()

    if (doc.body) {
      this._replaceBrs(doc.body)
    }

    this._replaceNodeTags(doc.getElementsByTagName('font'), 'SPAN')
  },

  // Remove unused
  _removeUnused: function () {
    // Pretty print line number
    this._removeNodes(this._doc.querySelectorAll('.prettyprint .pre-numbering'))

    const ignoreElements = this.websiteConfig.ignoreElements || []
    for (const elem of ignoreElements) {
      this._removeNodes(this._doc.querySelectorAll(elem))
      this.log('_removeUnused ignoreElements', elem)
    }
  },

  /**
   * Find author name
   */
  _findAuthor: function () {
    var patterns = this.websiteConfig.authorName || []
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        var authorElem = this._doc.querySelector(pattern)
        authorElem && (this._articleAuthorName = authorElem.innerText)
      } else if (pattern instanceof RegExp) {
        var matched = this._doc.innerHTML.match(pattern)
        matched && matched[1] && (this._articleAuthorName = matched[1])
      }
    }
  },

  /**
   * Finds the next element, starting from the given node, and ignoring
   * whitespace in between. If the given node is an element, the same node is
   * returned.
   */
  _nextElement: function (node) {
    var next = node
    while (next &&
      (next.nodeType !== this.ELEMENT_NODE) &&
      this.REGEXPS.whitespace.test(next.textContent)) {
      next = next.nextSibling
    }
    return next
  },

  /**
   * Replaces 2 or more successive <br> elements with a single <p>.
   * Whitespace between <br> elements are ignored. For example:
   *   <div>foo<br>bar<br> <br><br>abc</div>
   * will become:
   *   <div>foo<br>bar<p>abc</p></div>
   */
  _replaceBrs: function (elem) {
    this._forEachNode(this._getAllNodesWithTag(elem, ['br']), function (br) {
      var next = br.nextSibling

      // Whether 2 or more <br> elements have been found and replaced with a
      // <p> block.
      var replaced = false

      // If we find a <br> chain, remove the <br>s until we hit another element
      // or non-whitespace. This leaves behind the first <br> in the chain
      // (which will be replaced with a <p> later).
      while ((next = this._nextElement(next)) && (next.tagName === 'BR')) {
        replaced = 1
        var brSibling = next.nextSibling
        next.parentNode.removeChild(next)
        next = brSibling
      }

      if (!replaced && (this._hasAncestorTag(br, 'code', 2) || this._hasAncestorTag(br, 'pre', 2))) {
        replaced = 2
      }

      // If we removed a <br> chain, replace the remaining <br> with a <p>. Add
      // all sibling nodes as children of the <p> until we hit another <br>
      // chain.
      if (replaced === 1) {
        var p = this._doc.createElement('p')
        br.parentNode.replaceChild(p, br)

        next = p.nextSibling
        while (next) {
          // If we've hit another <br><br>, we're done adding children to this <p>.
          if (next.tagName === 'BR') {
            var nextElem = this._nextElement(next.nextSibling)
            if (nextElem && nextElem.tagName === 'BR') { break }
          }

          if (!this._isPhrasingContent(next)) { break }

          // Otherwise, make this node a child of the new <p>.
          var sibling = next.nextSibling
          p.appendChild(next)
          next = sibling
        }

        while (p.lastChild && this._isWhitespace(p.lastChild)) {
          p.removeChild(p.lastChild)
        }

        if (p.parentNode.tagName === 'P') { this._setNodeTag(p.parentNode, 'DIV') }
      } else if (replaced === 2) {
        br.parentNode.replaceChild(document.createTextNode('\n'), br)
      }
    })
  },

  _setNodeTag: function (node, tag) {
    this.log(node, tag)
    if (node.__JSDOMParser__) {
      node.localName = tag.toLowerCase()
      node.tagName = tag.toUpperCase()
      return node
    }

    var replacement = node.ownerDocument.createElement(tag)
    while (node.firstChild) {
      replacement.appendChild(node.firstChild)
    }
    node.parentNode.replaceChild(replacement, node)
    if (node.Clearly) { replacement.Clearly = node.Clearly }

    for (var i = 0; i < node.attributes.length; i++) {
      try {
        replacement.setAttribute(node.attributes[i].name, node.attributes[i].value)
      } catch (e) {
        // noop
      }
    }
    return replacement
  },

  /**
   * Prepare the article node for display. Clean out any inline styles,
   * iframes, forms, strip extraneous <p> tags, etc.
   *
   * @param Element
   * @return void
   **/
  _prepArticle: function (articleContent) {
    this._cleanExcludes(articleContent)
    this._cleanStyles(articleContent)

    // Check for data tables before we continue, to avoid removing items in
    // those tables, which will often be isolated even though they're
    // visually linked to other content-ful elements (text, images, etc.).
    this._markDataTables(articleContent)

    // Clean out junk from the article content
    this._cleanConditionally(articleContent, 'form')
    this._cleanConditionally(articleContent, 'fieldset')
    this._clean(articleContent, 'object')
    this._clean(articleContent, 'embed')
    this._clean(articleContent, 'h1')
    // this._clean(articleContent, 'header')
    this._clean(articleContent, 'footer')
    this._clean(articleContent, 'link')
    this._clean(articleContent, 'aside')
    this._clean(articleContent, 'canvas')

    // Clean out elements have "share" in their id/class combinations from final top candidates,
    // which means we don't remove the top candidates even they have "share".
    this._forEachNode(articleContent.children, function (topCandidate) {
      this._cleanMatchedNodes(topCandidate, /share/)
    })

    // If there is only one h2 and its text content substantially equals article title,
    // they are probably using it as a header and not a subheader,
    // so remove it since we already extract the title separately.
    var h2 = articleContent.getElementsByTagName('h2')
    if (h2.length === 1) {
      var lengthSimilarRate = (h2[0].textContent.length - this._articleTitle.length) / this._articleTitle.length
      if (Math.abs(lengthSimilarRate) < 0.5) {
        var titlesMatch = false
        if (lengthSimilarRate > 0) {
          titlesMatch = h2[0].textContent.includes(this._articleTitle)
        } else {
          titlesMatch = this._articleTitle.includes(h2[0].textContent)
        }
        if (titlesMatch) {
          this._clean(articleContent, 'h2')
        }
      }
    }

    this._clean(articleContent, 'iframe')
    this._clean(articleContent, 'input')
    this._clean(articleContent, 'textarea')
    this._clean(articleContent, 'select')
    this._clean(articleContent, 'button')
    this._cleanHeaders(articleContent)

    this._coverUrl = this._getCoverPhoto(articleContent)
    this.log('try get getCoverPhoto', this._coverUrl)

    // Do these last as the previous stuff may have removed junk
    // that will affect these
    this._cleanConditionally(articleContent, 'table')
    this._cleanConditionally(articleContent, 'ul')
    this._cleanConditionally(articleContent, 'div')
    this._cleanImg(articleContent)
    this._cleanNoscript(articleContent)

    // Remove extra paragraphs
    this._removeNodes(articleContent.getElementsByTagName('p'), function (paragraph) {
      var imgCount = paragraph.getElementsByTagName('img').length
      var embedCount = paragraph.getElementsByTagName('embed').length
      var objectCount = paragraph.getElementsByTagName('object').length
      // At this point, nasty iframes have been removed, only remain embedded video ones.
      var iframeCount = paragraph.getElementsByTagName('iframe').length
      var totalCount = imgCount + embedCount + objectCount + iframeCount

      return totalCount === 0 && !this._getInnerText(paragraph, false)
    })

    this._forEachNode(this._getAllNodesWithTag(articleContent, ['br']), function (br) {
      var next = this._nextElement(br.nextSibling)
      if (next && next.tagName === 'P') { br.parentNode.removeChild(br) }
    })

    // Remove single-cell tables
    this._forEachNode(this._getAllNodesWithTag(articleContent, ['table']), function (table) {
      var tbody = this._hasSingleTagInsideElement(table, 'TBODY') ? table.firstElementChild : table
      if (this._hasSingleTagInsideElement(tbody, 'TR')) {
        var row = tbody.firstElementChild
        if (this._hasSingleTagInsideElement(row, 'TD')) {
          var cell = row.firstElementChild
          cell = this._setNodeTag(cell, this._everyNode(cell.childNodes, this._isPhrasingContent) ? 'P' : 'DIV')
          table.parentNode.replaceChild(cell, table)
        }
      }
    })
  },

  /**
   * Initialize a node with the Clearly object. Also checks the
   * className/id for special names to add to its score.
   *
   * @param Element
   * @return void
  **/
  _initializeNode: function (node) {
    node.Clearly = { contentScore: 0 }

    switch (node.tagName) {
      case 'DIV':
        node.Clearly.contentScore += 5
        break

      case 'PRE':
      case 'TD':
      case 'BLOCKQUOTE':
        node.Clearly.contentScore += 3
        break

        // case 'IMG':
        // case 'svg':
        //   if (this.isRealPhoto(node)) {
        //     node.Clearly.contentScore += 1
        //   }
        //   break

      case 'ADDRESS':
      case 'OL':
      case 'UL':
      case 'DL':
      case 'DD':
      case 'DT':
      case 'LI':
      case 'FORM':
        node.Clearly.contentScore -= 3
        break

      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6':
      case 'TH':
        node.Clearly.contentScore -= 5
        break
    }

    node.Clearly.contentScore += this._getClassWeight(node)
  },

  _removeAndGetNext: function (node) {
    var nextNode = this._getNextNode(node, true)
    node.parentNode.removeChild(node)
    return nextNode
  },

  /**
   * Traverse the DOM from node to node, starting at the node passed in.
   * Pass true for the second parameter to indicate this node itself
   * (and its kids) are going away, and we want the next node over.
   *
   * Calling this in a loop will traverse the DOM depth-first.
   */
  _getNextNode: function (node, ignoreSelfAndKids) {
    // First check for kids if those aren't being ignored
    if (!ignoreSelfAndKids && node.firstElementChild) {
      return node.firstElementChild
    }
    // Then for siblings...
    if (node.nextElementSibling) {
      return node.nextElementSibling
    }
    // And finally, move up the parent chain *and* find a sibling
    // (because this is depth-first traversal, we will have already
    // seen the parent nodes themselves).
    do {
      node = node.parentNode
    } while (node && !node.nextElementSibling)
    return node && node.nextElementSibling
  },

  _checkByline: function (node, matchString) {
    if (this._articleByline) {
      return false
    }

    if (node.getAttribute !== undefined) {
      var rel = node.getAttribute('rel')
    }

    if ((rel === 'author' || this.REGEXPS.byline.test(matchString)) && this._isValidByline(node.textContent)) {
      this._articleByline = String(node.textContent || '').trim()
      return true
    }

    return false
  },

  _getNodeAncestors: function (node, maxDepth) {
    maxDepth = maxDepth || 0
    var i = 0; var ancestors = []
    while (node.parentNode) {
      ancestors.push(node.parentNode)
      if (maxDepth && ++i === maxDepth) { break }
      node = node.parentNode
    }
    return ancestors
  },

  /***
   * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
   *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
   *
   * @param page a document to run upon. Needs to be a full document, complete with body.
   * @return Element
  **/
  _grabArticle: function (page) {
    const doc = this._doc
    var isPaging = (page !== null)
    page = page || this._doc.body
    const root = doc.documentElement

    this.log('pickElement start', this.PICK_ELEMENTS)
    for (const elem of Object.keys(this.PICK_ELEMENTS)) {
      root.querySelectorAll(elem).forEach(node => {
        const pickElems = this.PICK_ELEMENTS[elem]
        const pickedNodes = node.querySelectorAll(pickElems.join(','))
        node.innerHTML = Array.prototype.map.call(pickedNodes, n => n.outerHTML).join('')
        node._isPicked = true
        this.log('pickElement processed', elem, node.outerHTML)
      })
    }

    this.log('websiteConfig articleElem start', this.websiteConfig)
    const { contentType = 'article', contentElem, extractElems, extractElemsJoiner = '' } = this.websiteConfig
    const detectElems = ['.notion', 'article', 'main']

    // Try to get all matched content elems
    let articleSelectedElem
    const contentElems = (Array.isArray(contentElem) ? contentElem : [contentElem]).concat(detectElems)
    for (const contentElem of contentElems) {
      const articleElems = root.querySelectorAll(contentElem)
      if (articleElems.length === 1) {
        this.log('articleElem matched', contentElem, articleElems)
        articleSelectedElem = articleElems[0]
        break
      }
    }

    this.log('websiteConfig articleElem matched selected', articleSelectedElem)

    // If only one
    if (articleSelectedElem) {
      this._ignoreCleanConditionally = true
      this.log('articleElem matched', contentElem, articleSelectedElem.cloneNode(true))

      // Create a wrapper div
      const articleContent = doc.createElement('DIV')
      const matchedExtractElems = []

      // Check extractElems and try to extract matched elems
      if (extractElems && extractElems.length) {
        for (const extractElem of extractElems) {
          const extractElems = articleSelectedElem.querySelectorAll(extractElem)
          if (extractElems && extractElems.length) {
            matchedExtractElems.push(...extractElems)
          }
        }
      }

      // If no matched extractElems, use contentElem
      if (matchedExtractElems.length) {
        this.log('articleElem extracts', matchedExtractElems)
        articleContent.innerHTML = matchedExtractElems.map((elem, i) => {
          return `<div class="clearly-${contentType} clearly-${contentType}-${i}">${elem.innerHTML}</div>`
        }).join(extractElemsJoiner)
      } else if (matchedExtractElems.length === 0) {
        for (let i = 0; i < articleSelectedElem.childNodes.length; i++) {
          articleContent.innerHTML = articleSelectedElem.outerHTML
        }
      }

      // Prepare article content
      this._prepArticle(articleContent)

      // Use article content directly
      return articleContent
    }

    // We can't grab an article if we don't have a page!
    if (!page) {
      this.log('NO BODY FOUND IN DOCUMENT, ABORT.')
      return null
    }

    var pageCacheHtml = page.innerHTML
    this.log('START', pageCacheHtml)

    while (true) {
      var stripUnlikelyCandidates = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)

      // First, node prepping. Trash nodes that look cruddy (like ones with the
      // class name "comment", etc), and turn divs into P tags where they have been
      // used inappropriately (as in, where they contain no other block level elements.)
      var elementsToScore = []
      var node = root

      // Mark visible to delete
      // var nodes = []
      // while (node) {
      //   if (!this._isRealVisible(node)) {
      //     node.style.display = 'none'
      //   }
      //   nodes.push(node)
      //   node = this._getNextNode(node);
      // }

      // for (var i = nodes.length - 1; i >= 0; i--) {
      //   if (!this._isProbablyVisible(nodes[i])) {
      //     nodes[i].parentNode.removeChild(nodes[i]);
      //   }
      // }
      while (node) {
        const isKeepElem = this.PRESERVE_ELEM_CLASSES.some(cls => node.classList.contains(cls))
        if (isKeepElem) {
          node = this._getNextNode(node, true)
          continue
        }

        var matchString = node.className + ' ' + node.id

        // if (!this._isProbablyVisible(node)) {
        //   this.log('REMOVE NON-VISIBLE', node)
        //   node = this._removeAndGetNext(node)
        //   continue
        // }

        // Check to see if this node is a byline, and remove it if it is.
        if (this._checkByline(node, matchString)) {
          this.log('REMOVE BYLINE', node)
          node = this._removeAndGetNext(node)
          continue
        }

        // Remove unlikely candidates
        if (stripUnlikelyCandidates && !this._hasAncestorTag(node, 'code') && !this._hasAncestorTag(node, 'pre')) {
          if (this.REGEXPS.unlikelyCandidates.test(matchString) &&
            !this.REGEXPS.okMaybeItsACandidate.test(matchString) &&
            node.tagName !== 'BODY' && node.tagName !== 'A' &&
            !this._hasElement(node, 'a') &&
            !this._hasChildTag(node, 'pre', n => n.classList.contains('hljs'))) {
            this.log('REMOVE UNLIKELY CANDIDATE', node)
            node = this._removeAndGetNext(node)
            continue
          }
        }

        // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
        if ((node.tagName === 'DIV' || node.tagName === 'SECTION' || node.tagName === 'HEADER' ||
          node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3' ||
          node.tagName === 'H4' || node.tagName === 'H5' || node.tagName === 'H6') &&
          this._isElementWithoutContent(node) && !this._hasDelayImageContainer(node)) {
          this.log('REMOVE EMPTY CONTENT', node)
          node = this._removeAndGetNext(node)
          continue
        }

        if (this.DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) !== -1) {
          elementsToScore.push(node)
        }

        // Turn all divs that don't have children block level elements into p's
        if (node.tagName === 'DIV' && !this._isDelayImageContainer(node)) {
          // Put phrasing content into paragraphs.
          var p = null
          var childNode = node.firstChild
          while (childNode) {
            var nextSibling = childNode.nextSibling
            if (this._isPhrasingContent(childNode)) {
              if (p !== null) {
                p.appendChild(childNode)
              } else if (!this._isWhitespace(childNode)) {
                p = doc.createElement('p')
                node.replaceChild(p, childNode)
                p.appendChild(childNode)
              }
            } else if (p !== null) {
              while (p.lastChild && this._isWhitespace(p.lastChild)) {
                p.removeChild(p.lastChild)
              }
              p = null
            }
            childNode = nextSibling
          }

          // Sites like http://mobile.slate.com encloses each paragraph with a DIV
          // element. DIVs with only a P element inside and no text content can be
          // safely converted into plain P elements to avoid confusing the scoring
          // algorithm with DIVs with are, in practice, paragraphs.
          if (this._hasSingleTagInsideElement(node, 'P') && this._getLinkDensity(node) < 0.25) {
            var newNode = node.children[0]
            node.parentNode.replaceChild(newNode, node)
            node = newNode
            elementsToScore.push(node)
          } else if (!this._hasChildBlockElement(node)) {
            node = this._setNodeTag(node, 'P')
            elementsToScore.push(node)
          }
        }
        node = this._getNextNode(node)
      }

      // this.log('HTML AFTER BASIC', this._doc.documentElement.innerHTML)

      /**
       * Loop through all paragraphs, and assign a score to them based on how content-y they look.
       * Then add their score to their parent node.
       *
       * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
      **/
      var candidates = []
      this._forEachNode(elementsToScore, function (elementToScore) {
        if (!elementToScore.parentNode || typeof (elementToScore.parentNode.tagName) === 'undefined') { return }

        // If this paragraph is less than 25 characters, don't even count it.
        var innerText = this._getInnerText(elementToScore)
        if (innerText.length < 25) { return }

        // Exclude nodes with no ancestor.
        var ancestors = this._getNodeAncestors(elementToScore, 3)
        if (ancestors.length === 0) { return }

        var contentScore = 0

        // Add a point for the paragraph itself as a base.
        contentScore += 1

        // Add points for any commas within this paragraph.
        contentScore += innerText.split(',').length

        // For every 100 characters in this paragraph, add another point. Up to 3 points.
        contentScore += Math.min(Math.floor(innerText.length / 100), 3)

        // var innerPhotos = this._getInnerPhotos(elementToScore)
        // contentScore += innerPhotos.length * 0.01

        // Initialize and score ancestors.
        this._forEachNode(ancestors, function (ancestor, level) {
          if (!ancestor.tagName || !ancestor.parentNode || typeof (ancestor.parentNode.tagName) === 'undefined') { return }

          if (typeof (ancestor.Clearly) === 'undefined') {
            this._initializeNode(ancestor)
            candidates.push(ancestor)
          }

          // Node score divider:
          // - parent:             1 (no division)
          // - grandparent:        2
          // - great grandparent+: ancestor level * 3
          if (level === 0) { var scoreDivider = 1 } else if (level === 1) { scoreDivider = 2 } else { scoreDivider = level * 3 }
          ancestor.Clearly.contentScore += contentScore / scoreDivider
        })
      })

      // After we've calculated scores, loop through all of the possible
      // candidate nodes we found and find the one with the highest score.
      var topCandidates = []
      for (var c = 0, cl = candidates.length; c < cl; c += 1) {
        var candidate = candidates[c]

        // Scale the final candidates score based on link density. Good content
        // should have a relatively small link density (5% or less) and be mostly
        // unaffected by this operation.
        var candidateScore = candidate.Clearly.contentScore * (1 - this._getLinkDensity(candidate))
        candidate.Clearly.contentScore = candidateScore

        // this.log('CANDIDATE SCORE', candidateScore, candidate)

        for (var t = 0; t < this._nbTopCandidates; t++) {
          var aTopCandidate = topCandidates[t]

          if (!aTopCandidate || candidateScore > aTopCandidate.Clearly.contentScore) {
            topCandidates.splice(t, 0, candidate)
            if (topCandidates.length > this._nbTopCandidates) {
              this.log('Remove topCandidate:', candidateScore, aTopCandidate.Clearly.contentScore, topCandidates.pop())
            }
            break
          }
        }
      }

      var topCandidate = topCandidates[0] || null
      var neededToCreateTopCandidate = false
      var parentOfTopCandidate

      // If we still have no top candidate, just use the body as a last resort.
      // We also have to copy the body node so it is something we can modify.
      if (topCandidate === null || topCandidate.tagName === 'BODY') {
        // Move all of the page's children into topCandidate
        topCandidate = doc.createElement('DIV')
        neededToCreateTopCandidate = true
        // Move everything (not just elements, also text nodes etc.) into the container
        // so we even include text directly in the body:
        var kids = page.childNodes
        while (kids.length) {
          this.log('THROW CHILD', kids[0])
          topCandidate.appendChild(kids[0])
        }

        page.appendChild(topCandidate)
        this._initializeNode(topCandidate)
      } else if (topCandidate) {
        // Find a better top candidate node if it contains (at least three) nodes which belong to `topCandidates` array
        // and whose scores are quite closed with current `topCandidate` node.
        var alternativeCandidateAncestors = []
        for (var i = 1; i < topCandidates.length; i++) {
          if (topCandidates[i].Clearly.contentScore / topCandidate.Clearly.contentScore >= 0.75) {
            alternativeCandidateAncestors.push(this._getNodeAncestors(topCandidates[i]))
          }
        }
        var MINIMUM_TOPCANDIDATES = 3
        if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
          parentOfTopCandidate = topCandidate.parentNode
          while (parentOfTopCandidate && parentOfTopCandidate.tagName !== 'BODY') {
            var listsContainingThisAncestor = 0
            for (var ancestorIndex = 0; ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
              listsContainingThisAncestor += Number(alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate))
            }
            if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
              topCandidate = parentOfTopCandidate
              break
            }
            parentOfTopCandidate = parentOfTopCandidate.parentNode
          }
        }
        if (!topCandidate.Clearly) {
          this._initializeNode(topCandidate)
        }

        // Because of our bonus system, parents of candidates might have scores
        // themselves. They get half of the node. There won't be nodes with higher
        // scores than our topCandidate, but if we see the score going *up* in the first
        // few steps up the tree, that's a decent sign that there might be more content
        // lurking in other places that we want to unify in. The sibling stuff
        // below does some of that - but only if we've looked high enough up the DOM
        // tree.
        parentOfTopCandidate = topCandidate.parentNode
        var lastScore = topCandidate.Clearly.contentScore
        // The scores shouldn't get too low.
        var scoreThreshold = lastScore / 3
        while (parentOfTopCandidate && parentOfTopCandidate.tagName !== 'BODY') {
          if (!parentOfTopCandidate.Clearly) {
            parentOfTopCandidate = parentOfTopCandidate.parentNode
            continue
          }
          var parentScore = parentOfTopCandidate.Clearly.contentScore
          if (parentScore < scoreThreshold) { break }
          if (parentScore > lastScore) {
            // Alright! We found a better parent to use.
            topCandidate = parentOfTopCandidate
            break
          }
          lastScore = parentOfTopCandidate.Clearly.contentScore
          parentOfTopCandidate = parentOfTopCandidate.parentNode
        }

        // If the top candidate is the only child, use parent instead. This will help sibling
        // joining logic when adjacent content is actually located in parent's sibling node.
        parentOfTopCandidate = topCandidate.parentNode
        while (parentOfTopCandidate.tagName !== 'BODY' && parentOfTopCandidate.children.length === 1) {
          topCandidate = parentOfTopCandidate
          parentOfTopCandidate = topCandidate.parentNode
        }
        if (!topCandidate.Clearly) {
          this._initializeNode(topCandidate)
        }
      }

      // Now that we have the top candidate, look through its siblings for content
      // that might also be related. Things like preambles, content split by ads
      // that we removed, etc.
      let articleContent = doc.createElement('DIV')
      if (isPaging) { articleContent.id = 'clearly-content' }

      var siblingScoreThreshold = Math.max(10, topCandidate.Clearly.contentScore * 0.2)
      // Keep potential top candidate's parent node to try to get text direction of it later.
      parentOfTopCandidate = topCandidate.parentNode
      var siblings = parentOfTopCandidate.children

      for (var s = 0, sl = siblings.length; s < sl; s++) {
        var sibling = siblings[s]
        var append = false

        this.log('SIBLING', sibling, sibling.Clearly ? ('with score ' + sibling.Clearly.contentScore) : '')
        this.log('SIBLING SCORE', sibling.Clearly ? sibling.Clearly.contentScore : 'Unknown', topCandidate)

        if (sibling === topCandidate) {
          append = true
        } else {
          var contentBonus = 0

          // Give a bonus if sibling nodes and top candidates have the example same classname
          if (sibling.className === topCandidate.className && topCandidate.className !== '') { contentBonus += topCandidate.Clearly.contentScore * 0.2 }

          if (sibling.Clearly &&
            ((sibling.Clearly.contentScore + contentBonus) >= siblingScoreThreshold)) {
            append = true
          } else if (sibling.nodeName === 'P') {
            var linkDensity = this._getLinkDensity(sibling)
            var nodeContent = this._getInnerText(sibling)
            var nodeLength = nodeContent.length

            if (nodeLength > 80 && linkDensity < 0.25) {
              append = true
            } else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 &&
              nodeContent.search(/\.( |$)/) !== -1) {
              append = true
            } else if (['FIGURE', 'PICTURE'].includes(sibling.nodeName) && this._hasDelayImageContainer(sibling)) {
              append = true
            }
          }
        }

        if (append) {
          this.log('SIBLING APPEND', sibling)

          if (this.ALTER_TO_DIV_EXCEPTIONS.indexOf(sibling.nodeName) === -1) {
            // We have a node that isn't a common block level element, like a form or td tag.
            // Turn it into a div so it doesn't get filtered out later by accident.
            this.log('SIBLING ALTER', sibling, 'to div.')
            sibling = this._setNodeTag(sibling, 'DIV')
          }

          articleContent.appendChild(sibling)
          // siblings is a reference to the children array, and
          // sibling is removed from the array when we call appendChild().
          // As a result, we must revisit this index since the nodes
          // have been shifted.
          s -= 1
          sl -= 1
        }
      }

      this.log('HTML AFTER CLEAN', articleContent.cloneNode(true))
      // So we have all of the content that we need. Now we clean it up for presentation.
      this._prepArticle(articleContent)
      this.log('HTML AFTER PREP', articleContent.cloneNode(true))

      if (neededToCreateTopCandidate) {
        // We already created a fake div thing, and there wouldn't have been any siblings left
        // for the previous loop, so there's no point trying to create a new div, and then
        // move all the children over. Just assign IDs and class names here. No need to append
        // because that already happened anyway.
        topCandidate.id = 'clearly-page-1'
        topCandidate.className = 'clearly-page'
      } else {
        var div = doc.createElement('DIV')
        div.id = 'clearly-page-1'
        div.className = 'clearly-page'
        var children = articleContent.childNodes
        while (children.length) {
          div.appendChild(children[0])
        }
        articleContent.appendChild(div)
      }

      this.log('HTML AFTER PAGING', articleContent.cloneNode(true))

      var parseSuccessful = true

      // Now that we've gone through the full algorithm, check to see if
      // we got any meaningful content. If we didn't, we may need to re-run
      // grabArticle with different flags set. This gives us a higher likelihood of
      // finding the content, and the sieve approach gives us a higher likelihood of
      // finding the -right- content.
      var textLength = this._getInnerText(articleContent, true).length
      if (textLength < this._charThreshold) {
        parseSuccessful = false
        page.innerHTML = pageCacheHtml

        if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
          this._removeFlag(this.FLAG_STRIP_UNLIKELYS)
          this._attempts.push({ articleContent: articleContent, textLength: textLength })
        } else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
          this._removeFlag(this.FLAG_WEIGHT_CLASSES)
          this._attempts.push({ articleContent: articleContent, textLength: textLength })
        } else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
          this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY)
          this._attempts.push({ articleContent: articleContent, textLength: textLength })
        } else {
          this._attempts.push({ articleContent: articleContent, textLength: textLength })
          // No luck after removing flags, just return the longest text we found during the different loops
          this._attempts.sort(function (a, b) {
            return a.textLength < b.textLength
          })

          // But first check if we actually have something
          if (!this._attempts[0].textLength) {
            this.log('MAX TRIES LIMIT')
            return null
          }

          articleContent = this._attempts[0].articleContent
          parseSuccessful = true
        }
      }

      if (parseSuccessful) {
        // Find out text direction from ancestors of final top candidate.
        var ancestors = [parentOfTopCandidate, topCandidate].concat(this._getNodeAncestors(parentOfTopCandidate))
        this._someNode(ancestors, function (ancestor) {
          if (!ancestor.tagName) { return false }
          var articleDir = ancestor.getAttribute('dir')
          if (articleDir) {
            this._articleDir = articleDir
            return true
          }
          return false
        })
        return articleContent
      }
    }
  },

  /**
   * Replace no script to img if img not loadable
   *
   * @param {Element} node
   */
  _cleanNoscript (node) {
    // 优化懒加载没有图片的问题
    var noscripts = node.getElementsByTagName('noscript')
    this._forEachNode(noscripts, (noscript) => {
      var noscriptContent = noscript.textContent.trim()
      this.log('check noscript', noscriptContent)
      if (!noscriptContent.startsWith('<img ')) return
      const parentNode = noscript.parentNode
      if (!noscript.previousSibling) return

      if (noscript.previousSibling.tagName === 'IMG' && (!noscript.previousSibling.getAttribute('src') || !noscript.previousSibling.getAttribute('src').startsWith('http'))) {
        const newImg = document.createElement('span')
        newImg.innerHTML = noscriptContent
        parentNode.replaceChild(newImg, noscript.previousSibling)
        parentNode.removeChild(noscript)
        this.log('replace noscript', newImg, noscript, noscript.previousSibling)
      }
    })

    this._clean(node, 'noscript')
  },

  /**
   * Check whether the input string could be a byline.
   * This verifies that the input is a string, and that the length
   * is less than 100 chars.
   *
   * @param possibleByline {string} - a string to check whether its a byline.
   * @return Boolean - whether the input string is a byline.
   */
  _isValidByline: function (byline) {
    if (typeof byline === 'string' || byline instanceof String) {
      byline = String(byline || '').trim()
      return (byline.length > 0) && (byline.length < 100)
    }
    return false
  },

  /**
   * Attempts to get excerpt and byline metadata for the article.
   *
   * @return Object with optional "excerpt" and "byline" properties
   */
  _getArticleMetadata: function () {
    var metadata = {}
    var values = {}
    var metaElements = this._doc.getElementsByTagName('meta')

    // property is a space-separated list of values
    var propertyPattern = /\s*(dc|dcterm|og|twitter)\s*:\s*(author|creator|description|title)\s*/gi

    // name is a single value
    var namePattern = /^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[.:]\s*)?(author|creator|description|title)\s*$/i

    // Find description tags.
    this._forEachNode(metaElements, function (element) {
      var elementName = element.getAttribute('name')
      var elementProperty = element.getAttribute('property')
      var content = element.getAttribute('content')
      var matches = null
      var name = null

      if (elementProperty) {
        matches = elementProperty.match(propertyPattern)
        if (matches) {
          for (var i = matches.length - 1; i >= 0; i--) {
            // Convert to lowercase, and remove any whitespace
            // so we can match below.
            name = matches[i].toLowerCase().replace(/\s/g, '')
            // multiple authors
            values[name] = String(content || '').trim()
          }
        }
      }
      if (!matches && elementName && namePattern.test(elementName)) {
        name = elementName
        if (content) {
          // Convert to lowercase, remove any whitespace, and convert dots
          // to colons so we can match below.
          name = name.toLowerCase().replace(/\s/g, '').replace(/\./g, ':')
          values[name] = String(content || '').trim()
        }
      }
    })

    // get title
    metadata.title = values['dc:title'] ||
      values['dcterm:title'] ||
      values['og:title'] ||
      values['weibo:article:title'] ||
      values['weibo:webpage:title'] ||
      values.title ||
      values['twitter:title']

    if (!metadata.title) {
      metadata.title = this._getArticleTitle()
    }

    // get author
    metadata.byline = values['dc:creator'] ||
      values['dcterm:creator'] ||
      values.author

    // get description
    metadata.excerpt = values['dc:description'] ||
      values['dcterm:description'] ||
      values['og:description'] ||
      values['weibo:article:description'] ||
      values['weibo:webpage:description'] ||
      values.description ||
      values['twitter:description']

    return metadata
  },

  _cleanExcludes (doc) {
    if (this.websiteConfig && this.websiteConfig.excludeElems) {
      this.log('clean excludes', this.websiteConfig.excludeElems)
      this._removeNodes(doc.querySelectorAll(this.websiteConfig.excludeElems.join(',')))
    }
  },

  /**
   * Removes script tags from the document.
   *
   * @param Element
  **/
  _removeScripts: function (doc) {
    this._removeNodes(doc.getElementsByTagName('script'), function (scriptNode) {
      scriptNode.nodeValue = ''
      scriptNode.removeAttribute('src')
      return true
    })
    // this._removeNodes(doc.getElementsByTagName('noscript'))
  },

  /**
   * Check if this node has only whitespace and a single element with given tag
   * Returns false if the DIV node contains non-empty text nodes
   * or if it contains no element with given tag or more than 1 element.
   *
   * @param Element
   * @param string tag of child element
  **/
  _hasSingleTagInsideElement: function (element, tag) {
    // There should be exactly 1 element child with given tag
    if (element.children.length !== 1 || element.children[0].tagName !== tag) {
      return false
    }

    // And there should be no text nodes with real content
    return !this._someNode(element.childNodes, function (node) {
      return node.nodeType === this.TEXT_NODE &&
        this.REGEXPS.hasContent.test(node.textContent)
    })
  },

  _hasElement: function (element, tag) {
    return !!this._someNode(element.childNodes, function (node) {
      return node.nodeName.toLowerCase() === tag.toLowerCase() && this.REGEXPS.hasContent.test(node.textContent)
    })
  },

  _isElementWithoutContent: function (node) {
    return node.nodeType === this.ELEMENT_NODE &&
      String(node.textContent || '').trim().length === 0 &&
      (node.children.length === 0 ||
        node.children.length === node.getElementsByTagName('br').length + node.getElementsByTagName('hr').length)
  },

  _isDelayImageContainer: function (node) {
    return this.DELAY_IMAGE_ATTRIBUTES.some(function (attr) {
      return node.hasAttribute(attr)
    })
  },

  _hasDelayImageContainer: function (node) {
    var selector = this.DELAY_IMAGE_ATTRIBUTES.map(function (attr) {
      return '[' + attr + ']'
    }).join(',') + ',img'
    return node.querySelectorAll(selector).length > 0
  },

  /**
   * Determine whether element has any children block level elements.
   *
   * @param Element
   */
  _hasChildBlockElement: function (element) {
    return this._someNode(element.childNodes, function (node) {
      return this.DIV_TO_P_ELEMS.indexOf(node.tagName) !== -1 ||
        this._hasChildBlockElement(node)
    })
  },

  /***
   * Determine if a node qualifies as phrasing content.
   * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
  **/
  _isPhrasingContent: function (node) {
    return node.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.indexOf(node.tagName) !== -1 ||
      ((node.tagName === 'A' || node.tagName === 'DEL' || node.tagName === 'INS') &&
        this._everyNode(node.childNodes, this._isPhrasingContent))
  },

  _isWhitespace: function (node) {
    return (node.nodeType === this.TEXT_NODE && String(node.textContent || '').trim().length === 0) ||
      (node.nodeType === this.ELEMENT_NODE && node.tagName === 'BR')
  },

  /**
   * Check has readable content
   *
   * @param {Node} node
   * @returns
   */
  _hasContent: function (node, normalizeSpaces = false, hasPlaceHolder = false) {
    // Check text
    if (this._getInnerText(node, normalizeSpaces)) return true

    const tag = node.tagName.toLowerCase()

    // Check img
    if (this._hasAncestorTag(node, 'pre', -1, node => node.classList.contains('hljs'))) return true
    if (tag === 'img' || node.querySelector('img')) return true
    if (['iframe', 'hr', 'td'].includes(tag) || node.querySelector('iframe,hr')) return true
    if (this._preserveIds && this._preserveIds.includes(node.getAttribute('id'))) return true
    if (tag === 'svg' || this._hasAncestorTag(node, 'svg', -1)) return true

    if (hasPlaceHolder) {
      const placeholderTags = ['br', 'hr']
      if (placeholderTags.includes(tag) || node.querySelector(placeholderTags.join(','))) return true
    }

    return false
  },

  /**
   * Get the inner text of a node - cross browser compatibly.
   * This also strips out any excess whitespace to be found.
   *
   * @param Element
   * @param Boolean normalizeSpaces (default: true)
   * @return string
  **/
  _getInnerText: function (e, normalizeSpaces) {
    normalizeSpaces = (typeof normalizeSpaces === 'undefined') ? true : normalizeSpaces
    var textContent = String(e.textContent || '').trim()

    if (normalizeSpaces) {
      return textContent.replace(this.REGEXPS.normalize, ' ')
    }

    return textContent
  },

  /**
   *
   * @returns
   */
  _getInnerPhotos: function (node) {
    var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
      return '[' + item + ']'
    })).join(',')

    let count = 0
    this._forEachNode(node.querySelectorAll(selectors), (node) => {
      if (this.isRealPhoto(node)) {
        count++
      }
    })

    return count
  },

  /**
   * is Real Photo
   *
   * @param {*} node
   * @returns
   */
  isRealPhoto: function (node) {
    if (this._isDelayImageContainer(node)) {
      return true
    }
    const sizes = this.getPhotoSize(node)
    if (Object.values(sizes).find(size => size > 300)) {
      return true
    }
    return false
  },

  /**
   * Try get photo size
   *
   * @param {Node} node
   * @returns
   */
  getPhotoSize: function (node) {
    var attrs = Object.values(node.attributes).map(a => a.nodeName)
    var widthAttr = attrs.find(a => a.includes('width'))
    var heightAttr = attrs.find(a => a.includes('height'))
    var width = node.clientWidth
    var height = node.clientHeight
    let realWidth = 0
    let realHeight = 0
    let url = node.getAttribute('src') || node.getAttribute('data-src')
    if (url && url.startsWith('data:')) url = null

    // Try to get width and heighdt through attributes
    if (widthAttr) width = parseInt(node.getAttribute(widthAttr), 10) || width
    if (heightAttr) height = parseInt(node.getAttribute(heightAttr), 10) || height

    // SVG viewBox check
    if (node.tagName === 'svg' && node.hasAttribute('viewBox')) {
      const [,, viewBoxWidth, viewBoxHeight] = node.getAttribute('viewBox').split(' ')
      if (viewBoxWidth) width = parseInt(viewBoxWidth, 10)
      if (viewBoxHeight) height = parseInt(viewBoxHeight, 10)
    }

    if (node.hasAttribute('src') || node.complete) {
      realHeight = node.naturalHeight
      realWidth = node.naturalWidth
    }

    const srcset = node.getAttribute('srcset') || node.getAttribute('data-srcset')
    if (srcset) {
      const highRes = srcset.split(', ').reduce((acc, item) => {
        let [url, width] = item.trim().split(' ')
        width = width ? parseInt((width.match(/\d+/) || [0])[0]) : 0
        if (width > acc.width) return { width, url }
        return acc
      }, { width: 0, url: '' })

      if (highRes && highRes.url) {
        width = highRes.width
        url = highRes.url
      }
    }

    return { width, height, realWidth, realHeight, url }
  },

  /**
   * Get the number of times a string s appears in the node e.
   *
   * @param Element
   * @param string - what to split on. Default is ","
   * @return number (integer)
  **/
  _getCharCount: function (e, s) {
    s = s || ','
    return this._getInnerText(e).split(s).length - 1
  },

  /**
   * Remove the style attribute on every e and under.
   * TODO: Test if getElementsByTagName(*) is faster.
   *
   * @param Element
   * @return void
  **/
  _cleanStyles: function (e) {
    if (!e || e.tagName.toLowerCase() === 'svg') { return }

    // Remove `style` and deprecated presentational attributes
    for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
      e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i])
    }

    if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1) {
      e.removeAttribute('width')
      e.removeAttribute('height')
    }

    var cur = e.firstElementChild
    while (cur !== null) {
      this._cleanStyles(cur)
      cur = cur.nextElementSibling
    }
  },

  /**
   * Get the density of links as a percentage of the content
   * This is the amount of text that is inside a link divided by the total text in the node.
   *
   * @param Element
   * @return number (float)
  **/
  _getLinkDensity: function (element) {
    var textLength = this._getInnerText(element).length
    if (textLength === 0) { return 0 }

    var linkLength = 0

    // XXX implement _reduceNodeList?
    this._forEachNode(element.getElementsByTagName('a'), function (linkNode) {
      linkLength += this._getInnerText(linkNode).length
    })

    return linkLength / textLength
  },

  /**
   * Get an elements class/id weight. Uses regular expressions to tell if this
   * element looks good or bad.
   *
   * @param Element
   * @return number (Integer)
  **/
  _getClassWeight: function (e) {
    if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) { return 0 }

    var weight = 0
    var flag = (e.className || '') + ':' + (e.id || '')

    // Look for a special classname
    if (e.className || e.id) {
      var negativeSize = flag.match(this.REGEXPS.negative)
      if (negativeSize) { weight -= 25 * negativeSize.length }

      // this.log('NEGATIVE WEIGHT', weight, flag, e)

      var positiveSize = flag.match(this.REGEXPS.positive)
      if (positiveSize) { weight += 25 * positiveSize.length }

      // this.log('POSITIVE WEIGHT', weight, flag, e)

      if (['SVG', 'IMG'].includes(e.tagName.toUpperCase())) {
        if (this.REGEXPS.imageNegative.test(e.className)) { weight -= 25 }
        if (this.REGEXPS.imagePositive.test(e.className)) { weight += 25 }
      }
    }

    return weight
  },

  /**
   * Clean a node of all elements of type "tag".
   * (Unless it's a youtube/vimeo video. People love movies.)
   *
   * @param Element
   * @param string tag to clean
   * @return void
   **/
  _clean: function (e, tag) {
    var isEmbed = ['object', 'embed', 'iframe', 'video'].indexOf(tag) !== -1

    this.log('_clean', tag, isEmbed)

    this._removeNodes(e.getElementsByTagName(tag), function (element) {
      // Allow youtube and vimeo videos through as people usually want to see those.
      if (isEmbed) {
        var attributeValues = [].map.call(element.attributes, function (attr) {
          return attr.value
        }).join('|')

        // First, check the elements attributes to see if any of them contain youtube or vimeo
        if (this.REGEXPS.videos.test(attributeValues)) { return false }

        // Then check the elements inside this element for the same.
        if (this.REGEXPS.videos.test(element.innerHTML)) { return false }
      }

      return true
    })
  },

  _hasPhotoContainer: function (node) {
    return this._hasAncestorTag(node, 'figure') || this._hasAncestorTag(node, 'picture')
  },

  /**
   * Check if a given node has one of its ancestor tag name matching the
   * provided one.
   * @param  HTMLElement node
   * @param  String      tagName
   * @param  Number      maxDepth
   * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
   * @return Boolean
   */
  _hasAncestorTag: function (node, tagName, maxDepth, filterFn) {
    maxDepth = maxDepth || 3
    tagName = tagName.toUpperCase()
    var depth = 0
    while (node.parentNode) {
      if (maxDepth > 0 && depth > maxDepth) return false
      if (node.parentNode.tagName && node.parentNode.tagName.toUpperCase() === tagName && (!filterFn || filterFn(node.parentNode))) return true
      node = node.parentNode
      depth++
    }
    return false
  },

  _hasChildTag: function (node, tagName, filterFn) {
    const nodes = node.getElementsByTagName(tagName)
    if (!filterFn) return nodes.length > 0
    return Array.prototype.some.call(nodes, filterFn)
  },

  /**
   * Return an object indicating how many rows and columns this table has.
   */
  _getRowAndColumnCount: function (table) {
    var rows = 0
    var columns = 0
    var trs = table.getElementsByTagName('tr')
    for (var i = 0; i < trs.length; i++) {
      var rowspan = trs[i].getAttribute('rowspan') || 0
      if (rowspan) {
        rowspan = parseInt(rowspan, 10)
      }
      rows += (rowspan || 1)

      // Now look for column-related info
      var columnsInThisRow = 0
      var cells = trs[i].getElementsByTagName('td')
      for (var j = 0; j < cells.length; j++) {
        var colspan = cells[j].getAttribute('colspan') || 0
        if (colspan) {
          colspan = parseInt(colspan, 10)
        }
        columnsInThisRow += (colspan || 1)
      }
      columns = Math.max(columns, columnsInThisRow)
    }
    return { rows: rows, columns: columns }
  },

  /**
   * Look for 'data' (as opposed to 'layout') tables, for which we use
   * similar checks as
   * https://dxr.mozilla.org/mozilla-central/rev/71224049c0b52ab190564d3ea0eab089a159a4cf/accessible/html/HTMLTableAccessible.cpp#920
   */
  _markDataTables: function (root) {
    var tables = root.getElementsByTagName('table')
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i]
      var role = table.getAttribute('role')
      if (role === 'presentation') {
        table._isDataTable = false
        continue
      }
      var datatable = table.getAttribute('datatable')
      if (datatable === '0') {
        table._isDataTable = false
        continue
      }
      var summary = table.getAttribute('summary')
      if (summary) {
        table._isDataTable = true
        continue
      }

      var caption = table.getElementsByTagName('caption')[0]
      if (caption && caption.childNodes.length > 0) {
        table._isDataTable = true
        continue
      }

      // If the table has a descendant with any of these tags, consider a data table:
      var dataTableDescendants = ['col', 'colgroup', 'tfoot', 'thead', 'th']
      var descendantExists = function (tag) {
        return !!table.getElementsByTagName(tag)[0]
      }
      if (dataTableDescendants.some(descendantExists)) {
        this.log('DATA TABLE BECAUSE FOUND DATA-Y DESCENDANT')
        table._isDataTable = true
        continue
      }

      // Nested tables indicate a layout table:
      if (table.getElementsByTagName('table')[0]) {
        table._isDataTable = false
        continue
      }

      var sizeInfo = this._getRowAndColumnCount(table)
      if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
        table._isDataTable = true
        continue
      }
      // Now just go by size entirely:
      table._isDataTable = sizeInfo.rows * sizeInfo.columns > 10
    }
  },

  /**
   * Clean an element of all tags of type "tag" if they look fishy.
   * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
   *
   * @return void
   **/
  _cleanImg: function (e) {
    this.log('_cleanImg start', e)
    // TODO: Consider taking into account original contentScore here.
    var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
      return '[' + item + ']'
    })).join(',')

    this._removeNodes(e.querySelectorAll(selectors), (node) => {
      var nodeName = node.nodeName.toUpperCase()

      this.log('_cleanImg check', node)

      // First check if we're in a data table, in which case don't remove us.
      var weight = this._getClassWeight(node)
      var contentScore = 0
      // var xpath = this.getPathTo(node)
      // var realNode = this.getByPath(xpath)

      if (weight + contentScore < 0) {
        this.log('_cleanImg executed with weight', weight, contentScore, node)
        return true
      }

      // is photo container
      // https://www.chromestory.com/2022/04/google-removes-smartlock-feature/
      // if (this._hasPhotoContainer(node)) return false

      // Srcset manage different size image
      if (['IMG', 'SVG'].includes(nodeName)) {
        if (this._root && node.hasAttribute('src')) {
          node = this._root.querySelector(`${node.tagName.toLowerCase()}[src="${node.getAttribute('src')}"]`)
        }

        const { width: photoWidth, height: photoHeight, realHeight, realWidth } = this.getPhotoSize(node)

        let width = Math.max(node.width, node.naturalWidth, node.offsetWidth, photoWidth, realWidth)
        let height = Math.max(node.height, node.naturalHeight, node.offsetHeight, photoHeight, realHeight)
        this.log('_cleanImg photo sizes', width, height, node)

        // SVG viewBox check
        if (nodeName === 'SVG' && node.hasAttribute('viewBox')) {
          const [,, viewBoxWidth, viewBoxHeight] = node.getAttribute('viewBox').split(' ')
          if (viewBoxWidth) width = parseInt(viewBoxWidth, 10)
          if (viewBoxHeight) height = parseInt(viewBoxHeight, 10)
        }

        if (
          (width <= 250 && height <= 250) ||
          (
            (height < 250 || width < 250) && width < 600 && height > 0 &&
            (
              // Too long
              height / width > 4.5 ||
              // Too wide
              height / width < 6
            )
          )
        ) {
          this.log('_cleanImg base sizes', width, height, node)
          return true
        }
      }

      // this.log('_cleanImg ignored', node, xpath, realNode, weight + contentScore, node.outerHTML)

      return false
    })
  },

  /**
   * Clean an element of all tags of type "tag" if they look fishy.
   * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
   *
   * @return void
   **/
  _cleanConditionally: function (e, tag) {
    if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY) || this._ignoreCleanConditionally) { return }

    var isList = tag === 'ul' || tag === 'ol'

    // Gather counts for other typical elements embedded within.
    // Traverse backwards so we can remove nodes at the same time
    // without effecting the traversal.
    //
    // TODO: Consider taking into account original contentScore here.
    this._removeNodes(e.getElementsByTagName(tag), function (node) {
      // First check if we're in a data table, in which case don't remove us.
      const isDataTable = t => t._isDataTable
      const isCode = t => t.classList.contains('hljs')
      const isPicked = t => t._isPicked

      // is data table check
      if (node._isDataTable) return false
      if (this._hasAncestorTag(node, 'table', -1, isDataTable)) return false
      if (this._hasChildTag(node, 'table', isDataTable)) return false

      if (node._isPicked) return false
      if (this._hasChildTag(node, 'span', isPicked)) return false

      if (isCode(node)) return false
      if (this._hasAncestorTag(node, 'pre', -1, isCode)) return false
      if (this._hasChildTag(node, 'pre', isCode)) return false

      var weight = this._getClassWeight(node)
      var contentScore = 0

      if (this._getCharCount(node, ',') < 20) {
        // If there are not very many commas, and the number of
        // non-paragraph elements is more than paragraphs or other
        // ominous signs, remove the element.
        var p = node.getElementsByTagName('p').length || node.getElementsByTagName('td').length || node.getElementsByTagName('th').length
        var img = node.getElementsByTagName('img').length
        var li = node.getElementsByTagName('li').length - 100
        var input = node.getElementsByTagName('input').length
        var embedCount = 0
        var embeds = node.getElementsByTagName('embed')
        for (var ei = 0, il = embeds.length; ei < il; ei += 1) {
          if (!this.REGEXPS.videos.test(embeds[ei].src)) { embedCount += 1 }
        }

        const linkDensity = this._getLinkDensity(node)
        const innerText = this._getInnerText(node)
        const contentLength = innerText.length
        const isImageTooMany = img > 1 && p / img < 0.5
        const isEmptyList = isList && !contentLength && !img
        const isChaosList = !isList && li > p
        const isInputTooMany = input > Math.floor(p / 3)
        const isContentTooShort = !isList && contentLength < 25 && (img === 0 || img > 2)
        const isContentUseLess = !isList && img === 0 && weight < 25 && linkDensity > 0.2
        const isContentIncludeDensityLinks = weight >= 25 && linkDensity > 0.5
        const isEmbedTooMany = (embedCount === 1 && contentLength < 75) || embedCount > 1

        var toRemove = isImageTooMany || isEmptyList || isChaosList || isInputTooMany || isContentTooShort || isContentUseLess || isContentIncludeDensityLinks || isEmbedTooMany

        toRemove && this.log('CLEANCONDITIONALLY BY RULES', { img, isList, contentLength, p, li, linkDensity, weight, embedCount, isImageTooMany, isEmptyList, isChaosList, isInputTooMany, isContentTooShort, isContentUseLess, isContentIncludeDensityLinks, isEmbedTooMany, innerText, isDataTable: node._isDataTable }, node)

        return toRemove
      }

      if (weight + contentScore < 0) {
        this.log('CLEANCONDITIONALLY BY SCORE', weight + contentScore, node)
        return true
      }

      return false
    })
  },

  /**
   * Clean out elements whose id/class combinations match specific string.
   *
   * @param Element
   * @param RegExp match id/class combination.
   * @return void
   **/
  _cleanMatchedNodes: function (e, regex) {
    var endOfSearchMarkerNode = this._getNextNode(e, true)
    var next = this._getNextNode(e)
    while (next && next !== endOfSearchMarkerNode) {
      if (regex.test(next.className + ' ' + next.id)) {
        this.log('REMOVE BY REGEX', regex, next)
        next = this._removeAndGetNext(next)
      } else {
        next = this._getNextNode(next)
      }
    }
  },

  /**
   * Clean out spurious headers from an Element. Checks things like classnames and link density.
   *
   * @param Element
   * @return void
  **/
  _cleanHeaders: function (e) {
    for (var headerIndex = 1; headerIndex < 3; headerIndex += 1) {
      this._removeNodes(e.getElementsByTagName('h' + headerIndex), function (header) {
        // Check header has anchor
        const hasAnchor = this._hasChildTag(header, 'a', a => {
          const href = a.getAttribute('href')
          const isAnchor = href && href.indexOf('#') === 0
          return isAnchor
        })
        if (hasAnchor) return false

        return this._getClassWeight(header) < 0
      })
    }
  },

  _flagIsActive: function (flag) {
    return (this._flags & flag) > 0
  },

  _removeFlag: function (flag) {
    this._flags = this._flags & ~flag
  },

  _isRealVisible: function (node) {
    var style = window.getComputedStyle(node)
    var visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity > 0 && !node.hasAttribute('hidden')
    // this.log('REAL VISIBLE', visible, node)
    return visible
  },

  _isProbablyVisible: function (node) {
    // this.log('PROBABLY VISIBLE', node.style.display, node)
    return (!node.style || node.style.display !== 'none') && !node.hasAttribute('hidden')
  },

  isNodeVisible: function (node) {
    // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
    return (!node.style || node.style.display !== 'none') &&
      !node.hasAttribute('hidden') &&
      // check for "fallback-image" so that wikimedia math images are displayed
      (!node.hasAttribute('aria-hidden') || node.getAttribute('aria-hidden') !== 'true' || (node.className && node.className.indexOf && node.className.indexOf('fallback-image') !== -1))
  },

  /**
   * Decides whether or not the document is reader-able without parsing the whole thing.
   *
   * @return boolean Whether or not we suspect parse() will suceeed at returning an article object.
   */
  isProbablyReaderable: function (doc, options) {
    doc = doc || this._doc

    // For backward compatibility reasons 'options' can either be a configuration object or the function used
    // to determine if a node is visible.
    if (typeof options === 'function') {
      options = { visibilityChecker: options }
    }

    var defaultOptions = { minScore: 20, minContentLength: 140, visibilityChecker: this.isNodeVisible }
    options = Object.assign(defaultOptions, options)

    var nodes = this._doc.querySelectorAll('p, pre, article')

    // Get <div> nodes which have <br> node(s) and append them into the `nodes` variable.
    // Some articles' DOM structures might look like
    // <div>
    //   Sentences<br>
    //   <br>
    //   Sentences<br>
    // </div>
    var brNodes = this._doc.querySelectorAll('div > br')
    if (brNodes.length) {
      var set = new Set(nodes);
      [].forEach.call(brNodes, function (node) {
        set.add(node.parentNode)
      })
      nodes = Array.from(set)
    }

    var score = 0
    // This is a little cheeky, we use the accumulator 'score' to decide what to return from
    // this callback:
    return [].some.call(nodes, (node) => {
      if (!options.visibilityChecker(node)) {
        return false
      }

      var matchString = node.className + ' ' + node.id
      if (this.REGEXPS.unlikelyCandidates.test(matchString) &&
        !this.REGEXPS.okMaybeItsACandidate.test(matchString)) {
        return false
      }

      if (node.matches('li p')) {
        return false
      }

      var textContentLength = node.textContent.trim().length
      if (textContentLength < options.minContentLength) {
        return false
      }

      score += Math.sqrt(textContentLength - options.minContentLength)

      if (score > options.minScore) {
        return true
      }
      return false
    })
  },

  /**
   *  Detect language
   *
   * @param {String} text
   * @returns
   */
  detectLanguage (text, defaultLang) {
    this.log(defaultLang)
    let lang = null
    if (defaultLang && !defaultLang.startsWith('en')) {
      this.log('default', defaultLang)
      lang = defaultLang
    }

    const wordsCount = text.match(this.WORD_REGEX).length

    if (!lang) {
      const latins = ['ro', 'nb', 'sv', 'it', 'es', 'pl', 'de', 'fr']
      const scores = []
      for (const [l, regex] of Object.entries(this.LANG_REGEXPS)) {
      // detect occurances of lang in a word
        const matches = text.match(regex) || []
        const score = matches.length / wordsCount

        this.log(l, score, matches.length, wordsCount)

        if (score) {
          scores[l] = score * (latins.includes(l) ? 5 : 1)
          if (scores[l] > 0.85) {
            lang = l
            continue
          }
        }
      }

      lang = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b)
      this.log(scores)
    }

    return { lang, wordsCount }
  },

  /**
   * Runs Clearly.
   *
   * Workflow:
   *  1. Prep the document by removing script tags, css, etc.
   *  2. Build Clearly's DOM tree.
   *  3. Grab the article content from the current dom tree.
   *  4. Replace the current DOM tree with the new one.
   *  5. Read peacefully.
   *
   * @return void
   **/
  parse: function () {
    // Avoid parsing too large documents, as per configuration option
    if (this._maxElemsToParse > 0) {
      var numTags = this._doc.getElementsByTagName('*').length
      if (numTags > this._maxElemsToParse) {
        throw new Error('Aborting parsing document; ' + numTags + ' elements found')
      }
    }

    var rtl = this._doc.querySelector('html').getAttribute('dir') === 'rtl'
    var htmlLang = String(this._doc.querySelector('html').getAttribute('lang') || 'en-US')
    this._prepDocument()

    // Remove script tags from the document.
    this._removeScripts(this._doc)

    var metadata = this._getArticleMetadata()
    this._articleTitle = metadata.title

    var articleContent = this._grabArticle()
    var articleText = articleContent && articleContent.textContent ? articleContent.textContent.trim() : ''
    if (!articleText || (articleText.length < 100 && articleContent.querySelectorAll('img').length < 2)) return null

    this._postProcessContent(articleContent)

    this.log('HTML PROCESS', articleContent.cloneNode(true))

    var outline = this._buildOutline(articleContent)
    var links = this._buildLinks(articleContent)

    // If we haven't found an excerpt in the article's metadata, use the article's
    // first paragraph as the excerpt. This is used for displaying a preview of
    // the article's content.
    if (!metadata.excerpt) {
      var paragraphs = articleContent.getElementsByTagName('p')
      if (paragraphs.length > 0) {
        metadata.excerpt = String(paragraphs[0].textContent || '').trim()
      }
    }

    const { wordsCount, lang } = this.detectLanguage(articleText, htmlLang)
    this.log('wordsCount', wordsCount, lang)

    var textContent = articleContent.textContent
    const coverPhotoUrlPos = articleContent.innerHTML.indexOf(this._coverUrl)
    var converUrl = this._coverUrl && (coverPhotoUrlPos === -1 || coverPhotoUrlPos > 500) ? this._coverUrl : null
    const readSeconds = wordsCount / 3.5
    return {
      url: articleContent.baseURI,
      title: this._articleTitle,
      coverUrl: converUrl,
      byline: metadata.byline || this._articleByline,
      dir: this._articleDir,
      html: '<article>' + articleContent.innerHTML + '</article>',
      text: textContent,
      length: textContent.length,
      readSeconds,
      readTime: Math.floor(readSeconds / 60) + ':' + String(Math.round(readSeconds % 60)).padStart(2, '0'),
      wordsCount,
      excerpt: metadata.excerpt,
      outline: outline,
      links,
      authorName: this._articleAuthorName,
      domain: new URL(this._doc.baseURI).hostname,
      rtl,
      lang
    }
  }
}

if (typeof module === 'object') {
  module.exports = Clearly
}
