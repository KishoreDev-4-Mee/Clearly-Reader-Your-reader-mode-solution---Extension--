import { s as styleInject, r as register$1, E as EVENT_TYPE, u as useI18n, i as isLogin, d as defineComponent, M as Messenger, m as makeDebug, a as assureLogin, C as CLEARLY_MESSAGE, c as client, b as debug$2, e as computed, f as ref, g as createElementBlock, h as createBaseVNode, w as withDirectives, v as vModelText, j as withKeys, k as withModifiers, F as Fragment, l as renderList, n as unref, o as createTextVNode, t as toDisplayString, p as createCommentVNode, q as onMounted, x as vShow, y as createBlock, z as request, A as uiProvider$1, B as markRaw, D as watch, G as reactive, H as effectScope, I as isRef, J as isReactive, K as toRaw, L as onUnmounted, N as openBlock, O as createApp, P as i18n, Q as setCurrentLang, R as nextTick, S as getCurrentInstance, T as h, U as getCurrentScope, V as onScopeDispose, W as toRefs, X as inject, Y as register } from '../chunks/client-72dd7af9.js';

const debug$1 = makeDebug('PARSE');
// interface Element {
//   Clearly: {
//     contentScore: number
//   }
// }
/**
 * Public constructor.
 * @param {HTMLDocument} doc     The document to parse.
 * @param {Object}       options The options object.
 */
class Clearly {
    FLAG_STRIP_UNLIKELYS = 0x1;
    FLAG_WEIGHT_CLASSES = 0x2;
    FLAG_CLEAN_CONDITIONALLY = 0x4;
    // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
    ELEMENT_NODE = 1;
    TEXT_NODE = 3;
    // Max number of nodes supported by this parser. Default: 0 (no limit)
    DEFAULT_MAX_ELEMS_TO_PARSE = 0;
    // The number of top candidates to consider when analysing how
    // tight the competition is among candidates.
    DEFAULT_N_TOP_CANDIDATES = 5;
    // Element tags to score by default.
    DEFAULT_TAGS_TO_SCORE = 'section,h2,h3,h4,h5,h6,p,td,pre'.toUpperCase().split(',');
    // The default number of chars an article must have in order to return a result
    DEFAULT_CHAR_THRESHOLD = 500;
    // All of the regular expressions in use within Clearly.
    // Defined up here so we don't instantiate them repeatedly in loops.
    REGEXPS = {
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
    };
    PRESERVE_ELEM_CLASSES = ['math', 'hljs'];
    DIV_TO_P_ELEMS = ['A', 'BLOCKQUOTE', 'DL', 'DIV', 'IMG', 'OL', 'P', 'PRE', 'TABLE', 'UL', 'SELECT'];
    ALTER_TO_DIV_EXCEPTIONS = ['DIV', 'ARTICLE', 'SECTION', 'P'];
    PICK_ELEMENTS = {
        'span.katex': ['annotation']
    };
    PRESENTATIONAL_ATTRIBUTES = ['align', 'background', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'frame', 'hspace', 'rules', 'style', 'valign', 'vspace'];
    DEPRECATED_SIZE_ATTRIBUTE_ELEMS = ['TABLE', 'TH', 'TD', 'HR', 'PRE'];
    // The commented out elements qualify as phrasing content but tend to be
    // removed by Clearly when put into paragraphs, so we ignore them here.
    PHRASING_ELEMS = [
        'CANVAS', 'IFRAME',
        // , "SVG", "VIDEO",
        'ABBR', 'AUDIO', 'B', 'BDO', 'BR', 'BUTTON', 'CITE', 'CODE', 'DATA',
        'DATALIST', 'DFN', 'EM', 'EMBED', 'I', 'IMG', 'INPUT', 'KBD', 'LABEL',
        'MARK', 'MATH', 'METER', 'NOSCRIPT', 'OBJECT', 'OUTPUT', 'PROGRESS', 'Q',
        'RUBY', 'SAMP', 'SCRIPT', 'SELECT', 'SMALL', 'SPAN', 'STRONG', 'SUB',
        'SUP', 'TEXTAREA', 'TIME', 'VAR', 'WBR'
    ];
    LANG_REGEXPS = {
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
    };
    WORD_REGEX = /[a-zA-Z-áéíñóúüÁÉÍÑÓÚÜäöüÄÖÜßàèéìíîòóùúÀÈÉÌÍÎÒÓÙÚàâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ]+|[\u4e00-\u9fff]|[\u3400-\u4dbf]|[\u{20000}-\u{2a6df}]|[\u{2a700}-\u{2b73f}]|[\u{2b740}-\u{2b81f}]|[\u{2b820}-\u{2ceaf}]|[\uf900-\ufaff]|[\u3300-\u33ff]|[\ufe30-\ufe4f]|[\uf900-\ufaff]|[\u{2f800}-\u{2fa1f}]|[\u3131-\uD79D]|[ぁ-ゔ]|[ァ-ヴー]|[々〆〤ヶ]|[аАбБвВгГдДеЕёЁжЖзЗиИйЙкКлЛмМнНоОпПрРсСтТуУфФхХцЦчЧшШщЩъЪыЫьЬэЭюЮяЯ]+|[\u0621-\u064A\u0660-\u0669]+/gu;
    DELAY_IMAGE_ATTRIBUTES = ['data-src', 'datasrc', 'data-src', 'data-hi-res-src', 'data-original-src', 'data-origin', 'data-origin-src', 'data-lazyload', 'data-lazyload-src', 'data-lazy-src', 'data-original', 'data-src-medium', 'data-src-large', 'data-src-mini', '_src', 'nitro-lazy-src'];
    // These are the classes that Clearly sets itself.
    CLASSES_TO_PRESERVE = ['page', 'hljs', /^hljs-.*/, /^clearly-.*/];
    WEBSITE_CONFIG;
    _doc;
    _classesToPreserve;
    _preserveIds;
    _outlineIndex;
    websiteConfig;
    _articleAuthorName;
    _articleTitle;
    _articleByline;
    _coverUrl;
    _ignoreCleanConditionally;
    _nbTopCandidates;
    _charThreshold;
    _attempts;
    _root;
    _flags;
    _maxElemsToParse;
    _articleDir;
    _debug;
    constructor(doc, options, config) {
        // In some older versions, people passed a URI as the first argument. Cope:
        if (options && options.documentElement) {
            doc = options;
            options = arguments[2];
        }
        else if (!doc || !doc.documentElement) {
            throw new Error('First argument to Clearly constructor should be a document object.');
        }
        options = options || {};
        const self = this;
        this._doc = doc;
        this._articleTitle = null;
        this._articleByline = null;
        this._articleAuthorName = null;
        this._articleDir = null;
        this._attempts = [];
        this._outlineIndex = 0;
        // Process extra config
        if (config && typeof config === 'object') {
            Object.assign(this, config);
            const regexPrefixies = ['REGEXPS', 'LANG_REGEXPS'];
            regexPrefixies.forEach(prop => {
                const value = self[prop];
                Object.keys(value).forEach(key => {
                    const regex = value[key];
                    if (typeof regex === 'string') {
                        const matched = regex.match(/^\/(.*)\/([a-z]*)$/);
                        if (matched) {
                            value[key] = new RegExp(matched[1], matched[2]);
                        }
                    }
                });
            });
        }
        // Configurable options
        this._debug = !!options.debug;
        this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
        this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
        this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
        this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || []);
        this._root = options.root;
        this.websiteConfig = {};
        // Start with all flags set
        this._flags = this.FLAG_STRIP_UNLIKELYS |
            this.FLAG_WEIGHT_CLASSES |
            this.FLAG_CLEAN_CONDITIONALLY;
        // Control whether log messages are sent to the console
    }
    log(...args) {
        debug$1(...args);
    }
    /**
     * Run any post-process modifications to article content as necessary.
     *
     * @param Element
     * @return void
    **/
    _postProcessContent(articleContent) {
        this.log('_postProcessContent', articleContent);
        // Clearly cannot open relative uris so we convert them to absolute uris.
        this._fixRelativeUris(articleContent);
        // Remove classes.
        // this.log('postProcessContent', articleContent.innerHTML)
        this._processAttributes(articleContent);
        // Remove empty
        this._removeEmptyNodes(articleContent);
        // Remove duplicate
        this._removeDuplicates(articleContent);
    }
    getWebsiteConfig(url) {
        if (!this.WEBSITE_CONFIG)
            return {};
        const key = Object.keys(this.WEBSITE_CONFIG).find(k => {
            if (k.includes('*')) {
                const regex = new RegExp(k.replace('/', '\\/').replace('.', '\\.').replace('*', '.+?'));
                return regex.test(url);
            }
            return url.includes(k);
        });
        return this.WEBSITE_CONFIG[key || ''] || {};
    }
    /**
     * Remove duplicate elements
     */
    _removeDuplicates(articleContent) {
        // TODO: Consider taking into account original contentScore here.
        var imgUrls = [];
        this._removeNodes(articleContent.querySelectorAll('img,svg'), (node) => {
            var url = node.getAttribute('src');
            if (url && imgUrls.includes(url) && !url.startsWith('data:')) {
                // Remove full figure
                if (this._hasAncestorTag(node, 'figure', 3)) {
                    const ancestors = this._getNodeAncestors(node, 3);
                    for (var i = 0; i < ancestors.length; i++) {
                        if (ancestors[i].tagName === 'FIGURE') {
                            this.log('_removeDuplicates start', ancestors[i].outerHTML);
                            ancestors[i].parentNode?.removeChild(ancestors[i]);
                            break;
                        }
                    }
                }
                return true;
            }
            imgUrls.push(url || '');
            return false;
        });
    }
    /**
     * Remove empty nodes
     *
     * @param {*} node
     */
    _removeEmptyNodes(article) {
        let node = this._getNextNode(article);
        while (node) {
            if (!this._hasContent(node, false, true)) {
                this.log('remove empty', node);
                node = this._removeAndGetNext(node);
            }
            else {
                node = this._getNextNode(node);
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
    }
    getPathTo(node) {
        if (node.id !== '') {
            return 'id("' + node.id + '")';
        }
        if (node === document.body) {
            return node.tagName;
        }
        var ix = 0;
        var siblings = node.parentNode?.childNodes || [];
        for (var i = 0; i < siblings.length; i++) {
            var sibling = siblings[i];
            if (sibling === node) {
                return this.getPathTo(node.parentNode) + '/' + node.tagName + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
                ix++;
            }
        }
    }
    getByPath(path) {
        return document.evaluate(path, document, null, window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }
    _getCoverPhoto(..._) {
        var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
            return '[' + item + ']';
        })).join(',');
        let maxWidth = 0;
        let maxHeight = 0;
        let maxImg = '';
        this.log('_getCoverPhoto', selectors);
        this._forEachNode(this._doc.querySelectorAll(selectors), (node) => {
            const { width: photoWidth, height: photoHeight, realHeight, realWidth, url } = this.getPhotoSize(node);
            const width = Math.max(node.width, node.naturalWidth, node.offsetWidth, photoWidth, realWidth);
            const height = Math.max(node.height, node.naturalHeight, node.offsetHeight, photoHeight, realHeight);
            this.log('_getCoverPhoto', width, realWidth, node);
            if (width > maxWidth) {
                maxWidth = width;
                maxHeight = height;
                maxImg = url;
            }
        });
        if ((maxWidth > 500 || maxHeight > 300) && maxImg !== null) {
            if (maxImg.startsWith('//')) {
                maxImg = this._doc.baseURI.split(':').shift() + ':' + maxImg;
            }
            else if (!maxImg.startsWith('http') && !maxImg.startsWith('data:')) {
                maxImg = this._toAbsoluteURI(maxImg);
            }
            return maxImg;
        }
        return undefined;
    }
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
    _removeNodes(nodeList, filterFn) {
        for (var i = nodeList.length - 1; i >= 0; i--) {
            var node = nodeList[i];
            var parentNode = node.parentNode;
            if (parentNode) {
                if (!filterFn || filterFn.call(this, node, i, nodeList)) {
                    this.log('_removeNodes', node, filterFn);
                    parentNode.removeChild(node);
                }
            }
        }
    }
    /**
     * Iterates over a NodeList, and calls _setNodeTag for each node.
     *
     * @param NodeList nodeList The nodes to operate on
     * @param String newTagName the new tag name to use
     * @return void
     */
    _replaceNodeTags(nodeList, newTagName) {
        for (var i = nodeList.length - 1; i >= 0; i--) {
            var node = nodeList[i];
            this._setNodeTag(node, newTagName);
        }
    }
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
    _forEachNode(nodeList, fn) {
        Array.prototype.forEach.call(nodeList, fn, this);
    }
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
    _someNode(nodeList, fn) {
        return Array.prototype.some.call(nodeList, fn, this);
    }
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
    _everyNode(nodeList, fn) {
        return Array.prototype.every.call(nodeList, fn, this);
    }
    /**
     * Concat all nodelists passed as arguments.
     *
     * @return ...NodeList
     * @return Array
     */
    _concatNodeLists(..._) {
        var slice = Array.prototype.slice;
        var args = slice.call(arguments);
        var nodeLists = args.map(function (list) {
            return slice.call(list);
        });
        return Array.prototype.concat.apply([], nodeLists);
    }
    _getAllNodesWithTag(node, tagNames) {
        if (node.querySelectorAll) {
            return node.querySelectorAll(tagNames.join(','));
        }
        return [].concat.apply([], tagNames.map((tag) => {
            const collection = node.getElementsByTagName(tag);
            const arr = Array.isArray(collection) ? collection : Array.from(collection);
            return arr;
        }));
    }
    /**
     * Removes the class="" attribute from every element in the given
     * subtree, except those that match CLASSES_TO_PRESERVE and
     * the classesToPreserve array from the options object.
     *
     * @param Element
     * @return void
     */
    _processAttributes(node) {
        var className = (node.getAttribute('class') || '')
            .split(/\s+/)
            .filter((cls) => {
            return this._classesToPreserve.indexOf(cls) !== -1 || this._classesToPreserve.some((i) => i instanceof RegExp && i.test(cls));
        })
            .join(' ');
        if (['P', 'DIV', 'SPAN', 'STRONG', 'TABLE', 'UL', 'LI', 'ARTICLE', 'MAIN'].includes(node.tagName)) {
            this._cleanAttributes(node, ['data-tex']);
        }
        if (node.tagName === 'IMG') {
            this._cleanAttributes(node, ['src', 'alt', 'srcset']);
            // node.setAttribute('crossorigin', 'anonymous')
        }
        if (node.tagName === 'A') {
            const href = node.getAttribute('href');
            if (href && href.startsWith('#')) {
                if (!this._preserveIds)
                    this._preserveIds = [];
                this._preserveIds.push(href.slice(1));
            }
            this._cleanAttributes(node, ['href', 'title', 'target', 'rel']);
        }
        if (className) {
            node.setAttribute('class', className);
        }
        else {
            node.removeAttribute('class');
        }
        for (node = node.firstElementChild; node; node = node.nextElementSibling) {
            this._processAttributes(node);
        }
    }
    /**
     * Clean attributes
     *
     * @param {Element} node
     * @param {Array} keeps
     */
    _cleanAttributes(node, keeps) {
        this.log('_cleanAttributes', node.tagName, keeps);
        var i = node.attributes.length;
        const id = node.getAttribute('id');
        if (id && this._preserveIds && this._preserveIds.includes(id)) {
            keeps = keeps || [];
            keeps.push('id');
        }
        while (i--) {
            var attr = node.attributes[i];
            if (!keeps || !keeps.includes(attr.name))
                node.removeAttribute(attr.name);
        }
    }
    /**
     * Build tree
     *
     * @param Element
     * @return void
     */
    _buildOutline(node) {
        var sections = node.querySelectorAll('h1,h2,h3,h4,h5,h6');
        var outline = [];
        this._forEachNode(sections, (section) => {
            section.setAttribute('class', 'ros');
            let id = section.getAttribute('id');
            if (!id) {
                id = 'ros-' + (this._outlineIndex + 1);
                section.setAttribute('id', id);
            }
            outline.push({
                id: id,
                level: parseInt(section.tagName.substr(1), 10),
                type: section.tagName.toLowerCase(),
                title: section.textContent
            });
            this._outlineIndex++;
        });
        return outline;
    }
    /**
     * Build Links
     *
     * @param Element
     * @return void
     */
    _buildLinks(node) {
        var sections = node.querySelectorAll('a');
        var links = [];
        this._forEachNode(sections, (node) => {
            const url = node.getAttribute('href');
            const title = (node.textContent && node.textContent.trim()) || '';
            if (!url || !title ||
                // Pure link
                title.startsWith('http') ||
                // Not url
                !url.startsWith('http') ||
                // So short
                title.length <= 12 ||
                // Already exists
                links.some(link => link.url.toLowerCase() === url.toLowerCase()))
                return;
            const textContent = node.textContent || '';
            links.push({
                title: textContent.trim().replace(/[\u00A0-\u9999<>&]/g, (i) => {
                    return '&#' + i.charCodeAt(0) + ';';
                }),
                type: 'text',
                url,
                alt: node.getAttribute('alt')
            });
        });
        return links;
    }
    _toAbsoluteURI(uri) {
        var baseURI = this._doc.baseURI;
        var documentURI = this._doc.documentURI;
        // Leave hash links alone if the base URI matches the document URI:
        if (baseURI === documentURI && uri.charAt(0) === '#') {
            return uri;
        }
        // Otherwise, resolve against base URI:
        try {
            return new URL(uri, baseURI).href;
        }
        catch (ex) {
            // Something went wrong, just return the original:
        }
        return uri;
    }
    /**
     * Converts each <a> and <img> uri in the given element to an absolute URI,
     * ignoring #ref URIs.
     *
     * @param Element
     * @return void
     */
    _fixRelativeUris(articleContent) {
        var links = articleContent.getElementsByTagName('a');
        this._forEachNode(links, (link) => {
            var href = link.getAttribute('href');
            if (href) {
                // Replace links with javascript: URIs with text content, since
                // they won't work after scripts have been removed from the page.
                if (href.indexOf('javascript:') === 0) {
                    var text = this._doc.createTextNode(link.textContent);
                    link.parentNode && link.parentNode.replaceChild(text, link);
                }
                else {
                    link.setAttribute('href', this._toAbsoluteURI(href));
                }
            }
        });
        var imgs = articleContent.querySelectorAll('img,picture>source');
        this._forEachNode(imgs, (img) => {
            var src = img.getAttribute('src');
            if (src && !src.startsWith('data:')) {
                img.setAttribute('src', this._toAbsoluteURI(src));
                img.setAttribute('crossorigin', '*');
            }
            for (const attr of this.DELAY_IMAGE_ATTRIBUTES) {
                const value = img.getAttribute(attr);
                if (value && !value.startsWith('data:') && (!src || src.startsWith('data:'))) {
                    img.setAttribute('src', this._toAbsoluteURI(value));
                    img.setAttribute('crossorigin', '*');
                }
            }
            const imgDataCellOptions = img.getAttribute('data-cell-options');
            if (imgDataCellOptions) {
                try {
                    const imgCellData = JSON.parse(imgDataCellOptions);
                    if (imgCellData && imgCellData.src) {
                        img.setAttribute('src', this._toAbsoluteURI(imgCellData.src));
                        img.setAttribute('crossorigin', '*');
                    }
                    this.log('imgDataCellOptions process ok', img, imgCellData.src);
                }
                catch (e) {
                    this.log('imgDataCellOptions parse error', e);
                }
            }
            if (img.hasAttribute('data-srcset') && !img.hasAttribute('srcset')) {
                img.setAttribute('srcset', img.getAttribute('data-srcset') || '');
            }
            // Src set url fixed
            const srcset = img.getAttribute('srcset');
            if (srcset) {
                img.setAttribute('srcset', srcset.split(', ').map(src => {
                    const arr = String(src).trim().split(' ');
                    if (arr[0].startsWith('http') || arr[0].startsWith('data:'))
                        return src;
                    arr[0] = this._toAbsoluteURI(arr[0]);
                    return arr.join(' ');
                }).join(', '));
            }
        });
        // For zhihu div.data-src
        var imgWrappers = articleContent.querySelectorAll('div[data-src],span[data-original]');
        this._forEachNode(imgWrappers, function (imgWrapper) {
            // @desc data-orignal https://www.theverge.com/2018/11/27/18112685/playstation-classic-review-3d-games
            var src = imgWrapper.getAttribute('data-src') || imgWrapper.getAttribute('data-original');
            if (!imgWrapper.innerHTML && src) {
                var newImg = document.createElement('img');
                newImg.src = src;
                newImg.crossOrigin = '*';
                imgWrapper.parentNode && imgWrapper.parentNode.replaceChild(newImg, imgWrapper);
            }
        });
    }
    /**
     * Get the article title as an H1.
     *
     * @return void
     **/
    _getArticleTitle() {
        // Website config support
        if (this.websiteConfig.titleElem) {
            const titleElem = document.querySelector(this.websiteConfig.titleElem);
            if (titleElem) {
                return titleElem.innerText;
            }
        }
        var doc = this._doc;
        var curTitle = '';
        var origTitle = '';
        try {
            curTitle = origTitle = String(doc.title || '').trim();
            // If they had an element with id "title" in their HTML
            if (typeof curTitle !== 'string') {
                curTitle = origTitle = this._getInnerText(doc.getElementsByTagName('title')[0]);
            }
        }
        catch (e) { /* ignore exceptions setting the title. */ }
        var titleHadHierarchicalSeparators = false;
        function wordCount(str) {
            return str.split(/\s+/).length;
        }
        // If there's a separator in the title, first remove the final part
        if ((/ [|\-\\/>»] /).test(curTitle)) {
            titleHadHierarchicalSeparators = / [\\/>»] /.test(curTitle);
            curTitle = origTitle.replace(/(.*)[|\-\\/>»] .*/gi, '$1');
            // If the resulting title is too short (3 words or fewer), remove
            // the first part instead:
            if (wordCount(curTitle) < 3) {
                curTitle = origTitle.replace(/[^|\-\\/>»]*[|\-\\/>»](.*)/gi, '$1');
            }
        }
        else if (curTitle.indexOf(': ') !== -1) {
            // Check if we have an heading containing this exact string, so we
            // could assume it's the full title.
            var headings = this._concatNodeLists(doc.getElementsByTagName('h1'), doc.getElementsByTagName('h2'));
            var trimmedTitle = String(curTitle || '').trim();
            var match = this._someNode(headings, function (heading) {
                return String(heading.textContent || '').trim() === trimmedTitle;
            });
            // If we don't, let's extract the title out of the original title string.
            if (!match) {
                curTitle = origTitle.substring(origTitle.lastIndexOf(':') + 1);
                // If the title is now too short, try the first colon instead:
                if (wordCount(curTitle) < 3) {
                    curTitle = origTitle.substring(origTitle.indexOf(':') + 1);
                    // But if we have too many words before the colon there's something weird
                    // with the titles and the H tags so let's just use the original title instead
                }
                else if (wordCount(origTitle.substr(0, origTitle.indexOf(':'))) > 5) {
                    curTitle = origTitle;
                }
            }
        }
        else if (curTitle.length > 150 || curTitle.length < 15) {
            var hOnes = doc.getElementsByTagName('h1');
            if (hOnes.length === 1) {
                curTitle = this._getInnerText(hOnes[0]);
            }
        }
        curTitle = String(curTitle || '').trim();
        // If we now have 4 words or fewer as our title, and either no
        // 'hierarchical' separators (\, /, > or ») were found in the original
        // title or we decreased the number of words by more than 1 word, use
        // the original title.
        var curTitleWordCount = wordCount(curTitle);
        if (curTitleWordCount <= 4 &&
            (!titleHadHierarchicalSeparators ||
                curTitleWordCount !== wordCount(origTitle.replace(/[|\-\\/>»]+/g, '')) - 1)) {
            curTitle = origTitle;
        }
        return curTitle;
    }
    /**
     * Prepare the HTML document for Clearly to scrape it.
     * This includes things like stripping javascript, CSS, and handling terrible markup.
     *
     * @return void
     **/
    _prepDocument() {
        var doc = this._doc;
        this.websiteConfig = this.getWebsiteConfig(this._doc.baseURI);
        // find author
        this._findAuthor();
        // Remove all style tags in head
        this._removeNodes(doc.getElementsByTagName('style'));
        // Remove
        this._removeUnused();
        if (doc.body) {
            this._replaceBrs(doc.body);
        }
        this._replaceNodeTags(doc.getElementsByTagName('font'), 'SPAN');
    }
    // Remove unused
    _removeUnused() {
        // Pretty print line number
        this._removeNodes(this._doc.querySelectorAll('.prettyprint .pre-numbering'));
        const ignoreElements = this.websiteConfig.ignoreElements || [];
        for (const elem of ignoreElements) {
            this._removeNodes(this._doc.querySelectorAll(elem));
            this.log('_removeUnused ignoreElements', elem);
        }
    }
    /**
     * Find author name
     */
    _findAuthor() {
        var patterns = this.websiteConfig.authorName || [];
        for (const pattern of patterns) {
            if (typeof pattern === 'string') {
                var authorElem = this._doc.querySelector(pattern);
                authorElem && (this._articleAuthorName = authorElem.innerText);
            }
            else if (pattern instanceof RegExp) {
                var matched = this._doc.innerHTML.match(pattern);
                matched && matched[1] && (this._articleAuthorName = matched[1]);
            }
        }
    }
    /**
     * Finds the next element, starting from the given node, and ignoring
     * whitespace in between. If the given node is an element, the same node is
     * returned.
     */
    _nextElement(node) {
        let next = node;
        while (next &&
            (next.nodeType !== this.ELEMENT_NODE) &&
            this.REGEXPS.whitespace.test(next.textContent) && next.nextSibling) {
            next = next.nextSibling;
        }
        return next;
    }
    /**
     * Replaces 2 or more successive <br> elements with a single <p>.
     * Whitespace between <br> elements are ignored. For example:
     *   <div>foo<br>bar<br> <br><br>abc</div>
     * will become:
     *   <div>foo<br>bar<p>abc</p></div>
     */
    _replaceBrs(elem) {
        this._forEachNode(this._getAllNodesWithTag(elem, ['br']), (br) => {
            var next = br.nextSibling;
            // Whether 2 or more <br> elements have been found and replaced with a
            // <p> block.
            let replaced = false;
            // If we find a <br> chain, remove the <br>s until we hit another element
            // or non-whitespace. This leaves behind the first <br> in the chain
            // (which will be replaced with a <p> later).
            while ((next = this._nextElement(next)) && (next.tagName === 'BR')) {
                replaced = 1;
                var brSibling = next.nextSibling;
                next.parentNode?.removeChild(next);
                next = brSibling;
            }
            if (!replaced && (this._hasAncestorTag(br, 'code', 2) || this._hasAncestorTag(br, 'pre', 2))) {
                replaced = 2;
            }
            // If we removed a <br> chain, replace the remaining <br> with a <p>. Add
            // all sibling nodes as children of the <p> until we hit another <br>
            // chain.
            if (replaced === 1) {
                var p = this._doc.createElement('p');
                br.parentNode?.replaceChild(p, br);
                next = p.nextSibling;
                while (next) {
                    // If we've hit another <br><br>, we're done adding children to this <p>.
                    if (next.tagName === 'BR') {
                        var nextElem = this._nextElement(next.nextSibling);
                        if (nextElem && nextElem.tagName === 'BR') {
                            break;
                        }
                    }
                    if (!this._isPhrasingContent(next)) {
                        break;
                    }
                    // Otherwise, make this node a child of the new <p>.
                    var sibling = next.nextSibling;
                    p.appendChild(next);
                    next = sibling;
                }
                while (p.lastChild && this._isWhitespace(p.lastChild)) {
                    p.removeChild(p.lastChild);
                }
                if (p.parentNode.tagName === 'P') {
                    this._setNodeTag(p.parentNode, 'DIV');
                }
            }
            else if (replaced === 2) {
                br.parentNode?.replaceChild(document.createTextNode('\n'), br);
            }
        });
    }
    _setNodeTag(node, tag) {
        const _node = node;
        this.log(node, tag);
        if (_node.__JSDOMParser__) {
            _node.localName = tag.toLowerCase();
            _node.tagName = tag.toUpperCase();
            return node;
        }
        var replacement = node.ownerDocument.createElement(tag);
        while (node.firstChild) {
            replacement.appendChild(node.firstChild);
        }
        node.parentNode && node.parentNode.replaceChild(replacement, node);
        if (_node.Clearly) {
            replacement.Clearly = _node.Clearly;
        }
        for (var i = 0; i < node.attributes.length; i++) {
            try {
                replacement.setAttribute(node.attributes[i].name, node.attributes[i].value);
            }
            catch (e) {
                // noop
            }
        }
        return replacement;
    }
    /**
     * Prepare the article node for display. Clean out any inline styles,
     * iframes, forms, strip extraneous <p> tags, etc.
     *
     * @param Element
     * @return void
     **/
    _prepArticle(articleContent) {
        this._cleanExcludes(articleContent);
        this._cleanStyles(articleContent);
        // Check for data tables before we continue, to avoid removing items in
        // those tables, which will often be isolated even though they're
        // visually linked to other content-ful elements (text, images, etc.).
        this._markDataTables(articleContent);
        // Clean out junk from the article content
        this._cleanConditionally(articleContent, 'form');
        this._cleanConditionally(articleContent, 'fieldset');
        this._clean(articleContent, 'object');
        this._clean(articleContent, 'embed');
        this._clean(articleContent, 'h1');
        // this._clean(articleContent, 'header')
        this._clean(articleContent, 'footer');
        this._clean(articleContent, 'link');
        this._clean(articleContent, 'aside');
        this._clean(articleContent, 'canvas');
        // Clean out elements have "share" in their id/class combinations from final top candidates,
        // which means we don't remove the top candidates even they have "share".
        this._forEachNode(articleContent.children, (topCandidate) => {
            this._cleanMatchedNodes(topCandidate, /share/);
        });
        // If there is only one h2 and its text content substantially equals article title,
        // they are probably using it as a header and not a subheader,
        // so remove it since we already extract the title separately.
        var h2 = articleContent.getElementsByTagName('h2');
        if (h2.length === 1) {
            var lengthSimilarRate = (h2[0].textContent.length - this._articleTitle.length) / this._articleTitle.length;
            if (Math.abs(lengthSimilarRate) < 0.5) {
                var titlesMatch = false;
                if (lengthSimilarRate > 0) {
                    titlesMatch = h2[0].textContent.includes(this._articleTitle);
                }
                else {
                    titlesMatch = this._articleTitle.includes(h2[0].textContent);
                }
                if (titlesMatch) {
                    this._clean(articleContent, 'h2');
                }
            }
        }
        this._clean(articleContent, 'iframe');
        this._clean(articleContent, 'input');
        this._clean(articleContent, 'textarea');
        this._clean(articleContent, 'select');
        this._clean(articleContent, 'button');
        this._cleanHeaders(articleContent);
        this._coverUrl = this._getCoverPhoto(articleContent);
        this.log('try get getCoverPhoto', this._coverUrl);
        // Do these last as the previous stuff may have removed junk
        // that will affect these
        this._cleanConditionally(articleContent, 'table');
        this._cleanConditionally(articleContent, 'ul');
        this._cleanConditionally(articleContent, 'div');
        this._cleanImg(articleContent);
        this._cleanNoscript(articleContent);
        // Remove extra paragraphs
        this._removeNodes(articleContent.getElementsByTagName('p'), (paragraph) => {
            var imgCount = paragraph.getElementsByTagName('img').length;
            var embedCount = paragraph.getElementsByTagName('embed').length;
            var objectCount = paragraph.getElementsByTagName('object').length;
            // At this point, nasty iframes have been removed, only remain embedded video ones.
            var iframeCount = paragraph.getElementsByTagName('iframe').length;
            var totalCount = imgCount + embedCount + objectCount + iframeCount;
            return totalCount === 0 && !this._getInnerText(paragraph, false);
        });
        this._forEachNode(this._getAllNodesWithTag(articleContent, ['br']), (br) => {
            var next = this._nextElement(br.nextSibling);
            if (next && next.tagName === 'P') {
                br.parentNode?.removeChild(br);
            }
        });
        // Remove single-cell tables
        this._forEachNode(this._getAllNodesWithTag(articleContent, ['table']), (table) => {
            var tbody = this._hasSingleTagInsideElement(table, 'TBODY') ? table.firstElementChild : table;
            if (this._hasSingleTagInsideElement(tbody, 'TR')) {
                var row = tbody?.firstElementChild;
                if (this._hasSingleTagInsideElement(row, 'TD')) {
                    var cell = row?.firstElementChild;
                    if (cell) {
                        cell = this._setNodeTag(cell, this._everyNode(cell.childNodes, this._isPhrasingContent) ? 'P' : 'DIV');
                        table.parentNode?.replaceChild(cell, table);
                    }
                }
            }
        });
    }
    /**
     * Initialize a node with the Clearly object. Also checks the
     * className/id for special names to add to its score.
     *
     * @param Element
     * @return void
    **/
    _initializeNode(node) {
        node.Clearly = { contentScore: 0 };
        switch (node.tagName) {
            case 'DIV':
                node.Clearly.contentScore += 5;
                break;
            case 'PRE':
            case 'TD':
            case 'BLOCKQUOTE':
                node.Clearly.contentScore += 3;
                break;
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
                node.Clearly.contentScore -= 3;
                break;
            case 'H1':
            case 'H2':
            case 'H3':
            case 'H4':
            case 'H5':
            case 'H6':
            case 'TH':
                node.Clearly.contentScore -= 5;
                break;
        }
        node.Clearly.contentScore += this._getClassWeight(node);
    }
    _removeAndGetNext(node) {
        var nextNode = this._getNextNode(node, true);
        node.parentNode && node.parentNode.removeChild(node);
        return nextNode;
    }
    /**
     * Traverse the DOM from node to node, starting at the node passed in.
     * Pass true for the second parameter to indicate this node itself
     * (and its kids) are going away, and we want the next node over.
     *
     * Calling this in a loop will traverse the DOM depth-first.
     */
    _getNextNode(node, ignoreSelfAndKids = false) {
        // First check for kids if those aren't being ignored
        if (!ignoreSelfAndKids && node.firstElementChild) {
            return node.firstElementChild;
        }
        // Then for siblings...
        if (node.nextElementSibling) {
            return node.nextElementSibling;
        }
        // And finally, move up the parent chain *and* find a sibling
        // (because this is depth-first traversal, we will have already
        // seen the parent nodes themselves).
        do {
            node = node.parentNode;
        } while (node && !node.nextElementSibling);
        return node && node.nextElementSibling;
    }
    _checkByline(node, matchString) {
        if (this._articleByline) {
            return false;
        }
        let rel = null;
        if (node.getAttribute !== undefined) {
            rel = node.getAttribute('rel');
        }
        if ((rel === 'author' || this.REGEXPS.byline.test(matchString)) && this._isValidByline(node.textContent)) {
            this._articleByline = String(node.textContent || '').trim();
            return true;
        }
        return false;
    }
    _getNodeAncestors(node, maxDepth) {
        maxDepth = maxDepth || 0;
        let i = 0;
        let ancestors = [];
        while (node.parentNode) {
            ancestors.push(node.parentNode);
            if (maxDepth && ++i === maxDepth) {
                break;
            }
            node = node.parentNode;
        }
        return ancestors;
    }
    /***
     * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
     *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
     *
     * @param page a document to run upon. Needs to be a full document, complete with body.
     * @return Element
    **/
    _grabArticle(page) {
        const doc = this._doc;
        var isPaging = (page !== null);
        page = page || this._doc.body;
        const root = doc.documentElement;
        this.log('pickElement start', this.PICK_ELEMENTS);
        for (const elem of Object.keys(this.PICK_ELEMENTS)) {
            root.querySelectorAll(elem).forEach((node) => {
                const pickElems = this.PICK_ELEMENTS[elem];
                const pickedNodes = node.querySelectorAll(pickElems.join(','));
                node.innerHTML = Array.prototype.map.call(pickedNodes, n => n.outerHTML).join('');
                node._isPicked = true;
                this.log('pickElement processed', elem, node.outerHTML);
            });
        }
        this.log('websiteConfig articleElem start', this.websiteConfig);
        const { contentType = 'article', contentElem, extractElems, extractElemsJoiner = '' } = this.websiteConfig;
        const detectElems = ['.notion', 'article', 'main'];
        // Try to get all matched content elems
        let articleSelectedElem = null;
        const contentElems = (Array.isArray(contentElem) ? contentElem : [contentElem]).concat(detectElems);
        for (const contentElem of contentElems) {
            const articleElems = root.querySelectorAll(contentElem);
            if (articleElems.length === 1) {
                this.log('articleElem matched', contentElem, articleElems);
                articleSelectedElem = articleElems[0];
                break;
            }
        }
        this.log('websiteConfig articleElem matched selected', articleSelectedElem);
        // If only one
        if (articleSelectedElem) {
            this._ignoreCleanConditionally = true;
            this.log('articleElem matched', contentElem, articleSelectedElem.cloneNode(true));
            // Create a wrapper div
            const articleContent = doc.createElement('DIV');
            const matchedExtractElems = [];
            // Check extractElems and try to extract matched elems
            if (extractElems && extractElems.length) {
                for (const extractElem of extractElems) {
                    const extractElems = articleSelectedElem.querySelectorAll(extractElem);
                    if (extractElems && extractElems.length) {
                        matchedExtractElems.push(...Array.from(extractElems));
                    }
                }
            }
            // If no matched extractElems, use contentElem
            if (matchedExtractElems.length) {
                this.log('articleElem extracts', matchedExtractElems);
                articleContent.innerHTML = matchedExtractElems.map((elem, i) => {
                    return `<div class="clearly-${contentType} clearly-${contentType}-${i}">${elem.innerHTML}</div>`;
                }).join(extractElemsJoiner);
            }
            else if (matchedExtractElems.length === 0) {
                for (let i = 0; i < articleSelectedElem.childNodes.length; i++) {
                    articleContent.innerHTML = articleSelectedElem.outerHTML;
                }
            }
            // Prepare article content
            this._prepArticle(articleContent);
            // Use article content directly
            return articleContent;
        }
        // We can't grab an article if we don't have a page!
        if (!page) {
            this.log('NO BODY FOUND IN DOCUMENT, ABORT.');
            return null;
        }
        let pageCacheHtml = page.innerHTML;
        this.log('START', pageCacheHtml);
        while (true) {
            let stripUnlikelyCandidates = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS);
            // First, node prepping. Trash nodes that look cruddy (like ones with the
            // class name "comment", etc), and turn divs into P tags where they have been
            // used inappropriately (as in, where they contain no other block level elements.)
            let elementsToScore = [];
            let node = root;
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
                const isKeepElem = this.PRESERVE_ELEM_CLASSES.some(cls => node?.classList.contains(cls));
                if (isKeepElem) {
                    node = this._getNextNode(node, true);
                    continue;
                }
                let matchString = node.className + ' ' + node.id;
                // if (!this._isProbablyVisible(node)) {
                //   this.log('REMOVE NON-VISIBLE', node)
                //   node = this._removeAndGetNext(node)
                //   continue
                // }
                // Check to see if this node is a byline, and remove it if it is.
                if (this._checkByline(node, matchString)) {
                    this.log('REMOVE BYLINE', node);
                    node = this._removeAndGetNext(node);
                    continue;
                }
                // Remove unlikely candidates
                if (stripUnlikelyCandidates && !this._hasAncestorTag(node, 'code') && !this._hasAncestorTag(node, 'pre')) {
                    if (this.REGEXPS.unlikelyCandidates.test(matchString) &&
                        !this.REGEXPS.okMaybeItsACandidate.test(matchString) &&
                        node.tagName !== 'BODY' && node.tagName !== 'A' &&
                        !this._hasElement(node, 'a') &&
                        !this._hasChildTag(node, 'pre', (n) => n.classList.contains('hljs'))) {
                        this.log('REMOVE UNLIKELY CANDIDATE', node);
                        node = this._removeAndGetNext(node);
                        continue;
                    }
                }
                // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
                if ((node.tagName === 'DIV' || node.tagName === 'SECTION' || node.tagName === 'HEADER' ||
                    node.tagName === 'H1' || node.tagName === 'H2' || node.tagName === 'H3' ||
                    node.tagName === 'H4' || node.tagName === 'H5' || node.tagName === 'H6') &&
                    this._isElementWithoutContent(node) && !this._hasDelayImageContainer(node)) {
                    this.log('REMOVE EMPTY CONTENT', node);
                    node = this._removeAndGetNext(node);
                    continue;
                }
                if (this.DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) !== -1) {
                    elementsToScore.push(node);
                }
                // Turn all divs that don't have children block level elements into p's
                if (node.tagName === 'DIV' && !this._isDelayImageContainer(node)) {
                    // Put phrasing content into paragraphs.
                    var p = null;
                    var childNode = node.firstChild;
                    while (childNode) {
                        var nextSibling = childNode.nextSibling;
                        if (this._isPhrasingContent(childNode)) {
                            if (p !== null) {
                                p.appendChild(childNode);
                            }
                            else if (!this._isWhitespace(childNode)) {
                                p = doc.createElement('p');
                                node.replaceChild(p, childNode);
                                p.appendChild(childNode);
                            }
                        }
                        else if (p !== null) {
                            while (p.lastChild && this._isWhitespace(p.lastChild)) {
                                p.removeChild(p.lastChild);
                            }
                            p = null;
                        }
                        childNode = nextSibling;
                    }
                    // Sites like http://mobile.slate.com encloses each paragraph with a DIV
                    // element. DIVs with only a P element inside and no text content can be
                    // safely converted into plain P elements to avoid confusing the scoring
                    // algorithm with DIVs with are, in practice, paragraphs.
                    if (this._hasSingleTagInsideElement(node, 'P') && this._getLinkDensity(node) < 0.25) {
                        var newNode = node.children[0];
                        node.parentNode?.replaceChild(newNode, node);
                        node = newNode;
                        elementsToScore.push(node);
                    }
                    else if (!this._hasChildBlockElement(node)) {
                        node = this._setNodeTag(node, 'P');
                        elementsToScore.push(node);
                    }
                }
                node = this._getNextNode(node);
            }
            // this.log('HTML AFTER BASIC', this._doc.documentElement.innerHTML)
            /**
             * Loop through all paragraphs, and assign a score to them based on how content-y they look.
             * Then add their score to their parent node.
             *
             * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
            **/
            var candidates = [];
            this._forEachNode(elementsToScore, (elementToScore) => {
                if (!elementToScore.parentNode || typeof (elementToScore.parentNode.tagName) === 'undefined') {
                    return;
                }
                // If this paragraph is less than 25 characters, don't even count it.
                var innerText = this._getInnerText(elementToScore);
                if (innerText.length < 25) {
                    return;
                }
                // Exclude nodes with no ancestor.
                var ancestors = this._getNodeAncestors(elementToScore, 3);
                if (ancestors.length === 0) {
                    return;
                }
                var contentScore = 0;
                // Add a point for the paragraph itself as a base.
                contentScore += 1;
                // Add points for any commas within this paragraph.
                contentScore += innerText.split(',').length;
                // For every 100 characters in this paragraph, add another point. Up to 3 points.
                contentScore += Math.min(Math.floor(innerText.length / 100), 3);
                // var innerPhotos = this._getInnerPhotos(elementToScore)
                // contentScore += innerPhotos.length * 0.01
                // Initialize and score ancestors.
                this._forEachNode(ancestors, (ancestor, level) => {
                    if (!ancestor.tagName || !ancestor.parentNode || typeof (ancestor.parentNode.tagName) === 'undefined') {
                        return;
                    }
                    if (typeof (ancestor.Clearly) === 'undefined') {
                        this._initializeNode(ancestor);
                        candidates.push(ancestor);
                    }
                    // Node score divider:
                    // - parent:             1 (no division)
                    // - grandparent:        2
                    // - great grandparent+: ancestor level * 3
                    if (level === 0) {
                        var scoreDivider = 1;
                    }
                    else if (level === 1) {
                        scoreDivider = 2;
                    }
                    else {
                        scoreDivider = level * 3;
                    }
                    ancestor.Clearly.contentScore += contentScore / scoreDivider;
                });
            });
            // After we've calculated scores, loop through all of the possible
            // candidate nodes we found and find the one with the highest score.
            var topCandidates = [];
            for (var c = 0, cl = candidates.length; c < cl; c += 1) {
                var candidate = candidates[c];
                // Scale the final candidates score based on link density. Good content
                // should have a relatively small link density (5% or less) and be mostly
                // unaffected by this operation.
                var candidateScore = candidate.Clearly.contentScore * (1 - this._getLinkDensity(candidate));
                candidate.Clearly.contentScore = candidateScore;
                // this.log('CANDIDATE SCORE', candidateScore, candidate)
                for (var t = 0; t < this._nbTopCandidates; t++) {
                    var aTopCandidate = topCandidates[t];
                    if (!aTopCandidate || candidateScore > aTopCandidate.Clearly.contentScore) {
                        topCandidates.splice(t, 0, candidate);
                        if (topCandidates.length > this._nbTopCandidates) {
                            this.log('Remove topCandidate:', candidateScore, aTopCandidate.Clearly.contentScore, topCandidates.pop());
                        }
                        break;
                    }
                }
            }
            var topCandidate = topCandidates[0] || null;
            var neededToCreateTopCandidate = false;
            var parentOfTopCandidate = null;
            // If we still have no top candidate, just use the body as a last resort.
            // We also have to copy the body node so it is something we can modify.
            if (topCandidate === null || topCandidate.tagName === 'BODY') {
                // Move all of the page's children into topCandidate
                topCandidate = doc.createElement('DIV');
                neededToCreateTopCandidate = true;
                // Move everything (not just elements, also text nodes etc.) into the container
                // so we even include text directly in the body:
                var kids = page.childNodes;
                while (kids.length) {
                    this.log('THROW CHILD', kids[0]);
                    topCandidate?.appendChild(kids[0]);
                }
                page.appendChild(topCandidate);
                this._initializeNode(topCandidate);
            }
            else if (topCandidate) {
                // Find a better top candidate node if it contains (at least three) nodes which belong to `topCandidates` array
                // and whose scores are quite closed with current `topCandidate` node.
                var alternativeCandidateAncestors = [];
                for (var i = 1; i < topCandidates.length; i++) {
                    if (topCandidates[i].Clearly.contentScore / topCandidate.Clearly.contentScore >= 0.75) {
                        alternativeCandidateAncestors.push(this._getNodeAncestors(topCandidates[i]));
                    }
                }
                var MINIMUM_TOPCANDIDATES = 3;
                if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
                    parentOfTopCandidate = topCandidate.parentNode;
                    while (parentOfTopCandidate && parentOfTopCandidate.tagName !== 'BODY') {
                        var listsContainingThisAncestor = 0;
                        for (var ancestorIndex = 0; ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
                            listsContainingThisAncestor += Number(alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate));
                        }
                        if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
                            topCandidate = parentOfTopCandidate;
                            break;
                        }
                        parentOfTopCandidate = parentOfTopCandidate.parentNode;
                    }
                }
                if (!topCandidate.Clearly) {
                    this._initializeNode(topCandidate);
                }
                // Because of our bonus system, parents of candidates might have scores
                // themselves. They get half of the node. There won't be nodes with higher
                // scores than our topCandidate, but if we see the score going *up* in the first
                // few steps up the tree, that's a decent sign that there might be more content
                // lurking in other places that we want to unify in. The sibling stuff
                // below does some of that - but only if we've looked high enough up the DOM
                // tree.
                parentOfTopCandidate = topCandidate.parentNode;
                var lastScore = topCandidate.Clearly.contentScore;
                // The scores shouldn't get too low.
                var scoreThreshold = lastScore / 3;
                while (parentOfTopCandidate && parentOfTopCandidate.tagName !== 'BODY') {
                    if (!parentOfTopCandidate.Clearly) {
                        parentOfTopCandidate = parentOfTopCandidate.parentNode;
                        continue;
                    }
                    var parentScore = parentOfTopCandidate.Clearly.contentScore;
                    if (parentScore < scoreThreshold) {
                        break;
                    }
                    if (parentScore > lastScore) {
                        // Alright! We found a better parent to use.
                        topCandidate = parentOfTopCandidate;
                        break;
                    }
                    lastScore = parentOfTopCandidate.Clearly.contentScore;
                    parentOfTopCandidate = parentOfTopCandidate.parentNode;
                }
                // If the top candidate is the only child, use parent instead. This will help sibling
                // joining logic when adjacent content is actually located in parent's sibling node.
                parentOfTopCandidate = topCandidate.parentNode;
                while (parentOfTopCandidate?.tagName !== 'BODY' && parentOfTopCandidate?.children.length === 1) {
                    topCandidate = parentOfTopCandidate;
                    parentOfTopCandidate = topCandidate.parentNode;
                }
                if (!topCandidate.Clearly) {
                    this._initializeNode(topCandidate);
                }
            }
            // Now that we have the top candidate, look through its siblings for content
            // that might also be related. Things like preambles, content split by ads
            // that we removed, etc.
            let articleContent = doc.createElement('DIV');
            if (isPaging) {
                articleContent.id = 'clearly-content';
            }
            var siblingScoreThreshold = Math.max(10, topCandidate ? topCandidate.Clearly.contentScore * 0.2 : 0);
            // Keep potential top candidate's parent node to try to get text direction of it later.
            parentOfTopCandidate = topCandidate.parentNode;
            var siblings = parentOfTopCandidate.children;
            for (var s = 0, sl = siblings.length; s < sl; s++) {
                var sibling = siblings[s];
                var append = false;
                this.log('SIBLING', sibling, sibling.Clearly ? ('with score ' + sibling.Clearly.contentScore) : '');
                this.log('SIBLING SCORE', sibling.Clearly ? sibling.Clearly.contentScore : 'Unknown', topCandidate);
                if (sibling === topCandidate) {
                    append = true;
                }
                else {
                    var contentBonus = 0;
                    // Give a bonus if sibling nodes and top candidates have the example same classname
                    if (sibling.className === topCandidate.className && topCandidate.className !== '') {
                        contentBonus += topCandidate.Clearly.contentScore * 0.2;
                    }
                    if (sibling.Clearly &&
                        ((sibling.Clearly.contentScore + contentBonus) >= siblingScoreThreshold)) {
                        append = true;
                    }
                    else if (sibling.nodeName === 'P') {
                        var linkDensity = this._getLinkDensity(sibling);
                        var nodeContent = this._getInnerText(sibling);
                        var nodeLength = nodeContent.length;
                        if (nodeLength > 80 && linkDensity < 0.25) {
                            append = true;
                        }
                        else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 &&
                            nodeContent.search(/\.( |$)/) !== -1) {
                            append = true;
                        }
                        else if (['FIGURE', 'PICTURE'].includes(sibling.nodeName) && this._hasDelayImageContainer(sibling)) {
                            append = true;
                        }
                    }
                }
                if (append) {
                    this.log('SIBLING APPEND', sibling);
                    if (this.ALTER_TO_DIV_EXCEPTIONS.indexOf(sibling.nodeName) === -1) {
                        // We have a node that isn't a common block level element, like a form or td tag.
                        // Turn it into a div so it doesn't get filtered out later by accident.
                        this.log('SIBLING ALTER', sibling, 'to div.');
                        sibling = this._setNodeTag(sibling, 'DIV');
                    }
                    articleContent.appendChild(sibling);
                    // siblings is a reference to the children array, and
                    // sibling is removed from the array when we call appendChild().
                    // As a result, we must revisit this index since the nodes
                    // have been shifted.
                    s -= 1;
                    sl -= 1;
                }
            }
            this.log('HTML AFTER CLEAN', articleContent.cloneNode(true));
            // So we have all of the content that we need. Now we clean it up for presentation.
            this._prepArticle(articleContent);
            this.log('HTML AFTER PREP', articleContent.cloneNode(true));
            if (neededToCreateTopCandidate) {
                // We already created a fake div thing, and there wouldn't have been any siblings left
                // for the previous loop, so there's no point trying to create a new div, and then
                // move all the children over. Just assign IDs and class names here. No need to append
                // because that already happened anyway.
                topCandidate.id = 'clearly-page-1';
                topCandidate.className = 'clearly-page';
            }
            else {
                var div = doc.createElement('DIV');
                div.id = 'clearly-page-1';
                div.className = 'clearly-page';
                var children = articleContent.childNodes;
                while (children.length) {
                    div.appendChild(children[0]);
                }
                articleContent.appendChild(div);
            }
            this.log('HTML AFTER PAGING', articleContent.cloneNode(true));
            var parseSuccessful = true;
            // Now that we've gone through the full algorithm, check to see if
            // we got any meaningful content. If we didn't, we may need to re-run
            // grabArticle with different flags set. This gives us a higher likelihood of
            // finding the content, and the sieve approach gives us a higher likelihood of
            // finding the -right- content.
            var textLength = this._getInnerText(articleContent, true).length;
            if (textLength < this._charThreshold) {
                parseSuccessful = false;
                page.innerHTML = pageCacheHtml;
                if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
                    this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
                    this._attempts.push({ articleContent: articleContent, textLength: textLength });
                }
                else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
                    this._removeFlag(this.FLAG_WEIGHT_CLASSES);
                    this._attempts.push({ articleContent: articleContent, textLength: textLength });
                }
                else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
                    this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
                    this._attempts.push({ articleContent: articleContent, textLength: textLength });
                }
                else {
                    this._attempts.push({ articleContent: articleContent, textLength: textLength });
                    // No luck after removing flags, just return the longest text we found during the different loops
                    this._attempts.sort(function (a, b) {
                        return a.textLength < b.textLength;
                    });
                    // But first check if we actually have something
                    if (!this._attempts[0].textLength) {
                        this.log('MAX TRIES LIMIT');
                        return null;
                    }
                    articleContent = this._attempts[0].articleContent;
                    parseSuccessful = true;
                }
            }
            if (parseSuccessful) {
                // Find out text direction from ancestors of final top candidate.
                var ancestors = [parentOfTopCandidate, topCandidate].concat(this._getNodeAncestors(parentOfTopCandidate));
                this._someNode(ancestors, (ancestor) => {
                    if (!ancestor.tagName) {
                        return false;
                    }
                    var articleDir = ancestor.getAttribute('dir');
                    if (articleDir) {
                        this._articleDir = articleDir;
                        return true;
                    }
                    return false;
                });
                return articleContent;
            }
        }
    }
    /**
     * Replace no script to img if img not loadable
     *
     * @param {Element} node
     */
    _cleanNoscript(node) {
        // 优化懒加载没有图片的问题
        var noscripts = node.getElementsByTagName('noscript');
        this._forEachNode(noscripts, (noscript) => {
            var noscriptContent = noscript.textContent.trim();
            this.log('check noscript', noscriptContent);
            if (!noscriptContent.startsWith('<img '))
                return;
            const parentNode = noscript.parentNode;
            if (!noscript.previousSibling)
                return;
            if (noscript.previousSibling.tagName === 'IMG' && (!noscript.previousSibling.getAttribute('src') || !noscript.previousSibling.getAttribute('src').startsWith('http'))) {
                const newImg = document.createElement('span');
                newImg.innerHTML = noscriptContent;
                parentNode.replaceChild(newImg, noscript.previousSibling);
                parentNode.removeChild(noscript);
                this.log('replace noscript', newImg, noscript, noscript.previousSibling);
            }
        });
        this._clean(node, 'noscript');
    }
    /**
     * Check whether the input string could be a byline.
     * This verifies that the input is a string, and that the length
     * is less than 100 chars.
     *
     * @param possibleByline {string} - a string to check whether its a byline.
     * @return Boolean - whether the input string is a byline.
     */
    _isValidByline(byline) {
        if (typeof byline === 'string' || byline instanceof String) {
            byline = String(byline || '').trim();
            return (byline.length > 0) && (byline.length < 100);
        }
        return false;
    }
    /**
     * Attempts to get excerpt and byline metadata for the article.
     *
     * @return Object with optional "excerpt" and "byline" properties
     */
    _getArticleMetadata() {
        var metadata = {};
        var values = {};
        var metaElements = this._doc.getElementsByTagName('meta');
        // property is a space-separated list of values
        var propertyPattern = /\s*(dc|dcterm|og|twitter)\s*:\s*(author|creator|description|title)\s*/gi;
        // name is a single value
        var namePattern = /^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[.:]\s*)?(author|creator|description|title)\s*$/i;
        // Find description tags.
        this._forEachNode(metaElements, (element) => {
            var elementName = element.getAttribute('name');
            var elementProperty = element.getAttribute('property');
            var content = element.getAttribute('content');
            var matches = null;
            var name = null;
            if (elementProperty) {
                matches = elementProperty.match(propertyPattern);
                if (matches) {
                    for (var i = matches.length - 1; i >= 0; i--) {
                        // Convert to lowercase, and remove any whitespace
                        // so we can match below.
                        name = matches[i].toLowerCase().replace(/\s/g, '');
                        // multiple authors
                        values[name] = String(content || '').trim();
                    }
                }
            }
            if (!matches && elementName && namePattern.test(elementName)) {
                name = elementName;
                if (content) {
                    // Convert to lowercase, remove any whitespace, and convert dots
                    // to colons so we can match below.
                    name = name.toLowerCase().replace(/\s/g, '').replace(/\./g, ':');
                    values[name] = String(content || '').trim();
                }
            }
        });
        // get title
        metadata.title = values['dc:title'] ||
            values['dcterm:title'] ||
            values['og:title'] ||
            values['weibo:article:title'] ||
            values['weibo:webpage:title'] ||
            values.title ||
            values['twitter:title'];
        if (!metadata.title) {
            metadata.title = this._getArticleTitle();
        }
        // get author
        metadata.byline = values['dc:creator'] ||
            values['dcterm:creator'] ||
            values.author;
        // get description
        metadata.excerpt = values['dc:description'] ||
            values['dcterm:description'] ||
            values['og:description'] ||
            values['weibo:article:description'] ||
            values['weibo:webpage:description'] ||
            values.description ||
            values['twitter:description'];
        return metadata;
    }
    _cleanExcludes(doc) {
        if (this.websiteConfig && this.websiteConfig.excludeElems) {
            this.log('clean excludes', this.websiteConfig.excludeElems);
            this._removeNodes(doc.querySelectorAll(this.websiteConfig.excludeElems.join(',')));
        }
    }
    /**
     * Removes script tags from the document.
     *
     * @param Element
    **/
    _removeScripts(doc) {
        this._removeNodes(doc.getElementsByTagName('script'), (scriptNode) => {
            scriptNode.nodeValue = '';
            scriptNode.removeAttribute('src');
            return true;
        });
        // this._removeNodes(doc.getElementsByTagName('noscript'))
    }
    /**
     * Check if this node has only whitespace and a single element with given tag
     * Returns false if the DIV node contains non-empty text nodes
     * or if it contains no element with given tag or more than 1 element.
     *
     * @param Element
     * @param string tag of child element
    **/
    _hasSingleTagInsideElement(element, tag) {
        // There should be exactly 1 element child with given tag
        if (element.children.length !== 1 || element.children[0].tagName !== tag) {
            return false;
        }
        // And there should be no text nodes with real content
        return !this._someNode(element.childNodes, (node) => {
            return node.nodeType === this.TEXT_NODE &&
                this.REGEXPS.hasContent.test(node.textContent);
        });
    }
    _hasElement(element, tag) {
        return !!this._someNode(element.childNodes, (node) => {
            return node.nodeName.toLowerCase() === tag.toLowerCase() && this.REGEXPS.hasContent.test(node.textContent);
        });
    }
    _isElementWithoutContent(node) {
        return node.nodeType === this.ELEMENT_NODE &&
            String(node.textContent || '').trim().length === 0 &&
            (node.children.length === 0 ||
                node.children.length === node.getElementsByTagName('br').length + node.getElementsByTagName('hr').length);
    }
    _isDelayImageContainer(node) {
        return this.DELAY_IMAGE_ATTRIBUTES.some(function (attr) {
            return node.hasAttribute(attr);
        });
    }
    _hasDelayImageContainer(node) {
        var selector = this.DELAY_IMAGE_ATTRIBUTES.map(function (attr) {
            return '[' + attr + ']';
        }).join(',') + ',img';
        return node.querySelectorAll(selector).length > 0;
    }
    /**
     * Determine whether element has any children block level elements.
     *
     * @param Element
     */
    _hasChildBlockElement(element) {
        return this._someNode(element.childNodes, (node) => {
            return this.DIV_TO_P_ELEMS.indexOf(node.tagName) !== -1 ||
                this._hasChildBlockElement(node);
        });
    }
    /***
     * Determine if a node qualifies as phrasing content.
     * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
    **/
    _isPhrasingContent(node) {
        return node.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.indexOf(node.tagName) !== -1 ||
            ((node.tagName === 'A' || node.tagName === 'DEL' || node.tagName === 'INS') &&
                this._everyNode(node.childNodes, this._isPhrasingContent));
    }
    _isWhitespace(node) {
        return (node.nodeType === this.TEXT_NODE && String(node.textContent || '').trim().length === 0) ||
            (node.nodeType === this.ELEMENT_NODE && node.tagName === 'BR');
    }
    /**
     * Check has readable content
     *
     * @param {Node} node
     * @returns
     */
    _hasContent(node, normalizeSpaces = false, hasPlaceHolder = false) {
        // Check text
        if (this._getInnerText(node, normalizeSpaces))
            return true;
        const tag = node.tagName.toLowerCase();
        // Check img
        if (this._hasAncestorTag(node, 'pre', -1, (node) => node.classList.contains('hljs')))
            return true;
        if (tag === 'img' || node.querySelector('img'))
            return true;
        if (['iframe', 'hr', 'td'].includes(tag) || node.querySelector('iframe,hr'))
            return true;
        if (this._preserveIds && this._preserveIds.includes(node.getAttribute('id')))
            return true;
        if (tag === 'svg' || this._hasAncestorTag(node, 'svg', -1))
            return true;
        if (hasPlaceHolder) {
            const placeholderTags = ['br', 'hr'];
            if (placeholderTags.includes(tag) || node.querySelector(placeholderTags.join(',')))
                return true;
        }
        return false;
    }
    /**
     * Get the inner text of a node - cross browser compatibly.
     * This also strips out any excess whitespace to be found.
     *
     * @param Element
     * @param Boolean normalizeSpaces (default: true)
     * @return string
    **/
    _getInnerText(e, normalizeSpaces = false) {
        normalizeSpaces = (typeof normalizeSpaces === 'undefined') ? true : normalizeSpaces;
        var textContent = String(e.textContent || '').trim();
        if (normalizeSpaces) {
            return textContent.replace(this.REGEXPS.normalize, ' ');
        }
        return textContent;
    }
    /**
     *
     * @returns
     */
    _getInnerPhotos(node) {
        var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
            return '[' + item + ']';
        })).join(',');
        let count = 0;
        this._forEachNode(node.querySelectorAll(selectors), (node) => {
            if (this.isRealPhoto(node)) {
                count++;
            }
        });
        return count;
    }
    /**
     * is Real Photo
     *
     * @param {*} node
     * @returns
     */
    isRealPhoto(node) {
        if (this._isDelayImageContainer(node)) {
            return true;
        }
        const sizes = this.getPhotoSize(node);
        if (Object.values(sizes).find((size) => size > 300)) {
            return true;
        }
        return false;
    }
    /**
     * Try get photo size
     *
     * @param {Node} node
     * @returns
     */
    getPhotoSize(node) {
        var attrs = Object.values(node.attributes).map(a => a.nodeName);
        var widthAttr = attrs.find(a => a.includes('width'));
        var heightAttr = attrs.find(a => a.includes('height'));
        var width = node.clientWidth;
        var height = node.clientHeight;
        let realWidth = 0;
        let realHeight = 0;
        let url = node.getAttribute('src') || node.getAttribute('data-src');
        if (url && url.startsWith('data:'))
            url = null;
        // Try to get width and heighdt through attributes
        if (widthAttr)
            width = parseInt(node.getAttribute(widthAttr) || '0', 10) || width;
        if (heightAttr)
            height = parseInt(node.getAttribute(heightAttr) || '0', 10) || height;
        // SVG viewBox check
        if (node.tagName === 'svg' && node.hasAttribute('viewBox')) {
            const [, , viewBoxWidth, viewBoxHeight] = node.getAttribute('viewBox').split(' ');
            if (viewBoxWidth)
                width = parseInt(viewBoxWidth, 10);
            if (viewBoxHeight)
                height = parseInt(viewBoxHeight, 10);
        }
        if (node.hasAttribute('src') || node.complete) {
            realHeight = node.naturalHeight;
            realWidth = node.naturalWidth;
        }
        const srcset = node.getAttribute('srcset') || node.getAttribute('data-srcset');
        if (srcset) {
            const highRes = srcset.split(', ').reduce((acc, item) => {
                let [url, widthStr] = item.trim().split(' ');
                let width = widthStr ? parseInt((widthStr.match(/\d+/) || ['0'])[0]) : 0;
                if (width > acc.width)
                    return { width, url };
                return acc;
            }, { width: 0, url: '' });
            if (highRes && highRes.url) {
                width = highRes.width;
                url = highRes.url;
            }
        }
        return { width, height, realWidth, realHeight, url };
    }
    /**
     * Get the number of times a string s appears in the node e.
     *
     * @param Element
     * @param string - what to split on. Default is ","
     * @return number (integer)
    **/
    _getCharCount(e, s) {
        s = s || ',';
        return this._getInnerText(e).split(s).length - 1;
    }
    /**
     * Remove the style attribute on every e and under.
     * TODO: Test if getElementsByTagName(*) is faster.
     *
     * @param Element
     * @return void
    **/
    _cleanStyles(e) {
        if (!e || e.tagName.toLowerCase() === 'svg') {
            return;
        }
        // Remove `style` and deprecated presentational attributes
        for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
            e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
        }
        if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1) {
            e.removeAttribute('width');
            e.removeAttribute('height');
        }
        var cur = e.firstElementChild;
        while (cur !== null) {
            this._cleanStyles(cur);
            cur = cur.nextElementSibling;
        }
    }
    /**
     * Get the density of links as a percentage of the content
     * This is the amount of text that is inside a link divided by the total text in the node.
     *
     * @param Element
     * @return number (float)
    **/
    _getLinkDensity(element) {
        var textLength = this._getInnerText(element).length;
        if (textLength === 0) {
            return 0;
        }
        var linkLength = 0;
        // XXX implement _reduceNodeList?
        this._forEachNode(element.getElementsByTagName('a'), (linkNode) => {
            linkLength += this._getInnerText(linkNode).length;
        });
        return linkLength / textLength;
    }
    /**
     * Get an elements class/id weight. Uses regular expressions to tell if this
     * element looks good or bad.
     *
     * @param Element
     * @return number (Integer)
    **/
    _getClassWeight(e) {
        if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
            return 0;
        }
        var weight = 0;
        var flag = (e.className || '') + ':' + (e.id || '');
        // Look for a special classname
        if (e.className || e.id) {
            var negativeSize = flag.match(this.REGEXPS.negative);
            if (negativeSize) {
                weight -= 25 * negativeSize.length;
            }
            // this.log('NEGATIVE WEIGHT', weight, flag, e)
            var positiveSize = flag.match(this.REGEXPS.positive);
            if (positiveSize) {
                weight += 25 * positiveSize.length;
            }
            // this.log('POSITIVE WEIGHT', weight, flag, e)
            if (['SVG', 'IMG'].includes(e.tagName.toUpperCase())) {
                if (this.REGEXPS.imageNegative.test(e.className)) {
                    weight -= 25;
                }
                if (this.REGEXPS.imagePositive.test(e.className)) {
                    weight += 25;
                }
            }
        }
        return weight;
    }
    /**
     * Clean a node of all elements of type "tag".
     * (Unless it's a youtube/vimeo video. People love movies.)
     *
     * @param Element
     * @param string tag to clean
     * @return void
     **/
    _clean(e, tag) {
        var isEmbed = ['object', 'embed', 'iframe', 'video'].indexOf(tag) !== -1;
        this.log('_clean', tag, isEmbed);
        this._removeNodes(e.getElementsByTagName(tag), (element) => {
            // Allow youtube and vimeo videos through as people usually want to see those.
            if (isEmbed) {
                var attributeValues = [].map.call(element.attributes, function (attr) {
                    return attr.value;
                }).join('|');
                // First, check the elements attributes to see if any of them contain youtube or vimeo
                if (this.REGEXPS.videos.test(attributeValues)) {
                    return false;
                }
                // Then check the elements inside this element for the same.
                if (this.REGEXPS.videos.test(element.innerHTML)) {
                    return false;
                }
            }
            return true;
        });
    }
    _hasPhotoContainer(node) {
        return this._hasAncestorTag(node, 'figure') || this._hasAncestorTag(node, 'picture');
    }
    /**
     * Check if a given node has one of its ancestor tag name matching the
     * provided one.
     * @param  HTMLElement node
     * @param  String      tagName
     * @param  Number      maxDepth
     * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
     * @return Boolean
     */
    _hasAncestorTag(node, tagName, maxDepth, filterFn) {
        maxDepth = maxDepth || 3;
        tagName = tagName.toUpperCase();
        var depth = 0;
        while (node.parentNode) {
            if (maxDepth > 0 && depth > maxDepth)
                return false;
            if (node.parentNode.tagName && node.parentNode.tagName.toUpperCase() === tagName && (!filterFn || filterFn(node.parentNode)))
                return true;
            node = node.parentNode;
            depth++;
        }
        return false;
    }
    _hasChildTag(node, tagName, filterFn) {
        const nodes = node.getElementsByTagName(tagName);
        if (!filterFn)
            return nodes.length > 0;
        return Array.prototype.some.call(nodes, filterFn);
    }
    /**
     * Return an object indicating how many rows and columns this table has.
     */
    _getRowAndColumnCount(table) {
        var rows = 0;
        var columns = 0;
        var trs = table.getElementsByTagName('tr');
        for (var i = 0; i < trs.length; i++) {
            var rowspanAttr = trs[i].getAttribute('rowspan') || '0';
            let rowspan = 0;
            if (rowspanAttr) {
                rowspan = parseInt(rowspanAttr, 10);
            }
            rows += (rowspan || 1);
            // Now look for column-related info
            var columnsInThisRow = 0;
            var cells = trs[i].getElementsByTagName('td');
            for (var j = 0; j < cells.length; j++) {
                var colspanAttr = cells[j].getAttribute('colspan') || '0';
                var colspan = 0;
                if (colspanAttr) {
                    colspan = parseInt(colspanAttr, 10);
                }
                columnsInThisRow += (colspan || 1);
            }
            columns = Math.max(columns, columnsInThisRow);
        }
        return { rows: rows, columns: columns };
    }
    /**
     * Look for 'data' (as opposed to 'layout') tables, for which we use
     * similar checks as
     * https://dxr.mozilla.org/mozilla-central/rev/71224049c0b52ab190564d3ea0eab089a159a4cf/accessible/html/HTMLTableAccessible.cpp#920
     */
    _markDataTables(root) {
        var tables = root.getElementsByTagName('table');
        for (var i = 0; i < tables.length; i++) {
            var table = tables[i];
            var role = table.getAttribute('role');
            if (role === 'presentation') {
                table._isDataTable = false;
                continue;
            }
            var datatable = table.getAttribute('datatable');
            if (datatable === '0') {
                table._isDataTable = false;
                continue;
            }
            var summary = table.getAttribute('summary');
            if (summary) {
                table._isDataTable = true;
                continue;
            }
            var caption = table.getElementsByTagName('caption')[0];
            if (caption && caption.childNodes.length > 0) {
                table._isDataTable = true;
                continue;
            }
            // If the table has a descendant with any of these tags, consider a data table:
            var dataTableDescendants = ['col', 'colgroup', 'tfoot', 'thead', 'th'];
            var descendantExists = function (tag) {
                return !!table.getElementsByTagName(tag)[0];
            };
            if (dataTableDescendants.some(descendantExists)) {
                this.log('DATA TABLE BECAUSE FOUND DATA-Y DESCENDANT');
                table._isDataTable = true;
                continue;
            }
            // Nested tables indicate a layout table:
            if (table.getElementsByTagName('table')[0]) {
                table._isDataTable = false;
                continue;
            }
            var sizeInfo = this._getRowAndColumnCount(table);
            if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
                table._isDataTable = true;
                continue;
            }
            // Now just go by size entirely:
            table._isDataTable = sizeInfo.rows * sizeInfo.columns > 10;
        }
    }
    /**
     * Clean an element of all tags of type "tag" if they look fishy.
     * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
     *
     * @return void
     **/
    _cleanImg(e) {
        this.log('_cleanImg start', e);
        // TODO: Consider taking into account original contentScore here.
        var selectors = ['img', 'svg'].concat(this.DELAY_IMAGE_ATTRIBUTES.map(function (item) {
            return '[' + item + ']';
        })).join(',');
        this._removeNodes(e.querySelectorAll(selectors), (node) => {
            var nodeName = node.nodeName.toUpperCase();
            this.log('_cleanImg check', node);
            // First check if we're in a data table, in which case don't remove us.
            var weight = this._getClassWeight(node);
            var contentScore = 0;
            // var xpath = this.getPathTo(node)
            // var realNode = this.getByPath(xpath)
            if (weight + contentScore < 0) {
                this.log('_cleanImg executed with weight', weight, contentScore, node);
                return true;
            }
            // is photo container
            // https://www.chromestory.com/2022/04/google-removes-smartlock-feature/
            // if (this._hasPhotoContainer(node)) return false
            // Srcset manage different size image
            if (['IMG', 'SVG'].includes(nodeName)) {
                if (this._root && node.hasAttribute('src')) {
                    node = this._root.querySelector(`${node.tagName.toLowerCase()}[src="${node.getAttribute('src')}"]`);
                }
                const { width: photoWidth, height: photoHeight, realHeight, realWidth } = this.getPhotoSize(node);
                let width = Math.max(node.width, node.naturalWidth, node.offsetWidth, photoWidth, realWidth);
                let height = Math.max(node.height, node.naturalHeight, node.offsetHeight, photoHeight, realHeight);
                this.log('_cleanImg photo sizes', width, height, node);
                // SVG viewBox check
                if (nodeName === 'SVG' && node.hasAttribute('viewBox')) {
                    const [, , viewBoxWidth, viewBoxHeight] = node.getAttribute('viewBox').split(' ');
                    if (viewBoxWidth)
                        width = parseInt(viewBoxWidth, 10);
                    if (viewBoxHeight)
                        height = parseInt(viewBoxHeight, 10);
                }
                if ((width <= 250 && height <= 250) ||
                    ((height < 250 || width < 250) && width < 600 && height > 0 &&
                        (
                        // Too long
                        height / width > 4.5 ||
                            // Too wide
                            height / width < 6))) {
                    this.log('_cleanImg base sizes', width, height, node);
                    return true;
                }
            }
            // this.log('_cleanImg ignored', node, xpath, realNode, weight + contentScore, node.outerHTML)
            return false;
        });
    }
    /**
     * Clean an element of all tags of type "tag" if they look fishy.
     * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
     *
     * @return void
     **/
    _cleanConditionally(e, tag) {
        if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY) || this._ignoreCleanConditionally) {
            return;
        }
        var isList = tag === 'ul' || tag === 'ol';
        // Gather counts for other typical elements embedded within.
        // Traverse backwards so we can remove nodes at the same time
        // without effecting the traversal.
        //
        // TODO: Consider taking into account original contentScore here.
        this._removeNodes(e.getElementsByTagName(tag), (node) => {
            // First check if we're in a data table, in which case don't remove us.
            const isDataTable = (t) => t._isDataTable;
            const isCode = (t) => t.classList.contains('hljs');
            const isPicked = (t) => t._isPicked;
            // is data table check
            if (node._isDataTable)
                return false;
            if (this._hasAncestorTag(node, 'table', -1, isDataTable))
                return false;
            if (this._hasChildTag(node, 'table', isDataTable))
                return false;
            if (node._isPicked)
                return false;
            if (this._hasChildTag(node, 'span', isPicked))
                return false;
            if (isCode(node))
                return false;
            if (this._hasAncestorTag(node, 'pre', -1, isCode))
                return false;
            if (this._hasChildTag(node, 'pre', isCode))
                return false;
            var weight = this._getClassWeight(node);
            var contentScore = 0;
            if (this._getCharCount(node, ',') < 20) {
                // If there are not very many commas, and the number of
                // non-paragraph elements is more than paragraphs or other
                // ominous signs, remove the element.
                var p = node.getElementsByTagName('p').length || node.getElementsByTagName('td').length || node.getElementsByTagName('th').length;
                var img = node.getElementsByTagName('img').length;
                var li = node.getElementsByTagName('li').length - 100;
                var input = node.getElementsByTagName('input').length;
                var embedCount = 0;
                var embeds = node.getElementsByTagName('embed');
                for (var ei = 0, il = embeds.length; ei < il; ei += 1) {
                    if (!this.REGEXPS.videos.test(embeds[ei].src)) {
                        embedCount += 1;
                    }
                }
                const linkDensity = this._getLinkDensity(node);
                const innerText = this._getInnerText(node);
                const contentLength = innerText.length;
                const isImageTooMany = img > 1 && p / img < 0.5;
                const isEmptyList = isList && !contentLength && !img;
                const isChaosList = !isList && li > p;
                const isInputTooMany = input > Math.floor(p / 3);
                const isContentTooShort = !isList && contentLength < 25 && (img === 0 || img > 2);
                const isContentUseLess = !isList && img === 0 && weight < 25 && linkDensity > 0.2;
                const isContentIncludeDensityLinks = weight >= 25 && linkDensity > 0.5;
                const isEmbedTooMany = (embedCount === 1 && contentLength < 75) || embedCount > 1;
                var toRemove = isImageTooMany || isEmptyList || isChaosList || isInputTooMany || isContentTooShort || isContentUseLess || isContentIncludeDensityLinks || isEmbedTooMany;
                toRemove && this.log('CLEANCONDITIONALLY BY RULES', { img, isList, contentLength, p, li, linkDensity, weight, embedCount, isImageTooMany, isEmptyList, isChaosList, isInputTooMany, isContentTooShort, isContentUseLess, isContentIncludeDensityLinks, isEmbedTooMany, innerText, isDataTable: node._isDataTable }, node);
                return toRemove;
            }
            if (weight + contentScore < 0) {
                this.log('CLEANCONDITIONALLY BY SCORE', weight + contentScore, node);
                return true;
            }
            return false;
        });
    }
    /**
     * Clean out elements whose id/class combinations match specific string.
     *
     * @param Element
     * @param RegExp match id/class combination.
     * @return void
     **/
    _cleanMatchedNodes(e, regex) {
        var endOfSearchMarkerNode = this._getNextNode(e, true);
        var next = this._getNextNode(e);
        while (next && next !== endOfSearchMarkerNode) {
            if (regex.test(next.className + ' ' + next.id)) {
                this.log('REMOVE BY REGEX', regex, next);
                next = this._removeAndGetNext(next);
            }
            else {
                next = this._getNextNode(next);
            }
        }
    }
    /**
     * Clean out spurious headers from an Element. Checks things like classnames and link density.
     *
     * @param Element
     * @return void
    **/
    _cleanHeaders(e) {
        for (var headerIndex = 1; headerIndex < 3; headerIndex += 1) {
            this._removeNodes(e.getElementsByTagName('h' + headerIndex), (header) => {
                // Check header has anchor
                const hasAnchor = this._hasChildTag(header, 'a', (a) => {
                    const href = a.getAttribute('href');
                    const isAnchor = href && href.indexOf('#') === 0;
                    return isAnchor;
                });
                if (hasAnchor)
                    return false;
                return this._getClassWeight(header) < 0;
            });
        }
    }
    _flagIsActive(flag) {
        return (this._flags & flag) > 0;
    }
    _removeFlag(flag) {
        this._flags = this._flags & ~flag;
    }
    _isRealVisible(node) {
        var style = window.getComputedStyle(node);
        var visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity > 0 && !node.hasAttribute('hidden');
        // this.log('REAL VISIBLE', visible, node)
        return visible;
    }
    _isProbablyVisible(node) {
        // this.log('PROBABLY VISIBLE', node.style.display, node)
        return (!node.style || node.style.display !== 'none') && !node.hasAttribute('hidden');
    }
    isNodeVisible(node) {
        // Have to null-check node.style and node.className.indexOf to deal with SVG and MathML nodes.
        return (!node.style || node.style.display !== 'none') &&
            !node.hasAttribute('hidden') &&
            // check for "fallback-image" so that wikimedia math images are displayed
            (!node.hasAttribute('aria-hidden') || node.getAttribute('aria-hidden') !== 'true' || (node.className && node.className.indexOf && node.className.indexOf('fallback-image') !== -1));
    }
    /**
     * Decides whether or not the document is reader-able without parsing the whole thing.
     *
     * @return boolean Whether or not we suspect parse() will suceeed at returning an article object.
     */
    isProbablyReaderable(doc, options) {
        doc = doc || this._doc;
        // For backward compatibility reasons 'options' can either be a configuration object or the function used
        // to determine if a node is visible.
        if (typeof options === 'function') {
            options = { visibilityChecker: options };
        }
        var defaultOptions = { minScore: 20, minContentLength: 140, visibilityChecker: this.isNodeVisible };
        options = Object.assign(defaultOptions, options);
        var nodes = this._doc.querySelectorAll('p, pre, article');
        // Get <div> nodes which have <br> node(s) and append them into the `nodes` variable.
        // Some articles' DOM structures might look like
        // <div>
        //   Sentences<br>
        //   <br>
        //   Sentences<br>
        // </div>
        var brNodes = this._doc.querySelectorAll('div > br');
        if (brNodes.length) {
            var set = new Set(nodes);
            [].forEach.call(brNodes, function (node) {
                set.add(node.parentNode);
            });
            nodes = Array.from(set);
        }
        var score = 0;
        // This is a little cheeky, we use the accumulator 'score' to decide what to return from
        // this callback:
        return [].some.call(nodes, (node) => {
            if (!options.visibilityChecker(node)) {
                return false;
            }
            var matchString = node.className + ' ' + node.id;
            if (this.REGEXPS.unlikelyCandidates.test(matchString) &&
                !this.REGEXPS.okMaybeItsACandidate.test(matchString)) {
                return false;
            }
            if (node.matches('li p')) {
                return false;
            }
            var textContentLength = node.textContent.trim().length;
            if (textContentLength < options.minContentLength) {
                return false;
            }
            score += Math.sqrt(textContentLength - options.minContentLength);
            if (score > options.minScore) {
                return true;
            }
            return false;
        });
    }
    /**
     *  Detect language
     *
     * @param {String} text
     * @returns
     */
    detectLanguage(text, defaultLang) {
        this.log(defaultLang);
        let lang = null;
        if (defaultLang && !defaultLang.startsWith('en')) {
            this.log('default', defaultLang);
            lang = defaultLang;
        }
        const wordsCountMatch = text.match(this.WORD_REGEX);
        const wordsCount = wordsCountMatch ? wordsCountMatch.length : 0;
        if (!lang) {
            const latins = ['ro', 'nb', 'sv', 'it', 'es', 'pl', 'de', 'fr'];
            const scores = {};
            for (const [l, regex] of Object.entries(this.LANG_REGEXPS)) {
                // detect occurances of lang in a word
                const matches = text.match(regex) || [];
                const score = matches.length / wordsCount;
                this.log(l, score, matches.length, wordsCount);
                if (score) {
                    scores[l] = score * (latins.includes(l) ? 5 : 1);
                    if (scores[l] > 0.85) {
                        lang = l;
                        continue;
                    }
                }
            }
            lang = Object.keys(scores).reduce((a, b) => scores[a] >= scores[b] ? a : b);
            this.log(scores);
        }
        return { lang, wordsCount };
    }
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
    parse() {
        // Avoid parsing too large documents, as per configuration option
        if (this._maxElemsToParse > 0) {
            var numTags = this._doc.getElementsByTagName('*').length;
            if (numTags > this._maxElemsToParse) {
                throw new Error('Aborting parsing document; ' + numTags + ' elements found');
            }
        }
        var rtl = this._doc.querySelector('html').getAttribute('dir') === 'rtl';
        var htmlLang = String(this._doc.querySelector('html').getAttribute('lang') || 'en-US');
        this._prepDocument();
        // Remove script tags from the document.
        this._removeScripts(this._doc);
        var metadata = this._getArticleMetadata();
        this._articleTitle = metadata.title;
        var articleContent = this._grabArticle();
        var articleText = articleContent && articleContent.textContent ? articleContent.textContent.trim() : '';
        if (!articleText || (articleText.length < 100 && articleContent.querySelectorAll('img').length < 2)) {
            return null;
        }
        this._postProcessContent(articleContent);
        this.log('HTML PROCESS', articleContent.cloneNode(true));
        var outline = this._buildOutline(articleContent);
        var links = this._buildLinks(articleContent);
        // If we haven't found an excerpt in the article's metadata, use the article's
        // first paragraph as the excerpt. This is used for displaying a preview of
        // the article's content.
        if (!metadata.excerpt) {
            var paragraphs = articleContent.getElementsByTagName('p');
            if (paragraphs.length > 0) {
                metadata.excerpt = String(paragraphs[0].textContent || '').trim();
            }
        }
        const { wordsCount, lang } = this.detectLanguage(articleText, htmlLang);
        this.log('wordsCount', wordsCount, lang);
        var textContent = articleContent.textContent;
        const coverPhotoUrlPos = articleContent.innerHTML.indexOf(this._coverUrl);
        var converUrl = this._coverUrl && (coverPhotoUrlPos === -1 || coverPhotoUrlPos > 500) ? this._coverUrl : null;
        const readSeconds = wordsCount / 3.5;
        return {
            url: articleContent.baseURI,
            title: this._articleTitle,
            text: textContent,
            html: '<article>' + articleContent.innerHTML + '</article>',
            coverUrl: converUrl,
            byline: metadata.byline || this._articleByline,
            dir: this._articleDir,
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
        };
    }
}

function mitt(n){return {all:n=n||new Map,on:function(t,e){var i=n.get(t);i?i.push(e):n.set(t,[e]);},off:function(t,e){var i=n.get(t);i&&(e?i.splice(i.indexOf(e)>>>0,1):n.set(t,[]));},emit:function(t,e){var i=n.get(t);i&&i.slice().map(function(n){n(e);}),(i=n.get("*"))&&i.slice().map(function(n){n(t,e);});}}}

const EVENT_LOGOUT = 'EVENT_LOGOUT';
const EVENT_LOGIN_SUCCESS = 'EVENT_LOGIN_SUCCESS';
const EVENT_CLIP_REMOVED = 'EVENT_CLIP_REMOVED';
const EVENT_CLIP_UPDATED = 'EVENT_CLIP_UPDATED';
var bus = mitt();

const ATTR_CLIP_ID = 'clearly-clip-id';

const MARK_CLASS = 'clearly-mark';
function wrapRange(range, id) {
    const wrap = document.createElement('span');
    wrap.classList.add(MARK_CLASS);
    if (id) {
        wrap.setAttribute(ATTR_CLIP_ID, id);
    }
    range.surroundContents(wrap);
}
function unwrapMark(id) {
    document.querySelectorAll('.' + MARK_CLASS + `[${ATTR_CLIP_ID}="${id}"]`).forEach(elem => {
        if (!elem.textContent)
            return;
        elem.replaceWith(elem.textContent);
    });
}
function unwrapAll() {
    document.querySelectorAll('.' + MARK_CLASS).forEach(elem => {
        if (!elem.textContent)
            return;
        elem.replaceWith(elem.textContent);
    });
}

function savePageClip(clip) {
    return request('savePageClip', clip);
}
function listPageClips(req) {
    return request('listPageClips', req);
}

var store = {
    articleClip: null,
    currentClip: null,
    clips: [],
    setCurrentClip(clip) {
        this.currentClip = clip;
    },
    clearAll() {
        this.articleClip = undefined;
        this.currentClip = undefined;
        this.clips = [];
    },
    async saveClip(clip, archived = false) {
        debug$2('saveClip', clip, this.currentClip);
        const newClip = await savePageClip({
            url: location.href,
            title: document.title,
            ...this.currentClip,
            ...clip,
            archived
        });
        if (this.currentClip) {
            Object.assign(this.currentClip, newClip);
        }
        const matchedClip = this.clips.find(item => {
            return item.id === newClip.id;
        });
        if (!matchedClip) {
            this.clips.push(newClip);
        }
        else {
            Object.assign(matchedClip, newClip);
        }
        bus.emit(EVENT_CLIP_UPDATED, {
            type: newClip.type
        });
        this.currentClip = newClip;
        return newClip;
    },
    async loadPageClips(query) {
        const resp = await listPageClips(query);
        if (resp) {
            let clips = resp.clips.filter(item => !item.archived);
            this.clips = clips;
            this.articleClip = clips.find((item) => item.type === 'article');
            debug$2('articleClip', this.articleClip);
            return clips;
        }
        else {
            return [];
        }
    },
    async removeCurrentClip() {
        console.log('store.removeCurrentClip', this.currentClip);
        if (this.currentClip && this.currentClip.id) {
            const currentClip = this.currentClip;
            await this.saveClip({
                id: currentClip.id
            }, true);
            const existIndex = this.clips.findIndex(clip => {
                return clip.id === currentClip?.id;
            });
            this.clips.splice(existIndex, 1);
            bus.emit(EVENT_CLIP_REMOVED, {
                id: currentClip.id,
                type: currentClip.type
            });
            this.currentClip = null;
        }
    }
};

let _root = document.body;
function removeAllMarks() {
    unwrapAll();
}
function removeMark(clipId) {
    unwrapMark(clipId);
}
const PRE_POST_OFFSET = 10;
function createRange(node, offset, end) {
    const range = document.createRange();
    debug$2('showmark add', node.nodeValue, offset, end);
    range.setStart(node, offset);
    range.setEnd(node, end);
    return range;
}
function allLocations(string, substring) {
    const a = [];
    let i = -1;
    while ((i = string.indexOf(substring, i + 1)) >= 0)
        a.push(i);
    return a;
}
function endsIsStart(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLength = Math.min(len1, len2);
    for (let l = maxLength; l > 0; l--) {
        const match = str1.substring(str1.length - l);
        if (match === str2.substring(0, l)) {
            return {
                match,
                length: l
            };
        }
    }
    return false;
}
function findMarkRanges(clip, root = _root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const mark = clip.mark;
    // 使用 start、end 标记可能的开始、结束节点
    const ranges = [];
    let allPreText = '';
    let startPreText = '';
    function matchPreText(node, offset, allPreText, mark) {
        let preText = startPreText;
        if (!preText) {
            const preTexts = allPreText + node.nodeValue?.substring(0, offset);
            preText = preTexts.substring(preTexts.length - PRE_POST_OFFSET);
        }
        const markPreText = mark.preText;
        if (!markPreText || preText.endsWith(markPreText)) {
            startPreText = preText;
            return true;
        }
        return false;
    }
    function isStartNode(node, offset, mark) {
        if (!node.nodeValue)
            return false;
        const preTexts = allPreText + node.nodeValue.substring(0, offset);
        const preText = preTexts.substring(preTexts.length - PRE_POST_OFFSET);
        // 写侧和读侧可能会有长度不一的情况（目前都是10），所以两边endWith都判断下
        return !mark.preText || preText.endsWith(mark.preText) || mark.preText.endsWith(preText);
    }
    function isEndNode(node, end, mark) {
        if (!node.nodeValue)
            return false;
        let endText = node.nodeValue.substring(end);
        while (walker.nextNode()) {
            endText += walker.currentNode.nodeValue || '';
            if (endText.length >= PRE_POST_OFFSET) {
                endText = endText.substring(0, PRE_POST_OFFSET);
                walker.currentNode = node;
                break;
            }
        }
        if (!mark.postText) {
            return true;
        }
        if (!endText) {
            return false;
        }
        return endText.startsWith(mark.postText) || mark.postText.startsWith(endText);
    }
    function add(node, offset, end) {
        if (!matchPreText(node, offset, allPreText, clip.mark)) {
            return;
        }
        const isStart = isStartNode(node, offset, clip.mark);
        const isEnd = isEndNode(node, end, clip.mark);
        const range = createRange(node, offset, end);
        ranges.push({
            range,
            id: clip.id,
            start: isStart,
            end: isEnd
        });
    }
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.nodeValue;
        if (!text)
            continue;
        // debug('N:', text)
        // debug('M:', mark.text)
        if (text.includes(mark.text)) {
            // 包含在节点中的 mark
            const matchedIndexes = allLocations(text, mark.text);
            debug$2('matched indexes', matchedIndexes);
            // 遍历后续 markers，直到不再被当前text包含
            for (const matchedIndex of matchedIndexes) {
                add(walker.currentNode, matchedIndex, matchedIndex + mark.text.length);
            }
        }
        else if (mark.text.includes(text)) {
            // 包含在 mark 中的节点
            // 确定与块的 preText postText 相同
            add(walker.currentNode, 0, text.length);
        }
        else {
            const matchTextMark = endsIsStart(text, mark.text);
            // mark 与节点是部分包含关系
            // 开始段的情况，文本结束是 mark 的开始
            if (matchTextMark) {
                add(walker.currentNode, text.length - matchTextMark.length, text.length);
            }
            else {
                // 最后一段的情况，mark 结束是文本的开始
                const matchMarkText = endsIsStart(mark.text, text);
                if (matchMarkText) {
                    add(walker.currentNode, 0, matchMarkText.length);
                }
            }
        }
        allPreText += walker.currentNode.nodeValue;
        if (ranges.length && ranges[ranges.length - 1].end) {
            break;
        }
    }
    function filterInRange(ranges) {
        let startOffset = -1;
        let endOffset = -1;
        for (let i = 0; i < ranges.length; i++) {
            if (ranges[i].start) {
                startOffset = i;
            }
            if (ranges[i].end) {
                endOffset = i;
                break;
            }
        }
        return ranges.slice(startOffset, endOffset + 1);
    }
    return filterInRange(ranges);
}
function showMarkClips(markClips, root = _root) {
    if (!markClips || markClips.length === 0)
        return;
    let ranges = [];
    console.log('markclips', markClips.map(item => item.mark.text));
    markClips.forEach((markClip) => {
        debug$2('mark:', markClip.mark.text);
        const markRanges = findMarkRanges(markClip, root);
        console.log('markRanges', markRanges);
        ranges = [...ranges, ...markRanges];
    });
    for (const { range, id } of ranges) {
        wrapRange(range, id);
    }
}

const t$4 = useI18n();
const POPUP_ICON_ID = 'clearly-popup-icon';
const ICON_HTML = `<div class="clearly-popup-icon-img"></div><div class="clearly-popup-text">${t$4('clip.feature.clip').toUpperCase()}</div>`;
function removeIcon(id) {
    const icon = document.getElementById(id);
    if (icon) {
        icon.parentElement?.removeChild(icon);
    }
}
function popupIcon(id, innerHTML, offset, onClick, beforeClick) {
    const icon = createIcon(id, innerHTML, onClick, beforeClick);
    icon.style.top = offset.top + 'px';
    icon.style.left = offset.left + 'px';
    document.body.appendChild(icon);
}
function createIcon(id, innerHTML, onClick, beforeClick) {
    let icon = document.getElementById(id);
    if (!icon) {
        icon = document.createElement('div');
        icon.setAttribute('id', id);
        icon.innerHTML = innerHTML;
        icon.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });
        icon.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        icon.addEventListener('click', async () => {
            beforeClick && beforeClick();
            assureLogin(onClick);
        });
    }
    return icon;
}

var css_248z$4 = "#clearly-edit-pop {\n  background-color: rgba(0, 0, 0, 0.9);\n  border-radius: 8px;\n  padding: 5px 12px;\n  color: #fff;\n  font-size: 14px;\n  display: inline-block;\n  position: relative;\n  cursor: pointer;\n  user-select: none;\n  position: absolute;\n  z-index: 999999999;\n}\n#clearly-edit-pop .clearly-edit-pop-remove {\n  cursor: pointer;\n}\n#clearly-edit-pop:after {\n  content: '';\n  display: block;\n  border-style: solid;\n  border-width: 5px;\n  border-color: transparent;\n  border-top-color: rgba(0, 0, 0, 0.9);\n  position: absolute;\n  margin-left: -5px;\n  bottom: -10px;\n  left: 50%;\n}\n";
styleInject(css_248z$4);

const EDIT_POP_ID = 'clearly-edit-pop';
const t$3 = useI18n();
function removeEditPop() {
    const div = document.getElementById(EDIT_POP_ID);
    if (div) {
        div.parentElement?.removeChild(div);
    }
}
function showEditPop(el, onRemove) {
    let div = document.getElementById(EDIT_POP_ID);
    if (!div) {
        div = document.createElement('div');
        div.setAttribute('id', EDIT_POP_ID);
        div.innerHTML = `<div class="clearly-edit-pop-remove">${t$3('clip.feature.remove')}</div>`;
        div.querySelector('.clearly-edit-pop-remove')?.addEventListener('click', () => {
            onRemove();
            removeDiv();
        });
    }
    function removeDiv() {
        if (div) {
            div.parentElement?.removeChild(div);
            document.body.removeEventListener('click', removeDiv);
        }
    }
    document.body.appendChild(div);
    const bound = el.getBoundingClientRect();
    const divBound = div.getBoundingClientRect();
    div.style.left = `${bound.left + bound.width / 2 - divBound.width / 2}px`;
    div.style.top = `${window.scrollY + bound.top - divBound.height}px`;
    document.body.addEventListener('click', removeDiv);
}

const t$2 = useI18n();
function createSelectionPopupIcon(e, onClick) {
    popupIcon(POPUP_ICON_ID, ICON_HTML, {
        left: e.pageX + 10,
        top: e.pageY - 10
    }, onClick, () => {
        removeIcon(POPUP_ICON_ID);
    });
}
function validSelection(selection) {
    if (!selection || !selection.rangeCount)
        return false;
    const range = selection.getRangeAt(0);
    if (!range || !range.toString().trim())
        return false;
    const rangeInsideEditable = Array.from(document.querySelectorAll('[contenteditable]')).some(container => {
        return container.contains(range.startContainer) || container.contains(range.endContainer);
    });
    if (rangeInsideEditable) {
        return false;
    }
    return true;
}
function getSelected() {
    if (window.getSelection) {
        return window.getSelection();
    }
    else if (document.getSelection) {
        return document.getSelection();
    }
    else {
        const selection = document.selection && document.selection.createRange();
        if (selection.text) {
            return selection.text;
        }
        return false;
    }
}
const markClipper = {
    type: 'mark',
    create(range) {
        const mark = {
            createdAt: Date.now(),
            text: range.toString(),
            preText: '',
            postText: '',
            startPos: 0,
            endPos: 0
        };
        const walker = document.createTreeWalker(document.body, // root node
        NodeFilter.SHOW_TEXT, // filtering only text nodes
        null);
        let matchStage = null;
        let textIndex = 0;
        let selectSize = 0;
        // let fullText = ''
        let preText = '';
        let endText = '';
        while (walker.nextNode()) {
            const currentNode = walker.currentNode;
            const text = currentNode.nodeValue;
            if (!text)
                continue;
            // fullText += text
            debug$2('savemark text', text);
            if (!matchStage) {
                if (range.startContainer === currentNode) {
                    const allPreText = preText + text.substring(0, range.startOffset);
                    matchStage = 'start';
                    mark.preText = allPreText.substring(allPreText.length - 10);
                    mark.startPos = textIndex + range.startOffset;
                    debug$2('savemark start', text);
                    if (range.startContainer !== range.endContainer) {
                        const startText = currentNode.nodeValue?.substring(range.startOffset).replace(/\s/gi, ' ').trim();
                        if (startText) {
                            selectSize += startText.length;
                        }
                        debug$2('savemark multiline', selectSize);
                        continue;
                    }
                }
            }
            if (matchStage === 'start') {
                if ((range.endContainer.nodeType === 3 && range.endContainer === currentNode) || range.startContainer === range.endContainer || selectSize >= mark.text.length) {
                    mark.endPos = textIndex + range.endOffset;
                    endText = text.substring(range.endOffset);
                    matchStage = 'end';
                    debug$2('savemark done', endText, range.endOffset);
                    continue;
                }
                selectSize += text.length;
            }
            else if (matchStage === 'end') {
                endText += text;
                mark.postText = endText.substring(0, 10);
                if (mark.postText.length === 10) {
                    matchStage = null;
                    endText = '';
                    debug$2('savemark end', text);
                }
            }
            textIndex += text.length;
            preText += text;
        }
        const clip = {
            type: 'mark',
            mark
        };
        return clip;
    },
    save() {
        const selection = getSelected();
        if (validSelection(selection)) {
            const range = selection.getRangeAt(0);
            if (range) {
                const clip = this.create(range);
                store.clips.push(clip);
                this.update();
                const clealyContent = window.ClearlyContent;
                if (clealyContent) {
                    clealyContent.saveToQueue(clip);
                }
            }
        }
    },
    init(showPop) {
        // document.body.addEventListener('DOMSubtreeModified', this.updateSelectClip)
        document.body.addEventListener('mousedown', () => {
            removeIcon(POPUP_ICON_ID);
        });
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains(MARK_CLASS)) {
                showEditPop(target, async () => {
                    const id = target.getAttribute(ATTR_CLIP_ID);
                    const clip = store.clips.find(item => item.id === id);
                    console.log('on click edit pop, clip:', clip);
                    if (clip) {
                        store.setCurrentClip(clip);
                        await store.removeCurrentClip();
                        uiProvider$1.toast(t$2('clip.pop.remove.success'));
                    }
                });
            }
        });
        document.body.addEventListener('mouseup', (e) => {
            const selection = getSelected();
            if (validSelection(selection)) {
                if (!showPop)
                    return;
                createSelectionPopupIcon(e, () => {
                    this.save();
                });
                setTimeout(() => {
                    // double check
                    if (!validSelection(getSelected())) {
                        removeIcon(POPUP_ICON_ID);
                    }
                });
            }
            else {
                removeIcon(POPUP_ICON_ID);
            }
        });
    },
    update() {
        const markClips = store.clips.filter(item => item.type === 'mark');
        this.removeAll();
        showMarkClips(markClips);
    },
    remove(id) {
        removeMark(id);
    },
    removeAll() {
        removeAllMarks();
    }
};

const CLASS_IMAGE_COLLECTED = 'clearly-image-collected';
const POPUP_IMAGE_ICON_ID = 'clearly-image-popup-icon';
const t$1 = useI18n();
function createImagePopupIcon(e, onClick) {
    const img = e.target;
    const rect = img.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) {
        return;
    }
    popupIcon(POPUP_IMAGE_ICON_ID, ICON_HTML, {
        left: rect.left + window.scrollX + rect.width - 88 + 10,
        top: rect.top + window.scrollY - 10
    }, onClick, () => {
        removeIcon(POPUP_IMAGE_ICON_ID);
    });
}
function markPhoto(img, id) {
    img.classList.add(CLASS_IMAGE_COLLECTED);
    if (id) {
        img.setAttribute(ATTR_CLIP_ID, id);
    }
}
const photoClipper = {
    type: 'photo',
    create(img) {
        const clip = { type: 'photo', photo: { url: img.src, width: img.width, height: img.height } };
        return clip;
    },
    save(src) {
        const img = document.querySelector('img[src="' + src + '"]');
        if (img) {
            const clip = this.create(img);
            store.clips.push(clip);
            this.update();
            const clealyContent = window.ClearlyContent;
            if (clealyContent) {
                clealyContent.saveToQueue(clip);
            }
        }
    },
    init(showPop) {
        let timeout;
        document.body.addEventListener('DOMSubtreeModified', this.update);
        document.body.addEventListener('mouseover', (e) => {
            const target = e.target;
            if (target.id === POPUP_IMAGE_ICON_ID || target.id === EDIT_POP_ID) {
                clearTimeout(timeout);
                return;
            }
            if (target.tagName === 'IMG') {
                if (!target.classList.contains(CLASS_IMAGE_COLLECTED)) {
                    if (!showPop)
                        return;
                    clearTimeout(timeout);
                    createImagePopupIcon(e, async () => {
                        const img = e.target;
                        let newClip = this.create(img);
                        const exists = store.clips.some(clip => clip.type === 'photo' && newClip.photo?.url === clip.photo.url);
                        // 保护一下，理论上因为新增了class，不会重复添加
                        if (!exists) {
                            store.clips.push(newClip);
                            this.update();
                            newClip = await window.ClearlyContent.saveToQueue(newClip);
                        }
                        else {
                            this.update();
                        }
                    });
                }
                else {
                    showEditPop(target, async () => {
                        const url = target.getAttribute('src');
                        const clip = store.clips.find(clip => clip.type === 'photo' && clip.photo.url === url);
                        if (clip) {
                            store.setCurrentClip(clip);
                            await store.removeCurrentClip();
                        }
                        target.classList.remove(CLASS_IMAGE_COLLECTED);
                        uiProvider$1.toast(t$1('clip.pop.remove.success'));
                    });
                }
            }
        });
        document.body.addEventListener('mouseout', (e) => {
            if (e.target.tagName === 'IMG') {
                timeout = setTimeout(() => {
                    removeIcon(POPUP_IMAGE_ICON_ID);
                    removeEditPop();
                }, 100);
            }
        });
    },
    update() {
        const photoClips = store.clips.filter(item => item.type === 'photo');
        debug$2('photoClips', photoClips);
        document.querySelectorAll('img').forEach((el) => {
            const matchedClip = photoClips.find(clip => clip.photo.url === el.src);
            if (matchedClip) {
                markPhoto(el, matchedClip.id);
            }
            else {
                el.classList.remove(CLASS_IMAGE_COLLECTED);
            }
        });
    },
    remove(id) {
        document.querySelector(`[${ATTR_CLIP_ID}="${id}"]`)?.classList.remove(CLASS_IMAGE_COLLECTED);
    },
    removeAll() {
        document.querySelectorAll('img').forEach((el) => {
            if (el.classList.contains(CLASS_IMAGE_COLLECTED)) {
                el.classList.remove(CLASS_IMAGE_COLLECTED);
                el.removeAttribute(ATTR_CLIP_ID);
            }
        });
    }
};

const t = useI18n();
const VIDEO_ICON_ID = 'clearly-video-icon';
const VIDEO_HTML = `<div class="clearly-popup-icon-img"></div><div class="clearly-popup-text">${t('clip.feature.clip')}</div>`;
const VIDEO_SAVED_HTML = `<div class="clearly-popup-icon-img"></div><div class="clearly-popup-text">${t('clip.feature.clipped')}</div>`;
const VIDEO_SAVED_CLASS = 'clearly-video-collected';
function hasVideoClip() {
    return store.clips.some(clip => clip.type === 'video');
}
function createVideoCollectedIcon(onVideoButtonClicked) {
    const icon = createIcon(VIDEO_ICON_ID, VIDEO_SAVED_HTML, onVideoButtonClicked);
    icon.classList.add(VIDEO_SAVED_CLASS);
    return icon;
}
function createVideoIcon(onVideoButtonClicked) {
    return createIcon(VIDEO_ICON_ID, VIDEO_HTML, onVideoButtonClicked);
}
const videoClipper = {
    type: 'video',
    create() {
        const videoID = new URL(location.href).searchParams.get('v');
        const durationText = document.querySelector('.ytp-time-duration')?.innerHTML.trim() || '';
        const [seconds, minutes, hours] = durationText.split(':').reverse().map(text => +text);
        const duration = seconds + minutes * 60 + hours * 60 * 60;
        const clip = {
            type: 'video',
            url: location.href,
            video: {
                coverUrl: `https://img.youtube.com/vi/${videoID}/maxresdefault.jpg`,
                duration
            }
        };
        return clip;
    },
    save(params) {
    },
    init() {
        if (location.host.includes('youtube.com')) {
            const onVideoButtonClicked = async () => {
                if (icon.classList.contains(VIDEO_SAVED_CLASS)) {
                    if (confirm(t('clip.video.remove.confirm'))) {
                        await store.removeCurrentClip();
                        uiProvider$1.toast(t('clip.pop.remove.success'));
                    }
                    return;
                }
                else {
                    // 保护一下，理论上因为新增了class，不会重复添加
                    if (!hasVideoClip()) {
                        const newClip = this.create();
                        window.ClearlyContent.saveToQueue(newClip);
                    }
                    icon.innerHTML = VIDEO_SAVED_HTML;
                    icon.classList.add(VIDEO_SAVED_CLASS);
                }
            };
            const icon = (() => {
                const _hasVideoClip = hasVideoClip();
                if (_hasVideoClip) {
                    const icon = createIcon(VIDEO_ICON_ID, VIDEO_SAVED_HTML, onVideoButtonClicked);
                    icon.classList.add(VIDEO_SAVED_CLASS);
                    return createVideoCollectedIcon(onVideoButtonClicked);
                }
                else {
                    return createVideoIcon(onVideoButtonClicked);
                }
            })();
            const tryToAddIcon = () => {
                const buttons = document.querySelector('#top-level-buttons-computed');
                const container = buttons?.parentElement;
                if (buttons && container && container.firstChild !== icon) {
                    const container = buttons.parentElement;
                    container.prepend(icon);
                    console.log('video button ADD!');
                }
            };
            window.addEventListener('load', tryToAddIcon);
            document.addEventListener('DOMContentLoaded', tryToAddIcon);
            document.body.addEventListener('DOMSubtreeModified', tryToAddIcon);
        }
    },
    update() {
        if (hasVideoClip()) {
            const icon = document.getElementById(VIDEO_ICON_ID);
            if (icon) {
                icon.innerHTML = VIDEO_SAVED_HTML;
                icon.classList.add(VIDEO_SAVED_CLASS);
            }
        }
    },
    remove(id) {
        this.removeAll();
    },
    removeAll() {
        const icon = document.getElementById(VIDEO_ICON_ID);
        if (icon) {
            icon.innerHTML = VIDEO_HTML;
            icon.classList.remove(VIDEO_SAVED_CLASS);
        }
    }
};

var css_248z$3 = ":root {\n  --color-yellow: #FFD76F;\n  --color-green: #34FFB6;\n  --color-black: rgba(0, 0, 0, 0.9);\n  --color-border: rgba(255, 255, 255, 0.1);\n  --color-icon: rgba(255, 255, 255, 0.6);\n  --color-icon-hover: rgba(255, 255, 255, 0.8);\n  --color-text-gray: rgba(255, 255, 255, 0.6);\n  --color-placeholder: rgba(255, 255, 255, 0.6);\n  --color-light-hover: rgba(255, 255, 255, 0.1);\n}\n.clearly-mark {\n  background-color: var(--color-yellow);\n  color: black;\n  cursor: pointer;\n}\n.clearly-image-collected {\n  border-left: 8px solid var(--color-yellow);\n}\n#clearly-image-popup-icon,\n#clearly-popup-icon {\n  background: #1C1A1A;\n  position: absolute;\n  border-radius: 8px;\n  border: 1px solid #C1C1C1;\n  cursor: pointer;\n  z-index: 2147483648;\n  overflow: hidden;\n  display: flex;\n  align-items: center;\n  transition: all 0.2s linear;\n}\n#clearly-image-popup-icon:hover,\n#clearly-popup-icon:hover {\n  background-color: #000;\n}\n#clearly-image-popup-icon .clearly-popup-icon-img,\n#clearly-popup-icon .clearly-popup-icon-img {\n  width: 32px;\n  height: 32px;\n  background-size: 24px 24px;\n  background-repeat: no-repeat;\n  background-position: center;\n  border-right: 1px solid rgba(255, 255, 255, 0.2);\n  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGrSURBVHgB7ZjRUcMwDIYVjgGyQbsBGSFswAbpJskGsEHYADbIMQHZIOkEhQmEfPZxIaRK5To2x+m700MTS9Xv2JZtAEVRFEVR/imImBuDDckgEC7RiqwgK8n2syY92Uj2SvaWZdno/A6Tth/0/Ali4nq5JjuhjJpsP3s2QExcAgOGQyzgFjyhPzNDpSPjxnjv7Oja3YEdYpvOi1Uu6PmOrGR8m1BfwFfAM5P8y4UxmiQCTM8yyQ+mhwWxuhQCOkZAK4xVRhWAv5e9OYUwpIl5ukaAdBXiEjRFqAc592BXpdHEACFSASXzzid58BT9zQ3I2DHvRkiAVEDaArSAVADHERIQUsAOEiAVIF4ltkYq4JN5J64BIZAK4Ja8PXjgimMl2YJ4YyrtSiUuQQj5HKaVGDc+gq7thTphrBx/bstF/l7Meuyqr0BtH2e+FcRg5SuYzVmx4p8vJB/vPIx24q0d4lu02+V84mN+12d84/T+RESB8puIczSQAgxzK9FAStCO58ZDyIAey+6mUEIPaA/870zSbcjEg10tLoF2Ahszp7U/t49SFEVRlOR8AQxUBgYyQX2vAAAAAElFTkSuQmCC');\n}\n#clearly-image-popup-icon .clearly-popup-text,\n#clearly-popup-icon .clearly-popup-text {\n  padding: 0 10px;\n  color: rgba(255, 255, 255, 0.8);\n}\n#clearly-video-icon {\n  cursor: pointer;\n  background: #2C2828;\n  display: inline-block;\n  align-items: center;\n  margin: 0 8px;\n  border-radius: 18px;\n  height: 36px;\n  position: relative;\n  box-sizing: border-box;\n  border: 2px solid rgba(255, 255, 255, 0.5);\n  transition: all 0.2s linear;\n}\n#clearly-video-icon:hover {\n  background-color: #000;\n}\n#clearly-video-icon .clearly-popup-icon-img {\n  position: absolute;\n  left: 4px;\n  top: 50%;\n  margin-top: -12px;\n  width: 24px;\n  height: 24px;\n  background-size: contain;\n  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGrSURBVHgB7ZjRUcMwDIYVjgGyQbsBGSFswAbpJskGsEHYADbIMQHZIOkEhQmEfPZxIaRK5To2x+m700MTS9Xv2JZtAEVRFEVR/imImBuDDckgEC7RiqwgK8n2syY92Uj2SvaWZdno/A6Tth/0/Ali4nq5JjuhjJpsP3s2QExcAgOGQyzgFjyhPzNDpSPjxnjv7Oja3YEdYpvOi1Uu6PmOrGR8m1BfwFfAM5P8y4UxmiQCTM8yyQ+mhwWxuhQCOkZAK4xVRhWAv5e9OYUwpIl5ukaAdBXiEjRFqAc592BXpdHEACFSASXzzid58BT9zQ3I2DHvRkiAVEDaArSAVADHERIQUsAOEiAVIF4ltkYq4JN5J64BIZAK4Ja8PXjgimMl2YJ4YyrtSiUuQQj5HKaVGDc+gq7thTphrBx/bstF/l7Meuyqr0BtH2e+FcRg5SuYzVmx4p8vJB/vPIx24q0d4lu02+V84mN+12d84/T+RESB8puIczSQAgxzK9FAStCO58ZDyIAey+6mUEIPaA/870zSbcjEg10tLoF2Ahszp7U/t49SFEVRlOR8AQxUBgYyQX2vAAAAAElFTkSuQmCC');\n}\n#clearly-video-icon .clearly-popup-text {\n  padding-left: 32px;\n  padding-right: 12px;\n  font-family: sans-serif;\n  font-size: 14px;\n  line-height: 32px;\n  height: 32px;\n  color: #FFFFFF;\n}\n";
styleInject(css_248z$3);

const clippers = [markClipper, videoClipper, photoClipper];
class ClearlyClip {
    // on start
    static async loadPageClips() {
        return await store.loadPageClips({
            title: document.title,
            url: location.href
        });
    }
    static listenRemoveUpdateEvent() {
        bus.on(EVENT_CLIP_REMOVED, (event) => {
            const { id, type } = event;
            clippers.forEach(clipper => {
                if (clipper.type === type) {
                    clipper.remove(id);
                }
            });
        });
        bus.on(EVENT_CLIP_UPDATED, (event) => {
            const { type } = event;
            clippers.forEach(clipper => {
                if (clipper.type === type) {
                    clipper.update();
                }
            });
        });
    }
    static updateClippers() {
        clippers.forEach(clipper => {
            clipper.update();
        });
    }
    static clipMark() {
        markClipper.save();
    }
    static clipPhoto(src) {
        photoClipper.save(src);
    }
    static initClippers(config) {
        clippers.forEach(clipper => {
            clipper.init(config.readerConfig.clipPopup);
        });
    }
    static async bootstrap(config) {
        this.initClippers(config);
        if (await isLogin()) {
            await this.loadPageClips();
        }
        bus.on(EVENT_LOGIN_SUCCESS, async () => {
            await this.loadPageClips();
            this.updateClippers();
        });
        bus.on(EVENT_LOGOUT, async () => {
            store.clearAll();
            clippers.forEach(clipper => {
                clipper.removeAll();
            });
        });
        this.updateClippers();
        this.listenRemoveUpdateEvent();
    }
}

var isVue2 = false;

function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
}
function getTarget() {
    // @ts-ignore
    return (typeof navigator !== 'undefined' && typeof window !== 'undefined')
        ? window
        : typeof global !== 'undefined'
            ? global
            : {};
}
const isProxyAvailable = typeof Proxy === 'function';

const HOOK_SETUP = 'devtools-plugin:setup';
const HOOK_PLUGIN_SETTINGS_SET = 'plugin:settings:set';

let supported;
let perf;
function isPerformanceSupported() {
    var _a;
    if (supported !== undefined) {
        return supported;
    }
    if (typeof window !== 'undefined' && window.performance) {
        supported = true;
        perf = window.performance;
    }
    else if (typeof global !== 'undefined' && ((_a = global.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
        supported = true;
        perf = global.perf_hooks.performance;
    }
    else {
        supported = false;
    }
    return supported;
}
function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
}

class ApiProxy {
    constructor(plugin, hook) {
        this.target = null;
        this.targetQueue = [];
        this.onQueue = [];
        this.plugin = plugin;
        this.hook = hook;
        const defaultSettings = {};
        if (plugin.settings) {
            for (const id in plugin.settings) {
                const item = plugin.settings[id];
                defaultSettings[id] = item.defaultValue;
            }
        }
        const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
        let currentSettings = Object.assign({}, defaultSettings);
        try {
            const raw = localStorage.getItem(localSettingsSaveId);
            const data = JSON.parse(raw);
            Object.assign(currentSettings, data);
        }
        catch (e) {
            // noop
        }
        this.fallbacks = {
            getSettings() {
                return currentSettings;
            },
            setSettings(value) {
                try {
                    localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
                }
                catch (e) {
                    // noop
                }
                currentSettings = value;
            },
            now() {
                return now();
            },
        };
        if (hook) {
            hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
                if (pluginId === this.plugin.id) {
                    this.fallbacks.setSettings(value);
                }
            });
        }
        this.proxiedOn = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target.on[prop];
                }
                else {
                    return (...args) => {
                        this.onQueue.push({
                            method: prop,
                            args,
                        });
                    };
                }
            },
        });
        this.proxiedTarget = new Proxy({}, {
            get: (_target, prop) => {
                if (this.target) {
                    return this.target[prop];
                }
                else if (prop === 'on') {
                    return this.proxiedOn;
                }
                else if (Object.keys(this.fallbacks).includes(prop)) {
                    return (...args) => {
                        this.targetQueue.push({
                            method: prop,
                            args,
                            resolve: () => { },
                        });
                        return this.fallbacks[prop](...args);
                    };
                }
                else {
                    return (...args) => {
                        return new Promise(resolve => {
                            this.targetQueue.push({
                                method: prop,
                                args,
                                resolve,
                            });
                        });
                    };
                }
            },
        });
    }
    async setRealTarget(target) {
        this.target = target;
        for (const item of this.onQueue) {
            this.target.on[item.method](...item.args);
        }
        for (const item of this.targetQueue) {
            item.resolve(await this.target[item.method](...item.args));
        }
    }
}

function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
        hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    }
    else {
        const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
        const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
        list.push({
            pluginDescriptor: descriptor,
            setupFn,
            proxy,
        });
        if (proxy)
            setupFn(proxy.proxiedTarget);
    }
}

/*!
  * pinia v2.0.33
  * (c) 2023 Eduardo San Martin Morote
  * @license MIT
  */

/**
 * setActivePinia must be called to handle SSR at the top of functions like
 * `fetch`, `setup`, `serverPrefetch` and others
 */
let activePinia;
/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
const setActivePinia = (pinia) => (activePinia = pinia);
const piniaSymbol = (/* istanbul ignore next */ Symbol());

function isPlainObject(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
o) {
    return (o &&
        typeof o === 'object' &&
        Object.prototype.toString.call(o) === '[object Object]' &&
        typeof o.toJSON !== 'function');
}
// type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
// TODO: can we change these to numbers?
/**
 * Possible types for SubscriptionCallback
 */
var MutationType;
(function (MutationType) {
    /**
     * Direct mutation of the state:
     *
     * - `store.name = 'new name'`
     * - `store.$state.name = 'new name'`
     * - `store.list.push('new item')`
     */
    MutationType["direct"] = "direct";
    /**
     * Mutated the state with `$patch` and an object
     *
     * - `store.$patch({ name: 'newName' })`
     */
    MutationType["patchObject"] = "patch object";
    /**
     * Mutated the state with `$patch` and a function
     *
     * - `store.$patch(state => state.name = 'newName')`
     */
    MutationType["patchFunction"] = "patch function";
    // maybe reset? for $state = {} and $reset
})(MutationType || (MutationType = {}));

const IS_CLIENT = typeof window !== 'undefined';
/**
 * Should we add the devtools plugins.
 * - only if dev mode or forced through the prod devtools flag
 * - not in test
 * - only if window exists (could change in the future)
 */
const USE_DEVTOOLS = ((typeof __VUE_PROD_DEVTOOLS__ !== 'undefined' && __VUE_PROD_DEVTOOLS__)) && !("production" === 'test') && IS_CLIENT;

/*
 * FileSaver.js A saveAs() FileSaver implementation.
 *
 * Originally by Eli Grey, adapted as an ESM module by Eduardo San Martin
 * Morote.
 *
 * License : MIT
 */
// The one and only way of getting global scope in all environments
// https://stackoverflow.com/q/3277182/1008999
const _global = /*#__PURE__*/ (() => typeof window === 'object' && window.window === window
    ? window
    : typeof self === 'object' && self.self === self
        ? self
        : typeof global === 'object' && global.global === global
            ? global
            : typeof globalThis === 'object'
                ? globalThis
                : { HTMLElement: null })();
function bom(blob, { autoBom = false } = {}) {
    // prepend BOM for UTF-8 XML and text/* types (including HTML)
    // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
    if (autoBom &&
        /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
        return new Blob([String.fromCharCode(0xfeff), blob], { type: blob.type });
    }
    return blob;
}
function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.onload = function () {
        saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function () {
        console.error('could not download file');
    };
    xhr.send();
}
function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    // use sync to avoid popup blocker
    xhr.open('HEAD', url, false);
    try {
        xhr.send();
    }
    catch (e) { }
    return xhr.status >= 200 && xhr.status <= 299;
}
// `a.click()` doesn't work for all browsers (#465)
function click(node) {
    try {
        node.dispatchEvent(new MouseEvent('click'));
    }
    catch (e) {
        const evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
        node.dispatchEvent(evt);
    }
}
const _navigator = 
 typeof navigator === 'object' ? navigator : { userAgent: '' };
// Detect WebView inside a native macOS app by ruling out all browsers
// We just need to check for 'Safari' because all other browsers (besides Firefox) include that too
// https://www.whatismybrowser.com/guides/the-latest-user-agent/macos
const isMacOSWebView = /*#__PURE__*/ (() => /Macintosh/.test(_navigator.userAgent) &&
    /AppleWebKit/.test(_navigator.userAgent) &&
    !/Safari/.test(_navigator.userAgent))();
const saveAs = !IS_CLIENT
    ? () => { } // noop
    : // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
        typeof HTMLAnchorElement !== 'undefined' &&
            'download' in HTMLAnchorElement.prototype &&
            !isMacOSWebView
            ? downloadSaveAs
            : // Use msSaveOrOpenBlob as a second approach
                'msSaveOrOpenBlob' in _navigator
                    ? msSaveAs
                    : // Fallback to using FileReader and a popup
                        fileSaverSaveAs;
function downloadSaveAs(blob, name = 'download', opts) {
    const a = document.createElement('a');
    a.download = name;
    a.rel = 'noopener'; // tabnabbing
    // TODO: detect chrome extensions & packaged apps
    // a.target = '_blank'
    if (typeof blob === 'string') {
        // Support regular links
        a.href = blob;
        if (a.origin !== location.origin) {
            if (corsEnabled(a.href)) {
                download(blob, name, opts);
            }
            else {
                a.target = '_blank';
                click(a);
            }
        }
        else {
            click(a);
        }
    }
    else {
        // Support blobs
        a.href = URL.createObjectURL(blob);
        setTimeout(function () {
            URL.revokeObjectURL(a.href);
        }, 4e4); // 40s
        setTimeout(function () {
            click(a);
        }, 0);
    }
}
function msSaveAs(blob, name = 'download', opts) {
    if (typeof blob === 'string') {
        if (corsEnabled(blob)) {
            download(blob, name, opts);
        }
        else {
            const a = document.createElement('a');
            a.href = blob;
            a.target = '_blank';
            setTimeout(function () {
                click(a);
            });
        }
    }
    else {
        // @ts-ignore: works on windows
        navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
}
function fileSaverSaveAs(blob, name, opts, popup) {
    // Open a popup immediately do go around popup blocker
    // Mostly only available on user interaction and the fileReader is async so...
    popup = popup || open('', '_blank');
    if (popup) {
        popup.document.title = popup.document.body.innerText = 'downloading...';
    }
    if (typeof blob === 'string')
        return download(blob, name, opts);
    const force = blob.type === 'application/octet-stream';
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || 'safari' in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || (force && isSafari) || isMacOSWebView) &&
        typeof FileReader !== 'undefined') {
        // Safari doesn't allow downloading of blob URLs
        const reader = new FileReader();
        reader.onloadend = function () {
            let url = reader.result;
            if (typeof url !== 'string') {
                popup = null;
                throw new Error('Wrong reader.result type');
            }
            url = isChromeIOS
                ? url
                : url.replace(/^data:[^;]*;/, 'data:attachment/file;');
            if (popup) {
                popup.location.href = url;
            }
            else {
                location.assign(url);
            }
            popup = null; // reverse-tabnabbing #460
        };
        reader.readAsDataURL(blob);
    }
    else {
        const url = URL.createObjectURL(blob);
        if (popup)
            popup.location.assign(url);
        else
            location.href = url;
        popup = null; // reverse-tabnabbing #460
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 4e4); // 40s
    }
}

/**
 * Shows a toast or console.log
 *
 * @param message - message to log
 * @param type - different color of the tooltip
 */
function toastMessage(message, type) {
    const piniaMessage = '🍍 ' + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === 'function') {
        __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    }
    else if (type === 'error') {
        console.error(piniaMessage);
    }
    else if (type === 'warn') {
        console.warn(piniaMessage);
    }
    else {
        console.log(piniaMessage);
    }
}
function isPinia(o) {
    return '_a' in o && 'install' in o;
}

function checkClipboardAccess() {
    if (!('clipboard' in navigator)) {
        toastMessage(`Your browser doesn't support the Clipboard API`, 'error');
        return true;
    }
}
function checkNotFocusedError(error) {
    if (error instanceof Error &&
        error.message.toLowerCase().includes('document is not focused')) {
        toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', 'warn');
        return true;
    }
    return false;
}
async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
        return;
    try {
        await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
        toastMessage('Global state copied to clipboard.');
    }
    catch (error) {
        if (checkNotFocusedError(error))
            return;
        toastMessage(`Failed to serialize the state. Check the console for more details.`, 'error');
        console.error(error);
    }
}
async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
        return;
    try {
        pinia.state.value = JSON.parse(await navigator.clipboard.readText());
        toastMessage('Global state pasted from clipboard.');
    }
    catch (error) {
        if (checkNotFocusedError(error))
            return;
        toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, 'error');
        console.error(error);
    }
}
async function actionGlobalSaveState(pinia) {
    try {
        saveAs(new Blob([JSON.stringify(pinia.state.value)], {
            type: 'text/plain;charset=utf-8',
        }), 'pinia-state.json');
    }
    catch (error) {
        toastMessage(`Failed to export the state as JSON. Check the console for more details.`, 'error');
        console.error(error);
    }
}
let fileInput;
function getFileOpener() {
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
    }
    function openFile() {
        return new Promise((resolve, reject) => {
            fileInput.onchange = async () => {
                const files = fileInput.files;
                if (!files)
                    return resolve(null);
                const file = files.item(0);
                if (!file)
                    return resolve(null);
                return resolve({ text: await file.text(), file });
            };
            // @ts-ignore: TODO: changed from 4.3 to 4.4
            fileInput.oncancel = () => resolve(null);
            fileInput.onerror = reject;
            fileInput.click();
        });
    }
    return openFile;
}
async function actionGlobalOpenStateFile(pinia) {
    try {
        const open = await getFileOpener();
        const result = await open();
        if (!result)
            return;
        const { text, file } = result;
        pinia.state.value = JSON.parse(text);
        toastMessage(`Global state imported from "${file.name}".`);
    }
    catch (error) {
        toastMessage(`Failed to export the state as JSON. Check the console for more details.`, 'error');
        console.error(error);
    }
}

function formatDisplay(display) {
    return {
        _custom: {
            display,
        },
    };
}
const PINIA_ROOT_LABEL = '🍍 Pinia (root)';
const PINIA_ROOT_ID = '_root';
function formatStoreForInspectorTree(store) {
    return isPinia(store)
        ? {
            id: PINIA_ROOT_ID,
            label: PINIA_ROOT_LABEL,
        }
        : {
            id: store.$id,
            label: store.$id,
        };
}
function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
        const storeNames = Array.from(store._s.keys());
        const storeMap = store._s;
        const state = {
            state: storeNames.map((storeId) => ({
                editable: true,
                key: storeId,
                value: store.state.value[storeId],
            })),
            getters: storeNames
                .filter((id) => storeMap.get(id)._getters)
                .map((id) => {
                const store = storeMap.get(id);
                return {
                    editable: false,
                    key: id,
                    value: store._getters.reduce((getters, key) => {
                        getters[key] = store[key];
                        return getters;
                    }, {}),
                };
            }),
        };
        return state;
    }
    const state = {
        state: Object.keys(store.$state).map((key) => ({
            editable: true,
            key,
            value: store.$state[key],
        })),
    };
    // avoid adding empty getters
    if (store._getters && store._getters.length) {
        state.getters = store._getters.map((getterName) => ({
            editable: false,
            key: getterName,
            value: store[getterName],
        }));
    }
    if (store._customProperties.size) {
        state.customProperties = Array.from(store._customProperties).map((key) => ({
            editable: true,
            key,
            value: store[key],
        }));
    }
    return state;
}
function formatEventData(events) {
    if (!events)
        return {};
    if (Array.isArray(events)) {
        // TODO: handle add and delete for arrays and objects
        return events.reduce((data, event) => {
            data.keys.push(event.key);
            data.operations.push(event.type);
            data.oldValue[event.key] = event.oldValue;
            data.newValue[event.key] = event.newValue;
            return data;
        }, {
            oldValue: {},
            keys: [],
            operations: [],
            newValue: {},
        });
    }
    else {
        return {
            operation: formatDisplay(events.type),
            key: formatDisplay(events.key),
            oldValue: events.oldValue,
            newValue: events.newValue,
        };
    }
}
function formatMutationType(type) {
    switch (type) {
        case MutationType.direct:
            return 'mutation';
        case MutationType.patchFunction:
            return '$patch';
        case MutationType.patchObject:
            return '$patch';
        default:
            return 'unknown';
    }
}

// timeline can be paused when directly changing the state
let isTimelineActive = true;
const componentStateTypes = [];
const MUTATIONS_LAYER_ID = 'pinia:mutations';
const INSPECTOR_ID = 'pinia';
const { assign: assign$1 } = Object;
/**
 * Gets the displayed name of a store in devtools
 *
 * @param id - id of the store
 * @returns a formatted string
 */
const getStoreType = (id) => '🍍 ' + id;
/**
 * Add the pinia plugin without any store. Allows displaying a Pinia plugin tab
 * as soon as it is added to the application.
 *
 * @param app - Vue application
 * @param pinia - pinia instance
 */
function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
        id: 'dev.esm.pinia',
        label: 'Pinia 🍍',
        logo: 'https://pinia.vuejs.org/logo.svg',
        packageName: 'pinia',
        homepage: 'https://pinia.vuejs.org',
        componentStateTypes,
        app,
    }, (api) => {
        if (typeof api.now !== 'function') {
            toastMessage('You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.');
        }
        api.addTimelineLayer({
            id: MUTATIONS_LAYER_ID,
            label: `Pinia 🍍`,
            color: 0xe5df88,
        });
        api.addInspector({
            id: INSPECTOR_ID,
            label: 'Pinia 🍍',
            icon: 'storage',
            treeFilterPlaceholder: 'Search stores',
            actions: [
                {
                    icon: 'content_copy',
                    action: () => {
                        actionGlobalCopyState(pinia);
                    },
                    tooltip: 'Serialize and copy the state',
                },
                {
                    icon: 'content_paste',
                    action: async () => {
                        await actionGlobalPasteState(pinia);
                        api.sendInspectorTree(INSPECTOR_ID);
                        api.sendInspectorState(INSPECTOR_ID);
                    },
                    tooltip: 'Replace the state with the content of your clipboard',
                },
                {
                    icon: 'save',
                    action: () => {
                        actionGlobalSaveState(pinia);
                    },
                    tooltip: 'Save the state as a JSON file',
                },
                {
                    icon: 'folder_open',
                    action: async () => {
                        await actionGlobalOpenStateFile(pinia);
                        api.sendInspectorTree(INSPECTOR_ID);
                        api.sendInspectorState(INSPECTOR_ID);
                    },
                    tooltip: 'Import the state from a JSON file',
                },
            ],
            nodeActions: [
                {
                    icon: 'restore',
                    tooltip: 'Reset the state (option store only)',
                    action: (nodeId) => {
                        const store = pinia._s.get(nodeId);
                        if (!store) {
                            toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, 'warn');
                        }
                        else if (!store._isOptionsAPI) {
                            toastMessage(`Cannot reset "${nodeId}" store because it's a setup store.`, 'warn');
                        }
                        else {
                            store.$reset();
                            toastMessage(`Store "${nodeId}" reset.`);
                        }
                    },
                },
            ],
        });
        api.on.inspectComponent((payload, ctx) => {
            const proxy = (payload.componentInstance &&
                payload.componentInstance.proxy);
            if (proxy && proxy._pStores) {
                const piniaStores = payload.componentInstance.proxy._pStores;
                Object.values(piniaStores).forEach((store) => {
                    payload.instanceData.state.push({
                        type: getStoreType(store.$id),
                        key: 'state',
                        editable: true,
                        value: store._isOptionsAPI
                            ? {
                                _custom: {
                                    value: toRaw(store.$state),
                                    actions: [
                                        {
                                            icon: 'restore',
                                            tooltip: 'Reset the state of this store',
                                            action: () => store.$reset(),
                                        },
                                    ],
                                },
                            }
                            : // NOTE: workaround to unwrap transferred refs
                                Object.keys(store.$state).reduce((state, key) => {
                                    state[key] = store.$state[key];
                                    return state;
                                }, {}),
                    });
                    if (store._getters && store._getters.length) {
                        payload.instanceData.state.push({
                            type: getStoreType(store.$id),
                            key: 'getters',
                            editable: false,
                            value: store._getters.reduce((getters, key) => {
                                try {
                                    getters[key] = store[key];
                                }
                                catch (error) {
                                    // @ts-expect-error: we just want to show it in devtools
                                    getters[key] = error;
                                }
                                return getters;
                            }, {}),
                        });
                    }
                });
            }
        });
        api.on.getInspectorTree((payload) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                let stores = [pinia];
                stores = stores.concat(Array.from(pinia._s.values()));
                payload.rootNodes = (payload.filter
                    ? stores.filter((store) => '$id' in store
                        ? store.$id
                            .toLowerCase()
                            .includes(payload.filter.toLowerCase())
                        : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase()))
                    : stores).map(formatStoreForInspectorTree);
            }
        });
        api.on.getInspectorState((payload) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                const inspectedStore = payload.nodeId === PINIA_ROOT_ID
                    ? pinia
                    : pinia._s.get(payload.nodeId);
                if (!inspectedStore) {
                    // this could be the selected store restored for a different project
                    // so it's better not to say anything here
                    return;
                }
                if (inspectedStore) {
                    payload.state = formatStoreForInspectorState(inspectedStore);
                }
            }
        });
        api.on.editInspectorState((payload, ctx) => {
            if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
                const inspectedStore = payload.nodeId === PINIA_ROOT_ID
                    ? pinia
                    : pinia._s.get(payload.nodeId);
                if (!inspectedStore) {
                    return toastMessage(`store "${payload.nodeId}" not found`, 'error');
                }
                const { path } = payload;
                if (!isPinia(inspectedStore)) {
                    // access only the state
                    if (path.length !== 1 ||
                        !inspectedStore._customProperties.has(path[0]) ||
                        path[0] in inspectedStore.$state) {
                        path.unshift('$state');
                    }
                }
                else {
                    // Root access, we can omit the `.value` because the devtools API does it for us
                    path.unshift('state');
                }
                isTimelineActive = false;
                payload.set(inspectedStore, path, payload.state.value);
                isTimelineActive = true;
            }
        });
        api.on.editComponentState((payload) => {
            if (payload.type.startsWith('🍍')) {
                const storeId = payload.type.replace(/^🍍\s*/, '');
                const store = pinia._s.get(storeId);
                if (!store) {
                    return toastMessage(`store "${storeId}" not found`, 'error');
                }
                const { path } = payload;
                if (path[0] !== 'state') {
                    return toastMessage(`Invalid path for store "${storeId}":\n${path}\nOnly state can be modified.`);
                }
                // rewrite the first entry to be able to directly set the state as
                // well as any other path
                path[0] = '$state';
                isTimelineActive = false;
                payload.set(store, path, payload.state.value);
                isTimelineActive = true;
            }
        });
    });
}
function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
        componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
        id: 'dev.esm.pinia',
        label: 'Pinia 🍍',
        logo: 'https://pinia.vuejs.org/logo.svg',
        packageName: 'pinia',
        homepage: 'https://pinia.vuejs.org',
        componentStateTypes,
        app,
        settings: {
            logStoreChanges: {
                label: 'Notify about new/deleted stores',
                type: 'boolean',
                defaultValue: true,
            },
            // useEmojis: {
            //   label: 'Use emojis in messages ⚡️',
            //   type: 'boolean',
            //   defaultValue: true,
            // },
        },
    }, (api) => {
        // gracefully handle errors
        const now = typeof api.now === 'function' ? api.now.bind(api) : Date.now;
        store.$onAction(({ after, onError, name, args }) => {
            const groupId = runningActionId++;
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: {
                    time: now(),
                    title: '🛫 ' + name,
                    subtitle: 'start',
                    data: {
                        store: formatDisplay(store.$id),
                        action: formatDisplay(name),
                        args,
                    },
                    groupId,
                },
            });
            after((result) => {
                activeAction = undefined;
                api.addTimelineEvent({
                    layerId: MUTATIONS_LAYER_ID,
                    event: {
                        time: now(),
                        title: '🛬 ' + name,
                        subtitle: 'end',
                        data: {
                            store: formatDisplay(store.$id),
                            action: formatDisplay(name),
                            args,
                            result,
                        },
                        groupId,
                    },
                });
            });
            onError((error) => {
                activeAction = undefined;
                api.addTimelineEvent({
                    layerId: MUTATIONS_LAYER_ID,
                    event: {
                        time: now(),
                        logType: 'error',
                        title: '💥 ' + name,
                        subtitle: 'end',
                        data: {
                            store: formatDisplay(store.$id),
                            action: formatDisplay(name),
                            args,
                            error,
                        },
                        groupId,
                    },
                });
            });
        }, true);
        store._customProperties.forEach((name) => {
            watch(() => unref(store[name]), (newValue, oldValue) => {
                api.notifyComponentUpdate();
                api.sendInspectorState(INSPECTOR_ID);
                if (isTimelineActive) {
                    api.addTimelineEvent({
                        layerId: MUTATIONS_LAYER_ID,
                        event: {
                            time: now(),
                            title: 'Change',
                            subtitle: name,
                            data: {
                                newValue,
                                oldValue,
                            },
                            groupId: activeAction,
                        },
                    });
                }
            }, { deep: true });
        });
        store.$subscribe(({ events, type }, state) => {
            api.notifyComponentUpdate();
            api.sendInspectorState(INSPECTOR_ID);
            if (!isTimelineActive)
                return;
            // rootStore.state[store.id] = state
            const eventData = {
                time: now(),
                title: formatMutationType(type),
                data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
                groupId: activeAction,
            };
            // reset for the next mutation
            activeAction = undefined;
            if (type === MutationType.patchFunction) {
                eventData.subtitle = '⤵️';
            }
            else if (type === MutationType.patchObject) {
                eventData.subtitle = '🧩';
            }
            else if (events && !Array.isArray(events)) {
                eventData.subtitle = events.type;
            }
            if (events) {
                eventData.data['rawEvent(s)'] = {
                    _custom: {
                        display: 'DebuggerEvent',
                        type: 'object',
                        tooltip: 'raw DebuggerEvent[]',
                        value: events,
                    },
                };
            }
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: eventData,
            });
        }, { detached: true, flush: 'sync' });
        const hotUpdate = store._hotUpdate;
        store._hotUpdate = markRaw((newStore) => {
            hotUpdate(newStore);
            api.addTimelineEvent({
                layerId: MUTATIONS_LAYER_ID,
                event: {
                    time: now(),
                    title: '🔥 ' + store.$id,
                    subtitle: 'HMR update',
                    data: {
                        store: formatDisplay(store.$id),
                        info: formatDisplay(`HMR update`),
                    },
                },
            });
            // update the devtools too
            api.notifyComponentUpdate();
            api.sendInspectorTree(INSPECTOR_ID);
            api.sendInspectorState(INSPECTOR_ID);
        });
        const { $dispose } = store;
        store.$dispose = () => {
            $dispose();
            api.notifyComponentUpdate();
            api.sendInspectorTree(INSPECTOR_ID);
            api.sendInspectorState(INSPECTOR_ID);
            api.getSettings().logStoreChanges &&
                toastMessage(`Disposed "${store.$id}" store 🗑`);
        };
        // trigger an update so it can display new registered stores
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges &&
            toastMessage(`"${store.$id}" store installed 🆕`);
    });
}
let runningActionId = 0;
let activeAction;
/**
 * Patches a store to enable action grouping in devtools by wrapping the store with a Proxy that is passed as the
 * context of all actions, allowing us to set `runningAction` on each access and effectively associating any state
 * mutation to the action.
 *
 * @param store - store to patch
 * @param actionNames - list of actionst to patch
 */
function patchActionForGrouping(store, actionNames) {
    // original actions of the store as they are given by pinia. We are going to override them
    const actions = actionNames.reduce((storeActions, actionName) => {
        // use toRaw to avoid tracking #541
        storeActions[actionName] = toRaw(store)[actionName];
        return storeActions;
    }, {});
    for (const actionName in actions) {
        store[actionName] = function () {
            // setActivePinia(store._p)
            // the running action id is incremented in a before action hook
            const _actionId = runningActionId;
            const trackedStore = new Proxy(store, {
                get(...args) {
                    activeAction = _actionId;
                    return Reflect.get(...args);
                },
                set(...args) {
                    activeAction = _actionId;
                    return Reflect.set(...args);
                },
            });
            return actions[actionName].apply(trackedStore, arguments);
        };
    }
}
/**
 * pinia.use(devtoolsPlugin)
 */
function devtoolsPlugin({ app, store, options }) {
    // HMR module
    if (store.$id.startsWith('__hot:')) {
        return;
    }
    // detect option api vs setup api
    if (options.state) {
        store._isOptionsAPI = true;
    }
    // only wrap actions in option-defined stores as this technique relies on
    // wrapping the context of the action with a proxy
    if (typeof options.state === 'function') {
        patchActionForGrouping(
        // @ts-expect-error: can cast the store...
        store, Object.keys(options.actions));
        const originalHotUpdate = store._hotUpdate;
        // Upgrade the HMR to also update the new actions
        toRaw(store)._hotUpdate = function (newStore) {
            originalHotUpdate.apply(this, arguments);
            patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions));
        };
    }
    addStoreToDevtools(app, 
    // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
    store);
}

/**
 * Creates a Pinia instance to be used by the application
 */
function createPinia() {
    const scope = effectScope(true);
    // NOTE: here we could check the window object for a state and directly set it
    // if there is anything like it with Vue 3 SSR
    const state = scope.run(() => ref({}));
    let _p = [];
    // plugins added before calling app.use(pinia)
    let toBeInstalled = [];
    const pinia = markRaw({
        install(app) {
            // this allows calling useStore() outside of a component setup after
            // installing pinia's plugin
            setActivePinia(pinia);
            {
                pinia._a = app;
                app.provide(piniaSymbol, pinia);
                app.config.globalProperties.$pinia = pinia;
                /* istanbul ignore else */
                if (USE_DEVTOOLS) {
                    registerPiniaDevtools(app, pinia);
                }
                toBeInstalled.forEach((plugin) => _p.push(plugin));
                toBeInstalled = [];
            }
        },
        use(plugin) {
            if (!this._a && !isVue2) {
                toBeInstalled.push(plugin);
            }
            else {
                _p.push(plugin);
            }
            return this;
        },
        _p,
        // it's actually undefined here
        // @ts-expect-error
        _a: null,
        _e: scope,
        _s: new Map(),
        state,
    });
    // pinia devtools rely on dev only features so they cannot be forced unless
    // the dev build of Vue is used. Avoid old browsers like IE11.
    if (USE_DEVTOOLS && typeof Proxy !== 'undefined') {
        pinia.use(devtoolsPlugin);
    }
    return pinia;
}

const noop = () => { };
function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
        const idx = subscriptions.indexOf(callback);
        if (idx > -1) {
            subscriptions.splice(idx, 1);
            onCleanup();
        }
    };
    if (!detached && getCurrentScope()) {
        onScopeDispose(removeSubscription);
    }
    return removeSubscription;
}
function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
        callback(...args);
    });
}

function mergeReactiveObjects(target, patchToApply) {
    // Handle Map instances
    if (target instanceof Map && patchToApply instanceof Map) {
        patchToApply.forEach((value, key) => target.set(key, value));
    }
    // Handle Set instances
    if (target instanceof Set && patchToApply instanceof Set) {
        patchToApply.forEach(target.add, target);
    }
    // no need to go through symbols because they cannot be serialized anyway
    for (const key in patchToApply) {
        if (!patchToApply.hasOwnProperty(key))
            continue;
        const subPatch = patchToApply[key];
        const targetValue = target[key];
        if (isPlainObject(targetValue) &&
            isPlainObject(subPatch) &&
            target.hasOwnProperty(key) &&
            !isRef(subPatch) &&
            !isReactive(subPatch)) {
            // NOTE: here I wanted to warn about inconsistent types but it's not possible because in setup stores one might
            // start the value of a property as a certain type e.g. a Map, and then for some reason, during SSR, change that
            // to `undefined`. When trying to hydrate, we want to override the Map with `undefined`.
            target[key] = mergeReactiveObjects(targetValue, subPatch);
        }
        else {
            // @ts-expect-error: subPatch is a valid value
            target[key] = subPatch;
        }
    }
    return target;
}
const skipHydrateSymbol = /* istanbul ignore next */ Symbol();
/**
 * Returns whether a value should be hydrated
 *
 * @param obj - target variable
 * @returns true if `obj` should be hydrated
 */
function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}
const { assign } = Object;
function isComputed(o) {
    return !!(isRef(o) && o.effect);
}
function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
        if (!initialState && (!("production" !== 'production') )) {
            /* istanbul ignore if */
            {
                pinia.state.value[id] = state ? state() : {};
            }
        }
        // avoid creating a state in pinia.state.value
        const localState = toRefs(pinia.state.value[id]);
        return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
            computedGetters[name] = markRaw(computed(() => {
                setActivePinia(pinia);
                // it was created just before
                const store = pinia._s.get(id);
                // @ts-expect-error
                // return getters![name].call(context, context)
                // TODO: avoid reading the getter while assigning with a global variable
                return getters[name].call(store, store);
            }));
            return computedGetters;
        }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
}
function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    // watcher options for $subscribe
    const $subscribeOptions = {
        deep: true,
        // flush: 'post',
    };
    // internal state
    let isListening; // set to true at the end
    let isSyncListening; // set to true at the end
    let subscriptions = markRaw([]);
    let actionSubscriptions = markRaw([]);
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    // avoid setting the state for option stores if it is set
    // by the setup
    if (!isOptionsStore && !initialState && (!("production" !== 'production') )) {
        /* istanbul ignore if */
        {
            pinia.state.value[$id] = {};
        }
    }
    const hotState = ref({});
    // avoid triggering too many listeners
    // https://github.com/vuejs/pinia/issues/1129
    let activeListener;
    function $patch(partialStateOrMutator) {
        let subscriptionMutation;
        isListening = isSyncListening = false;
        if (typeof partialStateOrMutator === 'function') {
            partialStateOrMutator(pinia.state.value[$id]);
            subscriptionMutation = {
                type: MutationType.patchFunction,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        else {
            mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
            subscriptionMutation = {
                type: MutationType.patchObject,
                payload: partialStateOrMutator,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        const myListenerId = (activeListener = Symbol());
        nextTick().then(() => {
            if (activeListener === myListenerId) {
                isListening = true;
            }
        });
        isSyncListening = true;
        // because we paused the watcher, we need to manually call the subscriptions
        triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore
        ? function $reset() {
            const { state } = options;
            const newState = state ? state() : {};
            // we use a patch to group all changes into one single subscription
            this.$patch(($state) => {
                assign($state, newState);
            });
        }
        : /* istanbul ignore next */
            noop;
    function $dispose() {
        scope.stop();
        subscriptions = [];
        actionSubscriptions = [];
        pinia._s.delete($id);
    }
    /**
     * Wraps an action to handle subscriptions.
     *
     * @param name - name of the action
     * @param action - action to wrap
     * @returns a wrapped action to handle subscriptions
     */
    function wrapAction(name, action) {
        return function () {
            setActivePinia(pinia);
            const args = Array.from(arguments);
            const afterCallbackList = [];
            const onErrorCallbackList = [];
            function after(callback) {
                afterCallbackList.push(callback);
            }
            function onError(callback) {
                onErrorCallbackList.push(callback);
            }
            // @ts-expect-error
            triggerSubscriptions(actionSubscriptions, {
                args,
                name,
                store,
                after,
                onError,
            });
            let ret;
            try {
                ret = action.apply(this && this.$id === $id ? this : store, args);
                // handle sync errors
            }
            catch (error) {
                triggerSubscriptions(onErrorCallbackList, error);
                throw error;
            }
            if (ret instanceof Promise) {
                return ret
                    .then((value) => {
                    triggerSubscriptions(afterCallbackList, value);
                    return value;
                })
                    .catch((error) => {
                    triggerSubscriptions(onErrorCallbackList, error);
                    return Promise.reject(error);
                });
            }
            // trigger after callbacks
            triggerSubscriptions(afterCallbackList, ret);
            return ret;
        };
    }
    const _hmrPayload = /*#__PURE__*/ markRaw({
        actions: {},
        getters: {},
        state: [],
        hotState,
    });
    const partialStore = {
        _p: pinia,
        // _s: scope,
        $id,
        $onAction: addSubscription.bind(null, actionSubscriptions),
        $patch,
        $reset,
        $subscribe(callback, options = {}) {
            const removeSubscription = addSubscription(subscriptions, callback, options.detached, () => stopWatcher());
            const stopWatcher = scope.run(() => watch(() => pinia.state.value[$id], (state) => {
                if (options.flush === 'sync' ? isSyncListening : isListening) {
                    callback({
                        storeId: $id,
                        type: MutationType.direct,
                        events: debuggerEvents,
                    }, state);
                }
            }, assign({}, $subscribeOptions, options)));
            return removeSubscription;
        },
        $dispose,
    };
    const store = reactive(USE_DEVTOOLS
        ? assign({
            _hmrPayload,
            _customProperties: markRaw(new Set()), // devtools custom properties
        }, partialStore
        // must be added later
        // setupStore
        )
        : partialStore);
    // store the partial store now so the setup of stores can instantiate each other before they are finished without
    // creating infinite loops.
    pinia._s.set($id, store);
    // TODO: idea create skipSerialize that marks properties as non serializable and they are skipped
    const setupStore = pinia._e.run(() => {
        scope = effectScope();
        return scope.run(() => setup());
    });
    // overwrite existing actions to support $onAction
    for (const key in setupStore) {
        const prop = setupStore[key];
        if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
            // mark it as a piece of state to be serialized
            if (!isOptionsStore) {
                // in setup stores we must hydrate the state and sync pinia state tree with the refs the user just created
                if (initialState && shouldHydrate(prop)) {
                    if (isRef(prop)) {
                        prop.value = initialState[key];
                    }
                    else {
                        // probably a reactive object, lets recursively assign
                        // @ts-expect-error: prop is unknown
                        mergeReactiveObjects(prop, initialState[key]);
                    }
                }
                // transfer the ref to the pinia state to keep everything in sync
                /* istanbul ignore if */
                {
                    pinia.state.value[$id][key] = prop;
                }
            }
            // action
        }
        else if (typeof prop === 'function') {
            // @ts-expect-error: we are overriding the function we avoid wrapping if
            const actionValue = wrapAction(key, prop);
            // this a hot module replacement store because the hotUpdate method needs
            // to do it with the right context
            /* istanbul ignore if */
            {
                // @ts-expect-error
                setupStore[key] = actionValue;
            }
            // list actions so they can be used in plugins
            // @ts-expect-error
            optionsForPlugin.actions[key] = prop;
        }
        else ;
    }
    // add the state, getters, and action properties
    /* istanbul ignore if */
    {
        assign(store, setupStore);
        // allows retrieving reactive objects with `storeToRefs()`. Must be called after assigning to the reactive object.
        // Make `storeToRefs()` work with `reactive()` #799
        assign(toRaw(store), setupStore);
    }
    // use this instead of a computed with setter to be able to create it anywhere
    // without linking the computed lifespan to wherever the store is first
    // created.
    Object.defineProperty(store, '$state', {
        get: () => (pinia.state.value[$id]),
        set: (state) => {
            $patch(($state) => {
                assign($state, state);
            });
        },
    });
    if (USE_DEVTOOLS) {
        const nonEnumerable = {
            writable: true,
            configurable: true,
            // avoid warning on devtools trying to display this property
            enumerable: false,
        };
        ['_p', '_hmrPayload', '_getters', '_customProperties'].forEach((p) => {
            Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
        });
    }
    // apply all plugins
    pinia._p.forEach((extender) => {
        /* istanbul ignore else */
        if (USE_DEVTOOLS) {
            const extensions = scope.run(() => extender({
                store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            }));
            Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
            assign(store, extensions);
        }
        else {
            assign(store, scope.run(() => extender({
                store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            })));
        }
    });
    // only apply hydrate to option stores with an initial state in pinia
    if (initialState &&
        isOptionsStore &&
        options.hydrate) {
        options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
}
function defineStore(
// TODO: add proper types from above
idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === 'function';
    if (typeof idOrOptions === 'string') {
        id = idOrOptions;
        // the option store setup will contain the actual options in this case
        options = isSetupStore ? setupOptions : setup;
    }
    else {
        options = idOrOptions;
        id = idOrOptions.id;
    }
    function useStore(pinia, hot) {
        const currentInstance = getCurrentInstance();
        pinia =
            // in test mode, ignore the argument provided as we can always retrieve a
            // pinia instance with getActivePinia()
            (pinia) ||
                (currentInstance && inject(piniaSymbol, null));
        if (pinia)
            setActivePinia(pinia);
        pinia = activePinia;
        if (!pinia._s.has(id)) {
            // creating the store registers it in `pinia._s`
            if (isSetupStore) {
                createSetupStore(id, setup, options, pinia);
            }
            else {
                createOptionsStore(id, options, pinia);
            }
        }
        const store = pinia._s.get(id);
        // StoreGeneric cannot be casted towards Store
        return store;
    }
    useStore.$id = id;
    return useStore;
}

function searchTags(req) {
    return request('searchTags', req);
}

const useTagStore = defineStore('tag', () => {
    const tags = ref([]);
    async function load() {
        const resp = await searchTags();
        tags.value = resp.tags;
    }
    function create(tag) {
        if (tags.value.find(item => item.value === tag))
            return;
        tags.value.push({
            value: tag
        });
    }
    return { tags, load, create };
});

function useToggleButton(id) {
    const opened = ref(false);
    function toggle() {
        debug$2('origin opened.value is', opened.value);
        const newValue = !opened.value;
        bus.emit('closeOther', id);
        opened.value = newValue;
        debug$2('opened.value is now', newValue);
    }
    function hideCurrent() {
        opened.value = false;
    }
    function hide(_id) {
        if (_id && _id === id)
            return;
        hideCurrent();
    }
    onMounted(() => {
        document.body.addEventListener('click', hideCurrent);
        bus.on('closeOther', hide);
    });
    onUnmounted(() => {
        document.body.removeEventListener('click', hideCurrent);
        bus.off('closeOther', hide);
    });
    return {
        hide,
        toggle,
        opened
    };
}

const _hoisted_1$1 = { class: "tag-pane" };
const _hoisted_2$1 = { class: "tag-search-input-container" };
const _hoisted_3$1 = ["placeholder", "onKeyup"];
const _hoisted_4$1 = { class: "tags" };
const _hoisted_5$1 = ["onClick"];
const _hoisted_6$1 = {
    key: 0,
    class: "ri-checkbox-circle-fill icon-check icon-checked"
};
const _hoisted_7$1 = {
    key: 1,
    class: "ri-checkbox-blank-circle-line icon-check"
};
const _hoisted_8$1 = ["onClick"];
const _hoisted_9$1 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-add-circle-line icon-add" }, null, -1 /* HOISTED */);
var script$1 = /*#__PURE__*/ defineComponent({
    __name: 'TagPane',
    props: {
        placeholder: String,
        clip: {
            type: Object,
            required: true
        },
    },
    emits: ['created', 'updated'],
    setup(__props, { emit }) {
        const props = __props;
        const tagStore = useTagStore();
        // const $t = useI18n()
        const tags = computed(() => {
            const currentClipTags = props.clip.tags || [];
            return tagStore.tags.map(item => {
                let checked = false;
                try {
                    checked = currentClipTags.includes(item.value);
                }
                catch (e) { }
                return {
                    name: item.value,
                    checked
                };
            });
        });
        const tagSearch = ref('');
        const showTagSearch = computed(() => {
            return tagSearch.value && !tags.value.find(item => item.name === tagSearch.value);
        });
        const filteredTags = computed(() => {
            return tags.value.filter(item => {
                return item.name.includes(tagSearch.value);
            });
        });
        async function saveClip() {
            await savePageClip(props.clip);
        }
        async function toggleTag(tag) {
            tag.checked = !tag.checked;
            const checkedTags = tags.value.filter(item => item.checked).map(item => item.name);
            props.clip.tags = checkedTags;
            await saveClip();
            emit('updated', checkedTags);
        }
        async function createTag() {
            const tag = tagSearch.value;
            const { clip } = props;
            tagSearch.value = '';
            // create tags
            if (tagStore.tags.find(item => item.value === tag))
                return;
            if (!clip.tags) {
                clip.tags = [tag];
            }
            else {
                clip.tags.push(tag);
            }
            // save clip
            await saveClip();
            tagStore.create(tag);
            const checkedTags = tags.value.filter(item => item.checked).map(item => item.name);
            emit('created', checkedTags);
        }
        return (_ctx, _cache) => {
            return (openBlock(), createElementBlock("div", _hoisted_1$1, [
                createBaseVNode("div", _hoisted_2$1, [
                    withDirectives(createBaseVNode("input", {
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => ((tagSearch).value = $event)),
                        class: "tag-search-input",
                        placeholder: __props.placeholder || _ctx.$t('tag-search'),
                        onKeyup: withKeys(createTag, ["enter"]),
                        onClick: _cache[1] || (_cache[1] = withModifiers(() => { }, ["stop"]))
                    }, null, 40 /* PROPS, HYDRATE_EVENTS */, _hoisted_3$1), [
                        [vModelText, tagSearch.value]
                    ])
                ]),
                createBaseVNode("div", _hoisted_4$1, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(unref(filteredTags), (tag) => {
                        return (openBlock(), createElementBlock("div", {
                            key: tag.name,
                            class: "item",
                            onClick: withModifiers(($event) => (toggleTag(tag)), ["stop"])
                        }, [
                            (tag.checked)
                                ? (openBlock(), createElementBlock("i", _hoisted_6$1))
                                : (openBlock(), createElementBlock("i", _hoisted_7$1)),
                            createTextVNode(" " + toDisplayString(tag.name), 1 /* TEXT */)
                        ], 8 /* PROPS */, _hoisted_5$1));
                    }), 128 /* KEYED_FRAGMENT */)),
                    (unref(showTagSearch))
                        ? (openBlock(), createElementBlock("div", {
                            key: 0,
                            class: "item item-add-tag",
                            onClick: withModifiers(createTag, ["stop"])
                        }, [
                            _hoisted_9$1,
                            createTextVNode(" " + toDisplayString(_ctx.$t('add')) + ": “" + toDisplayString(tagSearch.value) + "” ", 1 /* TEXT */)
                        ], 8 /* PROPS */, _hoisted_8$1))
                        : createCommentVNode("v-if", true)
                ])
            ]));
        };
    }
});

var css_248z$2 = ".tag-pane {\n  position: absolute;\n  width: 160px;\n  border-radius: 16px;\n  top: 40px;\n  right: 0;\n  padding-bottom: 8px;\n  overflow: hidden;\n  border: 1px solid var(--color-border);\n  background-color: var(--color-bg);\n  z-index: 99999999;\n}\n.tag-pane .item {\n  height: 30px;\n  line-height: 30px;\n  padding: 0 16px;\n  display: flex;\n  align-items: center;\n  color: var(--color-text);\n  white-space: nowrap;\n}\n.tag-pane .item:hover {\n  cursor: pointer;\n  background-color: var(--color-hover);\n}\n.tag-pane .tag-search-input-container {\n  padding: 16px;\n}\n.tag-pane .tag-search-input {\n  display: block;\n  height: 35px;\n  line-height: 35px;\n  border: 1px solid var(--color-yellow);\n  padding-left: 12px;\n  border-radius: 8px;\n  box-sizing: border-box;\n  width: 100%;\n  color: var(--color-text);\n  background-color: transparent;\n  outline: none;\n}\n.tag-pane .tag-search-input::placeholder {\n  color: var(--color-placeholder);\n}\n.tag-pane .icon-check,\n.tag-pane .icon-add {\n  font-size: 18px;\n  margin-right: 6px;\n  color: var(--color-icon);\n}\n.tag-pane .icon-checked {\n  color: var(--color-yellow);\n}\n";
styleInject(css_248z$2);

script$1.__file = "clearly-ui/TagPane.vue";

// import '@types/chrome'
function callBackground(type, data) {
    debug$2('call background', type, data);
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ ...data || {}, type }, (res) => {
            const { error, result } = res || {};
            if (chrome.runtime.lastError) {
                debug$2(`call ${type} failed with runtime error`);
                return resolve(undefined);
            }
            if (error)
                return reject(error);
            debug$2('call background result', type, data, result);
            resolve(result);
        });
    });
}

const _hoisted_1 = { class: "main" };
const _hoisted_2 = { class: "save" };
const _hoisted_3 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-checkbox-circle-fill icon-success" }, null, -1 /* HOISTED */);
const _hoisted_4 = ["onClick"];
const _hoisted_5 = ["onClick"];
const _hoisted_6 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-file-list-2-line icon-read" }, null, -1 /* HOISTED */);
const _hoisted_7 = [
    _hoisted_6
];
const _hoisted_8 = { class: "more-pane" };
const _hoisted_9 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-delete-bin-line" }, null, -1 /* HOISTED */);
const _hoisted_10 = ["onClick"];
const _hoisted_11 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-apps-line" }, null, -1 /* HOISTED */);
const _hoisted_12 = ["onClick"];
const _hoisted_13 = /*#__PURE__*/ createBaseVNode("i", { class: "ri-keyboard-line" }, null, -1 /* HOISTED */);
var script = /*#__PURE__*/ defineComponent({
    __name: 'CollectPop',
    props: {
        readable: {
            type: Boolean,
            default: true
        },
        onHide: {
            type: Function,
            default: () => { }
        }
    },
    setup(__props, { expose }) {
        const props = __props;
        const $t = useI18n();
        const tagStore = useTagStore();
        const HIDE_DELAY = 5000;
        const saving = ref(false);
        const clip = ref();
        let timeout;
        const message = ref();
        function delayHide() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                hide();
            }, HIDE_DELAY);
        }
        function hide(e) {
            if (e) {
                e.stopPropagation();
            }
            // tagSearch.value = ''
            hideTagPane();
            hideMore();
            props.onHide();
        }
        async function loadTags() {
            await tagStore.load();
        }
        async function saveClip() {
            await store.saveClip();
        }
        async function save(_clip) {
            if (saving.value) {
                return;
            }
            message.value = $t('clip.pop.collect.success');
            saving.value = true;
            clip.value = _clip;
            store.setCurrentClip(_clip);
            await loadTags();
            await saveClip();
            saving.value = false;
            delayHide();
        }
        function read() {
            window.ClearlyContent.toggle();
            hide();
        }
        async function remove() {
            if (!store.currentClip || !store.currentClip.id) {
                const v = message.value;
                message.value = $t('clip.pop.remove.unsaved');
                setTimeout(() => {
                    message.value = v;
                }, 1000);
                return;
            }
            await store.removeCurrentClip();
            message.value = $t('clip.pop.remove.success');
        }
        expose({
            save
        });
        function updateMessageWithTags(tags) {
            message.value = $t('clip.pop.tag.add') + ' (' + tags.length + ')';
        }
        function onTagUpdated(tags) {
            updateMessageWithTags(tags);
        }
        function onTagCreated(tags) {
            updateMessageWithTags(tags);
        }
        function toWebapp() {
            window.open('https://app.clearlyreader.com');
        }
        function toShortcuts() {
            callBackground('showEditShortcuts');
        }
        function onTagClick() {
            if (saving.value)
                return;
            toggleTagPane();
            hideMore();
        }
        function onMoreClick() {
            toggleMore();
            hideTagPane();
        }
        const { hide: hideTagPane, toggle: toggleTagPane, opened: tagPaneOpened } = useToggleButton();
        const { hide: hideMore, toggle: toggleMore, opened: moreOpened } = useToggleButton();
        onMounted(() => {
            tagStore.load();
        });
        return (_ctx, _cache) => {
            return (openBlock(), createElementBlock("div", {
                class: "collect-pop",
                onMousemove: delayHide
            }, [
                createBaseVNode("div", _hoisted_1, [
                    createBaseVNode("span", _hoisted_2, [
                        _hoisted_3,
                        createTextVNode(" " + toDisplayString(message.value) + " ", 1 /* TEXT */),
                        createBaseVNode("i", {
                            class: "ri-price-tag-3-line icon-tag",
                            onClick: withModifiers(onTagClick, ["stop"])
                        }, null, 8 /* PROPS */, _hoisted_4),
                        createBaseVNode("i", {
                            class: "ri-more-2-fill icon-more",
                            onClick: withModifiers(onMoreClick, ["stop"])
                        }, null, 8 /* PROPS */, _hoisted_5)
                    ]),
                    createBaseVNode("span", {
                        class: "read",
                        onClick: read
                    }, _hoisted_7)
                ]),
                (clip.value)
                    ? withDirectives((openBlock(), createBlock(script$1, {
                        key: 0,
                        placeholder: unref($t)('clip.pop.tag.search'),
                        clip: clip.value,
                        onCreated: onTagCreated,
                        onUpdated: onTagUpdated
                    }, null, 8 /* PROPS */, ["placeholder", "clip"])), [
                        [vShow, unref(tagPaneOpened)]
                    ])
                    : createCommentVNode("v-if", true),
                withDirectives(createBaseVNode("div", _hoisted_8, [
                    createBaseVNode("div", {
                        class: "item",
                        onClick: remove
                    }, [
                        _hoisted_9,
                        createTextVNode(" " + toDisplayString(unref($t)('clip.pop.feature.remove')), 1 /* TEXT */)
                    ]),
                    createBaseVNode("div", {
                        class: "item",
                        onClick: withModifiers(toWebapp, ["stop"])
                    }, [
                        _hoisted_11,
                        createCommentVNode(" {{ $t('site-nav-name') }} "),
                        createTextVNode(" " + toDisplayString(unref($t)('clip.pop.feature.webapp')), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_10),
                    createBaseVNode("div", {
                        class: "item",
                        onClick: withModifiers(toShortcuts, ["stop"])
                    }, [
                        _hoisted_13,
                        createTextVNode(" " + toDisplayString(unref($t)('clip.pop.feature.shortcuts')), 1 /* TEXT */)
                    ], 8 /* PROPS */, _hoisted_12)
                ], 512 /* NEED_PATCH */), [
                    [vShow, unref(moreOpened)]
                ])
            ], 32 /* HYDRATE_EVENTS */));
        };
    }
});

var css_248z$1 = ".collect-pop {\n  position: fixed;\n  border: 1px solid var(--color-gray-border);\n  right: 32px;\n  top: 32px;\n  border-radius: 16px;\n  background-color: var(--color-black);\n  z-index: 2147483648;\n}\n.collect-pop .main {\n  height: 60px;\n  line-height: 60px;\n  display: flex;\n  align-items: center;\n  color: #fff;\n}\n.collect-pop .save {\n  padding: 0 20px;\n  font-size: 16px;\n  display: flex;\n  align-items: center;\n}\n.collect-pop .save .icon-success {\n  color: var(--color-green);\n  font-size: 24px;\n  margin-right: 8px;\n}\n.collect-pop .icon-tag {\n  cursor: pointer;\n  font-size: 20px;\n  margin-left: 24px;\n  margin-right: 20px;\n  color: var(--color-icon);\n}\n.collect-pop .icon-tag:hover {\n  color: var(--color-icon-hover);\n}\n.collect-pop .icon-more {\n  font-size: 20px;\n  cursor: pointer;\n  color: var(--color-icon);\n}\n.collect-pop .icon-more:hover {\n  color: var(--color-icon-hover);\n}\n.collect-pop .read {\n  border-left: 1px solid var(--color-gray-border);\n  width: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.collect-pop .read:hover {\n  background: var(--color-hover);\n  cursor: pointer;\n}\n.collect-pop .icon-read {\n  font-size: 20px;\n  color: var(--color-yellow);\n}\n.collect-pop .tag-pane {\n  position: absolute;\n  width: 160px;\n  border-radius: 16px;\n  top: 75px;\n  right: 0;\n  padding-bottom: 8px;\n  overflow: hidden;\n  background-color: var(--color-black);\n}\n.collect-pop .tag-pane .item {\n  height: 30px;\n  line-height: 30px;\n  padding: 0 16px;\n  display: flex;\n  align-items: center;\n  color: #fff;\n  white-space: nowrap;\n}\n.collect-pop .tag-pane .tag-search-input-container {\n  padding: 16px;\n}\n.collect-pop .tag-pane .tag-search-input {\n  display: block;\n  height: 35px;\n  line-height: 35px;\n  border: 1px solid var(--color-yellow);\n  padding-left: 12px;\n  border-radius: 8px;\n  box-sizing: border-box;\n  width: 100%;\n  color: #fff;\n  background-color: transparent;\n}\n.collect-pop .tag-pane .tag-search-input::placeholder {\n  color: var(--color-placeholder);\n}\n.collect-pop .tag-pane .icon-check,\n.collect-pop .tag-pane .icon-add {\n  font-size: 18px;\n  margin-right: 6px;\n  color: var(--color-icon);\n}\n.collect-pop .tag-pane .icon-checked {\n  color: var(--color-yellow);\n}\n.collect-pop .tag-pane .item:hover {\n  cursor: pointer;\n  background-color: var(--color-hover);\n}\n.collect-pop .more-pane {\n  position: absolute;\n  width: 160px;\n  border-radius: 16px;\n  padding: 8px 0;\n  top: 75px;\n  right: 0;\n  background-color: var(--color-black);\n}\n.collect-pop .more-pane .item {\n  height: 30px;\n  line-height: 30px;\n  padding-left: 16px;\n  font-size: 13px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  color: var(--color-text-gray);\n}\n.collect-pop .more-pane .item:hover {\n  background: var(--color-hover);\n}\n.collect-pop .more-pane .item i {\n  color: var(--color-icon);\n  font-size: 16px;\n  margin-right: 6px;\n}\n";
styleInject(css_248z$1);

script.__file = "src/content-script/components/CollectPop.vue";

// console.log('import clearly-collect-pop.scss')
// 收藏相关逻辑
class ClearlyCollectPop {
    elem;
    popRef;
    constructor(clip) {
        const id = 'clearly-save-to-queue';
        const elem = document.createElement('div');
        const popRef = ref();
        const pinia = createPinia();
        elem.setAttribute('id', id);
        elem.style.display = 'none';
        document.body.appendChild(elem);
        this.elem = elem;
        const app = createApp({
            render: () => h(script, {
                ref: popRef,
                clip,
                onHide: () => {
                    this.hide();
                }
            })
        });
        app.use(pinia);
        app.use(i18n);
        app.mount(elem);
        this.popRef = popRef;
        document.body.appendChild(this.elem);
    }
    pop() {
        console.log('pop');
        this.elem.style.display = 'block';
    }
    hide() {
        console.log('hide');
        this.elem.style.display = 'none';
    }
    save(clip) {
        this.popRef.value.save(clip);
    }
}

class ContentMessenger extends Messenger {
    async sendMessage(receiver, message) {
        try {
            if (message === undefined) {
                return await chrome.runtime.sendMessage(receiver);
            }
            return await chrome.runtime.sendMessage({ event: EVENT_TYPE.FORWARD, receiver, message });
        }
        catch (e) {
            console.log('send message failed from content', e);
        }
    }
}
var contentMessenger = new ContentMessenger();

async function callBakgroundApi(fn, data, options) {
    try {
        const res = await callBackground('callApi', { fn, data });
        debug$2('callApi', fn, data, res);
        if (!res || (res.code && res.code !== 'OK') || !res.data) {
            const err = new Error(res.message);
            err.code = res.code || 'ERR';
            throw err;
        }
        return res.data;
    }
    catch (err) {
        // const clearlyApp = window.clearlyApp
        if (err.code === 'NEED_UPGRADE') {
            console.log('need upgrade');
            // clearlyApp.showUpgrade('PRO', err.message)
        }
        else if (err.code === 'AUTH_REQUIRED') {
            console.log('auth required');
            // clearlyApp.alert('warn', clearlyApp.message('app.account.loginrequired'), _ => clearlyApp.setState({ showDialog: 'account' }))
            return;
        }
        if (!options?.error && !options?.silent) {
            if (!err.code) {
                console.log('warn!!!! api request failed', fn, err);
                // clearlyApp.alert('warn', 'Api request failed: ' + fn)
                debug$2('api error', err);
            }
            else if (!['NEED_PRO', 'NEED_PREMIUM'].includes(err.code)) {
                console.log('warn!!! ', err.message);
                // clearlyApp.alert('warn', `${err.message} (${err.code})`)
            }
        }
        else {
            throw err;
        }
    }
}

var css_248z = "\n.toast {\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 99;\n  width: 100%;\n  justify-content: center;\n  align-items: center;\n  display: flex;\n  z-index: 2147483647;\n  animation: fadeindown linear .2s;\n}\n\n.toast.hide {\n  animation: fadeoutup linear .2s;\n}\n\n@keyframes fadeindown {\n  from {\n    opacity: 0;\n    transform: translateY(-60px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n\n@keyframes fadeoutup {\n  from {\n    opacity: 1;\n    transform: translateY(0);\n  }\n\n  to {\n    opacity: 0;\n    transform: translateY(-60px);\n  }\n}\n\n.toast-message {\n  margin-top: 24px;\n  display: inline-flex;\n  align-items: center;\n  font-size: 14px;\n  background: rgba(0, 0, 0, 0.7);\n  backdrop-filter: blur(2px);\n  padding: 12px 14px;\n  color: #ffffff;\n  border-radius: 8px;\n  position: relative;\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif;\n}\n";
styleInject(css_248z);

function toast$1(message, options) {
    const toastElem = document.createElement('div');
    toastElem.setAttribute('class', 'toast');
    toastElem.innerHTML = `
    <span class="toast-message">${message}</span>
  `;
    document.body.append(toastElem);
    setTimeout(() => {
        toastElem.classList.add('hide');
        setTimeout(() => {
            document.body.removeChild(toastElem);
        }, 200);
    }, options?.duration || 2000);
}

function toast(message) {
    toast$1(message);
}
var uiProvider = {
    toast
};

const ClearlyEnv = window['ClearlyEnv'] || {};
const debug = makeDebug('CONTENT');
debug('registerRequest', register$1);
register$1(callBakgroundApi);
register(uiProvider);
// eslint-disable-next-line no-unused-vars
class ClearlyContent {
    static tipTimer = null;
    static config;
    static _init;
    static _isSupported;
    static _bootstrap;
    static frameEl = null;
    static article = null;
    static faviconUpdated = false;
    static collectPop;
    static ga(action, ...fields) {
        // @ts-ignore
        // window.ga(action, v, url, d)
        // const img = new Image()
        // img.src = `https://www.google-analytics.com/collect?v=1&tid=UA-126000-1&cid=555&t=${action}&ec=clearly&ea=${v}&el=${url}&ev=${d}`
    }
    // 保存内容，默认保存当前页面
    static saveToQueue(clip) {
        assureLogin(() => {
            const _clip = clip || {
                ...store.articleClip,
                ...{
                    type: 'article',
                    article: this.getArticle()
                }
            };
            if (!this.collectPop) {
                this.collectPop = new ClearlyCollectPop(_clip);
            }
            this.collectPop.pop();
            this.collectPop.save(_clip);
        });
    }
    static toggle() {
        if (this.isOpen()) {
            this.close();
        }
        else {
            this.open();
        }
    }
    static stopKeyZoom(event) {
        if ((event.metaKey || event.ctrlKey) && [48, 61, 96, 107, 109, 187, 189].indexOf(event.keyCode) > -1) {
            event.preventDefault();
        }
    }
    static async open(params) {
        params = params || {};
        if (ClearlyContent._bootstrap && !ClearlyContent._isSupported) {
            this.addTip('notsupport');
            return;
        }
        if (!ClearlyContent._init) {
            await ClearlyContent.init(params);
        }
        else {
            ClearlyContent.update();
        }
        // await ClearlyContent.init()
        const clearlyFrame = document.getElementById('clearly-container');
        if (clearlyFrame) {
            document.documentElement.classList.add('clearly-overflow');
            document.body.classList.add('clearly-enabled');
            document.getElementById('clearly-container').style.display = 'inherit';
            callBackground('updateIcon', { status: 'active' });
            ClearlyContent.updateFavicon();
            document.addEventListener('keydown', e => ClearlyContent.stopKeyZoom(e));
        }
        else {
            debug('clearlyFrame not init');
        }
    }
    static close() {
        document.documentElement.classList.remove('clearly-overflow');
        document.body.classList.remove('clearly-enabled');
        const clearlyFrame = document.getElementById('clearly-container');
        if (clearlyFrame) {
            clearlyFrame.style.display = 'none';
        }
        ClearlyContent.restoreFavicon();
        callBackground('updateIcon', { status: 'readable' });
        callBackground('speakStop');
        window.focus();
        document.removeEventListener('keydown', e => ClearlyContent.stopKeyZoom(e));
    }
    static isOpen() {
        const enabledElem = document.getElementById('clearly-container');
        return enabledElem && enabledElem.style.display !== 'none';
    }
    static updateFavicon() {
        const icons = document.querySelectorAll('link[rel*="icon"]');
        let shortcutLink = null;
        if (icons.length > 0) {
            icons.forEach((icon) => {
                if (shortcutLink === null)
                    shortcutLink = icon.href;
                if (icon.getAttribute('rel') === 'shortcut icon')
                    shortcutLink = false;
                icon.setAttribute('data-href', icon.href);
                icon.href = chrome.runtime.getURL('/assets/icons/active/ic_128.png');
            });
        }
        if (shortcutLink) {
            const shortcutIcon = document.createElement('link');
            shortcutIcon.rel = 'shortcut icon';
            shortcutIcon.setAttribute('data-href', shortcutLink);
            shortcutIcon.href = chrome.runtime.getURL('/assets/icons/active/ic_128.png');
            document.getElementsByTagName('head')[0].appendChild(shortcutIcon);
        }
        this.faviconUpdated = true;
    }
    static restoreFavicon() {
        if (!this.faviconUpdated)
            return;
        const icons = document.querySelectorAll("link[rel*='icon']");
        icons.forEach((icon) => {
            const orgHref = icon.getAttribute('data-href');
            if (orgHref) {
                icon.href = orgHref;
                icon.removeAttribute('data-href');
            }
        });
    }
    static sendFrame(message) {
        console.log('ClearlyContent.frameEl', ClearlyContent.frameEl);
        this.frameEl?.contentWindow?.postMessage(message, '*');
    }
    static getArticle(force) {
        if (!ClearlyContent.article || force || ClearlyContent.article.url !== window.location.href) {
            ClearlyContent.article = new Clearly(document.cloneNode(true), { root: document, debug: ClearlyEnv.debug }, this.config.clearlyConfig && this.config.clearlyConfig.websites ? { WEBSITE_CONFIG: this.config.clearlyConfig.websites } : null).parse();
        }
        return ClearlyContent.article;
    }
    static update() {
        debug('update');
        this.sendFrame({
            type: 'UPDATE',
            article: ClearlyContent.getArticle()
        });
    }
    static async init(params) {
        // debug('init')
        // Check support
        if (!ClearlyContent._isSupported || ClearlyContent._init)
            return;
        // Check init
        ClearlyContent._init = true;
        const frameURL = chrome.runtime.getURL('/pages/content/app.html');
        // const chromBaseUrl = chrome.extension.getURL('/')
        // const origHtml = await (await window.fetch(frameURL)).text()
        // const tmpHtml = origHtml.replace(/(src|href)="\//g, `$1="${chromBaseUrl}`)
        // const html = tmpHtml.replace('<!-- clearly placeholder -->', `<textarea id="config" style="display:none">${JSON.stringify(this.config)}</textarea><textarea id="env" style="display:none">${JSON.stringify(ClearlyEnv)}</textarea><textarea id="params" style="display:none">${JSON.stringify(params || {})}</textarea>`)
        const frameEl = document.createElement('iframe');
        frameEl.allowFullscreen = true;
        frameEl.src = frameURL + '?' + new URLSearchParams({ ...params, url: window.location.href }).toString();
        // frameEl.srcdoc = html
        frameEl.style.display = 'none';
        frameEl.id = 'clearly-container';
        frameEl.referrerPolicy = 'origin-when-cross-origin';
        // frameEl.setAttribute('sandbox', 'allow-modals')
        frameEl.onload = () => {
            // debug('frame.onload', frameEl.contentWindow)
            // ClearlyContent.update()
            // debug('frame load')
            frameEl.contentWindow?.focus();
            ClearlyContent.update();
        };
        document.body.appendChild(frameEl);
        this.frameEl = frameEl;
        const FS_EVENTS = ['webkitfullscreenchange', 'mozfullscreenchange', 'fullscreenchange'];
        FS_EVENTS.forEach(e => {
            this.frameEl?.addEventListener(e, _ => {
                ClearlyContent.sendFrame({
                    type: 'setState',
                    state: { fullscreen: !!document.fullscreenElement }
                });
            });
        });
    }
    static remove() {
        if (this.frameEl) {
            document.body.removeChild(this.frameEl);
            this.frameEl = null;
        }
    }
    static fullscreen(data) {
        if (!data.fullscreen) {
            const cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;
            cancelFullScreen.call(document);
        }
        else {
            const frame = this.frameEl;
            const requestFullScreen = frame.requestFullScreen || frame.webkitRequestFullScreen || frame.mozRequestFullScreen || false;
            requestFullScreen && requestFullScreen.call(frame);
        }
    }
    static handleFrameMessage(data) {
        debug('handleFrameMessage', data);
        if (typeof this[data.type] === 'function')
            this[data.type].call(this, data);
    }
    static isSupportUrl(websitesConfig, url) {
        if (!websitesConfig)
            return true;
        return !Object.keys(websitesConfig).some(key => {
            if (url.includes(key)) {
                const { readable } = websitesConfig[key];
                if (readable === false)
                    return true;
            }
            return false;
        });
    }
    static urlToRegexp(list) {
        return list.map(item => {
            const regexStr = item
                .replace(/[-[]\/\{\}\(\)\+\?\.\\\^\$\|]/g, '\\$&')
                .replace(/\*/g, '.*?')
                .replace(/^http:\\\/\\\/\.\*/i, 'http:\\/\\/[^/]*')
                .replace(/^https:\\\/\\\/\.\*/i, 'https:\\/\\/[^/]*');
            return new RegExp(regexStr, 'i');
        });
    }
    static removeTip() {
        document.getElementById('clearly-content-container')?.remove();
    }
    static injectCss(id, url) {
        // Already injected
        if (document.querySelector('#' + id))
            return;
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.id = id;
        css.href = chrome.runtime.getURL(url);
        document.getElementsByTagName('head')[0].appendChild(css);
    }
    static message(key) {
        // eslint-disable-next-line no-undef
        return CLEARLY_MESSAGE.get(key, (this.config && this.config.system.lang) || 'en');
    }
    static addTip(type) {
        const tpl = document.createElement('template');
        tpl.innerHTML = `<div id="clearly-content-container">
      <div id="clearly-content-btn-open" class="clearly-content-tip-btn">${ClearlyContent.message(`content.tip.${type}`)}</div>
      <div id="clearly-content-btn-setting" class="clearly-content-tip-btn setting"></div>
      <div id="clearly-content-btn-dismiss" class="clearly-content-tip-btn"></div>
    </div>`;
        if (tpl.content.firstChild) {
            document.body.appendChild(tpl.content.firstChild);
        }
        if (type === 'open') {
            document.getElementById('clearly-content-btn-open')?.addEventListener('click', () => {
                ClearlyContent.open();
                ClearlyContent.removeTip();
            });
            document.getElementById('clearly-content-btn-setting')?.addEventListener('click', () => {
                ClearlyContent.open({ showDialog: 'setting' });
                ClearlyContent.removeTip();
            });
        }
        document.getElementById('clearly-content-btn-dismiss')?.addEventListener('click', () => {
            ClearlyContent.removeTip();
        });
        document.getElementById('clearly-content-container')?.addEventListener('mousemove', () => {
            if (!ClearlyContent.tipTimer)
                return;
            clearTimeout(ClearlyContent.tipTimer);
            this.tipTimer = null;
        });
        document.getElementById('clearly-content-container')?.addEventListener('mouseout', () => {
            if (ClearlyContent.tipTimer)
                return;
            setTimer();
        });
        const setTimer = () => {
            this.tipTimer = setTimeout(() => {
                this.removeTip();
            }, 3000);
        };
        setTimer();
    }
    static async tryLoginFromWeb() {
        if (this.config.user && this.config.user.accountToken) {
            return;
        }
        try {
            let accountStr = localStorage.getItem('account');
            let info = accountStr ? JSON.parse(accountStr) : null;
            if (info.accountToken) {
                const ok = await callBackground('loginFromToken', { token: info.accountToken });
                debug('loginFromToken', ok);
                if (ok) {
                    ClearlyContent.addTip('loginok');
                    setTimeout(() => {
                        if (window.parent) {
                            window.close();
                        }
                    }, 2500);
                }
            }
        }
        catch (err) {
        }
    }
    static onLogin() {
        bus.emit(EVENT_LOGIN_SUCCESS);
    }
    static onLogout() {
        bus.emit(EVENT_LOGOUT);
    }
    static async bootstrap(force) {
        const url = window.location.href;
        const urlObj = new URL(url);
        this.config = await callBackground('getConfig', { url }) || {};
        // const docLang = document.querySelector('html')!.getAttribute('lang')
        setCurrentLang(window.navigator.language);
        // Default to true
        ClearlyContent._bootstrap = true;
        ClearlyContent._isSupported = true;
        if (['clearlyreader.com', 'clearly.im', 'clip.do', 'localhost:5200', 'localhost:4000'].includes(urlObj.hostname)) {
            ClearlyContent.tryLoginFromWeb();
        }
        if (!force && this.config.clearlyConfig &&
            (!document.contentType.includes('/html') ||
                (!ClearlyContent.isSupportUrl(this.config.clearlyConfig.websites, url)))) {
            ClearlyContent._isSupported = false;
            callBackground('updateIcon', { status: 'disable' });
            return;
        }
        debug('init content script');
        ClearlyClip.bootstrap(this.config);
        const platform = client.getPlatform();
        ClearlyContent.injectCss('clearly-content-css', '/assets/styles/frame.css');
        ClearlyContent.injectCss('clearly-remixin-icon', '/assets/fonts/remixicon/remixicon.css');
        ClearlyContent.injectCss('clearly-remixin-icon-platform', '/assets/fonts/remixicon/remixicon-' + platform + '.css');
        callBackground('updateIcon', { status: 'readable' });
        // Listen frame message
        window.addEventListener('message', async function (e) {
            const data = e.data;
            if (!data || !data.type)
                return;
            debug('Window Message', data);
            if (data.background) {
                debug('Send to background', data);
                let result;
                let error;
                try {
                    result = await callBackground(data.type, data);
                }
                catch (err) {
                    error = err.message;
                }
                if (data.callback) {
                    ClearlyContent.sendFrame({ callback: data.callback, result, error });
                }
            }
            else {
                ClearlyContent.handleFrameMessage(data);
            }
        }, false);
        window.onbeforeunload = () => {
            ClearlyContent.restoreFavicon();
        };
        chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
            if (!request.frame)
                return;
            ClearlyContent.sendFrame(request);
        });
        // auto open or tip
        if (window.location.href.includes('#clearly') || (this.config.autoOpen && this.config.autoOpen.mode)) {
            debug('open automatically');
            ClearlyContent.open({ auto: true });
        }
        // else if (this.config.user && this.config.user.openTip && ClearlyContent.getClearly().isProbablyReaderable()) {
        //   ClearlyContent.addTip('open')
        // }
    }
}
ClearlyContent.bootstrap();
contentMessenger.on(EVENT_TYPE.GA, (event) => {
    const data = event.data;
    ClearlyContent.ga.apply(null, data);
});
contentMessenger.on(EVENT_TYPE.CLIP_MARK, (event) => {
    ClearlyClip.clipMark();
});
contentMessenger.on(EVENT_TYPE.CLIP_IMAGE, (event) => {
    ClearlyClip.clipPhoto(event.data);
});
contentMessenger.on(EVENT_TYPE.TOGGLE, () => {
    ClearlyContent.toggle();
});
contentMessenger.on(EVENT_TYPE.SAVE_TO_QUEUE, () => {
    ClearlyContent.saveToQueue();
});
contentMessenger.on(EVENT_TYPE.ON_LOGIN, ClearlyContent.onLogin);
contentMessenger.on(EVENT_TYPE.ON_LOGOUT, ClearlyContent.onLogout);
window.ClearlyContent = ClearlyContent;

export { ClearlyContent as default };
