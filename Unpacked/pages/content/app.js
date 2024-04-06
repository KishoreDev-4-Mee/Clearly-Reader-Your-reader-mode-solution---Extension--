/* eslint-disable no-undef */
class ClearlyApp {
  constructor(options) {
    this.options = options || {}
    this.state = {}
    this.config = {}
    this.repeatDoms = {}
    this.readyFns = []
    this.runtime = window.chrome && window.chrome.runtime

    this.init()
  }

  load(article, force) {
    if (!this.boot && !force) return false
    this.setState({ isReady: true })
    this.renderArticle(article)

    this.ga('create', 'UA-92398359-4', 'auto')
    this.ga('set', 'checkProtocolTask', null)
    this.ga('send', 'pageview', {
      'page': 'url=' + (article ? article.url : 'No url'),
      'title': article ? article.title : 'No title'
    })
    return true
  }

  renderArticle(article) {
    this.article = article

    if (article) {
      this.setState({
        load: true,
        articleLang: this.getMainLang(),
        articleTitle: article.title,
        articleUrl: article.url,
        articleText: article.text,
        articleDomain: article.domain,
        articleLinks: article.links
      })

      // Outline process
      if (article.outline && article.outline.length && article.outline[0].id !== '') {
        article.outline.unshift({ title: article.title, id: 'ros-0', type: 'h1' })
      }

      if (article.outline) {
        $('#outlines').html(
          DOMPurify.sanitize(
            article.outline.map(section => '<li id="outline-' + section.id + '" class="outline-section outline-' +
            section.type + '"><a href="javascript:;" data-id="#' +
            section.id + '">' +
            section.title +
            '</a></li>'
            ).join('\n')
            , { SAFE_FOR_JQUERY: true })
        )
      }

      if (article.links && article.links.length > 0) {
        $('#links').html(DOMPurify.sanitize(
          article.links.filter(link => link.type === 'text').map(link =>
            `<li class="links-item"><a href="${link.url}">${link.title}</a></li>`
          ).join('\n'), { SAFE_FOR_JQUERY: true }
        ))
      }

      $('#btn-cantact').attr('href', 'https://clearlyreader.com/r/report?url=' + encodeURIComponent(this.article.url))

      // set rtl
      document.querySelector('html').setAttribute('dir', article && article.rtl ? 'rtl' : '')

      $('#subject').text(article.title)
      $('#byline').html(`${article.authorName ? '<span>' + article.authorName + '</span>' : ''}
      <span>${this.message('app.article.estimated', article.readTime)}</span>
      <span>${this.message('app.article.wordscount', article.wordsCount)}</span>
      <span>${this.message('app.article.lang', String(article.lang || 'en').toUpperCase())}</span>`)
      // if (article.coverUrl) {
      //   $('#cover').css({ backgroundImage: 'url(\'' + article.coverUrl + '\')' })
      //   $('#cover').show()
      // }
      $('#content').html(DOMPurify.sanitize(article.html, {
        USE_PROFILES: { html: true, mathMl: true, svg: true },
        ADD_TAGS: ['iframe', 'article'],
        SAFE_FOR_JQUERY: true,
        ALLOWED_ATTR: ['id', 'style', 'src', 'alt', 'href', 'class', 'srcset', 'title', 'crossorigin', 'colspan', 'rowspan', 'scope']
      }))
    } else {
      const QUOTES = this.getQuotes()
      const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)]
      const [text, author] = quote.split(' – ')
      $('#content').html(`<div class="quote"><div class="quote-text">${text}</div><div class="quote-author">${author}</div></div>`)
    }

    // After render article
    this.afterArticle()
  }

  // After init
  afterArticle() {
    // mark
    const content = document.querySelector('#content')
    this.maker = new Mark(content)

    // highligh js
    if (window.hljs && this.config.syntax) {
      hljs.configure({ ignoreUnescapedHTML: true })
      content.querySelectorAll('pre').forEach((el) => {
        if (el.classList.contains('hljs')) return
        hljs.highlightElement(el)
      })
    }
    // this.speakMarker.markRanges([
    //   { start: 0, length: 5 },
    //   { start: 6, length: 6 }
    // ])

    // content.querySelectorAll('article p').forEach(el => {
    //   el.innerHTML += '<clearly-btn class="btn-ph-translate"></clearly-btn>'
    // })

    // document.querySelectorAll('[show]').forEach(elem => {
    //   elem.style.display = 'none'
    // })

    if (window.katex && this.config.latex) {
      // renderMathInElement(content, {
      //   delimiters: [
      //     { left: '$$', right: '$$', display: true },
      //     { left: '$', right: '$', display: false },
      //     { left: '\\(', right: '\\)', display: false },
      //     { left: '\\[', right: '\\]', display: true },
      //     { left: '\\begin{equation}', right: '\\end{equation}', display: true },
      //     { left: '\\begin{align}', right: '\\end{align}', display: true },
      //     { left: '\\begin{alignat}', right: '\\end{alignat}', display: true },
      //     { left: '\\begin{gather}', right: '\\end{gather}', display: true },
      //     { left: '\\begin{CD}', right: '\\end{CD}', display: true }
      //   ],
      //   throwOnError: false,
      //   strict: 'ignore'
      // })

      // content.querySelectorAll('math').forEach(el => {
      //   katex.render(el.textContent, el, {
      //     throwOnError: false,
      //     strict: 'ignore'
      //   })
      // })
      const items = document.querySelectorAll('[data-tex]')
      items.forEach(item => {
        item.innerHTML = item.getAttribute('data-tex')
      })
      this.renderLaTex()
    }

    content.querySelectorAll('img').forEach(function(img) {
      img.onerror = function() {
        this.style.display = 'none'
      }

      img.onload = function() {
        // const canvas = document.createElement('canvas')
        // const context = canvas.getContext('2d')
        // canvas.height = this.naturalHeight
        // canvas.width = this.naturalWidth
        // context.drawImage(this, 0, 0)
        // const dataURL = canvas.toDataURL('image/jpeg')
        // img.setAttribute('src', dataURL)
        debug('img onload', this.naturalWidth, this.naturalHeight, this.clientHeight, this.clientWidth, img)
        if (this.naturalWidth < 250 || this.naturalWidth < 250) {
          img.setAttribute('class', 'img-small')
        }
      }
    })

    if (this.config.accountToken) {
      this.clip(this.config.autoClip ? 'clip' : 'get', { silent: true }).then(_ => {
        this.showMark(this.state.marks)
      })
    }

    if (!this.hasPermission('PRO')) {
      this.setState({ tipUpgrade: true })
    }
  }

  getQuotes() {
    return [
      '“A reader lives a thousand lives before he dies . . . The man who never reads lives only one.” – George R.R. Martin,',
      '“Until I feared I would lose it, I never loved to read. One does not love breathing.” – Harper Lee',
      '“Never trust anyone who has not brought a book with them.” – Lemony Snicket',
      '“You can never get a cup of tea large enough or a book long enough to suit me.” – C.S. Lewis',
      '“Reading is essential for those who seek to rise above the ordinary.” – Jim Rohn',
      '“I find television very educating. Every time somebody turns on the set, I go into the other room and read a book.” – Groucho Marx',
      '“‘Classic’, a book which people praise and don’t read.” – Mark Twain',
      '“You don’t have to burn books to destroy a culture. Just get people to stop reading them.” – Ray Bradbury',
      '“So please, oh please, we beg, we pray, go throw your TV set away, and in its place you can install a lovely bookshelf on the wall.” – Roald Dahl',
      '“Think before you speak. Read before you think.” – Fran Lebowitz',
      '“Let’s be reasonable and add an eighth day to the week that is devoted exclusively to reading.” – Lena Dunham',
      '“The reading of all good books is like conversation with the finest (people) of the past centuries.” – Descartes',
      '“In the case of good books, the point is not to see how many of them you can get through, but rather how many can get through to you.” – Mortimer J. Adler',
      '“Reading one book is like eating one potato chip.” – Diane Duane',
      '“The more that you read, the more things you will know. The more that you learn, the more places you’ll go.” – Dr. Seuss',
      'Like Dr. Suess? Want to see our entire collection of quotes from Dr. Suess?',
      '“Books are a uniquely portable magic.” – Stephen King',
      '“I read a book one day and my whole life was changed.” – Orhan Pamuk',
      '“People say that life is the thing, but I prefer reading.” – Logan Pearsall Smith',
      '“Today a reader, tomorrow a leader.” – Margaret Fuller',
      '“People can lose their lives in libraries. They ought to be warned.” – Saul Bellow'
    ]
  }

  popmenuClose(event) {
    if (event && $(event.target).parents('#popmenu,#poptranslate').length) {
      return
    }

    debug('popmenuClose', event)
    // this.lastSelection = null
    this.showPopmenuOverlay()
    $('#popmenu').hide()
    $('#poptranslate').hide()
    $('#popshare').hide()
  }

  popmenu(type) {
    debug('popmenu type', type)
    const selectedText = window.getSelection().toString().trim()
    if (!selectedText) return
    this.lastSelectedText = selectedText
    switch (type) {
      case 'translate':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }

        this.setState({ popmenuLoading: type })

        this.translate(selectedText, this.config.translateLang)
          .then(res => this.showPopmenuTranslate(res))
          .catch(_ => this.showPopmenuTranslate())
          .finally(_ => this.setState({ popmenuLoading: null }))

        break
      case 'copy':
        document.execCommand('copy')
        this.popmenuClose()
        this.alert('ok', 'text copied')
        break
      case 'speak':
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel()
        }
        const utterance = new SpeechSynthesisUtterance(selectedText)
        this.getVoiceConfig()
          .then(v => {
            utterance.voice = v
            utterance.volume = 1
            window.speechSynthesis.speak(utterance)
            this.popmenuClose()
          })
        break
      case 'search':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }
        this.setState({ popmenuLoading: type })
        this.api('card/search', { keyword: selectedText })
          .then(data => this.showPopmenuOverlay({ type: 'search', data }))
          .finally(_ => (this.setState({ popmenuLoading: null })))
        break
      case 'wiki':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }
        this.setState({ popmenuLoading: type })
        this.api('card/wiki', { text: selectedText, lang: this.getMainLang() })
          .then(data => this.showPopmenuOverlay({ type: 'wiki', data }))
          .finally(_ => (this.setState({ popmenuLoading: null })))
        break
      case 'share':
        html2canvas(document.querySelector('#root')).then(canvas => {
          document.body.appendChild(canvas)
        })
        break
      case 'mark':
        this.saveMark()
        this.popmenuClose()
        window.getSelection().empty()
        break
    }

    this.ga('send', 'event', 'Popmenu', type)
  }

  showPopmenuOverlay(value) {
    debug('showPopmenuOverlay', value)
    if (value && value.data) {
      const results = value.data.results.slice(0, 5)
      $('#popmenu-overlay').html('')
      $('#popmenu-overlay').removeClass('pop-down')
      if (results && results.length) {
        results.forEach(item => {
          $('#popmenu-overlay').prepend(`
          <a target="clearly-wiki" href="${item.link}"><div class="popmenu-overlay-item">
            <div class="popmenu-item-title"><label>${item.title}</label></div>
              <div class="popmenu-item-url">${item.displayUrl || item.link}</div>
              <div class="popmenu-item-intro">${item.intro}</div>
            </div>
          </a>`)
        })
        $('#popmenu-overlay').append('<div class="popmenu-overlay-footer">More results on <a href="' + value.data.moreUrl + '" target="_blank">' + (value.type === 'wiki' ? 'Wikipedia' : 'DuckDuckGo') + '</a></div>')
      } else {
        $('#popmenu-overlay').html('<div class="popmenu-overlay-empty">no result</div>')
      }
      const pos = $('#popmenu-overlay').position()
      if (pos.top < 0) {
        $('#popmenu-overlay').addClass('pop-down')
      }

      // $('#popmenu-tools').hide()
      $('#popmenu-overlay').css({ visibility: 'visible' })
    } else {
      $('#popmenu-overlay').css({ visibility: 'hidden' })
      $('#popmenu-overlay').html('')
    }
  }

  keepSelection() {
    if (!this.lastSelection) return

    let currentSelection = window.getSelection()
    let currentSelectedText = currentSelection.toString()
    let lastSelectionRanges = this.lastSelection.ranges

    if (currentSelectedText) {
      currentSelection.removeAllRanges()
    }

    for (let i = 0, len = lastSelectionRanges.length; i < len; ++i) {
      currentSelection.addRange(lastSelectionRanges[i])
    }
  }

  showPopmenu(e) {
    debug('showPopmenu', e)
    const selectedText = window.getSelection().toString().trim()
    if (!selectedText) return

    const pos = this.lastSelection && this.lastSelection.position
    if (!pos) return

    const view = document.getElementById('main')
    const viewPos = view.getBoundingClientRect()
    // const left = (pos.x - viewPos.left + (pos.width - $('#popmenu').width()) / 2) * parseFloat(this.config.zoom || 1)
    // const top = (view.scrollTop + pos.y - $('#popmenu').height() - 10) * parseFloat(this.config.zoom || 1)
    const left = e.pageX - viewPos.left - $('#popmenu').width() / 2
    debug('showPopmenu pos', e.pageX, e.pageY, view.scrollTop, view.scrollHeight)
    const top = e.pageY - $('#popmenu').height() - 20 + view.scrollTop
    debug('showPopmenu pos', e.pageX, e.pageY)
    $('#poptranslate').hide()
    $('#popmenu').css({ left, top })
    $('#popmenu').show()

    if (top < 100) {
      $('#popmenu').addClass('popmenu-down')
    } else {
      $('#popmenu').removeClass('popmenu-down')
    }

    if (selectedText.length > 30) {
      $('#popmenu').addClass('popmenu-long')
    } else {
      $('#popmenu').removeClass('popmenu-long')
    }

    if (this.popmenuCloseTimer) {
      clearTimeout(this.popmenuCloseTimer)
      this.popmenuCloseTimer = null
    }

    this.popmenuCloseTimer = setTimeout(() => {
      const fn = (e) => {
        this.popmenuClose(e)
        $('body').off('click', fn)
      }
      $('body').on('click', fn)
      this.popmenuCloseTimer = null
    }, 200)
  }

  /**
   * Show tranlate menu
   *
   * @param {Object} data
   */
  showPopmenuTranslate(data) {
    let pos = this.lastSelection.position

    // Init
    $('#popmenu').hide()
    $('#poptranslate').removeClass('pop-down')

    if (!data) {
      const w = 800
      const h = 600
      const y = window.outerHeight / 2 + window.screenY - (h / 2)
      const x = window.outerWidth / 2 + window.screenX - (w / 2)
      window.open(`https://translate.google.com/?sl=auto&text=${encodeURIComponent(this.lastSelectedText)}&op=translate`, 'translate', `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, copyhistory=no, width=${w}, height=${h}, left=${x}, top=${y}`)
      return
    }

    let contentHtml = data.sentences.map(result => result.trans || '').join('')
    $('#poptranslate').show()
    $('#poptranslate').css('visibility', 'hidden')
    $('#poptranslate-explain').html(contentHtml)
    $('#poptranslate-voice').hide()

    if (data.dict) {
      $('#poptranslate').addClass('poptranslate-wordmode')
      let nouce = data.sentences.find(item => item.translit)
      if (nouce.src_translit) {
        $('#poptranslate-voice span').html(`[${nouce.src_translit}]`)
        $('#poptranslate-voice').show()
      }
      $('#poptranslate-translit').html(nouce.translit || '')
      $('#poptranslate-word').html(this.lastSelection.text)
      let dictHtml = data.dict
        .map(item => `${item.pos[0]}. ${item.terms.join('; ')}`)
        .join('<br />')
      $('#poptranslate-dict').html(dictHtml)
    } else {
      $('#poptranslate').removeClass('poptranslate-wordmode')
    }

    const view = document.getElementById('main')
    const viewPos = view.getBoundingClientRect()
    const left = pos.x - viewPos.left + (pos.width - $('#poptranslate').width()) / 2
    let top = view.scrollTop + pos.y - $('#poptranslate').height() - 30
    if (top < 0) {
      top = view.scrollTop + pos.y + pos.bottom - pos.top
      $('#poptranslate').addClass('pop-down')
    }
    $('#poptranslate').css({ left, top, visibility: 'visible' })
  }

  // showCodeTools (e) {
  //   const elem = e.target
  //   const hljsContainer = elem.classList.contains('hljs') ? elem : this.getAncestorTag(elem, '.hljs')
  //   const pos = hljsContainer.getBoundingClientRect()
  //   let top = window.pageYOffset + pos.y
  //   let left = pos.x + pos.width - 50

  //   $('#clearly-code-tool').show()
  //   $('#clearly-code-tool').css({ left, top })
  // }

  // hideCodeTools (e) {
  //   $('#clearly-code-tool').hide()
  // }

  getAncestorTag(node, tagName, maxDepth) {
    maxDepth = maxDepth || 5
    let depth = 0
    while (node.parentNode) {
      if (maxDepth > 0 && depth > maxDepth) return false

      if (tagName.startsWith('.') && node.parentNode.classList.contains(tagName.substr(1, tagName.length - 1))) return node.parentNode
      else if (node.parentNode && node.parentNode.tagName && node.parentNode.tagName.toUpperCase() === tagName.toUpperCase()) return node.parentNode

      node = node.parentNode
      depth++
    }
    return false
  }

  /**
   * Show code clip button
   * @param {Event} e
   */
  handleCodeHover(e) {
    debug('handleCodeHover', e)
    const elem = e.currentTarget
    const type = e.type
    let btn = elem.querySelector('.clearly-code-btn')
    if (type === 'mouseenter') {
      if (!btn) {
        btn = document.createElement('i')
        btn.setAttribute('class', 'clearly-code-btn ri-clipboard-fill')
        btn.innerHTML = ''
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const codeElem = elem.cloneNode(true)
          const codeLineNumber = codeElem.childNodes[0].tagName === 'CODE' ? codeElem.childNodes[0] : null
          if (codeLineNumber) codeLineNumber.remove()
          this.copy(codeElem.innerText)
          this.alert('ok', 'Copied to clipboard')
        })
        elem.appendChild(btn)
      }
      btn.style.display = ''
    } else if (type === 'mouseleave') {
      if (btn) {
        btn.style.display = 'none'
      }
    }
  }

  /**
   * Show paragraph button
   * @param {Event} e
   */
  handleParagraphHover(e) {
    if (!this.config.paragraphTranslate) return

    debug('handleParagraphHover', e)
    const elem = e.currentTarget
    const type = e.type
    if (type === 'mouseenter') {
      if (!elem.querySelector('clearly-btn')) {
        const btn = document.createElement('clearly-btn')
        btn.setAttribute('class', 'btn-ph-translate')
        btn.addEventListener('click', (e) => {
          debug('handleParagraphHover click', e)
          this.action('translateParagraph', e.currentTarget.parentNode)
          e.stopPropagation()
        }, true)
        elem.appendChild(btn)
      }
    } else if (type === 'mouseleave') {
      // const btn = elem.querySelector('clearly-btn')
      // if (btn) {
      //   btn.remove()
      // }
    }
  }

  openWindow(url) {
    if (url === 'upgradebtn') {
      url = 'https://clearlyreader.com/pricing?utm_source=clealy&utm_medium=upgradebtn'
    }
    window.open(url, '_blank')
  }

  /**
   * Open cleary
   */
  openClearlyBtn() {
    const url = $('#clearly-btn').data('url')
    if (url) {
      window.open(url + '#clearly', '_blank')
    }

    this.ga([
      '_trackEvent',
      'CHROME_APP',
      'CLICK_CLEARLY_BTN'
    ])
  }

  /**
   * Hanlde open content click
   *
   * @param {Event} e
   * @returns
   */
  handleClick(e) {
    e.preventDefault()
    const elem = e.target

    const url = elem.getAttribute('href')
    if (!url || !url.startsWith('http')) return

    if (this.config.linkOpenNew) {
      window.open(url, '_blank')
    } else {
      window.top.location = url
    }
  }

  getAndSaveSelection() {
    let selection = window.getSelection()
    let selectedText = selection.toString()
    if (!selectedText) return false

    let ranges = []
    if (selection.rangeCount) {
      for (let i = 0, len = selection.rangeCount; i < len; ++i) {
        ranges.push(selection.getRangeAt(i))
      }
    }

    this.lastSelection = {
      ranges,
      text: selectedText,
      position: selection.getRangeAt(0).getBoundingClientRect()
    }

    return true
  }

  show(article, force) {
    if (!this.load(article, force)) return
    this.ga('send', 'event', 'App', 'Show')
  }

  /**
   * App Actions
   *
   * @param {String} key
   * @param {Mixed} value
   */
  action(key, value) {
    debug('action', key, value)
    switch (key) {
      case 'reload':
        window.location.reload()
        break
      case 'showUpgrade':
        this.showUpgrade()
        break
      case 'close':
        this.callParent({ type: 'fullscreen', fullscreen: false })
        this.callParent({ type: 'close' })
        this.shutdown()
        break
      case 'feedback':
        this.setState({ isSharing: value })
        this.callBus('submitFeedback', {
          article: this.article,
          feedback: value.toUpperCase()
        })
        break
      case 'zoomIn':
        const zoomIn = ((parseFloat(this.config.zoom, 10) || 1) - 0.1).toFixed(2)
        if (zoomIn < 0.5) {
          this.setConfig({ zoom: 0.5 })
          return
        }
        this.setConfig({ zoom: zoomIn })
        break
      case 'zoomOut':
        const zoomOut = ((parseFloat(this.config.zoom, 10) || 1) + 0.1).toFixed(2)
        if (zoomOut > 2) {
          this.setConfig({ zoom: 2 })
          return
        }
        this.setConfig({ zoom: zoomOut })
        break
      case 'increseWidth':
        let increseWidth = (parseInt(this.config.width, 10) || 0) + 1
        if (increseWidth < 5 && increseWidth >= 0) {
          this.setConfig({ width: increseWidth })
        }
        break
      case 'decreseWidth':
        let decreseWidth = (parseInt(this.config.width, 10) || 0) - 1
        if (decreseWidth < 5 && decreseWidth >= 0) {
          this.setConfig({ width: decreseWidth })
        }
        break

      case 'exportDoc':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }
        const docHtml = [
          "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export From Word</title></head><body>",
          '<h1>' + this.article.title + '</h1>',
          document.getElementById('content').getElementsByTagName('article')[0].innerHTML,
          this.config.disableExportBrand ? '' : '<p style="text-align:center">[ Converted by <a href="https://clearlyreader.com">Clearly Reader<a/> ]</p>',
          '</body></html>'
        ].join('')
        const docLink = document.createElement('a')
        docLink.setAttribute('download', this.article.title + '.doc')
        docLink.setAttribute('href', 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(docHtml))
        docLink.click()
        break
      case 'exportDocx':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }
        this.convertImagesToBase64()
        const docxHtml = [
          "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export From Clearly</title></head><body>",
          '<h1>' + this.article.title + '</h1>',
          document.getElementById('content').getElementsByTagName('article')[0].innerHTML,
          this.config.disableExportBrand ? '' : '<p style="text-align:center">Converted by <a href="https://clearlyreader.com">Clearly Reader<a/></p>',
          '</body></html>'
        ].join('')
        const docxLink = document.createElement('a')
        docxLink.setAttribute('download', this.article.title + '.docx')
        docxLink.setAttribute('href', URL.createObjectURL(htmlDocx.asBlob(docxHtml)))
        docxLink.click()
        break
      case 'exportMarkdown':
        if (!this.hasPermission('PRO')) {
          this.showUpgrade()
          return
        }
        const mdLink = document.createElement('a')
        mdLink.setAttribute('download', this.article.title + '.md')
        mdLink.setAttribute('href', 'data:plain/txt;charset=utf-8,p' + encodeURIComponent(this.covertMarkdown()))
        mdLink.click()
        break
      case 'copyMarkdown':
        if (!this.hasPermission('PRO')) {
          return this.showUpgrade()
        }
        this.copy(this.covertMarkdown())
        this.alert('ok', 'Markdown copied')
        break
      case 'copyHTML':
        if (!this.hasPermission('PRO')) {
          return this.showUpgrade()
        }
        const copyHTML = document.getElementById('content').innerHTML + (this.config.disableExportBrand ? '' : '<p style="text-align:center">[ Copied from <a href="https://clearlyreader.com">Clearly Reader<a/> ]</p>')
        this.copy(copyHTML)
        this.alert('ok', 'HTML copied')
        break
      case 'copyClipUrl':
        this.copy(this.state.clipUrl)
        this.alert('ok', 'Link copied')
        break
      case 'copyTranslate':
        this.copy($('#poptranslate-explain').text() + (this.config.disableExportBrand ? '' : '\n[ Translated from Clearly Reader ]'))
        this.alert('ok', 'Translation copied')
        break
      case 'print':
        // this.setState({ showDialog: null })
        if ((this.config.printWithOutline || this.config.printWithMark || this.config.printWithoutMeta) && !this.hasPermission('PRO')) {
          return this.showUpgrade()
        }

        if (this.config.printWithOutline) $('#container').addClass('print-outline')
        if (this.config.printWithMark) $('#container').addClass('print-mark')
        if (this.config.printWithSummary) $('#container').addClass('print-summary')
        if (this.config.printWithoutMeta) $('#container').addClass('print-nometa')

        window.print()

        if (this.config.printWithOutline) $('#container').removeClass('print-outline')
        if (this.config.printWithMark) $('#container').removeClass('print-mark')
        if (this.config.printWithSummary) $('#container').removeClass('print-summary')
        if (this.config.printWithoutMeta) $('#container').removeClass('print-nometa')
        break
      case 'exportPDF':
        // html2pdf(document.body).set({
        //   image: { type: 'jpeg' },
        //   html2canvas: { scale: 1.2 },
        //   jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        // }).from().save()
        break
      case 'copyArticle':
        const doc = document
        const text = doc.getElementById('container')
        let range
        let selection

        if (doc.body.createTextRange) {
          range = doc.body.createTextRange()
          range.moveToElement(text)
          range.select()
        } else if (window.getSelection) {
          selection = window.getSelection()

          range = doc.createRange()
          range.selectNodeContents(text)

          selection.removeAllRanges()
          selection.addRange(range)
        }

        document.execCommand('copy')
        window.getSelection().removeAllRanges()
        this.alert('ok', 'Article copied')
        break
      case 'toggleFullscreenMode':
        this.setState({ fullscreen: !this.state.fullscreen })
        this.callParent({
          type: 'fullscreen',
          fullscreen: this.state.fullscreen
        })
        break
      case 'report':
        window.open('https://clearlyreader.com/r/report?url=' + encodeURIComponent(this.article.url))
        break
      case 'editShortcuts':
        this.callBus('showEditShortcuts')
        break
      case 'translateParagraph':
        if (!this.hasPermission('PRO')) {
          return this.showUpgrade()
        }
        const element = value
        if (!value) return
        const transElem = element.querySelector('.ph-translate')
        if (transElem) {
          transElem.remove()
          $(element).removeClass('ph-translated')
        } else {
          const text = element.textContent.replace(/translate$/, '')
          this.translate(text).then(data => {
            const text = data.sentences.map(s => s.trans || '').join('')
            // element.innerHTML += `<clearly-text class="ph-translate" translate-lang="${this.config.translateLang}">${text}</clearly-text>`
            const newTransElem = document.createElement('clearly-text')
            newTransElem.className = 'ph-translate'
            newTransElem.setAttribute('translate-lang', this.config.translateLang)
            newTransElem.innerText = text
            element.appendChild(newTransElem)
            $(element).addClass('ph-translated')
          })
        }
        break
      case 'login':
      case 'logout':
        this[key](value)
        break
      case 'miniUI':
        $('#btn-mini-ui').hide()
        $('#btn-max-ui').addClass('flex')
        $('#audio-control-wrapper').addClass('mini')
        break
      case 'maxUI':
        $('#btn-max-ui').removeClass('flex')
        $('#btn-mini-ui').show()
        $('#audio-control-wrapper').removeClass('mini')
        break
      case 'updateSystemConfig':
        this.updateSystemConfig()
        break
      case 'reportBug':
        window.open(`https://clearlyreader.com/r/report?url=${encodeURIComponent(this.article.url)}`)
        break
    }

    this.ga('send', 'event', 'Action', key)
  }

  convertImagesToBase64() {
    if (this.isConvertingImages) return

    this.isConvertingImages = true
    const regularImages = document.getElementById('content').querySelectorAll('img')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d');
    [].forEach.call(regularImages, function(imgElement) {
      // preparing canvas for drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = imgElement.width
      canvas.height = imgElement.height

      ctx.drawImage(imgElement, 0, 0)
      // by default toDataURL() produces png image, but you can also export to jpeg
      // checkout function's documentation for more details
      var dataURL = canvas.toDataURL()
      imgElement.setAttribute('src', dataURL)
    })
    canvas.remove()
  }

  updateSystemConfig(silent = false) {
    this.callBus('updateClearlyConfig')
      .then(data => {
        if (data && data.version && data.version !== this.state.version) {
          this.setState({ version: data.version })
          !silent && this.alert('warn', 'Config updated, refresh page to enable new config')
        } else {
          !silent && this.alert('ok', 'Config is up to date')
        }
      })
  }

  /**
   * Translate text with lang
   *
   * @param {String} text
   * @param {String} lang
   */
  translate(text, lang) {
    lang = lang || this.config.translateLang
    if (lang.split('-').shift() === this.getMainLang()) {
      lang = 'en'
    }
    const token = Math.random().toString().substr(2, 7) + '.' + Math.random().toString().substr(2, 7)
    return fetch(`https://translate.googleapis.com/translate_a/single?dt=t&dt=bd&dt=qc&dt=rm&client=gtx&sl=auto&tl=${lang}&q=${encodeURIComponent(text)}&hl=en-US&dj=1&tk=${token}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(res => res.json())
  }

  /**
   * Copy any text
   *
   * @param {String} text
   */
  copy(text) {
    const copyHTMLElem = document.createElement('textarea')
    copyHTMLElem.value = text
    document.body.appendChild(copyHTMLElem)
    copyHTMLElem.select()
    document.execCommand('Copy')
    // removing textarea after copy
    copyHTMLElem.remove()
  }

  /**
   *
   * @param {String} key
   */
  copyFromState(key) {
    if (this.state[key]) {
      this.copy(this.state[key])
      this.alert('ok', 'copied')
    } else {
      this.alert('warn', 'nothing to copy')
    }
  }

  resetConfig(key) {
    if (!this.config.hasOwnProperty(key)) return
    this.setConfig({ [key]: ClearlyApp.DEFAULT_READERCONFIG[key] })
  }

  /**
   * Covert article to markdown
   * @returns
   */
  covertMarkdown() {
    const turndown = new TurndownService()
    turndown.remove('footer')
    let md = turndown.turndown(document.getElementById('container'))
    return [md, this.config.disableExportBrand ? '' : '> Converted by [Clearly Reader](https://clearlyreader.com)'].join('\n')
  }

  /**
   * Show alert
   *
   * @param {string} type
   * @param {string} message
   */
  alert(type, message, fn, btn) {
    // $('#alert-message').text(message)
    this.setState({
      alertMessage: message,
      alertBtnCallback: fn,
      alertBtn: fn ? btn || 'Check' : null
    })

    $('#alert').attr('class', '')
    $('#alert').addClass('alert-' + type)
    $('#alert').addClass('show')

    if (this.alertTipTimer) {
      clearTimeout(this.alertTipTimer)
    }

    this.alertTipTimer = setTimeout(_ => {
      $('#alert').removeClass('show')
      this.alertTipTimer = null
      this.setState({
        alertMessage: null,
        alertBtnCallback: null,
        alertBtn: null
      })
    }, 3000)
  }

  alertBtnClick() {
    if (typeof this.state.alertBtnCallback === 'function') {
      this.state.alertBtnCallback()
    }
  }

  /**
   * Update state event
   *
   * @param {String} key
   * @param {Mixed} value
   * @param {Mixed} oldValue
   */
  handleState(key, value, oldValue, initial) {
    if (value === oldValue && !initial) return
    debug('handleState', key, value, oldValue)
    this.handleBind('state', key, value, oldValue)
    switch (key) {
      case 'speak':
        if (!this.article) return

        if (value === 'RESTART') {
          this.setState({ speakStartPos: 0, speakPos: 0, speak: 'START', speakMark: true }, initial)
          return
        }

        this.ga('send', 'event', 'Speak', value)

        switch (value) {
          case 'PAUSE':
            this.speakPause()
            break
          case 'START':
            this.speakStart()
            break
          case 'STOP':
          case null:
            this.speakStop()
            break
          case 'EXIT':
            $('#audio-player').removeClass('show')
            this.setState({ speak: 'STOP' })
            break
        }
        break

      case 'autoOpenMode':
        this.callBus('setAutoOpen', { url: this.article.url, mode: value })
          .then(data => this.setState({ autoOpen: data }))

        this.ga('send', 'event', 'Set AutoOpen', value)
        break
      case 'autoOpen':
        if (!value) {
          this.setState({ autoOpenValue: null })
        } else {
          this.setState({ autoOpenValue: value.value })
          $('#autoopen-select').html(
            value.availableOptions.map(i => `<li click="autoOpenMode=${i.mode}">${i.value}</li>`).join('')
          )
          $('#autoopen').attr('class', 'autoopen-mode-' + value.mode)
        }
        break
      case 'fullscreen':
        if (value) {
          $('#menu-fullscreen').addClass('menu-actived')
          $('#menu-fullscreen-icon').addClass('ri-fullscreen-exit-fill')
          $('#menu-fullscreen-icon').removeClass('ri-fullscreen-line')
        } else {
          $('#menu-fullscreen').removeClass('menu-actived')
          $('#menu-fullscreen-icon').addClass('ri-fullscreen-line')
          $('#menu-fullscreen-icon').removeClass('ri-fullscreen-exit-fill')
        }
        this.ga('send', 'event', 'Fullscreen', value)
        break
      case 'isSharing':
        $('.share-overlay').hide()
        switch (value) {
          case 'yes':
            $('#share-yes').show()
            break
          case 'no':
            $('#share-no').show()
            break
          case 'finish':
          default:
            $('#share-default').show()
        }
        break
      case 'isReady':
        if (value) {
          $('#loading').hide()
          // $('#loading').show()
          $('#tool').css('display', 'flex')
          $('#container').show()
        } else {
          $('#loading').show()
          $('#tool').css('display', 'none')
          $('#container').hide()
        }
        break
      case 'showDialog':
        if (initial) return
        $('.dialog').removeClass('dialog--open')
        $(`#dialog-${value}`).addClass('dialog--open')

        this.showDialog(value)
        this.ga('send', 'event', 'Show Dialog', value)
        break
      case 'fonts':
        $('#font-select-style').html(
          value
            .map(f => {
              let fontValue = f.name.toLowerCase().replace(/ /g, '')
              return `<span style="font-family:${fontValue}" class="btn-font ${this.config.font === fontValue ? 'font-selected' : ''}" bind-class="font-selected:config.font=${fontValue}" click="config.font=${fontValue}">${f.name}</span>`
            })
            .concat(
              this.state.clientApp === 'extension'
                ? `<span class="btn-font btn-font-custom btn-pro" bind-css="font-family:config.systemFont" bind-class="font-selected:config.font=custom" click="config.font=custom" show="browser=chrome,edge">Custom</span>
          <select id="font-custom" bind="config.systemFont" show="config.font=custom"></select>`
                : ''
            )
            .join('')
        )
        break
      case 'systemFonts':
        $('#font-custom').html(value.map(item => `<option value="${item.fontId}" ${this.config.systemFont === item.fontId ? 'selected' : ''} style="font-family: ${item.fontId}">${item.displayName}</option>`))
        break
      case 'themes':
        $('#themes .themes-list').html(
          value
            .map(t => `<span class="btn-theme ${t.theme === this.config.theme ? 'btn-selected' : ''} ${t.pro && !this.hasPermission('PRO') ? 'btn-pro' : ''}" click="config.theme=${t.theme}" style="background-color: ${t.mainColor};background-image:${t.bgImg ? `url(${this.replaceExtensionUrl(t.bgImg)})` : 'none'}; background-size:cover; color:${t.fontColor};" bind-class="btn-selected:config.theme=${t.theme}">${t.theme}</span>`)
            .concat(`<span click="config.theme=custom" bind-class="btn-selected:config.theme=custom" class="btn-theme btn-theme-custom btn-pro" bind-css="background-color:config.mainColor;color:config.fontColor">custom</span>
            <span click="config.theme=css" bind-class="btn-selected:config.theme=css" class="btn-theme btn-theme-css btn-pro">css</span>`)
            .join('')
        )

        $('#themes-day .themes-list').html(value.filter(t => t.autoTheme === 'day').map(t => `<span class="btn-theme ${t.theme === this.config.themeDay ? 'btn-selected' : ''} ${t.pro && !this.hasPermission('PRO') ? 'btn-pro' : ''}" click="config.themeDay=${t.theme}" style="background-color: ${t.mainColor};background-image:${t.bgImg ? `url(${this.replaceExtensionUrl(t.bgImg)})` : 'none'}; background-size:cover; color:${t.fontColor};" bind-class="btn-selected:config.themeDay=${t.theme}">${t.theme}</span>`).join(''))

        $('#themes-night .themes-list').html(value.filter(t => t.autoTheme === 'night').map(t => `<span class="btn-theme ${t.theme === this.config.themeNight ? 'btn-selected' : ''} ${t.pro && !this.hasPermission('PRO') ? 'btn-pro' : ''}" click="config.themeNight=${t.theme}" style="background-color: ${t.mainColor};background-image:${t.bgImg ? `url(${this.replaceExtensionUrl(t.bgImg)})` : 'none'}; background-size:cover; color:${t.fontColor};" bind-class="btn-selected:config.themeNight=${t.theme}">${t.theme}</span>`).join(''))
        break
      case 'speakWordRange':
        this.maker.unmark()
        this.maker.markRanges([value], {
          className: 'mark-word',
          element: 'span',
          exclude: ['clearly-btn', 'clearly-text'],
          done: () => {
            const markElem = document.querySelector('span.mark-word')
            if (!markElem) return
            this.scrollTo(markElem, 500)
          }
        })
        break
      case 'speakWord':
        // if (oldValue) {
        this.maker.unmark()
        // }
        if (value && this.state.speak === 'START') {
          const speakPos = this.state.speakStartPos + value.charIndex
          this.setState({ speakPos })
          debug('speak word', this.state.articleText.substr(speakPos, value.charLength))
          this.maker.markRanges(
            [{ start: speakPos, length: value.charLength }],
            {
              className: 'mark-word',
              element: 'span',
              exclude: ['clearly-btn', 'clearly-text'],
              done: () => {
                const markElem = document.querySelector('span.mark-word')
                if (!markElem) return
                this.scrollTo(markElem, 500)
              }
            }
          )
        }
        break
      case 'speakVoice':
        if (value !== 'auto' && !this.hasPermission('PRO')) {
          this.setState({ speakVoice: 'auto' })
          this.showUpgrade()
          return
        }

        this.setState({ speakVoiceName: value === 'auto' ? 'Auto' : this.getVoice().name })

        $(`[click="speakVoice=${oldValue}"]`).removeClass('selected')
        $(`[click="speakVoice=${value}"]`).addClass('selected')

        if (this.state.speak === 'START') {
          this.setState({ speak: 'PAUSE' }, initial)
          this.setState({ speak: 'START' }, initial)
        }

        if (!initial && this.state && this.state.speakVoiceMap[this.getMainLang()] !== value) {
          if (typeof this.state.speakVoiceMap !== 'object') this.state.speakVoiceMap = {}
          this.setState({ speakVoiceMap: { ...this.state.speakVoiceMap, [this.getMainLang()]: value } })
        }
        break
      case 'speechVoices':
        this.buildVoices()
        break
      case 'articleLang':
        this.buildVoices()
        break
      case 'speakVoiceMap':
        this.setState({ speakVoice: value && value[this.getMainLang()] ? value[this.getMainLang()] : 'auto' }, initial)
        break
    }
  }

  /**
   * Speak start
   */
  async speakStart() {
    $('#menu-speak').addClass('menu-actived')
    $('#menu-speak-icon').addClass('ri-volume-up-fill')
    $('#menu-speak-icon').removeClass('ri-volume-down-line')
    $('#audio-player').addClass('show')

    let speakData
    if (this.state.speakStartPos) {
      speakData = {
        text: this.state.articleText.substr(this.state.speakStartPos, this.state.articleText.length - this.state.speakStartPos),
        rate: this.config.speakRate,
        voiceName: this.state.speakVoice,
        pitch: this.config.speakPitch || 1
      }
    } else {
      speakData = {
        text: this.state.articleText,
        rate: this.config.speakRate,
        voiceName: this.state.speakVoice,
        pitch: this.config.speakPitch || 1
      }
    }

    if (this.config.speechMSEngine) {
      const msSpeechConfig = await this.api('getSpeechConfig', speakData)
      if (!msSpeechConfig) {
        this.setState({ speak: 'STOP' })
        return
      }
      this.alert('ok', msSpeechConfig.message || 'Start speaking...')

      this.speechMSWords = []
      const player = this.speechMSPlayer = new SpeechSDK.SpeakerAudioDestination()
      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player)
      const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(msSpeechConfig.token, msSpeechConfig.region)
      speechConfig.speechSynthesisVoiceName = await this.getVoiceConfig()
      let synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig)
      synthesizer.wordBoundary = (s, e) => {
        console.log('(WordBoundary), Text: ' + e.text + ', Audio offset: ' + e.audioOffset / 10000 + 'ms.', e.wordLength, e.textOffset)
        // const speakPos = this.state.speakStartPos + e.textOffset
        // , speakWordRange: { start: speakPos, length: e.wordLength }
        // this.setState({ speakPos })
        this.speechMSWords.push(e)
      }
      this.speechMSStatus = synthesizer.speakSsmlAsync(await this.buildSSML(speakData), function(result) {
        if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
          // resultDiv.innerHTML += 'synthesis finished for [' + inputText + '].\n'
        } else if (result.reason === SpeechSDK.ResultReason.Canceled) {
          // resultDiv.innerHTML += 'synthesis failed. Error detail: ' + result.errorDetails + '\n'
        }
        window.console.log(result)
        synthesizer.close()
        synthesizer = undefined
      }, function(err) {
        window.console.log(err)
        synthesizer.close()
        synthesizer = undefined
      })
      this.startMSWordHighlight()
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }
      this.alert('ok', 'Start speaking...')
      const utterance = this.speechUtterance = new SpeechSynthesisUtterance(speakData.text)
      utterance.rate = Number(speakData.rate || '1') * 0.9
      utterance.voice = await this.getVoiceConfig()

      if (utterance.voice) {
        this.setState({ speakMark: true })
        utterance.onboundary = (data) => {
          // console.log('speak word boundary', data)
          const speakPos = this.state.speakStartPos + data.charIndex
          this.setState({ speakPos, speakWordRange: { start: speakPos, length: data.charLength } })
          // this.setState({ speakWord: data })
        }
      } else {
        this.setState({ speakMark: 'false' })
      }

      utterance.pitch = speakData.pitch
      utterance.volume = 1
      utterance.onpause = () => {
        this.setState({ speak: 'PAUSE' })
      }
      utterance.onstop = utterance.onerror = () => {
        this.setState({ speak: 'STOP' })
      }
      window.speechSynthesis.speak(utterance)
    }
  }

  startMSWordHighlight() {
    let text = this.article.text
    let index = 0

    if (this.speechMSWordTimer) {
      clearInterval(this.speechMSWordTimer)
      this.speechMSWordTimer = null
    }

    this.speechMSWordTimer = setInterval(() => {
      const curTime = this.speechMSPlayer.currentTime

      const curWord = this.speechMSWords.find((word) => {
        return (curTime >= word.audioOffset / 10000000) && (curTime <= (word.audioOffset + word.duration) / 10000000)
      })

      if (!curWord || !curWord.text) {
        // not text words
        return
      }

      index = text.indexOf(curWord.text, index)
      length = curWord.text.length

      // console.log('speech curword', curWord.text, index, length)
      this.setState({ speakPos: index, speakWordRange: { start: index, length } })
    }, 100)
  }

  async buildSSML({ text, rate }) {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${this.articleLang}">
    <voice name="${await this.getVoiceConfig()}"><prosody rate="${(Number(rate || '1') - 1) * 100}%">${escape(text)}</prosody></voice></speak>`

    function escape(text) {
      var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }

      return text.replace(/[&<>"']/g, function(m) { return map[m] })
    }
  }

  /**
   * Speak stop
   */
  speakStop() {
    $('#menu-speak').removeClass('menu-actived')
    $('#menu-speak-icon').addClass('ri-volume-down-line')
    $('#menu-speak-icon').removeClass('ri-volume-mute-fill')

    if (this.config.speechMSEngine) {
      this.speechMSPlayer && this.speechMSPlayer.pause()
      this.speechMSWords = []
    } else {
      window.speechSynthesis.cancel()
    }
    this.setState({ speakWord: null, speakStartPos: 0, speakPos: 0 })
  }

  /**
   * Control speak pause
   */
  speakPause() {
    $('#menu-speak').addClass('menu-actived')
    $('#menu-speak-icon').addClass('ri-volume-mute-fill')
    $('#menu-speak-icon').removeClass('ri-volume-up-fill')
    if (this.config.speechMSEngine) {
      this.speechMSPlayer && this.speechMSPlayer.pause()
    } else {
      window.speechSynthesis.cancel()
    }
    this.setState({ speakStartPos: this.state.speakPos, speakPos: 0 })
  }

  /**
   * Show dialog
   *
   * @param {String} type
   */
  showDialog(type) {
    switch (type) {
      case 'clip':
        this.clip('bookmark')
        break
      case 'account':
        this.callBus('refreshToken').then(config => {
          if (config && config.accountToken) {
            this.setConfig(config)
          }
        })
        break
      case 'setting':
        this.updateSystemConfig({ silent: true })
        break
    }
  }

  retrySummary() {
    window.open('https://clearlyreader.com/app?utm_source=clearly', '_blank')
  }

  async buildVoices() {
    const voices = await this.getVoices()
    $('#menu-voices').html('')
    $('#menu-voices').append(`<span class="item-voice" click="speakVoice=auto;showVoiceSelector=0">Auto</span>`)
    voices.forEach(voice => {
      $('#menu-voices').append(`<span class="item-voice" click="speakVoice=${voice.id};showVoiceSelector=0">${voice.name}</span>`)
    })
  }

  /**
   * Get voice
   *
   * @returns
   */
  async getVoices() {
    const mainLang = this.getMainLang()
    if (this.config.speechMSEngine) {
      return this.state.msTTSVoices.filter(voice => {
        return voice.Locale.split('-').shift() === mainLang
      }).map(voice => {
        return {
          name: voice.LocalName,
          id: voice.ShortName
        }
      })
    } else {
      if (!this.state.speechVoices) this.state.speechVoices = await this.getSpeechVoices()
      return (this.state.speechVoices || []).filter(voice => {
        return voice.lang.split('-').shift() === mainLang && voice.localService
      }).map(voice => {
        return {
          name: voice.name,
          id: voice.name
        }
      })
    }
  }

  /**
   * Get voice
   *
   * @returns {Object}
   */
  async getVoice() {
    const voices = await this.getVoices()
    let voice = voices.find(voice => voice.id === this.state.speakVoice)
    if (!voice) voice = voices[0]
    return voice
  }

  /**
   * Get auto voice name
   *
   * @param {String} voiceName
   * @returns
   */
  async getVoiceConfig() {
    const voice = await this.getVoice()
    if (!voice) return
    if (this.config.speechMSEngine) {
      return voice.id
    } else {
      return this.state.speechVoices.find(v => v.name === voice.id)
    }
  }

  getSpeechVoices() {
    return new Promise(
      function(resolve, reject) {
        let synth = window.speechSynthesis
        let id

        id = setInterval(() => {
          if (synth.getVoices().length !== 0) {
            resolve(synth.getVoices())
            clearInterval(id)
          }
        }, 10)
      }
    )
  }

  /**
   * Hanlde state bind
   *
   * @param {*} key
   * @param {*} value
   */
  handleBind(type, key, value) {
    debug('handleBind', type, key, value)

    const prefix = type === 'config' ? 'config.' : ''
    const id = `${prefix}${key}`

    $(`[show*="${id}"]`).each((_, elem) => this.processBindEquation(elem))

    $(`[bind*="${id}"]`).each((_, elem) => this.processBindValue('bind', elem))

    $(`[repeat="${id}"]`).each((_, elem) => {
      const repeatName = $(elem).attr('repeat')
      this.repeatDoms[repeatName] = { elem, parent: elem.parentNode, nodes: [] }
      elem.remove()
    })

    if (this.repeatDoms[id] && value && value.length > 0) {
      const { elem, parent, nodes } = this.repeatDoms[id]

      // emtpy nodes
      nodes.forEach(node => node.remove())
      this.repeatDoms[id].nodes = []

      value.forEach(v => {
        const newElem = elem.cloneNode(true)
        newElem.contextValue = v

        newElem.querySelectorAll('[bind]').forEach(el => this.processBindValue('bind', el))
        newElem.querySelectorAll('[bind-href]').forEach(el => this.processBindValue('bind-href', el))
        newElem.querySelectorAll('[show]').forEach(el => this.processBindEquation(el))

        // newElem.removeAttribute('repeat')
        parent.appendChild(newElem)
        this.repeatDoms[id].nodes.push(newElem)
      })
    }

    $(`[bind-css*="${id}"]`).each((_, elem) => {
      const bindExprs = $(elem).attr('bind-css')
      bindExprs.split(';').forEach(expr => {
        const [k, v] = expr.split(':')
        const prop = String(v).trim()
        if (prop === prefix + key) {
          $(elem).css(String(k).trim(), value)
        }
      })
    })

    $(`[disable]`).each((_, elem) => this.processBindEquation(elem, 'disable'))

    $(`[bind-class*="${id}"]`).each((_, elem) => {
      debug('handleBind', key, elem)
      const $elem = $(elem)
      const bindExprs = $elem.attr('bind-class')
      bindExprs.split(';').forEach(expr => {
        let [cls, clsExpr] = String(expr).trim().split(':')
        let [prop, propValue] = String(clsExpr).trim().split('=')
        cls = String(cls).trim()

        // true/false value support
        let positive = true
        if (!propValue) {
          if (prop.startsWith('!')) {
            prop = prop.substring(1)
            propValue = false
          } else {
            propValue = true
          }
        } else if (prop.endsWith('!')) {
          prop = prop.substring(0, prop.length - 1)
          positive = false
        }

        const v = prop.startsWith('config.') ? this.config[prop.substring(7)] : this.state[prop]
        debug('handleBind check', expr, prop, propValue, v)

        // Check config value match
        if (prop === prefix + key) {
          const exprMatched = (
            propValue === v ||
            (typeof propValue === 'string' && propValue && v && propValue.split(',').includes(v)) ||
            (typeof propValue === 'boolean' && propValue === !!v)
          )
          debug('handleBind match', expr, positive, exprMatched)
          if ((positive && exprMatched) || (!exprMatched && !positive)) {
            debug('handleBind add', key, cls)
            $elem.addClass(cls)
          } else if ($elem.hasClass(cls)) {
            debug('handleBind remove', key, cls)
            $elem.removeClass(cls)
          }
        }
      })
    })
  }

  formatDate(time, defaultText = '') {
    return time ? dayjs(time).format('YYYY-MM-DD') : defaultText
  }

  formatTime(time, defaultText = '') {
    return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : defaultText
  }

  processBindEquation(elem, type = 'show') {
    const exprs = $(elem).attr(type)
    debug('processBindEquation', type, exprs)
    const ok = exprs.split('&&').every(expr => {
      let [prop, propValue] = String(expr).trim().split('=')

      // true/false value support
      let positive = true
      if (!propValue) {
        if (prop.startsWith('!')) {
          prop = prop.substring(1)
          propValue = false
        } else {
          propValue = true
        }
      } else if (prop.endsWith('!')) {
        prop = prop.substring(0, prop.length - 1)
        positive = false
      }

      let value
      if (prop.startsWith('.')) {
        const contextElem = this.findContextElem(elem)
        value = ((contextElem && contextElem.contextValue) || {})[prop.substring(1)]
      } else {
        value = prop.startsWith('config.') ? this.config[prop.substring(7)] : this.state[prop]
      }

      const matched = value === propValue ||
        (typeof propValue === 'string' && propValue.split(',').map(i => i === '!' ? '' : i).includes(value || '')) ||
        ((Array.isArray(value) ? value.length > 0 : value) && (propValue === '*' || propValue === true)) ||
        (propValue === false && (Array.isArray(value) ? value.length === 0 : !value))

      if ((positive && matched) || (!positive && !matched)) {
        debug('processShow check ok', prop, value, propValue, expr)
        return true
      } else {
        debug('processShow check fail', prop, value, propValue, expr)
        return false
      }
    })

    switch (type) {
      case 'show':
        if (ok) {
          debug('processShow ok', elem)
          $(elem).show()
        } else {
          debug('processShow no', elem)
          $(elem).hide()
        }
        break
      case 'disable':
        if (ok) {
          debug('processDisable ok', elem)
          $(elem).attr('disabled', 'disabled')
        } else {
          debug('processDisable no', elem)
          $(elem).removeAttr('disabled')
        }
        break
    }
  }

  /**
   * Bind type
   *
   * @param {String} type
   * @param {Node} elem
   * @param {String|Function} value
   */
  processBindValue(type, elem) {
    const expr = elem.getAttribute(type)
    // value = typeof value === 'function' ? value(expr, elem) : value
    let [key, fn] = expr.split('|')
    let value
    key = key.trim()
    fn = fn && fn.trim()
    if (key.startsWith('config.')) {
      value = this.config[key.substr(7)]
    } else if (key.startsWith('.')) {
      const contextElem = this.findContextElem(elem)
      value = ((contextElem && contextElem.contextValue) || {})[key.substring(1)]
    } else {
      value = this.state[key]
    }

    if (fn) {
      value = this[fn] ? this[fn](value) : value
    }

    value = value || ''
    if (elem.getAttribute('type') === 'color' && !value) {
      value = '#ffffff'
    }

    if (type === 'bind') {
      if (elem.nodeName === 'INPUT' || elem.nodeName === 'SELECT' || elem.nodeName === 'TEXTAREA') {
        elem.value = value
      } else {
        $(elem).text(value)
      }
    } else if (type === 'bind-href') {
      elem.setAttribute('href', value)
    }
  }

  /**
   * Config update
   *
   * @param {String} key
   * @param {Mixed} value
   * @param {Mixed} oldValue
   */
  handleConfig(key, value, oldValue, initial) {
    if (value === oldValue && !initial) return
    if (typeof value === 'object' && JSON.stringify(value) === JSON.stringify(oldValue) && !initial) return
    debug('handleConfig', key, value, oldValue)
    this.handleBind('config', key, value, oldValue)

    switch (key) {
      case 'theme':
      case 'themeDay':
      case 'themeNight':
        const selectedTheme = this.state.themes.find(t => t.theme === value)
        if (['custom', 'css'].includes(value) || (selectedTheme && selectedTheme.pro)) {
          // upgrade
          if (!this.hasPermission('PRO')) {
            this.setConfig({ [key]: oldValue === value ? 'default' : oldValue })
            this.showUpgrade()
            return
          }
          this.setState({ showDialog: value }, initial)
        }
      // eslint-disable-next-line no-fallthrough
      case 'themeAuto':
      case 'lineHeight':
      case 'letterSpacing':
      case 'roundCorner':
        this.selectTheme(oldValue)
        break
      case 'zoom':
        $('#value-zoom').text((value * 100).toFixed(0) + '%')
        // document.getElementById('container').style.zoom = value
        if (oldValue !== value) {
          $('html').removeClass('font-' + Math.floor(oldValue * 100))
        }
        $('html').addClass('font-' + Math.floor(value * 100))
        break
      case 'width':
        $('#value-width').text((10 + parseInt(value) - 2) * 10 + '%')
        if (oldValue !== value) {
          $('#root').removeClass('width-' + oldValue)
        }
        $('#root').addClass('width-' + value)
        // this.initialBook(true)
        break
      case 'speakRate':
        $(`[click="config.speakRate=${oldValue}"]`).removeClass('selected')
        $(`[click="config.speakRate=${value}"]`).addClass('selected')
        if (this.state.speak === 'START') {
          this.setState({ speak: 'PAUSE' }, initial)
          this.setState({ speak: 'START' }, initial)
        }
        break
      case 'readUpdates':
        if (value !== (this.initConfig.client && this.initConfig.client.version)) {
          $('#btn-about').addClass('info')
        } else {
          $('#btn-about').removeClass('info')
        }
        break
      case 'bgColor':
      case 'mainColor':
      case 'fontColor':
      case 'codeBgColor':
        if (this.config.theme === 'custom') {
          this.selectTheme('custom')
        }
        break
      case 'customCSS':
        if (this.config.theme === 'css') {
          this.selectTheme('css')
        }
        break
      case 'font':
        // this.selectTheme()
        if (value === 'custom') {
          if (!this.hasPermission('PRO')) {
            this.setConfig({ [key]: 'default' })
            !initial && this.showUpgrade()
            return
          }
          this.getSystemFonts()
        }
        this.selectTheme()
        break
      case 'systemFont':
        this.selectTheme()
        break
      case 'syntax':
      case 'latex':
      case 'lang':
        !initial && this.alert('warn', `Change ${key} need to refresh page`, _ => this.action('reload'), 'Refresh')
        break
      case 'bookLayout':
        if (value) {
          $('#root').addClass('book-layout')
          this.initialView()
        } else {
          $('#root').removeClass('book-layout')
          this.disableBookView()
        }
        break
      case 'translateLang':
        if ($('#poptranslate').is(':visible')) {
          this.popmenu('translate')
        }
        break
      case 'disableExportBrand':
        if (value) {
          $('#print-copyright').css({ visibility: 'hidden' })
        } else {
          $('#print-copyright').css({ visibility: 'visible' })
        }
        break
      case 'accountEmail':
      case 'accountPlanId':
      case 'accountPlanExpiredAt':
        this.resetAccount()
        break
      case 'speechMSEngine':
        this.buildVoices()
        break
      case 'showVideo':
        if (value) {
          // $('#content iframe').show()
          $('#root').removeClass('disable-video')
        } else {
          $('#root').addClass('disable-video')
        }
        break
      case 'syncBookmark':
        /**
         * migrate syncBookmark to autoClip
         */
        if (value) {
          delete this.config.syncBookmark
          this.setConfig({ autoClip: true })
        }
        break
      case 'syncConfig':
        if (value) {
          this.syncConfig()
        }
        break
    }

    // init not trigger update
    if (initial) return

    this.ga('send', 'event', 'Update Config', key, String(value))
    if (!['syncConfig'].includes(key) && !key.startsWith('account') && !key.startsWith('sync')) {
      debug('syncConfig', key)
      this.syncConfig()
    }

    this.saveUserConfig()
  }

  initialView(keepPage) {
    setTimeout(() => {
      const main = document.getElementById('main')
      const container = document.getElementById('container')
      const viewWidth = main.offsetWidth
      const viewHeight = main.offsetHeight
      this.setState({ viewWidth, viewHeight })

      if (this.config.bookLayout) {
        const pagePadding = Number(getComputedStyle(main).paddingLeft.split('px').shift(), 0)
        const columnWidth = viewWidth - 2 * pagePadding
        container.style.columnWidth = columnWidth + 'px'
        container.style.columnGap = pagePadding * 2 + 56 + 'px'
        const viewSize = container.scrollWidth
        const bookPages = Math.ceil(viewSize / viewWidth) || 1
        this.setState({ viewSize, bookPages })
        this.scrollPage(keepPage ? this.state.bookPage : 1)
      } else {
        const viewSize = main.scrollHeight
        this.setState({ viewSize, bookPages: Math.ceil(viewSize / viewHeight) || 1 })
      }
    }, 1)
  }

  syncConfig(overwrite) {
    // not permission
    if (!this.hasPermission('PRO')) return
    // not enable sync
    if (!this.config.syncConfig) return

    this.api('syncConfig', { config: this.config, force: overwrite === 'local' }).then(data => {
      if (!data) return

      if (data.reason === 'CONFLICT' && !overwrite) {
        this.alert('error', `Sync config failed: ${data.reason}`, _ => this.setState({ showDialog: 'setting' }))
      }

      this.setState({ syncConfigStatus: overwrite || data.reason === 'OK' ? null : data.reason })

      if (data.config) {
        if (overwrite === 'online' || ['OK', 'PULL'].includes(data.reason)) {
          this.setConfig(data.config)
        }

        this.setState({ syncAt: data.config.syncAt })
      }
    })
  }

  resetAccount() {
    if (this.hasPermission('PREMIUM')) {
      $('.icon-premium').hide()
      $('.btn-premium').removeClass('btn-premium')
      $('.icon-pro').hide()
      $('.btn-pro').removeClass('btn-pro')
      this.setState({ tipUpgrade: false })
    } else if (this.hasPermission('PRO')) {
      $('.icon-pro').hide()
      $('.btn-pro').removeClass('btn-pro')
      this.setState({ tipUpgrade: false })
    } else {
      $('.icon-pro').show()
      $('.icon-premium').show()
      this.setConfig({
        // theme: 'default',
        themeAuto: false,
        // font: 'system',
        disableExportBrand: false,
        disableBrand: false,
        bookLayout: false,
        latex: true,
        lineHeight: 1.6,
        spacing: 0,
        syncConfig: false,
        // autoClip: false,
        speechMSEngine: false,
        // roundCorner: false,
        // showVideo: false,
        popmenuWiki: true,
        popmenuSearch: true,
        paragraphTranslate: true
      })

      if (['css', 'custom'].includes(this.config.theme)) {
        this.setConfig({ theme: 'default' })
      }

      if (this.config.font === 'custom') {
        this.setConfig({ theme: 'System' })
      }
    }
  }

  disableBookView() {
    const container = document.getElementById('container')
    container.style.columnWidth = ''
    container.style.columnGap = ''
    this.setState({ bookPages: 1, bookPage: 1 })
  }

  scrollPage(page) {
    if (this.config.bookLayout) {
      if (page === 'prev') {
        page = this.state.bookPage > 1 ? this.state.bookPage - 1 : 1
      } else if (page === 'next') {
        page = this.state.bookPage < this.state.bookPages ? this.state.bookPage + 1 : this.state.bookPage
      } else if (page === 'home') {
        page = 1
      } else if (page === 'last') {
        page = this.state.bookPages
      }

      if (page < 1) {
        page = 1
      } else if (page > this.state.bookPages) {
        page = this.state.bookPages
      }

      this.setState({ bookPage: page })
      const bookView = document.getElementById('container')
      const pos = (page - 1) * this.state.viewWidth
      bookView.scroll(pos, 0)
    } else {
      let pos = null

      if (page === 'prev') {
        pos = main.scrollTop - this.state.viewHeight
      } else if (page === 'next') {
        pos = main.scrollTop + this.state.viewHeight
      } else if (page === 'home') {
        pos = 0
      } else if (page === 'last') {
        pos = main.scrollHeight
      }

      if (pos === null) return

      if (pos < 0) {
        pos = 0
      } else if (pos > this.state.viewSize) {
        pos = this.state.viewSize
      }

      const bookView = document.getElementById('main')
      bookView.scroll(0, pos)
    }
  }

  controlToggle(key) {
    let type = 'state'
    let fn = 'setState'
    if (key.startsWith('config.')) {
      key = key.substring(7)
      type = 'config'
      fn = 'setConfig'
    }

    const FREE_KEYS = ['clipPopup']
    const PREMIUM_KEYS = ['speechMSEngine']
    const isFreeFunc = FREE_KEYS.includes(key)
    const permType = PREMIUM_KEYS.includes(key) ? 'PREMIUM' : 'PRO'
    if (!isFreeFunc && !this.hasPermission(permType)) {
      this.showUpgrade(permType)
      return
    }

    this[fn]({ [key]: !this[type][key] })
  }

  hasPermission(type) {
    // if (!type) type = 'PRO'
    // const types = type === 'PRO' ? ['PRO', 'PREMIUM'] : ['PREMIUM']
    // if (!types.includes(this.config.accountPlanId) || this.config.accountPlanExpiredAt < Date.now()) {
    //   return false
    // }
    return true
  }

  showUpgrade(type, message) {
    type = type || 'PRO'
    this.alert('warn', message || this.message('app.upgrade.tip' + type.toLowerCase()))
    this.setState({ showDialog: 'upgrade' })
  }

  getBrowser() {
    let userAgent = navigator.userAgent
    let browserName

    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = 'chrome'
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = 'firefox'
    } else if (userAgent.match(/safari/i)) {
      browserName = 'safari'
    } else if (userAgent.match(/opr\//i)) {
      browserName = 'opera'
    } else if (userAgent.match(/edg/i)) {
      browserName = 'edge'
    } else {
      browserName = null
    }
    return browserName
  }

  getMainLang() {
    return ((this.article && this.article.lang) || 'en').split('-').shift()
  }

  selectTheme(old) {
    const autoTheme = this.config && this.config.themeAuto
    let selectedTheme = 'default'

    if (autoTheme) {
      const isNight = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      selectedTheme = this.config[isNight ? 'themeNight' : 'themeDay']
    } else {
      selectedTheme = this.config.theme
    }

    let theme = this.state.themes.find(t => t.theme === selectedTheme)

    if (old && old !== selectedTheme && selectedTheme === 'custom' && !this.config.bgColor) {
      // Change to custom
      theme = this.state.themes.find(t => t.theme === 'default')
      this.setConfig({ ...theme, theme: 'custom' })
    } else if (!theme) {
      // Already custom
      theme = this.config
    }

    let sheet = document.querySelector('style#theme-style')
    if (!sheet) {
      sheet = document.createElement('style')
      sheet.id = 'theme-style'
      sheet.type = 'text/css'
      document.body.appendChild(sheet)
    }

    sheet.innerHTML = `
.icon-mask:before {
  background-color: ${theme.fontColor};
}
html {
  background-image: ${theme.bgImg ? 'url(' + this.replaceExtensionUrl(theme.bgImg) + ')' : 'none'};
  background-color: ${theme.bgColor};
  font-family: "${this.config.font === 'custom' ? this.config.systemFont : this.config.font}";
  color: ${theme.fontColor};
}
#main {
  background-color: ${theme.mainColor};
  background-image: ${theme.mainImg ? 'url(' + theme.mainImg + ')' : 'none'};
  ${this.config.roundCorner ? `
  border-radius: 20px;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 54px;
  ` : ''}
}
article * {
  letter-spacing: ${this.config.letterSpacing ? this.config.letterSpacing + 'em' : 'normal'};
  line-height: ${this.config.lineHeight || '1.6'}em;
}
#main a {
  color: ${theme.linkColor};
  border-bottom: 1px dashed ${theme.fontColor};
}
#main a:hover {
  border-bottom: 2px solid ${theme.fontColor};
}
${selectedTheme === 'css' ? theme.customCSS : ''}`

    ; ($('html').attr('class') || '').split(' ').forEach(className => {
      if (className.startsWith('theme-')) {
        $('html').removeClass(className)
      }
    })
    $('html').addClass('theme-' + selectedTheme)
  }

  replaceExtensionUrl(url) {
    return String(url || '')
      .replace('__MSG_@@extension_id__', (this.runtime && this.runtime.id) ? `//${this.runtime.id}` : '/webreader/file')
  }

  /**
   * Save user reader config
   */
  saveUserConfig() {
    if (!this.config) return

    debug('saveUserConfig', this.config)

    // this.syncConfig()
    if (this.useBackground) {
      return this.callBus('saveUserConfig', this.config)
    } else {
      window.localStorage.setItem('readerconfig', JSON.stringify({
        ...this.initConfig,
        readerConfig: this.config
      }))
    }
  }

  async getUserConfig() {
    return this.callBus('getUserConfig')
  }

  /**
   * Get user reader config
   *
   * @returns {Object||NULL}
   */
  async getConfig() {
    let config = {}
    try {
      if (!this.useBackground) {
        config = JSON.parse($('#config').text())
      } else {
        config = await this.callBus('getConfig', { url: this.initParams.url })
      }
    } catch (e) {
      // console.error(e)
      config = await this.callBus('getConfig', { url: this.initParams.url })
    }
    return config
  }

  /**
   * Send GA
   *
   * @param {Array} data
   */
  ga(...data) {
    debug('ga', ...data)
    window.ga && window.ga(...data)
  }

  // Send message
  callParent(data) {
    debug('sendParent', data)
    parent.postMessage({ ...data, parent: true }, '*')
    // chrome.tabs.sendBackground(this.tabId, data, cb)
  }

  callBus(type, data) {
    debug('callBus', type, data)
    if (this.useBackground) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type,
          ...data
        }).then((resp) => {
          resolve(resp.result)
        }).catch(reject)
      })
    } else {
      return new Promise((resolve, reject) => {
        const callback = String(Math.random())

        this.callbackWait(callback, (err, res) => {
          if (err) return reject(err)
          resolve(res)
        })

        parent.postMessage({
          ...data || {},
          background: true,
          type,
          callback
        }, '*')
      }).catch(err => {
        if (err.name === 'TimeoutError') {
          console.warn('TimeoutError', type, data)
          return
        }
        throw err
      })
    }
  }

  callbackWait(id, fn) {
    debug('callbackWait', id, fn)
    this.callbacks[id] = { fn, ts: Date.now() }
  }

  callbackReceive(id, result, error) {
    debug('callbackReceive', id, error, result)
    const { fn } = this.callbacks[id] || {}
    if (!fn) return
    fn(error, result)
  }

  callbackStart() {
    debug('callbackLoop')
    if (!this.callbacks) this.callbacks = {}
    window.setInterval(_ => {
      const cs = Date.now()
      Object.keys(this.callbacks).forEach(id => {
        const { fn, ts } = this.callbacks[id]
        let error = null
        let result = null
        if (cs - ts > 10000) {
          delete this.callbacks[id]
          error = new Error(`call "${id}" timeout`)
          error.name = 'TimeoutError'
          fn(error, result)
        }
      })
    }, 1000)
  }

  /**
   * Get system fonts
   */
  getSystemFonts() {
    this.callBus('getSystemFonts').then(data => {
      this.setState({ systemFonts: data })
    })
  }

  /**
   * Scroll to element or size
   *
   * @param {Element} dest
   */
  scrollTo(dest, offset = 0) {
    const view = document.getElementById(this.config.bookLayout ? 'container' : 'main')
    if (!dest) {
      view.scroll(0, 0)
      return
    }

    if (typeof dest === 'number') {
      view.scroll(0, dest)
    }

    const destRect = dest.getBoundingClientRect()
    const viewRect = view.getBoundingClientRect()
    if (!this.config.bookLayout) {
      const destPos = view.scrollTop + destRect.top - offset
      debug('scroll to', destPos, view.scrollTop, destRect.top, offset)
      view.scroll(0, destPos)
    } else {
      const elemPos = view.scrollLeft + viewRect.left + destRect.left
      const bookPage = Math.floor(elemPos / this.state.viewWidth)
      debug('scroll to', bookPage, view.scrollLeft, viewRect, destRect)
      this.scrollPage(bookPage)
    }

    if (dest && dest.tagName) {
      $(dest).addClass('outline-clicked')
      setTimeout(_ => $(dest).removeClass('outline-clicked'), 1000)
    }
  }

  /**
   * Handle outline links
   *
   * @param {*} event
   * @returns
   */
  handleClickOutline(event) {
    event.preventDefault()
    event.stopPropagation()

    let target = null
    let targetSelector = $(event.target).data('id')
    let type = targetSelector ? 'outline' : 'link'
    if (targetSelector && targetSelector === '#') return this.scrollTo()

    if (type === 'outline') {
      target = document.querySelector(targetSelector)
    } else {
      target = document.querySelector('#content').querySelector(`a[href="${event.target.getAttribute('href')}"]`)
    }

    if (!target) return this.scrollTo()

    this.scrollTo(target, type === 'link' ? 300 : 0)

    this.ga('send', 'event', 'Read', 'Click outline')
  }

  /**
   * Handle outline links
   *
   * @param {*} event
   * @returns
   */
  clickMark(mark) {
    const target = document.querySelector(`[mark="${mark.id}"]`)
    if (!target) return
    this.scrollTo(target, 300)
    this.ga('send', 'event', 'Read', 'Click mark')
  }

  /**
   * Bind events
   */
  bindEvents() {
    $('#root').on('click', '#outline a', e => this.handleClickOutline(e))

    // Common state control
    $('#root').on('click', '[click]', e => this.handleEvent(e))
    $('#root').on('change', 'select[bind],input[bind],textarea[bind]', e => this.handleChange(e))

    // Share
    $('#btn-thumb-up').click(() => this.action('feedback', 'yes'))
    $('#btn-thumb-down').click(() => this.action('feedback', 'no'))

    // Popmenu
    $('#main').on('click dragend', e => {
      debug('#main handle event', e.type, e)

      if (window.getSelection().toString()) {
        // Click on content only
        if ($(e.target).parents('#content').length <= 0) {
          return
        }

        if (this.popmenuShowTimer) {
          clearTimeout(this.popmenuShowTimer)
          this.popmenuShowTimer = null
        }

        this.popmenuShowTimer = setTimeout(_ => {
          if (this.getAndSaveSelection()) {
            this.showPopmenu(e)
            e.stopPropagation()
          }
          this.popmenuShowTimer = null
        }, 200)
      } else if (e.target.nodeName === 'A') {
        const href = e.target.getAttribute('href')
        if (href && /^#[A-Za-z]+[\w\-:.]*$/.test(href)) {
          debug('#main handle link', href)
          e.preventDefault()
          e.stopPropagation()
          const target = document.querySelector(href)
          if (target) {
            this.scrollTo(target)
          }
        }
      }
    })

    $('#root').on('click', '#btn-copy-translate', _ => this.action('copyTranslate'))

    // inline的code代码块可以被复制
    $('#content').on('click', ':not(pre) > code', e => {
      debug('copy code', e.target)
      this.copy(e.target.textContent)
      this.alert('ok', 'Code copied')
      this.ga('send', 'event', 'Action', 'Copy Code')
    })

    $('#content').on('mouseenter mouseleave', 'pre', e => this.handleCodeHover(e))
    $('#content').on('mouseenter mouseleave', 'article p', e => this.handleParagraphHover(e))

    // $('#root').on('click', 'pre', e => {
    //   const codeElem = e.target.classList.contains('hljs') ? e.target : e.target.querySelector('code')
    //   if (codeElem) {
    //     this.copy(codeElem.textContent)
    //     this.alert('ok', 'Code copied')
    //     this.ga('send', 'event', 'Action', 'Copy Code')
    //   }
    // })
    // $('#clearly-btn').click(e => this.openClearlyBtn(e))

    $('#content').on('click', 'a', e => this.handleClick(e))

    // Calc outline and mark
    document.querySelector('#main').addEventListener('scroll', e => {
      // debug('main scroll', e)
      this.handleOutlineFollow(e)
    })

    document.querySelector('#container').addEventListener('scroll', e => {
      // debug('container scroll', e)
      this.handleOutlineFollow(e)
    })

    // Handle resize and rebuild book layout
    window.addEventListener('resize', _ => {
      this.initialView(true)
    })

    // Handle shortcut keys
    document.addEventListener('keyup', event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      debug('keyup', event)

      // Avoid input trigger
      if (['TEXTAREA', 'INPUT', 'SELECT'].includes(event.target.nodeName)) return

      if (event.code === 'ArrowLeft' || event.code === 'KeyK') {
        this.scrollPage('prev')
      } else if (event.code === 'ArrowRight' || event.code === 'KeyJ') {
        this.scrollPage('next')
      } if (event.code === 'KeyH') {
        this.scrollPage('home')
      } else if (event.code === 'KeyL') {
        this.scrollPage('last')
      } else if (event.code === 'Slash' && event.shiftKey) {
        this.setState({ showDialog: 'shortcut' })
      } else if (event.code === 'KeyB') {
        if (!this.hasPermission('PRO')) {
          return this.showUpgrade()
        }
        this.setConfig({ bookLayout: !this.config.bookLayout })
      } else if (event.code === 'KeyP') {
        this.setState({ showDialog: 'print' })
      } else if (event.code === 'KeyS') {
        if (this.state.speak !== 'START') {
          this.setState({ speak: 'START' })
        } else {
          this.setState({ speak: 'PAUSE' })
        }
      } else if (event.code === 'KeyC') {
        this.setState({ showDialog: 'clip' })
      } else if (event.code === 'KeyE') {
        this.setState({ showDialog: 'export' })
      } else if (event.code === 'KeyT') {
        this.setState({ showDialog: 'style' })
      } else if (event.code === 'Escape') {
        if (this.state.showDialog) {
          this.setState({ showDialog: null })
        } else {
          this.action('close')
        }
      }
    })

    this.observeSize('#container', m => {
      this.initialView(true)
    })

    this.observeStyle('#container', {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true
    }, _ => {
      this.initialView(true)
    })
  }

  observeSize(el, cb) {
    const container = document.querySelector(el)
    const observer = new ResizeObserver(cb)
    for (var i = 0; i < container.children.length; i++) {
      observer.observe(container.children[i])
    }
  }

  observeStyle(sel, opt, cb) {
    const Obs = new MutationObserver((m) => [...m].forEach(cb))
    document.querySelectorAll(sel).forEach(el => Obs.observe(el, opt))
  }

  /**
   * i18n
   *
   * @param {String} key
   * @returns
   */
  message(key, ...values) {
    // eslint-disable-next-line no-undef
    return CLEARLY_MESSAGE.get(key, (!this.config.lang || this.config.lang === 'auto') ? (this.system && this.system.lang) || 'en' : this.config.lang, ...values)
  }

  /**
   * Brush page i18n message
   */
  translateUI() {
    const walker = document.createTreeWalker(
      document.body, // root node
      NodeFilter.SHOW_TEXT, // filtering only text nodes
      null,
      false
    )

    while (walker.nextNode()) {
      const text = walker.currentNode.nodeValue
      if (!text.includes('{{') || !text.includes('}}')) continue

      walker.currentNode.nodeValue = text.replace(/{{([\w.]+)}}/ig, (_, key) => {
        if ((key.match(/\./g) || []).length < 2) {
          return key.startsWith('config.') ? this.config[key.substring(7)] : this.state[key]
        }
        return this.message(key)
      })
    }
  }

  renderLaTex() {
    const LATEXT_REGEXPS = [
      /\\ce\{([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+?)\}/g,
      /\$([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+?)\$/g,
      /\\\(([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+?)\\\)/g,
      /\\(underbar|acute|check|dot|ddot|grave|hat|widehat|tilde|widetilde|utilde|vec|overleftarrow|underleftarrow|overleftharpoon|overleftrightarrow|underleftrightarrow|overline|underline|widecheck|mathring|overgroup|undergroup|Overrightarrow|overrightarrow|underrightarrow|overrightharpoon|overbrace|underbrace|overlinesegment|underlinesegment||underbar)\{[\w]+\}/g,
      /\\(lvert|rvert|lang|rang|lparen|rparen|lbrack|rbrack|lbrace|rbrace|langle|rangle|vert|Vert|lVert|rVert|lt|gt|left|right|lceil|rceil|lfloor|rfloor|lmoustache|rmoustache|lgroup|rgroup|ulcorner|urcorner|llcorner||lrcorner|llbracket|rrbracket|uparrow|downarrow|updownarrow|Uparrow|Downarrow|Updownarrow|backslash|lBrace|rBrace|middle|big|Big|bigg|Bigg|bigl|Bigl|biggl|Biggl|bigm|Bigm|biggm|Biggm|bigr|Bigr|biggr|Biggr|includegraphics)/g,
      /\\(htmlId|htmlClass|htmlStyle|htmlData|href|url|includegraphics)\{[a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+\}/g,
      /\\(Alpha|Beta|Delta|Epsilon|Zeta|Theta|Iota|Kappa|Mu|Nu|Xi|Pi|Rho|Sigma|Upsilon|Phi|Chi|Omega|varGamma|varDelta|varLambda|varXi|varPi|varUpsilon|varPhi|varPsi|alpha|gamma|epsilon|eta|theta|iota|lambda|nu|omicron|rho|sigma|tau|phi|psi|varepsilon|vartheta|thetasym|varpi|varsigma|digamma)/g,
      /\\(imath|nabla|Im|Reals|text|jmath|partial|image|wp|aleph|Game|Bbbk|weierp|alef|Finv|N|Z|alefsym|cnums|natnums|beth|Complex|R|gimel|ell|Re|daleth|hbar|real|eth|hslash|reals)/g,
      /\\(cancel|bcancel|xcancel|sout|\$a|phase|overbrace|underbrace|boxed|angln|not|tag)/g,
      /\\(stackrel|overset|underset)\{[\w]+\}/g,
      /\\(mathllap|mathrlap|sqrt)/g,
      /\\(forall|complement|therefore|emptyset|exists|subset|because|empty|exist|supset|mapsto|varnothing|nexists|mid|to|implies|in|land|gets|impliedby|isin|lor|leftrightarrow|iff|notin|ni|notni|neg|Set|set)/g, // 逻辑运算符
      /\\(def|gdef|edef|xdef|let|futurelet|global|newcommand|renewcommand|providecommand)/g,
      /\\(sum|prod|bigotimes|bigvee|int|coprod|bigoplus|bigwedge|iint|intop|bigodot|bigcap|iiint|smallint|biguplus|bigcup|oint|oiint|oiiint|bigsqcup)/g, // 积分
      /\\(cdot|gtrdot|pmod|cdotp|intercal|pod|centerdot|land|rhd|circ|leftthreetimes|rightthreetimes|amalg|circledast|ldotp|rtimes|And|circledcirc|lor|setminus|ast|circleddash|lessdot|smallsetminus|barwedge|Cup|lhd|sqcap|bigcirc|cup|ltimes|sqcup|bmod|curlyvee|mod|times|boxdot|curlywedge|mp|unlhd|boxminus|div|odot|unrhd|boxplus|divideontimes|ominus|uplus|boxtimes|dotplus|oplus|vee|bullet|doublebarwedge|otimes|veebar|Cap|doublecap|oslash|wedge|cap|doublecup|pm|wr)/g,
      /\\(frac|tfrac|genfrac|over|dfrac|above|cfrac|binom|choose|dbinom|tbinom|brace|brack)/g,
      /\\(arcsin|cosec|deg|sec|arccos|cosh|dim|sin|arctan|cot|exp|sinh|arctg|cotg|hom|sh|arcctg|coth|ker|tan|arg|csc|lg|tanh|ch|ctg|ln|tg|cos|cth|log|th|operatorname|argmax|injlim|min|varinjlim|argmin|lim|plim|varliminf|det|liminf|Pr|varlimsup|gcd|limsup|projlim|varprojlim|inf|max|sup|operatorname|operatornamewithlimits)/g,
      /\\(doteqdot|lessapprox|smile|eqcirc|lesseqgtr|sqsubset|eqcolon|minuscolon|lesseqqgtr|sqsubseteq|Eqcolon|minuscoloncolon|lessgtr|sqsupset|approx|eqqcolon|equalscolon|lesssim|sqsupseteq|approxcolon|Eqqcolon|equalscoloncolon|ll|Subset|approxcoloncolon|eqsim|lll|subset|approxeq|eqslantgtr|llless|subseteq|asymp|eqslantless|lt|subseteqq|backepsilon|equiv|mid|succ|backsim|fallingdotseq|models|succapprox|backsimeq|frown|multimap|succcurlyeq|between|ge|origof|succeq|bowtie|geq|owns|succsim|bumpeq|geqq|parallel|Supset|Bumpeq|geqslant|perp|supset|circeq|gg|pitchfork|supseteq|colonapprox|ggg|prec|supseteqq|Colonapprox|coloncolonapprox|gggtr|precapprox|thickapprox|coloneq|colonminus|gt|preccurlyeq|thicksim|Coloneq|coloncolonminus|gtrapprox|preceq|trianglelefteq|coloneqq|colonequals|gtreqless|precsim|triangleq|Coloneqq|coloncolonequals|gtreqqless|propto|trianglerighteq|colonsim|gtrless|risingdotseq|varpropto|Colonsim|coloncolonsim|gtrsim|shortmid|vartriangle|cong|imageof|shortparallel|vartriangleleft|curlyeqprec|in|sim|vartriangleright|curlyeqsucc|Join|simcolon|vcentcolon|ratio|dashv|le|simcoloncolon|vdash|dblcolon|coloncolon|leq|simeq|vDash|doteq|leqq|smallfrown|Vdash|Doteq|leqslant|smallsmile|Vvdash)/g,
      /\\(gnapprox|ngeqslant|nsubseteq|precneqq|gneq|ngtr|nsubseteqq|precnsim|gneqq|nleq|nsucc|subsetneq|gnsim|nleqq|nsucceq|subsetneqq|gvertneqq|nleqslant|nsupseteq|succnapprox|lnapprox|nless|nsupseteqq|succneqq|lneq|nmid|ntriangleleft|succnsim|lneqq|notin|ntrianglelefteq|supsetneq|lnsim|notni|ntriangleright|supsetneqq|lvertneqq|nparallel|ntrianglerighteq|varsubsetneq|ncong|nprec|nvdash|varsubsetneqq|ne|npreceq|nvDash|varsupsetneq|neq|nshortmid|nVDash|varsupsetneqq|ngeq|nshortparallel|nVdash|ngeqq|nsim|precnapprox)/g,
      /\\(circlearrowleft|leftharpoonup|rArr|circlearrowright|leftleftarrows|rarr|curvearrowleft|leftrightarrow|restriction|curvearrowright|Leftrightarrow|rightarrow|Darr|leftrightarrows|Rightarrow|dArr|leftrightharpoons|rightarrowtail|darr|leftrightsquigarrow|rightharpoondown|dashleftarrow|Lleftarrow|rightharpoonup|dashrightarrow|longleftarrow|rightleftarrows|downarrow|Longleftarrow|rightleftharpoons|Downarrow|longleftrightarrow|rightrightarrows|downdownarrows|Longleftrightarrow|rightsquigarrow|downharpoonleft|longmapsto|Rrightarrow|downharpoonright|longrightarrow|Rsh|gets|Longrightarrow|searrow|Harr|looparrowleft|swarrow|hArr|looparrowright|to|harr|Lrarr|twoheadleftarrow|hookleftarrow|lrArr|twoheadrightarrow|hookrightarrow|lrarr|Uarr|iff|Lsh|uArr|impliedby|mapsto|uarr|implies|nearrow|uparrow|Larr|nleftarrow|Uparrow|lArr|nLeftarrow|updownarrow|larr|nleftrightarrow|Updownarrow|leadsto|nLeftrightarrow|upharpoonleft|leftarrow|nrightarrow|upharpoonright|Leftarrow|nRightarrow|upuparrows|leftarrowtail|nwarrow|leftharpoondown|Rarr)/g,
      /\\(xleftarrow|xrightarrow|xLeftarrow|xRightarrow|xleftrightarrow|xLeftrightarrow|xhookleftarrow|xhookrightarrow|xtwoheadleftarrow|xtwoheadrightarrow|xleftharpoonup|xrightharpoonup|xleftharpoondown|xrightharpoondown|xleftrightharpoons|xrightleftharpoons|xtofrom|xmapsto|xlongequal)/g,
      /\\(mathrm|mathbf|mathit|mathnormal|textbf|textit|textrm|bf|it|rm|bold|textup|textnormal|boldsymbol|Bbb|text|bm|mathbb|mathsf|textmd|frak|textsf|mathtt|mathfrak|sf|texttt|mathcal|tt|cal|mathscr)/g,
      /\\(Huge|normalsize|huge|small|LARGE|footnotesize|Large|scriptsize|large|tiny)/g,
      /\\(displaystyle|textstyle|scriptstyle|scriptscriptstyle|lim|lim|verb)/g,
      /\\(dots|KaTeX|cdots|LaTeX|ddots|TeX|ldots|nabla|vdots|infty|text|dotsb|infin|text|dotsc|checkmark|text|dotsi|dag|text|dotsm|dagger|text|dotso|text|text|sdot|ddag|text|mathellipsis|ddagger|text|text|textquoteleft|Box|Dagger|lq|square|angle|text|blacksquare|measuredangle|rq|triangle|sphericalangle|text|triangledown|top|triangleleft|bot|text|triangleright|colon|bigtriangledown|text|backprime|bigtriangleup|pounds|prime|blacktriangle|mathsterling|text|blacktriangledown|text|text|blacktriangleleft|yen|text|blacktriangleright|surd|text|diamond|degree|text|Diamond|text|text|lozenge|mho||text|blacklozenge|diagdown|text|star|diagup|text|bigstar|flat|text|clubsuit|natural|copyright|clubs|sharp|circledR|diamondsuit|heartsuit|text|diamonds|hearts|circledS|spadesuit|spades|text|maltese|minuso)/g
    ]

    const LATEX_DISPLAY_REGEXPS = [
      /\$\$([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+?)\$\$/g,
      /\\\[([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+?)\\\]/g,
      /\\begin\{[\w]+\}([a-z_A-Z0-9-.!@#$%\\^&*)(+={}[\]/",'<>~·`?:;|↓′×Δ∣−× ]+)\\end\{[\w]+\}/g
    ]

    const walker = document.createTreeWalker(
      document.querySelector('#content'), // root node
      NodeFilter.SHOW_TEXT, // filtering only text nodes
      null,
      false
    )

    const latexRenders = []

    while (walker.nextNode()) {
      const parenNode = walker.currentNode.parentNode
      if (parenNode.tagName === 'CODE' || parenNode.tagName === 'PRE') continue
      if (this.getAncestorTag(parenNode, 'CODE') || this.getAncestorTag(parenNode, 'PRE')) continue

      const text = String(walker.currentNode.nodeValue || '').trim()
      if (!text) continue

      for (const regexp of LATEX_DISPLAY_REGEXPS) {
        if (regexp.test(text)) {
          debug('renderLaTex display check', regexp, text)
          if (latexRenders.some(item => item.node === parenNode)) break
          latexRenders.push({ text, node: parenNode, displayMode: true })
          break
        }
      }

      for (const regexp of LATEXT_REGEXPS) {
        if (regexp.test(text)) {
          debug('renderLaTex inline check', regexp, text)
          if (latexRenders.some(item => item.node === parenNode)) break
          latexRenders.push({ text, node: parenNode })
          break
        }
      }
    }

    for (const { text, node, displayMode } of latexRenders) {
      // node.classList.add('latex')
      const innerHTML = node.innerHTML
      try {
        katex.render(text, node, { throwOnError: false, displayMode })
      } catch (e) {
        debug('renderLaTex fail', text, e)
        if (e instanceof katex.ParseError) {
          // KaTeX can't parse the expression
          node.innerHTML = ("Error in LaTeX '" + innerHTML + "': " + e.message)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }
      }
    }
  }

  renderTags(words) {
    const walker = document.createTreeWalker(
      document.querySelector('#content'), // root node
      NodeFilter.SHOW_TEXT, // filtering only text nodes
      null,
      false
    )

    let wordIndex = 0
    const ranges = []
    while (walker.nextNode()) {
      const text = String(walker.currentNode.nodeValue || '').replace(/\s/gi, ' ').trim()
      if (!text) continue

      let wordItem = words[wordIndex]
      if (!wordItem) break

      let textIndex = 0
      let tryText = text.substring(textIndex, wordItem.word.length)
      do {
        if (wordItem.word === tryText) {
          if (['v', 'n', 'nn', 'a'].includes(wordItem.tag)) {
            add(walker.currentNode, textIndex, textIndex + wordItem.word.length)
          }
        }
        textIndex += wordItem.word.length
        wordIndex++
        wordItem = words[wordIndex]
        tryText = wordItem ? text.substring(textIndex, wordItem.word.length + textIndex) : null
      } while (tryText)
    }

    for (const range of ranges.reverse()) {
      wrap(range)
    }

    function add(node, offset, end) {
      const range = document.createRange()
      debug('wordtag add', node.nodeValue, offset, end)
      range.setStart(node, offset)
      range.setEnd(node, end)
      ranges.push(range)
    }

    function wrap(range) {
      debug('wordtag range', range)
      const wrap = document.createElement('span')
      wrap.classList.add('tag')
      range.surroundContents(wrap)
    }
  }

  saveMark() {
    const walker = document.createTreeWalker(
      document.querySelector('#content'), // root node
      NodeFilter.SHOW_TEXT, // filtering only text nodes
      null,
      false
    )

    const range = window.getSelection().getRangeAt(0)
    const mark = { id: this.uuidv4(), createdAt: Date.now(), text: window.getSelection().toString().trim() }
    let matchStage = null
    let textIndex = 0
    let selectSize = 0
    // let fullText = ''
    let preText = ''
    let endText = ''

    while (walker.nextNode()) {
      const currentNode = walker.currentNode
      const orgText = currentNode.nodeValue
      const text = String(orgText).replace(/\s/gi, ' ').trim()
      if (!text) continue
      // fullText += text
      debug('savemark text', text)

      if (!matchStage) {
        if (range.startContainer === currentNode) {
          const allPreText = preText + orgText.substring(0, range.startOffset)
          matchStage = 'start'
          mark.preText = allPreText.substring(allPreText.length - 10)
          mark.startPos = textIndex + range.startOffset

          debug('savemark start', text)

          if (range.startContainer !== range.endContainer) {
            const startText = currentNode.nodeValue.substring(range.startOffset).replace(/\s/gi, ' ').trim()
            selectSize += startText.length
            debug('savemark multiline', selectSize)
          }
        }
      }

      if (matchStage === 'start') {
        if ((range.endContainer.nodeType === 3 && range.endContainer === currentNode) || range.startContainer === range.endContainer || selectSize >= mark.text.length || mark.text.endsWith(text)) {
          mark.endPos = textIndex + range.endOffset
          endText = text.substring(range.endOffset)
          matchStage = 'end'
          debug('savemark done', endText, range.endOffset)
          continue
        }
        selectSize += text.length
      } else if (matchStage === 'end') {
        const allEndText = endText + text
        mark.postText = allEndText.substring(0, 10)
        matchStage = null
        endText = ''
        debug('savemark end', text)
      }

      textIndex += text.length
      preText = text
    }

    debug('savemark save', mark)

    const marks = this.state.marks || []
    let extendMark = null

    for (const existMark of marks) {
      if (mark.endPos >= existMark.startPos && mark.startPos < existMark.startPos) {
        // 延长左边
        existMark.text = mark.text.substring(0, existMark.startPos - mark.startPos) + existMark.text
        existMark.startPos = mark.startPos
        existMark.preText = mark.preText
        existMark.createdAt = mark.createdAt
        extendMark = existMark
      }

      if (mark.startPos <= existMark.endPos && mark.endPos > existMark.endPos) {
        // 延长右边
        existMark.text = existMark.text + mark.text.substring(mark.text.length - (mark.endPos - existMark.endPos))
        existMark.postText = mark.postText
        existMark.endPos = mark.endPos
        existMark.createdAt = mark.createdAt
        extendMark = existMark
      }

      if (mark.startPos >= existMark.startPos && mark.endPos <= existMark.endPos) {
        // 小于当前的范围
        return
      }

      if (extendMark) break
      // @todo 如果延长超过还需要继续合并
    }

    if (extendMark) {
      this.removeMark(extendMark)
      this.showMark([extendMark])
    } else {
      marks.push(mark)
      this.showMark([mark])
    }

    this.setState({ marks })
    this.clip('mark')
  }

  /**
   * Highlights
   *
   * @param {Array} marks
   * @returns
   */
  showMark(marks) {
    if (!marks || marks.length === 0) return

    const walker = document.createTreeWalker(
      document.querySelector('#content'), // root node
      NodeFilter.SHOW_TEXT, // filtering only text nodes
      null,
      false
    )

    // 排序保证顺序性
    marks = marks.sort((a, b) => a.startPos - b.startPos)

    let inMark = null
    let tryMark = null
    let fullText = ''
    let markIndex = 0
    let markLeftText = ''
    let curMark = null

    const ranges = []
    while (walker.nextNode()) {
      const orgText = walker.currentNode.nodeValue
      const text = String(orgText || '').replace(/\s/gi, ' ').trim()
      if (!text) continue

      const textPreEmpty = (orgText.match(/^\s+/) || [''])[0].length
      fullText += orgText
      if (marks.indexOf(curMark) !== markIndex) {
        debug('showmark current', marks[markIndex])
      }
      curMark = marks[markIndex]
      if (!curMark) break
      debug('showmark text', tryMark && 'try', inMark && 'in', text, markLeftText)

      // const markLeftTextPreEmpty = (markLeftText.match(/^\s+/) || [''])[0].length

      if (fullText === orgText) {
        tryMark = marks.find(h => !h.preText)
        debug('showmark check try', text)
      }

      // debug('mark check', text)

      if (tryMark) {
        if (text === curMark.text || text.startsWith(curMark.text)) {
          debug('showmark try done', text)
          add(walker.currentNode, 0, curMark.text.length, curMark.id)
          tryMark = null
          markIndex++
        } else if (curMark.text.startsWith(text)) {
          debug('showmark try continue', text)
          add(walker.currentNode, 0, text.length, curMark.id)
          inMark = curMark
          markLeftText = curMark.text.substring(text.length)
        }
        tryMark = null
      } else if (inMark) {
        if (text === markLeftText || text.startsWith(markLeftText.trim())) {
          // 匹配完了
          debug('showmark in done', text)
          add(walker.currentNode, 0, textPreEmpty + markLeftText.trim().length, curMark.id)
          inMark = null
          markIndex++
        } else if (markLeftText.trim().startsWith(text)) {
          // 没有匹配完
          debug('showmark in continue', text)
          add(walker.currentNode, 0, text.length, curMark.id)
          inMark = curMark
          markLeftText = markLeftText.trim().substring(text.length)
        }
      } else if (!tryMark && !inMark) {
        // const matchStartIndex = fullText.indexOf(curMark.preText)
        const matchIndexes = locations(curMark.preText, fullText)
        if (matchIndexes.length > 0) {
          for (const matchStartIndex of matchIndexes) {
            const markMatchText = fullText.substring(matchStartIndex + curMark.preText.length)
            const markInTextIndex = orgText.length - markMatchText.length
            debug('showmark check', matchStartIndex, markMatchText, markInTextIndex)
            if (markMatchText && curMark.text.startsWith(markMatchText.trim())) {
              // 还没匹配完的情况
              add(walker.currentNode, markInTextIndex, text.length, curMark.id)
              inMark = curMark
              markLeftText = curMark.text.substring(markMatchText.trim().length)
              debug('showmark check continue', text)
            } else if (markMatchText && markMatchText.trim().startsWith(curMark.text)) {
              // 选择的比较短的情况
              // currentMark = mark
              add(walker.currentNode, markInTextIndex, markInTextIndex + curMark.text.length, curMark.id)
              markIndex++
              debug('showmark check done', text)
            } else if (!markMatchText) {
              tryMark = curMark
              debug('showmark check try', text)
            }
          }
        }
      }
    }

    for (const { range, id } of ranges) {
      wrap(range, id)
    }

    function locations(substring, string) {
      const a = []
      let i = -1
      while ((i = string.indexOf(substring, i + 1)) >= 0) a.push(i)
      return a
    }

    function add(node, offset, end, id) {
      const range = document.createRange()
      debug('showmark add', node.nodeValue, offset, end)
      range.setStart(node, offset)
      range.setEnd(node, end)
      ranges.push({ range, id })
    }

    function wrap(range, id) {
      const wrap = document.createElement('span')
      wrap.classList.add('mark')
      wrap.setAttribute('mark', id)
      range.surroundContents(wrap)
      // if (!self.markElems[id]) self.markElems[id] = []
      // self.markElems[id].push(wrap)
    }
  }

  removeMark(mark, sync) {
    document.querySelectorAll(`span[mark="${mark.id}"]`).forEach(elem => {
      elem.replaceWith(elem.textContent)
    })
    this.setState({ marks: (this.state.marks || []).filter(m => m.id !== mark.id) })
    if (sync) {
      this.clip('mark')
    }
  }

  removeAllMarks() {
    document.querySelectorAll('span.mark').forEach(elem => {
      elem.replaceWith(elem.textContent)
    })
    this.setState({ marks: [] })
    // this.clip('mark')
  }

  /**
   * Calculate outline position and set status
   */
  handleOutlineFollow() {
    const titles = document.querySelectorAll('.ros')
    let currentRos = null
    let currentPos = null

    if (!titles.length) return

    if (!this.config.bookLayout) {
      for (let i = 0; i < titles.length; i++) {
        const posTop = titles[i].getBoundingClientRect().top
        if (posTop > 0 && (posTop < currentPos || currentPos === null)) {
          currentRos = titles[i]
          currentPos = posTop
          break
        }
      }
    } else {
      const mainPos = document.getElementById('main').getBoundingClientRect()
      const mainLeft = mainPos.left
      const mainWidth = mainPos.width
      for (let i = 0; i < titles.length; i++) {
        const posLeft = titles[i].getBoundingClientRect().x
        debug('calcOutlinePos', mainLeft, mainWidth, posLeft, titles[i])
        if (posLeft < mainLeft + mainWidth && posLeft > mainLeft) {
          currentRos = titles[i]
          break
        }
      }
    }

    if (currentRos) {
      const currentId = currentRos.getAttribute('id')
      const currentIndex = currentId && currentId.startsWith('ros-') ? currentId.split('-').pop() : 0
      const currentOutline = document.querySelector(`#outline-ros-${currentIndex}`)
      // Changed
      if (currentOutline && !currentOutline.classList.contains('outline-active')) {
        const outlines = document.querySelectorAll('.outline-section')
        for (let i = 0; i < outlines.length; i++) {
          if (String(i) === String(currentIndex)) {
            outlines[i].classList.add('outline-active')
          } else {
            outlines[i].classList.remove('outline-active')
          }
        }
      }
    }
  }

  /**
   * Handle value change
   *
   * @param {*} e
   */
  handleChange(e) {
    const $elem = $(e.currentTarget)
    const value = $elem.val()
    let fn = 'setState'
    let key = $elem.attr('bind')
    if (key.startsWith('config.')) {
      fn = 'setConfig'
      key = key.substr(7, key.length)
    }
    this[fn]({ [key]: value })
  }

  /**
   * Handle click/mouse event
   *
   * @param {*} e
   * @returns
   */
  handleEvent(e) {
    debug('handleEvent', e.type, e.currentTarget)
    const value = $(e.currentTarget).attr(e.type)
    if (!value) return

    if ($(e.target).parents('#popmenu,#popshare,#poptranslate').length > 0) {
      e.stopPropagation()
    }

    value.split(';').forEach(s => {
      if (s.includes('=')) {
        let [key, value] = s.split('=')
        let fn = 'setState'
        let prop = 'state'
        if (key.startsWith('config.')) {
          fn = 'setConfig'
          key = key.substr(7, key.length)
          prop = 'config'
        }

        let propValue = value
        if (value.includes('/')) {
          if (value === '0/1') {
            propValue = !this[prop][key]
          } else {
            const [pos, neg] = value.split('/')
            propValue = this[prop][key] === pos ? neg : pos
          }
        }
        this[fn]({ [key]: propValue })
      } else if (s.includes('(')) {
        const matched = s.match(/([\w]+)\((.*?)\)/)
        debug('handleEvent matched', matched)
        if (matched) {
          const fn = matched[1]
          let contextElem
          const args = (matched[2] ? matched[2].split(',').map(arg => String(arg).trim()) : []).map(a => {
            if (a === '.') {
              if (!contextElem) {
                contextElem = this.findContextElem(e.currentTarget)
              }
              return contextElem && contextElem.contextValue
            }
            return a
          })
          this[fn](...args)
        }
      }
    })
  }

  /**
   *
   * @param {Node} elem
   * @returns
   */
  findContextElem(elem) {
    let contextElem
    let depth = 0
    const org = elem
    elem = elem.parentNode
    while (elem) {
      if (depth > 5) break
      if (elem.hasAttribute('repeat')) {
        contextElem = elem
        break
      }
      elem = elem.parentNode
      depth++
    }
    if (contextElem) {
      org.contextElem = contextElem
    }
    return contextElem
  }

  syncLocalConfig(init) {
    const config = this.initConfig

    this.state = {
      ...ClearlyApp.DEFAULT_STATE,
      clientApp: config.client && config.client.app,
      clientVersion: config.client && config.client.version,
      autoOpen: config.autoOpen,
      browser: this.getBrowser(),
      systemLang: window.navigator.language,
      ...config.clearly,
      ...this.initParams
    }
    this.config = {
      ...ClearlyApp.DEFAULT_READERCONFIG,
      ...config.readerConfig
    }

    if (config.user) {
      const user = config.user
      Object.assign(this.config, {
        accountEmail: user ? user.accountEmail : null,
        accountToken: user ? user.accountToken : null,
        accountPlanId: user ? user.accountPlanId : null,
        accountPlanExpiredAt: user ? user.accountPlanExpiredAt : 0
      })
    }
    this.system = config.system

    debug('state', this.state)
    debug('config', this.config)
    this.setConfig(this.config, init)
    this.setState(this.state, init)
    return config
  }

  uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
  }

  /**
   *  Receive parent messages
   *
   * @param {*} data
   * @returns
   */
  handleParentMessage(data) {
    if (!data) return

    if (data.callback) {
      return this.callbackReceive(data.callback, data.result, data.error)
    }
    // debug('App receive message:', data)

    switch (data.type) {
      case 'UPDATE':
        this.ready(_ => {
          this.syncLocalConfig('init')
          this.setState({ isReady: true })
          this.show(data.article, true)
        })
        break
      case 'setState':
        this.ready(_ => {
          this.setState(data.state)
        })
        break
      case 'INIT':
        this.initConfig = data.config

        if (data.api) {
          this.apiUrl = data.api
        }

        this.bootstrap()

        if (data.article) {
          debug('load article when INIT')
          this.ready(_ => {
            this.setState({ isReady: true })
            this.show(data.article, true)
          })
        }
        break
    }
  }

  /**
   * Update website icon
   *
   * @param {*} status
   */
  setIcon(status) {
    this.callBus('updateIcon', { status })
  }

  /**
   * Clip article
   *
   * @returns
   */
  api(fn, data, options = {}) {
    let request
    if (this.useBackground) {
      request = this.callBus('callApi', { fn, data })
    } else {
      request = this.callApi(fn, data)
    }

    return request
      .then(res => {
        console.log('callApi', fn, data, res)
        if (!res || (res.code && res.code !== 'OK') || !res.data) {
          const err = new Error(res.message)
          err.code = res.code || 'ERR'
          throw err
        }
        return res.data
      })
      .catch(err => {
        if (err.code === 'NEED_UPGRADE') {
          this.showUpgrade('PRO', err.message)
        } else if (err.code === 'AUTH_REQUIRED') {
          this.alert('warn', this.message('app.account.loginrequired'), _ => this.setState({ showDialog: 'account' }))
          return
        }

        if (!options.error && !options.silent) {
          if (!err.code) {
            this.alert('warn', 'Api request failed: ' + fn)
            debug('api error', err)
          } else if (!['NEED_PRO', 'NEED_PREMIUM'].includes(err.code)) {
            this.alert('warn', `${err.message} (${err.code})`)
          }
        } else {
          throw err
        }
      })
  }

  async callApi(fn, data) {
    const endpoint = this.apiUrl || 'https://api.clearlyreader.com'
    return fetch(`${endpoint}/api/${fn}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
      headers: {
        'content-type': 'application/json',
        'x-clearly-token': (this.config && this.config.accountToken) || '',
        'x-clearly-version': this.state.clientVersion,
        'x-clearly-app': this.state.clientApp
      }
    })
      .then(res => res.json())
      .catch(err => {
        return { code: 'API_ERR', message: err.message }
      })
  }

  login() {
    this.api('login', {
      email: this.state.loginEmail,
      passcode: this.state.loginCode
    }).then(data => {
      if (data.action === 'NEED_CODE') {
        this.setState({ loginCodeNeed: true })
        this.alert('ok', this.message('app.account.codesent'))
      } else if (data.token) {
        this.setState({ loginCodeNeed: false })
        this.setAccount({
          accountPlanId: data.planId,
          accountPlanExpiredAt: data.planExpiredAt,
          accountEmail: data.email,
          accountToken: data.token
        })

        setTimeout(_ => {
          if (data.config && data.config.syncAt) {
            this.setConfig({ syncConfig: true })
          }

          this.clip('get', { silent: true }).then(_ => {
            this.showMark(this.state.marks)
          })
        }, 1000)
      }
    }).finally(_ => {
      this.setState({ loginCode: null })
    })
  }

  setAccount(user) {
    this.setConfig({
      accountEmail: user ? user.accountEmail : null,
      accountToken: user ? user.accountToken : null,
      accountPlanId: user ? user.accountPlanId : null,
      accountPlanExpiredAt: user ? user.accountPlanExpiredAt : 0
    })
  }

  logout() {
    this.resetAccount()
    this.setAccount()
    this.setConfig({
      syncAt: null
    })
    this.setState({
      clipId: null,
      rssUrl: null,
      podcastUrl: null
    })
    this.removeAllMarks()
    this.callBus('logout')
  }

  quickClip() {
    this.setState({ showDialog: 'clips' })
  }

  toggleClip(type) {
    if (this.state[type]) {
      this.clip(type, { value: false })
    } else {
      this.clip(type)
    }
  }

  removeClip(clip) {
    if (!window.confirm('Are you sure you want to remove this clip?')) {
      return
    }

    if (!clip) return

    this.api('clipArticle', {
      id: clip.id,
      url: clip.url,
      title: clip.title,
      lang: clip.lang,
      [this.state.clipType]: false
    }).then(data => {
      debug('removeClip', data)
      this.alert('ok', 'clip archived')
    }).finally(_ => {
      this.listClips(true)
    })
  }

  async summarize() {
    this.ga('send', 'event', 'Clip', 'summarize')
    this.alert('ok', 'Summarizing will run in the background and be displayed when finished.')
    this.setState({ summaryStatus: 'PENDING' })
    this.clip('summary', { sync: true })
  }

  exportClip(type) {
    const key = `${type}Url`
    if (!this.state[key]) {
      return this.clip(type)
    }
    window.open(this.state[key], '_blank')
  }

  sendToKindle() {
    this.ga('send', 'event', 'Clip', 'sendToKindle')
    this.clip('kindle', { data: { kindleEmailName: this.config.kindleEmailName } })
      .then(_ => {
        this.setState({ showDialog: null })
      })
  }

  /**
   * Clip article
   *
   * @returns
   */
  async clip(type, options) {
    // if (this.state.clipUrl) return
    this.ga('send', 'event', 'Clip', type || 'get')
    options = { value: true, ...options }

    return this.api('clipArticle', {
      id: this.state.clipId,
      ...this.article,
      marks: this.state.marks || [],
      config: this.config,
      ...type ? { [type]: options.value } : null,
      sync: options.sync,
      ...options.data || {}
    }, { ...options, error: !type })
      .then(data => {
        if (!data) return

        if (data.shareUrl && type === 'share') {
          this.copy(data.shareUrl)
          return this.alert('ok', 'share url copied')
        }

        if (data.clipId) {
          if (type && !options.silent && type !== 'get' && (type !== 'bookmark' || !this.state.clipId)) {
            this.alert('ok', 'clip ' + type + ' success' + (['audio', 'podcast'].includes(type) ? ', the result will email to you when finished.' : ''))
          }
          this.setState(data)
        }
      })
      .catch(err => {
        console.error('clip article', err)
      })
  }

  setState(obj, initial) {
    if (!this.state) this.state = {}
    const oldValues = {}
    Object.keys(obj).forEach(key => {
      oldValues[key] = this.state[key]
      this.state[key] = obj[key]
    })
    Object.keys(obj).forEach(key => {
      this.handleState(key, obj[key], oldValues[key], initial)
    })
  }

  setConfig(obj, initial) {
    if (!this.config) this.config = {}
    const oldValues = {}
    Object.keys(obj).forEach(key => {
      oldValues[key] = this.config[key]
      this.config[key] = obj[key]
    })
    Object.keys(obj).forEach(key => {
      this.handleConfig(key, obj[key], oldValues[key], initial)
    })
  }

  getSelectionCharOffsets() {
    let start = 0
    let end = 0
    let sel
    let range
    let priorRange
    const element = document.querySelector('#content')
    if (typeof window.getSelection !== 'undefined') {
      range = window.getSelection().getRangeAt(0)
      priorRange = range.cloneRange()
      priorRange.selectNodeContents(element)
      priorRange.setEnd(range.startContainer, range.startOffset)
      start = priorRange.toString().length
      end = start + range.toString().length
    } else if (
      typeof document.selection !== 'undefined' &&
      (sel = document.selection).type !== 'Control'
    ) {
      range = sel.createRange()
      priorRange = document.body.createTextRange()
      priorRange.moveToElementText(element)
      priorRange.setEndPoint('EndToStart', range)
      start = priorRange.text.length
      end = start + range.text.length
    }

    return {
      start,
      end,
      length: end - start
    }
  }

  /**
   * Define run strategy
   */
  async init() {
    this.useBackground = this.runtime && this.runtime.getBackgroundPage

    if (!this.useBackground) {
      this.callbackStart()
    }

    window.addEventListener('message', (e) => {
      debug('Frame received message', e.data)
      this.handleParentMessage(e.data)
    }, false)

    // set [show] to display: none
    document.querySelectorAll('[show]').forEach(el => (el.style.display = 'none'))

    let params
    try {
      if (!this.useBackground) {
        params = JSON.parse($('#params').text())
      } else {
        const url = new URL(window.location.href)
        params = Object.fromEntries(url.searchParams.entries())
      }
    } catch (e) {
      // console.error(e)
    }
    this.initParams = params || {}
    const initConfig = await this.getConfig()
    const userConfig = await this.getUserConfig()
    this.initConfig = {
      ...initConfig,
      user: userConfig
    }

    if (this.initConfig) {
      this.bootstrap()
    }
  }

  /**
   * Ready
   *
   * @param {Function|Null} fn
   */
  ready(fn) {
    if (fn) {
      this.readyFns.push(fn)
    }

    if (this.boot) {
      for (const readyFn of this.readyFns) {
        readyFn.call(this)
      }
    }
  }

  /**
   * Bootstrap
   */
  async bootstrap() {
    if (!this.initConfig) return

    const config = this.syncLocalConfig('init')

    // Support online messages
    if (config.clearlyConfig.messages && typeof config.clearlyConfig.messages === 'object') {
      // this.messages = config.clearly.messages
      Object.assign(CLEARLY_MESSAGE.messages, config.clearlyConfig.messages)
    }

    this.boot = true
    this.bindEvents()
    this.ready()
    this.translateUI()
  }

  async shutdown() {
    window.speechSynthesis.cancel()
  }
}

ClearlyApp.DEFAULT_READERCONFIG = {
  lang: 'auto',
  zoom: 1,
  outline: true,
  links: false,
  theme: 'default',
  themeAuto: false,
  themeDay: 'default',
  themeNight: 'gray',
  openTip: false,
  letterSpacing: '0',
  lineHeight: '1.6',
  font: 'System',
  systemFont: 'Georgia',
  syntax: true,
  latex: true,
  width: 2,
  bookLayout: false,
  background: true,
  disableExportBrand: false,
  disableBrand: false,
  paragraphTranslate: true,
  syncConfig: false,
  autoClip: false,
  popmenuSearch: true,
  popmenuWiki: true,
  customCSS: `html {
background-color: #f1f3f4;
color: #191919;
}
#main {
background-color: #ffffff;
}
article * {
letter-spacing: 0em;
line-height: 1.6em;
}
#main a {
color: #000000;
border-bottom: 1px dashed #191919;
}
#main a:hover {
border-bottom: 2px solid #191919;
}\n`,
  linkOpenNew: true,
  speakRate: '1',
  roundCorner: false,
  speakPitch: 1,
  readUpdates: false,
  speechMSEngine: false,
  clipPopup: false,
  accountEmail: null,
  accountToken: null,
  accountPlanId: null,
  accountPlanExpiredAt: 0,
  printWithOutline: false,
  printWithMark: false,
  printWithoutMeta: false,
  showVideo: false
}

ClearlyApp.DEFAULT_STATE = {
  load: false,
  speak: null,
  speakStartPos: 0,
  speakPos: 0,
  speakMark: true,
  speakVoiceMap: { default: 'auto' },
  fullscreen: false,
  isReady: false,
  isTranslate: false,
  translateResult: null,
  isSharing: false,
  clipId: null,
  summaryText: null,
  summaryStatus: null,
  audioStatus: null,
  loginEmail: null,
  loginCode: null,
  loginCodeNeed: false,
  hasRenderTags: false,
  bookPages: 1,
  bookPage: 1,
  viewWidth: 0,
  viewHeight: 0,
  viewSize: 0,
  marks: [],
  bookmark: false,
  clip: false,
  clipArticlesLoading: false,
  rssUrl: null,
  podcastUrl: null,
  audioUrl: null,
  epubUrl: null,
  kindle: false,
  syncConfigStatus: null,
  syncConfigVersion: null,
  alertBtnCallback: null,
  showStyleTab: null,
  whitelist: [
    'news.google.com/*',
    'support.google.com/*',
    'medium.com/*',
    'www.jianshu.com/p/*'
  ],
  blacklist: [
    'www.youtube.com/*',
    'www.google.*',
    'chrome.google.com/*',
    'accounts.google.com/*',
    'myaccount.google.com/*',
    'translate.google.com/*',
    'mail.google.com/*',
    'drive.google.com/*',
    'docs.google.com/*',
    'spreadsheet.google.com/*'
  ],
  msTTSVoices: [
    {
      'LocalName': 'Adri',
      'ShortName': 'af-ZA-AdriNeural',
      'DisplayName': 'Adri',
      'Gender': 'Female',
      'Locale': 'af-ZA'
    },
    {
      'LocalName': 'Willem',
      'ShortName': 'af-ZA-WillemNeural',
      'DisplayName': 'Willem',
      'Gender': 'Male',
      'Locale': 'af-ZA'
    },
    {
      'LocalName': 'አምሀ',
      'ShortName': 'am-ET-AmehaNeural',
      'DisplayName': 'Ameha',
      'Gender': 'Male',
      'Locale': 'am-ET'
    },
    {
      'LocalName': 'መቅደስ',
      'ShortName': 'am-ET-MekdesNeural',
      'DisplayName': 'Mekdes',
      'Gender': 'Female',
      'Locale': 'am-ET'
    },
    {
      'LocalName': 'فاطمة',
      'ShortName': 'ar-AE-FatimaNeural',
      'DisplayName': 'Fatima',
      'Gender': 'Female',
      'Locale': 'ar-AE'
    },
    {
      'LocalName': 'حمدان',
      'ShortName': 'ar-AE-HamdanNeural',
      'DisplayName': 'Hamdan',
      'Gender': 'Male',
      'Locale': 'ar-AE'
    },
    {
      'LocalName': 'علي',
      'ShortName': 'ar-BH-AliNeural',
      'DisplayName': 'Ali',
      'Gender': 'Male',
      'Locale': 'ar-BH'
    },
    {
      'LocalName': 'ليلى',
      'ShortName': 'ar-BH-LailaNeural',
      'DisplayName': 'Laila',
      'Gender': 'Female',
      'Locale': 'ar-BH'
    },
    {
      'LocalName': 'أمينة',
      'ShortName': 'ar-DZ-AminaNeural',
      'DisplayName': 'Amina',
      'Gender': 'Female',
      'Locale': 'ar-DZ'
    },
    {
      'LocalName': 'إسماعيل',
      'ShortName': 'ar-DZ-IsmaelNeural',
      'DisplayName': 'Ismael',
      'Gender': 'Male',
      'Locale': 'ar-DZ'
    },
    {
      'LocalName': 'سلمى',
      'ShortName': 'ar-EG-SalmaNeural',
      'DisplayName': 'Salma',
      'Gender': 'Female',
      'Locale': 'ar-EG'
    },
    {
      'LocalName': 'شاكر',
      'ShortName': 'ar-EG-ShakirNeural',
      'DisplayName': 'Shakir',
      'Gender': 'Male',
      'Locale': 'ar-EG'
    },
    {
      'LocalName': 'باسل',
      'ShortName': 'ar-IQ-BasselNeural',
      'DisplayName': 'Bassel',
      'Gender': 'Male',
      'Locale': 'ar-IQ'
    },
    {
      'LocalName': 'رنا',
      'ShortName': 'ar-IQ-RanaNeural',
      'DisplayName': 'Rana',
      'Gender': 'Female',
      'Locale': 'ar-IQ'
    },
    {
      'LocalName': 'سناء',
      'ShortName': 'ar-JO-SanaNeural',
      'DisplayName': 'Sana',
      'Gender': 'Female',
      'Locale': 'ar-JO'
    },
    {
      'LocalName': 'تيم',
      'ShortName': 'ar-JO-TaimNeural',
      'DisplayName': 'Taim',
      'Gender': 'Male',
      'Locale': 'ar-JO'
    },
    {
      'LocalName': 'فهد',
      'ShortName': 'ar-KW-FahedNeural',
      'DisplayName': 'Fahed',
      'Gender': 'Male',
      'Locale': 'ar-KW'
    },
    {
      'LocalName': 'نورا',
      'ShortName': 'ar-KW-NouraNeural',
      'DisplayName': 'Noura',
      'Gender': 'Female',
      'Locale': 'ar-KW'
    },
    {
      'LocalName': 'ليلى',
      'ShortName': 'ar-LB-LaylaNeural',
      'DisplayName': 'Layla',
      'Gender': 'Female',
      'Locale': 'ar-LB'
    },
    {
      'LocalName': 'رامي',
      'ShortName': 'ar-LB-RamiNeural',
      'DisplayName': 'Rami',
      'Gender': 'Male',
      'Locale': 'ar-LB'
    },
    {
      'LocalName': 'إيمان',
      'ShortName': 'ar-LY-ImanNeural',
      'DisplayName': 'Iman',
      'Gender': 'Female',
      'Locale': 'ar-LY'
    },
    {
      'LocalName': 'أحمد',
      'ShortName': 'ar-LY-OmarNeural',
      'DisplayName': 'Omar',
      'Gender': 'Male',
      'Locale': 'ar-LY'
    },
    {
      'LocalName': 'جمال',
      'ShortName': 'ar-MA-JamalNeural',
      'DisplayName': 'Jamal',
      'Gender': 'Male',
      'Locale': 'ar-MA'
    },
    {
      'LocalName': 'منى',
      'ShortName': 'ar-MA-MounaNeural',
      'DisplayName': 'Mouna',
      'Gender': 'Female',
      'Locale': 'ar-MA'
    },
    {
      'LocalName': 'عبدالله',
      'ShortName': 'ar-OM-AbdullahNeural',
      'DisplayName': 'Abdullah',
      'Gender': 'Male',
      'Locale': 'ar-OM'
    },
    {
      'LocalName': 'عائشة',
      'ShortName': 'ar-OM-AyshaNeural',
      'DisplayName': 'Aysha',
      'Gender': 'Female',
      'Locale': 'ar-OM'
    },
    {
      'LocalName': 'أمل',
      'ShortName': 'ar-QA-AmalNeural',
      'DisplayName': 'Amal',
      'Gender': 'Female',
      'Locale': 'ar-QA'
    },
    {
      'LocalName': 'معاذ',
      'ShortName': 'ar-QA-MoazNeural',
      'DisplayName': 'Moaz',
      'Gender': 'Male',
      'Locale': 'ar-QA'
    },
    {
      'LocalName': 'حامد',
      'ShortName': 'ar-SA-HamedNeural',
      'DisplayName': 'Hamed',
      'Gender': 'Male',
      'Locale': 'ar-SA'
    },
    {
      'LocalName': 'زارية',
      'ShortName': 'ar-SA-ZariyahNeural',
      'DisplayName': 'Zariyah',
      'Gender': 'Female',
      'Locale': 'ar-SA'
    },
    {
      'LocalName': 'أماني',
      'ShortName': 'ar-SY-AmanyNeural',
      'DisplayName': 'Amany',
      'Gender': 'Female',
      'Locale': 'ar-SY'
    },
    {
      'LocalName': 'ليث',
      'ShortName': 'ar-SY-LaithNeural',
      'DisplayName': 'Laith',
      'Gender': 'Male',
      'Locale': 'ar-SY'
    },
    {
      'LocalName': 'هادي',
      'ShortName': 'ar-TN-HediNeural',
      'DisplayName': 'Hedi',
      'Gender': 'Male',
      'Locale': 'ar-TN'
    },
    {
      'LocalName': 'ريم',
      'ShortName': 'ar-TN-ReemNeural',
      'DisplayName': 'Reem',
      'Gender': 'Female',
      'Locale': 'ar-TN'
    },
    {
      'LocalName': 'مريم',
      'ShortName': 'ar-YE-MaryamNeural',
      'DisplayName': 'Maryam',
      'Gender': 'Female',
      'Locale': 'ar-YE'
    },
    {
      'LocalName': 'صالح',
      'ShortName': 'ar-YE-SalehNeural',
      'DisplayName': 'Saleh',
      'Gender': 'Male',
      'Locale': 'ar-YE'
    },
    {
      'LocalName': 'Babək',
      'ShortName': 'az-AZ-BabekNeural',
      'DisplayName': 'Babek',
      'Gender': 'Male',
      'Locale': 'az-AZ'
    },
    {
      'LocalName': 'Banu',
      'ShortName': 'az-AZ-BanuNeural',
      'DisplayName': 'Banu',
      'Gender': 'Female',
      'Locale': 'az-AZ'
    },
    {
      'LocalName': 'Борислав',
      'ShortName': 'bg-BG-BorislavNeural',
      'DisplayName': 'Borislav',
      'Gender': 'Male',
      'Locale': 'bg-BG'
    },
    {
      'LocalName': 'Калина',
      'ShortName': 'bg-BG-KalinaNeural',
      'DisplayName': 'Kalina',
      'Gender': 'Female',
      'Locale': 'bg-BG'
    },
    {
      'LocalName': 'নবনীতা',
      'ShortName': 'bn-BD-NabanitaNeural',
      'DisplayName': 'Nabanita',
      'Gender': 'Female',
      'Locale': 'bn-BD'
    },
    {
      'LocalName': 'প্রদ্বীপ',
      'ShortName': 'bn-BD-PradeepNeural',
      'DisplayName': 'Pradeep',
      'Gender': 'Male',
      'Locale': 'bn-BD'
    },
    {
      'LocalName': 'ভাস্কর',
      'ShortName': 'bn-IN-BashkarNeural',
      'DisplayName': 'Bashkar',
      'Gender': 'Male',
      'Locale': 'bn-IN'
    },
    {
      'LocalName': 'তানিশা',
      'ShortName': 'bn-IN-TanishaaNeural',
      'DisplayName': 'Tanishaa',
      'Gender': 'Female',
      'Locale': 'bn-IN'
    },
    {
      'LocalName': 'Goran',
      'ShortName': 'bs-BA-GoranNeural',
      'DisplayName': 'Goran',
      'Gender': 'Male',
      'Locale': 'bs-BA'
    },
    {
      'LocalName': 'Vesna',
      'ShortName': 'bs-BA-VesnaNeural',
      'DisplayName': 'Vesna',
      'Gender': 'Female',
      'Locale': 'bs-BA'
    },
    {
      'LocalName': 'Joana',
      'ShortName': 'ca-ES-JoanaNeural',
      'DisplayName': 'Joana',
      'Gender': 'Female',
      'Locale': 'ca-ES'
    },
    {
      'LocalName': 'Alba',
      'ShortName': 'ca-ES-AlbaNeural',
      'DisplayName': 'Alba',
      'Gender': 'Female',
      'Locale': 'ca-ES'
    },
    {
      'LocalName': 'Enric',
      'ShortName': 'ca-ES-EnricNeural',
      'DisplayName': 'Enric',
      'Gender': 'Male',
      'Locale': 'ca-ES'
    },
    {
      'LocalName': 'Antonín',
      'ShortName': 'cs-CZ-AntoninNeural',
      'DisplayName': 'Antonin',
      'Gender': 'Male',
      'Locale': 'cs-CZ'
    },
    {
      'LocalName': 'Vlasta',
      'ShortName': 'cs-CZ-VlastaNeural',
      'DisplayName': 'Vlasta',
      'Gender': 'Female',
      'Locale': 'cs-CZ'
    },
    {
      'LocalName': 'Aled',
      'ShortName': 'cy-GB-AledNeural',
      'DisplayName': 'Aled',
      'Gender': 'Male',
      'Locale': 'cy-GB'
    },
    {
      'LocalName': 'Nia',
      'ShortName': 'cy-GB-NiaNeural',
      'DisplayName': 'Nia',
      'Gender': 'Female',
      'Locale': 'cy-GB'
    },
    {
      'LocalName': 'Christel',
      'ShortName': 'da-DK-ChristelNeural',
      'DisplayName': 'Christel',
      'Gender': 'Female',
      'Locale': 'da-DK'
    },
    {
      'LocalName': 'Jeppe',
      'ShortName': 'da-DK-JeppeNeural',
      'DisplayName': 'Jeppe',
      'Gender': 'Male',
      'Locale': 'da-DK'
    },
    {
      'LocalName': 'Ingrid',
      'ShortName': 'de-AT-IngridNeural',
      'DisplayName': 'Ingrid',
      'Gender': 'Female',
      'Locale': 'de-AT'
    },
    {
      'LocalName': 'Jonas',
      'ShortName': 'de-AT-JonasNeural',
      'DisplayName': 'Jonas',
      'Gender': 'Male',
      'Locale': 'de-AT'
    },
    {
      'LocalName': 'Jan',
      'ShortName': 'de-CH-JanNeural',
      'DisplayName': 'Jan',
      'Gender': 'Male',
      'Locale': 'de-CH'
    },
    {
      'LocalName': 'Leni',
      'ShortName': 'de-CH-LeniNeural',
      'DisplayName': 'Leni',
      'Gender': 'Female',
      'Locale': 'de-CH'
    },
    {
      'LocalName': 'Katja',
      'ShortName': 'de-DE-KatjaNeural',
      'DisplayName': 'Katja',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Amala',
      'ShortName': 'de-DE-AmalaNeural',
      'DisplayName': 'Amala',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Bernd',
      'ShortName': 'de-DE-BerndNeural',
      'DisplayName': 'Bernd',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Christoph',
      'ShortName': 'de-DE-ChristophNeural',
      'DisplayName': 'Christoph',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Conrad',
      'ShortName': 'de-DE-ConradNeural',
      'DisplayName': 'Conrad',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Elke',
      'ShortName': 'de-DE-ElkeNeural',
      'DisplayName': 'Elke',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Gisela',
      'ShortName': 'de-DE-GiselaNeural',
      'DisplayName': 'Gisela',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Kasper',
      'ShortName': 'de-DE-KasperNeural',
      'DisplayName': 'Kasper',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Killian',
      'ShortName': 'de-DE-KillianNeural',
      'DisplayName': 'Killian',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Klarissa',
      'ShortName': 'de-DE-KlarissaNeural',
      'DisplayName': 'Klarissa',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Klaus',
      'ShortName': 'de-DE-KlausNeural',
      'DisplayName': 'Klaus',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Louisa',
      'ShortName': 'de-DE-LouisaNeural',
      'DisplayName': 'Louisa',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Maja',
      'ShortName': 'de-DE-MajaNeural',
      'DisplayName': 'Maja',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Ralf',
      'ShortName': 'de-DE-RalfNeural',
      'DisplayName': 'Ralf',
      'Gender': 'Male',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Tanja',
      'ShortName': 'de-DE-TanjaNeural',
      'DisplayName': 'Tanja',
      'Gender': 'Female',
      'Locale': 'de-DE'
    },
    {
      'LocalName': 'Αθηνά',
      'ShortName': 'el-GR-AthinaNeural',
      'DisplayName': 'Athina',
      'Gender': 'Female',
      'Locale': 'el-GR'
    },
    {
      'LocalName': 'Νέστορας',
      'ShortName': 'el-GR-NestorasNeural',
      'DisplayName': 'Nestoras',
      'Gender': 'Male',
      'Locale': 'el-GR'
    },
    {
      'LocalName': 'Natasha',
      'ShortName': 'en-AU-NatashaNeural',
      'DisplayName': 'Natasha',
      'Gender': 'Female',
      'Locale': 'en-AU'
    },
    {
      'LocalName': 'William',
      'ShortName': 'en-AU-WilliamNeural',
      'DisplayName': 'William',
      'Gender': 'Male',
      'Locale': 'en-AU'
    },
    {
      'LocalName': 'Clara',
      'ShortName': 'en-CA-ClaraNeural',
      'DisplayName': 'Clara',
      'Gender': 'Female',
      'Locale': 'en-CA'
    },
    {
      'LocalName': 'Liam',
      'ShortName': 'en-CA-LiamNeural',
      'DisplayName': 'Liam',
      'Gender': 'Male',
      'Locale': 'en-CA'
    },
    {
      'LocalName': 'Libby',
      'ShortName': 'en-GB-LibbyNeural',
      'DisplayName': 'Libby',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Abbi',
      'ShortName': 'en-GB-AbbiNeural',
      'DisplayName': 'Abbi',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Alfie',
      'ShortName': 'en-GB-AlfieNeural',
      'DisplayName': 'Alfie',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Bella',
      'ShortName': 'en-GB-BellaNeural',
      'DisplayName': 'Bella',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Elliot',
      'ShortName': 'en-GB-ElliotNeural',
      'DisplayName': 'Elliot',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Ethan',
      'ShortName': 'en-GB-EthanNeural',
      'DisplayName': 'Ethan',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Hollie',
      'ShortName': 'en-GB-HollieNeural',
      'DisplayName': 'Hollie',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Maisie',
      'ShortName': 'en-GB-MaisieNeural',
      'DisplayName': 'Maisie',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Noah',
      'ShortName': 'en-GB-NoahNeural',
      'DisplayName': 'Noah',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Oliver',
      'ShortName': 'en-GB-OliverNeural',
      'DisplayName': 'Oliver',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Olivia',
      'ShortName': 'en-GB-OliviaNeural',
      'DisplayName': 'Olivia',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Ryan',
      'ShortName': 'en-GB-RyanNeural',
      'DisplayName': 'Ryan',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Sonia',
      'ShortName': 'en-GB-SoniaNeural',
      'DisplayName': 'Sonia',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Thomas',
      'ShortName': 'en-GB-ThomasNeural',
      'DisplayName': 'Thomas',
      'Gender': 'Male',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Mia',
      'ShortName': 'en-GB-MiaNeural',
      'DisplayName': 'Mia',
      'Gender': 'Female',
      'Locale': 'en-GB'
    },
    {
      'LocalName': 'Sam',
      'ShortName': 'en-HK-SamNeural',
      'DisplayName': 'Sam',
      'Gender': 'Male',
      'Locale': 'en-HK'
    },
    {
      'LocalName': 'Yan',
      'ShortName': 'en-HK-YanNeural',
      'DisplayName': 'Yan',
      'Gender': 'Female',
      'Locale': 'en-HK'
    },
    {
      'LocalName': 'Connor',
      'ShortName': 'en-IE-ConnorNeural',
      'DisplayName': 'Connor',
      'Gender': 'Male',
      'Locale': 'en-IE'
    },
    {
      'LocalName': 'Emily',
      'ShortName': 'en-IE-EmilyNeural',
      'DisplayName': 'Emily',
      'Gender': 'Female',
      'Locale': 'en-IE'
    },
    {
      'LocalName': 'Neerja',
      'ShortName': 'en-IN-NeerjaNeural',
      'DisplayName': 'Neerja',
      'Gender': 'Female',
      'Locale': 'en-IN'
    },
    {
      'LocalName': 'Prabhat',
      'ShortName': 'en-IN-PrabhatNeural',
      'DisplayName': 'Prabhat',
      'Gender': 'Male',
      'Locale': 'en-IN'
    },
    {
      'LocalName': 'Asilia',
      'ShortName': 'en-KE-AsiliaNeural',
      'DisplayName': 'Asilia',
      'Gender': 'Female',
      'Locale': 'en-KE'
    },
    {
      'LocalName': 'Chilemba',
      'ShortName': 'en-KE-ChilembaNeural',
      'DisplayName': 'Chilemba',
      'Gender': 'Male',
      'Locale': 'en-KE'
    },
    {
      'LocalName': 'Abeo',
      'ShortName': 'en-NG-AbeoNeural',
      'DisplayName': 'Abeo',
      'Gender': 'Male',
      'Locale': 'en-NG'
    },
    {
      'LocalName': 'Ezinne',
      'ShortName': 'en-NG-EzinneNeural',
      'DisplayName': 'Ezinne',
      'Gender': 'Female',
      'Locale': 'en-NG'
    },
    {
      'LocalName': 'Mitchell',
      'ShortName': 'en-NZ-MitchellNeural',
      'DisplayName': 'Mitchell',
      'Gender': 'Male',
      'Locale': 'en-NZ'
    },
    {
      'LocalName': 'Molly',
      'ShortName': 'en-NZ-MollyNeural',
      'DisplayName': 'Molly',
      'Gender': 'Female',
      'Locale': 'en-NZ'
    },
    {
      'LocalName': 'James',
      'ShortName': 'en-PH-JamesNeural',
      'DisplayName': 'James',
      'Gender': 'Male',
      'Locale': 'en-PH'
    },
    {
      'LocalName': 'Rosa',
      'ShortName': 'en-PH-RosaNeural',
      'DisplayName': 'Rosa',
      'Gender': 'Female',
      'Locale': 'en-PH'
    },
    {
      'LocalName': 'Luna',
      'ShortName': 'en-SG-LunaNeural',
      'DisplayName': 'Luna',
      'Gender': 'Female',
      'Locale': 'en-SG'
    },
    {
      'LocalName': 'Wayne',
      'ShortName': 'en-SG-WayneNeural',
      'DisplayName': 'Wayne',
      'Gender': 'Male',
      'Locale': 'en-SG'
    },
    {
      'LocalName': 'Elimu',
      'ShortName': 'en-TZ-ElimuNeural',
      'DisplayName': 'Elimu',
      'Gender': 'Male',
      'Locale': 'en-TZ'
    },
    {
      'LocalName': 'Imani',
      'ShortName': 'en-TZ-ImaniNeural',
      'DisplayName': 'Imani',
      'Gender': 'Female',
      'Locale': 'en-TZ'
    },
    {
      'LocalName': 'Jenny',
      'ShortName': 'en-US-JennyNeural',
      'DisplayName': 'Jenny',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Jenny Multilingual',
      'ShortName': 'en-US-JennyMultilingualNeural',
      'DisplayName': 'Jenny Multilingual',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Guy',
      'ShortName': 'en-US-GuyNeural',
      'DisplayName': 'Guy',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Amber',
      'ShortName': 'en-US-AmberNeural',
      'DisplayName': 'Amber',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Ana',
      'ShortName': 'en-US-AnaNeural',
      'DisplayName': 'Ana',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Aria',
      'ShortName': 'en-US-AriaNeural',
      'DisplayName': 'Aria',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Ashley',
      'ShortName': 'en-US-AshleyNeural',
      'DisplayName': 'Ashley',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Brandon',
      'ShortName': 'en-US-BrandonNeural',
      'DisplayName': 'Brandon',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Christopher',
      'ShortName': 'en-US-ChristopherNeural',
      'DisplayName': 'Christopher',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Cora',
      'ShortName': 'en-US-CoraNeural',
      'DisplayName': 'Cora',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Davis',
      'ShortName': 'en-US-DavisNeural',
      'DisplayName': 'Davis',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Elizabeth',
      'ShortName': 'en-US-ElizabethNeural',
      'DisplayName': 'Elizabeth',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Eric',
      'ShortName': 'en-US-EricNeural',
      'DisplayName': 'Eric',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Jacob',
      'ShortName': 'en-US-JacobNeural',
      'DisplayName': 'Jacob',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Jane',
      'ShortName': 'en-US-JaneNeural',
      'DisplayName': 'Jane',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Jason',
      'ShortName': 'en-US-JasonNeural',
      'DisplayName': 'Jason',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Michelle',
      'ShortName': 'en-US-MichelleNeural',
      'DisplayName': 'Michelle',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Monica',
      'ShortName': 'en-US-MonicaNeural',
      'DisplayName': 'Monica',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Nancy',
      'ShortName': 'en-US-NancyNeural',
      'DisplayName': 'Nancy',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Sara',
      'ShortName': 'en-US-SaraNeural',
      'DisplayName': 'Sara',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Tony',
      'ShortName': 'en-US-TonyNeural',
      'DisplayName': 'Tony',
      'Gender': 'Male',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'JennyEmotion',
      'ShortName': 'en-US-JennyEmotionNeural',
      'DisplayName': 'JennyEmotion',
      'Gender': 'Female',
      'Locale': 'en-US'
    },
    {
      'LocalName': 'Leah',
      'ShortName': 'en-ZA-LeahNeural',
      'DisplayName': 'Leah',
      'Gender': 'Female',
      'Locale': 'en-ZA'
    },
    {
      'LocalName': 'Luke',
      'ShortName': 'en-ZA-LukeNeural',
      'DisplayName': 'Luke',
      'Gender': 'Male',
      'Locale': 'en-ZA'
    },
    {
      'LocalName': 'Elena',
      'ShortName': 'es-AR-ElenaNeural',
      'DisplayName': 'Elena',
      'Gender': 'Female',
      'Locale': 'es-AR'
    },
    {
      'LocalName': 'Tomas',
      'ShortName': 'es-AR-TomasNeural',
      'DisplayName': 'Tomas',
      'Gender': 'Male',
      'Locale': 'es-AR'
    },
    {
      'LocalName': 'Marcelo',
      'ShortName': 'es-BO-MarceloNeural',
      'DisplayName': 'Marcelo',
      'Gender': 'Male',
      'Locale': 'es-BO'
    },
    {
      'LocalName': 'Sofia',
      'ShortName': 'es-BO-SofiaNeural',
      'DisplayName': 'Sofia',
      'Gender': 'Female',
      'Locale': 'es-BO'
    },
    {
      'LocalName': 'Catalina',
      'ShortName': 'es-CL-CatalinaNeural',
      'DisplayName': 'Catalina',
      'Gender': 'Female',
      'Locale': 'es-CL'
    },
    {
      'LocalName': 'Lorenzo',
      'ShortName': 'es-CL-LorenzoNeural',
      'DisplayName': 'Lorenzo',
      'Gender': 'Male',
      'Locale': 'es-CL'
    },
    {
      'LocalName': 'Gonzalo',
      'ShortName': 'es-CO-GonzaloNeural',
      'DisplayName': 'Gonzalo',
      'Gender': 'Male',
      'Locale': 'es-CO'
    },
    {
      'LocalName': 'Salome',
      'ShortName': 'es-CO-SalomeNeural',
      'DisplayName': 'Salome',
      'Gender': 'Female',
      'Locale': 'es-CO'
    },
    {
      'LocalName': 'Juan',
      'ShortName': 'es-CR-JuanNeural',
      'DisplayName': 'Juan',
      'Gender': 'Male',
      'Locale': 'es-CR'
    },
    {
      'LocalName': 'María',
      'ShortName': 'es-CR-MariaNeural',
      'DisplayName': 'Maria',
      'Gender': 'Female',
      'Locale': 'es-CR'
    },
    {
      'LocalName': 'Belkys',
      'ShortName': 'es-CU-BelkysNeural',
      'DisplayName': 'Belkys',
      'Gender': 'Female',
      'Locale': 'es-CU'
    },
    {
      'LocalName': 'Manuel',
      'ShortName': 'es-CU-ManuelNeural',
      'DisplayName': 'Manuel',
      'Gender': 'Male',
      'Locale': 'es-CU'
    },
    {
      'LocalName': 'Emilio',
      'ShortName': 'es-DO-EmilioNeural',
      'DisplayName': 'Emilio',
      'Gender': 'Male',
      'Locale': 'es-DO'
    },
    {
      'LocalName': 'Ramona',
      'ShortName': 'es-DO-RamonaNeural',
      'DisplayName': 'Ramona',
      'Gender': 'Female',
      'Locale': 'es-DO'
    },
    {
      'LocalName': 'Andrea',
      'ShortName': 'es-EC-AndreaNeural',
      'DisplayName': 'Andrea',
      'Gender': 'Female',
      'Locale': 'es-EC'
    },
    {
      'LocalName': 'Luis',
      'ShortName': 'es-EC-LuisNeural',
      'DisplayName': 'Luis',
      'Gender': 'Male',
      'Locale': 'es-EC'
    },
    {
      'LocalName': 'Álvaro',
      'ShortName': 'es-ES-AlvaroNeural',
      'DisplayName': 'Alvaro',
      'Gender': 'Male',
      'Locale': 'es-ES'
    },
    {
      'LocalName': 'Elvira',
      'ShortName': 'es-ES-ElviraNeural',
      'DisplayName': 'Elvira',
      'Gender': 'Female',
      'Locale': 'es-ES'
    },
    {
      'LocalName': 'Javier',
      'ShortName': 'es-GQ-JavierNeural',
      'DisplayName': 'Javier',
      'Gender': 'Male',
      'Locale': 'es-GQ'
    },
    {
      'LocalName': 'Teresa',
      'ShortName': 'es-GQ-TeresaNeural',
      'DisplayName': 'Teresa',
      'Gender': 'Female',
      'Locale': 'es-GQ'
    },
    {
      'LocalName': 'Andrés',
      'ShortName': 'es-GT-AndresNeural',
      'DisplayName': 'Andres',
      'Gender': 'Male',
      'Locale': 'es-GT'
    },
    {
      'LocalName': 'Marta',
      'ShortName': 'es-GT-MartaNeural',
      'DisplayName': 'Marta',
      'Gender': 'Female',
      'Locale': 'es-GT'
    },
    {
      'LocalName': 'Carlos',
      'ShortName': 'es-HN-CarlosNeural',
      'DisplayName': 'Carlos',
      'Gender': 'Male',
      'Locale': 'es-HN'
    },
    {
      'LocalName': 'Karla',
      'ShortName': 'es-HN-KarlaNeural',
      'DisplayName': 'Karla',
      'Gender': 'Female',
      'Locale': 'es-HN'
    },
    {
      'LocalName': 'Beatriz',
      'ShortName': 'es-MX-BeatrizNeural',
      'DisplayName': 'Beatriz',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Candela',
      'ShortName': 'es-MX-CandelaNeural',
      'DisplayName': 'Candela',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Carlota',
      'ShortName': 'es-MX-CarlotaNeural',
      'DisplayName': 'Carlota',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Cecilio',
      'ShortName': 'es-MX-CecilioNeural',
      'DisplayName': 'Cecilio',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Dalia',
      'ShortName': 'es-MX-DaliaNeural',
      'DisplayName': 'Dalia',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Gerardo',
      'ShortName': 'es-MX-GerardoNeural',
      'DisplayName': 'Gerardo',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Jorge',
      'ShortName': 'es-MX-JorgeNeural',
      'DisplayName': 'Jorge',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Larissa',
      'ShortName': 'es-MX-LarissaNeural',
      'DisplayName': 'Larissa',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Liberto',
      'ShortName': 'es-MX-LibertoNeural',
      'DisplayName': 'Liberto',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Luciano',
      'ShortName': 'es-MX-LucianoNeural',
      'DisplayName': 'Luciano',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Marina',
      'ShortName': 'es-MX-MarinaNeural',
      'DisplayName': 'Marina',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Nuria',
      'ShortName': 'es-MX-NuriaNeural',
      'DisplayName': 'Nuria',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Pelayo',
      'ShortName': 'es-MX-PelayoNeural',
      'DisplayName': 'Pelayo',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Renata',
      'ShortName': 'es-MX-RenataNeural',
      'DisplayName': 'Renata',
      'Gender': 'Female',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Yago',
      'ShortName': 'es-MX-YagoNeural',
      'DisplayName': 'Yago',
      'Gender': 'Male',
      'Locale': 'es-MX'
    },
    {
      'LocalName': 'Federico',
      'ShortName': 'es-NI-FedericoNeural',
      'DisplayName': 'Federico',
      'Gender': 'Male',
      'Locale': 'es-NI'
    },
    {
      'LocalName': 'Yolanda',
      'ShortName': 'es-NI-YolandaNeural',
      'DisplayName': 'Yolanda',
      'Gender': 'Female',
      'Locale': 'es-NI'
    },
    {
      'LocalName': 'Margarita',
      'ShortName': 'es-PA-MargaritaNeural',
      'DisplayName': 'Margarita',
      'Gender': 'Female',
      'Locale': 'es-PA'
    },
    {
      'LocalName': 'Roberto',
      'ShortName': 'es-PA-RobertoNeural',
      'DisplayName': 'Roberto',
      'Gender': 'Male',
      'Locale': 'es-PA'
    },
    {
      'LocalName': 'Alex',
      'ShortName': 'es-PE-AlexNeural',
      'DisplayName': 'Alex',
      'Gender': 'Male',
      'Locale': 'es-PE'
    },
    {
      'LocalName': 'Camila',
      'ShortName': 'es-PE-CamilaNeural',
      'DisplayName': 'Camila',
      'Gender': 'Female',
      'Locale': 'es-PE'
    },
    {
      'LocalName': 'Karina',
      'ShortName': 'es-PR-KarinaNeural',
      'DisplayName': 'Karina',
      'Gender': 'Female',
      'Locale': 'es-PR'
    },
    {
      'LocalName': 'Víctor',
      'ShortName': 'es-PR-VictorNeural',
      'DisplayName': 'Victor',
      'Gender': 'Male',
      'Locale': 'es-PR'
    },
    {
      'LocalName': 'Mario',
      'ShortName': 'es-PY-MarioNeural',
      'DisplayName': 'Mario',
      'Gender': 'Male',
      'Locale': 'es-PY'
    },
    {
      'LocalName': 'Tania',
      'ShortName': 'es-PY-TaniaNeural',
      'DisplayName': 'Tania',
      'Gender': 'Female',
      'Locale': 'es-PY'
    },
    {
      'LocalName': 'Lorena',
      'ShortName': 'es-SV-LorenaNeural',
      'DisplayName': 'Lorena',
      'Gender': 'Female',
      'Locale': 'es-SV'
    },
    {
      'LocalName': 'Rodrigo',
      'ShortName': 'es-SV-RodrigoNeural',
      'DisplayName': 'Rodrigo',
      'Gender': 'Male',
      'Locale': 'es-SV'
    },
    {
      'LocalName': 'Alonso',
      'ShortName': 'es-US-AlonsoNeural',
      'DisplayName': 'Alonso',
      'Gender': 'Male',
      'Locale': 'es-US'
    },
    {
      'LocalName': 'Paloma',
      'ShortName': 'es-US-PalomaNeural',
      'DisplayName': 'Paloma',
      'Gender': 'Female',
      'Locale': 'es-US'
    },
    {
      'LocalName': 'Mateo',
      'ShortName': 'es-UY-MateoNeural',
      'DisplayName': 'Mateo',
      'Gender': 'Male',
      'Locale': 'es-UY'
    },
    {
      'LocalName': 'Valentina',
      'ShortName': 'es-UY-ValentinaNeural',
      'DisplayName': 'Valentina',
      'Gender': 'Female',
      'Locale': 'es-UY'
    },
    {
      'LocalName': 'Paola',
      'ShortName': 'es-VE-PaolaNeural',
      'DisplayName': 'Paola',
      'Gender': 'Female',
      'Locale': 'es-VE'
    },
    {
      'LocalName': 'Sebastián',
      'ShortName': 'es-VE-SebastianNeural',
      'DisplayName': 'Sebastian',
      'Gender': 'Male',
      'Locale': 'es-VE'
    },
    {
      'LocalName': 'Anu',
      'ShortName': 'et-EE-AnuNeural',
      'DisplayName': 'Anu',
      'Gender': 'Female',
      'Locale': 'et-EE'
    },
    {
      'LocalName': 'Kert',
      'ShortName': 'et-EE-KertNeural',
      'DisplayName': 'Kert',
      'Gender': 'Male',
      'Locale': 'et-EE'
    },
    {
      'LocalName': 'Ainhoa',
      'ShortName': 'eu-ES-AinhoaNeural',
      'DisplayName': 'Ainhoa',
      'Gender': 'Female',
      'Locale': 'eu-ES'
    },
    {
      'LocalName': 'Ander',
      'ShortName': 'eu-ES-AnderNeural',
      'DisplayName': 'Ander',
      'Gender': 'Male',
      'Locale': 'eu-ES'
    },
    {
      'LocalName': 'دلارا',
      'ShortName': 'fa-IR-DilaraNeural',
      'DisplayName': 'Dilara',
      'Gender': 'Female',
      'Locale': 'fa-IR'
    },
    {
      'LocalName': 'فرید',
      'ShortName': 'fa-IR-FaridNeural',
      'DisplayName': 'Farid',
      'Gender': 'Male',
      'Locale': 'fa-IR'
    },
    {
      'LocalName': 'Selma',
      'ShortName': 'fi-FI-SelmaNeural',
      'DisplayName': 'Selma',
      'Gender': 'Female',
      'Locale': 'fi-FI'
    },
    {
      'LocalName': 'Harri',
      'ShortName': 'fi-FI-HarriNeural',
      'DisplayName': 'Harri',
      'Gender': 'Male',
      'Locale': 'fi-FI'
    },
    {
      'LocalName': 'Noora',
      'ShortName': 'fi-FI-NooraNeural',
      'DisplayName': 'Noora',
      'Gender': 'Female',
      'Locale': 'fi-FI'
    },
    {
      'LocalName': 'Angelo',
      'ShortName': 'fil-PH-AngeloNeural',
      'DisplayName': 'Angelo',
      'Gender': 'Male',
      'Locale': 'fil-PH'
    },
    {
      'LocalName': 'Blessica',
      'ShortName': 'fil-PH-BlessicaNeural',
      'DisplayName': 'Blessica',
      'Gender': 'Female',
      'Locale': 'fil-PH'
    },
    {
      'LocalName': 'Charline',
      'ShortName': 'fr-BE-CharlineNeural',
      'DisplayName': 'Charline',
      'Gender': 'Female',
      'Locale': 'fr-BE'
    },
    {
      'LocalName': 'Gerard',
      'ShortName': 'fr-BE-GerardNeural',
      'DisplayName': 'Gerard',
      'Gender': 'Male',
      'Locale': 'fr-BE'
    },
    {
      'LocalName': 'Sylvie',
      'ShortName': 'fr-CA-SylvieNeural',
      'DisplayName': 'Sylvie',
      'Gender': 'Female',
      'Locale': 'fr-CA'
    },
    {
      'LocalName': 'Antoine',
      'ShortName': 'fr-CA-AntoineNeural',
      'DisplayName': 'Antoine',
      'Gender': 'Male',
      'Locale': 'fr-CA'
    },
    {
      'LocalName': 'Jean',
      'ShortName': 'fr-CA-JeanNeural',
      'DisplayName': 'Jean',
      'Gender': 'Male',
      'Locale': 'fr-CA'
    },
    {
      'LocalName': 'Ariane',
      'ShortName': 'fr-CH-ArianeNeural',
      'DisplayName': 'Ariane',
      'Gender': 'Female',
      'Locale': 'fr-CH'
    },
    {
      'LocalName': 'Fabrice',
      'ShortName': 'fr-CH-FabriceNeural',
      'DisplayName': 'Fabrice',
      'Gender': 'Male',
      'Locale': 'fr-CH'
    },
    {
      'LocalName': 'Alain',
      'ShortName': 'fr-FR-AlainNeural',
      'DisplayName': 'Alain',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Brigitte',
      'ShortName': 'fr-FR-BrigitteNeural',
      'DisplayName': 'Brigitte',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Celeste',
      'ShortName': 'fr-FR-CelesteNeural',
      'DisplayName': 'Celeste',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Claude',
      'ShortName': 'fr-FR-ClaudeNeural',
      'DisplayName': 'Claude',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Coralie',
      'ShortName': 'fr-FR-CoralieNeural',
      'DisplayName': 'Coralie',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Denise',
      'ShortName': 'fr-FR-DeniseNeural',
      'DisplayName': 'Denise',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Eloise',
      'ShortName': 'fr-FR-EloiseNeural',
      'DisplayName': 'Eloise',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Henri',
      'ShortName': 'fr-FR-HenriNeural',
      'DisplayName': 'Henri',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Jacqueline',
      'ShortName': 'fr-FR-JacquelineNeural',
      'DisplayName': 'Jacqueline',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Jerome',
      'ShortName': 'fr-FR-JeromeNeural',
      'DisplayName': 'Jerome',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Josephine',
      'ShortName': 'fr-FR-JosephineNeural',
      'DisplayName': 'Josephine',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Maurice',
      'ShortName': 'fr-FR-MauriceNeural',
      'DisplayName': 'Maurice',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Yves',
      'ShortName': 'fr-FR-YvesNeural',
      'DisplayName': 'Yves',
      'Gender': 'Male',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Yvette',
      'ShortName': 'fr-FR-YvetteNeural',
      'DisplayName': 'Yvette',
      'Gender': 'Female',
      'Locale': 'fr-FR'
    },
    {
      'LocalName': 'Colm',
      'ShortName': 'ga-IE-ColmNeural',
      'DisplayName': 'Colm',
      'Gender': 'Male',
      'Locale': 'ga-IE'
    },
    {
      'LocalName': 'Orla',
      'ShortName': 'ga-IE-OrlaNeural',
      'DisplayName': 'Orla',
      'Gender': 'Female',
      'Locale': 'ga-IE'
    },
    {
      'LocalName': 'Roi',
      'ShortName': 'gl-ES-RoiNeural',
      'DisplayName': 'Roi',
      'Gender': 'Male',
      'Locale': 'gl-ES'
    },
    {
      'LocalName': 'Sabela',
      'ShortName': 'gl-ES-SabelaNeural',
      'DisplayName': 'Sabela',
      'Gender': 'Female',
      'Locale': 'gl-ES'
    },
    {
      'LocalName': 'ધ્વની',
      'ShortName': 'gu-IN-DhwaniNeural',
      'DisplayName': 'Dhwani',
      'Gender': 'Female',
      'Locale': 'gu-IN'
    },
    {
      'LocalName': 'નિરંજન',
      'ShortName': 'gu-IN-NiranjanNeural',
      'DisplayName': 'Niranjan',
      'Gender': 'Male',
      'Locale': 'gu-IN'
    },
    {
      'LocalName': 'אברי',
      'ShortName': 'he-IL-AvriNeural',
      'DisplayName': 'Avri',
      'Gender': 'Male',
      'Locale': 'he-IL'
    },
    {
      'LocalName': 'הילה',
      'ShortName': 'he-IL-HilaNeural',
      'DisplayName': 'Hila',
      'Gender': 'Female',
      'Locale': 'he-IL'
    },
    {
      'LocalName': 'मधुर',
      'ShortName': 'hi-IN-MadhurNeural',
      'DisplayName': 'Madhur',
      'Gender': 'Male',
      'Locale': 'hi-IN'
    },
    {
      'LocalName': 'स्वरा',
      'ShortName': 'hi-IN-SwaraNeural',
      'DisplayName': 'Swara',
      'Gender': 'Female',
      'Locale': 'hi-IN'
    },
    {
      'LocalName': 'Gabrijela',
      'ShortName': 'hr-HR-GabrijelaNeural',
      'DisplayName': 'Gabrijela',
      'Gender': 'Female',
      'Locale': 'hr-HR'
    },
    {
      'LocalName': 'Srećko',
      'ShortName': 'hr-HR-SreckoNeural',
      'DisplayName': 'Srecko',
      'Gender': 'Male',
      'Locale': 'hr-HR'
    },
    {
      'LocalName': 'Noémi',
      'ShortName': 'hu-HU-NoemiNeural',
      'DisplayName': 'Noemi',
      'Gender': 'Female',
      'Locale': 'hu-HU'
    },
    {
      'LocalName': 'Tamás',
      'ShortName': 'hu-HU-TamasNeural',
      'DisplayName': 'Tamas',
      'Gender': 'Male',
      'Locale': 'hu-HU'
    },
    {
      'LocalName': 'Անահիտ',
      'ShortName': 'hy-AM-AnahitNeural',
      'DisplayName': 'Anahit',
      'Gender': 'Female',
      'Locale': 'hy-AM'
    },
    {
      'LocalName': 'Հայկ',
      'ShortName': 'hy-AM-HaykNeural',
      'DisplayName': 'Hayk',
      'Gender': 'Male',
      'Locale': 'hy-AM'
    },
    {
      'LocalName': 'Ardi',
      'ShortName': 'id-ID-ArdiNeural',
      'DisplayName': 'Ardi',
      'Gender': 'Male',
      'Locale': 'id-ID'
    },
    {
      'LocalName': 'Gadis',
      'ShortName': 'id-ID-GadisNeural',
      'DisplayName': 'Gadis',
      'Gender': 'Female',
      'Locale': 'id-ID'
    },
    {
      'LocalName': 'Guðrún',
      'ShortName': 'is-IS-GudrunNeural',
      'DisplayName': 'Gudrun',
      'Gender': 'Female',
      'Locale': 'is-IS'
    },
    {
      'LocalName': 'Gunnar',
      'ShortName': 'is-IS-GunnarNeural',
      'DisplayName': 'Gunnar',
      'Gender': 'Male',
      'Locale': 'is-IS'
    },
    {
      'LocalName': 'Isabella',
      'ShortName': 'it-IT-IsabellaNeural',
      'DisplayName': 'Isabella',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Benigno',
      'ShortName': 'it-IT-BenignoNeural',
      'DisplayName': 'Benigno',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Calimero',
      'ShortName': 'it-IT-CalimeroNeural',
      'DisplayName': 'Calimero',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Cataldo',
      'ShortName': 'it-IT-CataldoNeural',
      'DisplayName': 'Cataldo',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Diego',
      'ShortName': 'it-IT-DiegoNeural',
      'DisplayName': 'Diego',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Elsa',
      'ShortName': 'it-IT-ElsaNeural',
      'DisplayName': 'Elsa',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Fabiola',
      'ShortName': 'it-IT-FabiolaNeural',
      'DisplayName': 'Fabiola',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Fiamma',
      'ShortName': 'it-IT-FiammaNeural',
      'DisplayName': 'Fiamma',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Gianni',
      'ShortName': 'it-IT-GianniNeural',
      'DisplayName': 'Gianni',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Imelda',
      'ShortName': 'it-IT-ImeldaNeural',
      'DisplayName': 'Imelda',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Irma',
      'ShortName': 'it-IT-IrmaNeural',
      'DisplayName': 'Irma',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Lisandro',
      'ShortName': 'it-IT-LisandroNeural',
      'DisplayName': 'Lisandro',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Palmira',
      'ShortName': 'it-IT-PalmiraNeural',
      'DisplayName': 'Palmira',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Pierina',
      'ShortName': 'it-IT-PierinaNeural',
      'DisplayName': 'Pierina',
      'Gender': 'Female',
      'Locale': 'it-IT'
    },
    {
      'LocalName': 'Rinaldo',
      'ShortName': 'it-IT-RinaldoNeural',
      'DisplayName': 'Rinaldo',
      'Gender': 'Male',
      'Locale': 'it-IT'
    },
    {
      'LocalName': '七海',
      'ShortName': 'ja-JP-NanamiNeural',
      'DisplayName': 'Nanami',
      'Gender': 'Female',
      'Locale': 'ja-JP'
    },
    {
      'LocalName': '圭太',
      'ShortName': 'ja-JP-KeitaNeural',
      'DisplayName': 'Keita',
      'Gender': 'Male',
      'Locale': 'ja-JP'
    },
    {
      'LocalName': 'Dimas',
      'ShortName': 'jv-ID-DimasNeural',
      'DisplayName': 'Dimas',
      'Gender': 'Male',
      'Locale': 'jv-ID'
    },
    {
      'LocalName': 'Siti',
      'ShortName': 'jv-ID-SitiNeural',
      'DisplayName': 'Siti',
      'Gender': 'Female',
      'Locale': 'jv-ID'
    },
    {
      'LocalName': 'ეკა',
      'ShortName': 'ka-GE-EkaNeural',
      'DisplayName': 'Eka',
      'Gender': 'Female',
      'Locale': 'ka-GE'
    },
    {
      'LocalName': 'გიორგი',
      'ShortName': 'ka-GE-GiorgiNeural',
      'DisplayName': 'Giorgi',
      'Gender': 'Male',
      'Locale': 'ka-GE'
    },
    {
      'LocalName': 'Айгүл',
      'ShortName': 'kk-KZ-AigulNeural',
      'DisplayName': 'Aigul',
      'Gender': 'Female',
      'Locale': 'kk-KZ'
    },
    {
      'LocalName': 'Дәулет',
      'ShortName': 'kk-KZ-DauletNeural',
      'DisplayName': 'Daulet',
      'Gender': 'Male',
      'Locale': 'kk-KZ'
    },
    {
      'LocalName': 'ពិសិដ្ឋ',
      'ShortName': 'km-KH-PisethNeural',
      'DisplayName': 'Piseth',
      'Gender': 'Male',
      'Locale': 'km-KH'
    },
    {
      'LocalName': 'ស្រីមុំ',
      'ShortName': 'km-KH-SreymomNeural',
      'DisplayName': 'Sreymom',
      'Gender': 'Female',
      'Locale': 'km-KH'
    },
    {
      'LocalName': 'ಗಗನ್',
      'ShortName': 'kn-IN-GaganNeural',
      'DisplayName': 'Gagan',
      'Gender': 'Male',
      'Locale': 'kn-IN'
    },
    {
      'LocalName': 'ಸಪ್ನಾ',
      'ShortName': 'kn-IN-SapnaNeural',
      'DisplayName': 'Sapna',
      'Gender': 'Female',
      'Locale': 'kn-IN'
    },
    {
      'LocalName': '선히',
      'ShortName': 'ko-KR-SunHiNeural',
      'DisplayName': 'Sun-Hi',
      'Gender': 'Female',
      'Locale': 'ko-KR'
    },
    {
      'LocalName': '인준',
      'ShortName': 'ko-KR-InJoonNeural',
      'DisplayName': 'InJoon',
      'Gender': 'Male',
      'Locale': 'ko-KR'
    },
    {
      'LocalName': 'ຈັນທະວົງ',
      'ShortName': 'lo-LA-ChanthavongNeural',
      'DisplayName': 'Chanthavong',
      'Gender': 'Male',
      'Locale': 'lo-LA'
    },
    {
      'LocalName': 'ແກ້ວມະນີ',
      'ShortName': 'lo-LA-KeomanyNeural',
      'DisplayName': 'Keomany',
      'Gender': 'Female',
      'Locale': 'lo-LA'
    },
    {
      'LocalName': 'Leonas',
      'ShortName': 'lt-LT-LeonasNeural',
      'DisplayName': 'Leonas',
      'Gender': 'Male',
      'Locale': 'lt-LT'
    },
    {
      'LocalName': 'Ona',
      'ShortName': 'lt-LT-OnaNeural',
      'DisplayName': 'Ona',
      'Gender': 'Female',
      'Locale': 'lt-LT'
    },
    {
      'LocalName': 'Everita',
      'ShortName': 'lv-LV-EveritaNeural',
      'DisplayName': 'Everita',
      'Gender': 'Female',
      'Locale': 'lv-LV'
    },
    {
      'LocalName': 'Nils',
      'ShortName': 'lv-LV-NilsNeural',
      'DisplayName': 'Nils',
      'Gender': 'Male',
      'Locale': 'lv-LV'
    },
    {
      'LocalName': 'Александар',
      'ShortName': 'mk-MK-AleksandarNeural',
      'DisplayName': 'Aleksandar',
      'Gender': 'Male',
      'Locale': 'mk-MK'
    },
    {
      'LocalName': 'Марија',
      'ShortName': 'mk-MK-MarijaNeural',
      'DisplayName': 'Marija',
      'Gender': 'Female',
      'Locale': 'mk-MK'
    },
    {
      'LocalName': 'മിഥുൻ',
      'ShortName': 'ml-IN-MidhunNeural',
      'DisplayName': 'Midhun',
      'Gender': 'Male',
      'Locale': 'ml-IN'
    },
    {
      'LocalName': 'ശോഭന',
      'ShortName': 'ml-IN-SobhanaNeural',
      'DisplayName': 'Sobhana',
      'Gender': 'Female',
      'Locale': 'ml-IN'
    },
    {
      'LocalName': 'Батаа',
      'ShortName': 'mn-MN-BataaNeural',
      'DisplayName': 'Bataa',
      'Gender': 'Male',
      'Locale': 'mn-MN'
    },
    {
      'LocalName': 'Есүй',
      'ShortName': 'mn-MN-YesuiNeural',
      'DisplayName': 'Yesui',
      'Gender': 'Female',
      'Locale': 'mn-MN'
    },
    {
      'LocalName': 'आरोही',
      'ShortName': 'mr-IN-AarohiNeural',
      'DisplayName': 'Aarohi',
      'Gender': 'Female',
      'Locale': 'mr-IN'
    },
    {
      'LocalName': 'मनोहर',
      'ShortName': 'mr-IN-ManoharNeural',
      'DisplayName': 'Manohar',
      'Gender': 'Male',
      'Locale': 'mr-IN'
    },
    {
      'LocalName': 'Osman',
      'ShortName': 'ms-MY-OsmanNeural',
      'DisplayName': 'Osman',
      'Gender': 'Male',
      'Locale': 'ms-MY'
    },
    {
      'LocalName': 'Yasmin',
      'ShortName': 'ms-MY-YasminNeural',
      'DisplayName': 'Yasmin',
      'Gender': 'Female',
      'Locale': 'ms-MY'
    },
    {
      'LocalName': 'Grace',
      'ShortName': 'mt-MT-GraceNeural',
      'DisplayName': 'Grace',
      'Gender': 'Female',
      'Locale': 'mt-MT'
    },
    {
      'LocalName': 'Joseph',
      'ShortName': 'mt-MT-JosephNeural',
      'DisplayName': 'Joseph',
      'Gender': 'Male',
      'Locale': 'mt-MT'
    },
    {
      'LocalName': 'နီလာ',
      'ShortName': 'my-MM-NilarNeural',
      'DisplayName': 'Nilar',
      'Gender': 'Female',
      'Locale': 'my-MM'
    },
    {
      'LocalName': 'သီဟ',
      'ShortName': 'my-MM-ThihaNeural',
      'DisplayName': 'Thiha',
      'Gender': 'Male',
      'Locale': 'my-MM'
    },
    {
      'LocalName': 'Pernille',
      'ShortName': 'nb-NO-PernilleNeural',
      'DisplayName': 'Pernille',
      'Gender': 'Female',
      'Locale': 'nb-NO'
    },
    {
      'LocalName': 'Finn',
      'ShortName': 'nb-NO-FinnNeural',
      'DisplayName': 'Finn',
      'Gender': 'Male',
      'Locale': 'nb-NO'
    },
    {
      'LocalName': 'Iselin',
      'ShortName': 'nb-NO-IselinNeural',
      'DisplayName': 'Iselin',
      'Gender': 'Female',
      'Locale': 'nb-NO'
    },
    {
      'LocalName': 'हेमकला',
      'ShortName': 'ne-NP-HemkalaNeural',
      'DisplayName': 'Hemkala',
      'Gender': 'Female',
      'Locale': 'ne-NP'
    },
    {
      'LocalName': 'सागर',
      'ShortName': 'ne-NP-SagarNeural',
      'DisplayName': 'Sagar',
      'Gender': 'Male',
      'Locale': 'ne-NP'
    },
    {
      'LocalName': 'Arnaud',
      'ShortName': 'nl-BE-ArnaudNeural',
      'DisplayName': 'Arnaud',
      'Gender': 'Male',
      'Locale': 'nl-BE'
    },
    {
      'LocalName': 'Dena',
      'ShortName': 'nl-BE-DenaNeural',
      'DisplayName': 'Dena',
      'Gender': 'Female',
      'Locale': 'nl-BE'
    },
    {
      'LocalName': 'Colette',
      'ShortName': 'nl-NL-ColetteNeural',
      'DisplayName': 'Colette',
      'Gender': 'Female',
      'Locale': 'nl-NL'
    },
    {
      'LocalName': 'Fenna',
      'ShortName': 'nl-NL-FennaNeural',
      'DisplayName': 'Fenna',
      'Gender': 'Female',
      'Locale': 'nl-NL'
    },
    {
      'LocalName': 'Maarten',
      'ShortName': 'nl-NL-MaartenNeural',
      'DisplayName': 'Maarten',
      'Gender': 'Male',
      'Locale': 'nl-NL'
    },
    {
      'LocalName': 'Agnieszka',
      'ShortName': 'pl-PL-AgnieszkaNeural',
      'DisplayName': 'Agnieszka',
      'Gender': 'Female',
      'Locale': 'pl-PL'
    },
    {
      'LocalName': 'Marek',
      'ShortName': 'pl-PL-MarekNeural',
      'DisplayName': 'Marek',
      'Gender': 'Male',
      'Locale': 'pl-PL'
    },
    {
      'LocalName': 'Zofia',
      'ShortName': 'pl-PL-ZofiaNeural',
      'DisplayName': 'Zofia',
      'Gender': 'Female',
      'Locale': 'pl-PL'
    },
    {
      'LocalName': ' ګل نواز',
      'ShortName': 'ps-AF-GulNawazNeural',
      'DisplayName': 'Gul Nawaz',
      'Gender': 'Male',
      'Locale': 'ps-AF'
    },
    {
      'LocalName': 'لطيفه',
      'ShortName': 'ps-AF-LatifaNeural',
      'DisplayName': 'Latifa',
      'Gender': 'Female',
      'Locale': 'ps-AF'
    },
    {
      'LocalName': 'Francisca',
      'ShortName': 'pt-BR-FranciscaNeural',
      'DisplayName': 'Francisca',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Brenda',
      'ShortName': 'pt-BR-BrendaNeural',
      'DisplayName': 'Brenda',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Donato',
      'ShortName': 'pt-BR-DonatoNeural',
      'DisplayName': 'Donato',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Elza',
      'ShortName': 'pt-BR-ElzaNeural',
      'DisplayName': 'Elza',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Fabio',
      'ShortName': 'pt-BR-FabioNeural',
      'DisplayName': 'Fabio',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Giovanna',
      'ShortName': 'pt-BR-GiovannaNeural',
      'DisplayName': 'Giovanna',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Humberto',
      'ShortName': 'pt-BR-HumbertoNeural',
      'DisplayName': 'Humberto',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Julio',
      'ShortName': 'pt-BR-JulioNeural',
      'DisplayName': 'Julio',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Leila',
      'ShortName': 'pt-BR-LeilaNeural',
      'DisplayName': 'Leila',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Leticia',
      'ShortName': 'pt-BR-LeticiaNeural',
      'DisplayName': 'Leticia',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Manuela',
      'ShortName': 'pt-BR-ManuelaNeural',
      'DisplayName': 'Manuela',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Nicolau',
      'ShortName': 'pt-BR-NicolauNeural',
      'DisplayName': 'Nicolau',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Valerio',
      'ShortName': 'pt-BR-ValerioNeural',
      'DisplayName': 'Valerio',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Yara',
      'ShortName': 'pt-BR-YaraNeural',
      'DisplayName': 'Yara',
      'Gender': 'Female',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Antônio',
      'ShortName': 'pt-BR-AntonioNeural',
      'DisplayName': 'Antonio',
      'Gender': 'Male',
      'Locale': 'pt-BR'
    },
    {
      'LocalName': 'Duarte',
      'ShortName': 'pt-PT-DuarteNeural',
      'DisplayName': 'Duarte',
      'Gender': 'Male',
      'Locale': 'pt-PT'
    },
    {
      'LocalName': 'Fernanda',
      'ShortName': 'pt-PT-FernandaNeural',
      'DisplayName': 'Fernanda',
      'Gender': 'Female',
      'Locale': 'pt-PT'
    },
    {
      'LocalName': 'Raquel',
      'ShortName': 'pt-PT-RaquelNeural',
      'DisplayName': 'Raquel',
      'Gender': 'Female',
      'Locale': 'pt-PT'
    },
    {
      'LocalName': 'Alina',
      'ShortName': 'ro-RO-AlinaNeural',
      'DisplayName': 'Alina',
      'Gender': 'Female',
      'Locale': 'ro-RO'
    },
    {
      'LocalName': 'Emil',
      'ShortName': 'ro-RO-EmilNeural',
      'DisplayName': 'Emil',
      'Gender': 'Male',
      'Locale': 'ro-RO'
    },
    {
      'LocalName': 'Светлана',
      'ShortName': 'ru-RU-SvetlanaNeural',
      'DisplayName': 'Svetlana',
      'Gender': 'Female',
      'Locale': 'ru-RU'
    },
    {
      'LocalName': 'Дария',
      'ShortName': 'ru-RU-DariyaNeural',
      'DisplayName': 'Dariya',
      'Gender': 'Female',
      'Locale': 'ru-RU'
    },
    {
      'LocalName': 'Дмитрий',
      'ShortName': 'ru-RU-DmitryNeural',
      'DisplayName': 'Dmitry',
      'Gender': 'Male',
      'Locale': 'ru-RU'
    },
    {
      'LocalName': 'සමීර',
      'ShortName': 'si-LK-SameeraNeural',
      'DisplayName': 'Sameera',
      'Gender': 'Male',
      'Locale': 'si-LK'
    },
    {
      'LocalName': 'තිළිණි',
      'ShortName': 'si-LK-ThiliniNeural',
      'DisplayName': 'Thilini',
      'Gender': 'Female',
      'Locale': 'si-LK'
    },
    {
      'LocalName': 'Lukáš',
      'ShortName': 'sk-SK-LukasNeural',
      'DisplayName': 'Lukas',
      'Gender': 'Male',
      'Locale': 'sk-SK'
    },
    {
      'LocalName': 'Viktória',
      'ShortName': 'sk-SK-ViktoriaNeural',
      'DisplayName': 'Viktoria',
      'Gender': 'Female',
      'Locale': 'sk-SK'
    },
    {
      'LocalName': 'Petra',
      'ShortName': 'sl-SI-PetraNeural',
      'DisplayName': 'Petra',
      'Gender': 'Female',
      'Locale': 'sl-SI'
    },
    {
      'LocalName': 'Rok',
      'ShortName': 'sl-SI-RokNeural',
      'DisplayName': 'Rok',
      'Gender': 'Male',
      'Locale': 'sl-SI'
    },
    {
      'LocalName': 'Muuse',
      'ShortName': 'so-SO-MuuseNeural',
      'DisplayName': 'Muuse',
      'Gender': 'Male',
      'Locale': 'so-SO'
    },
    {
      'LocalName': 'Ubax',
      'ShortName': 'so-SO-UbaxNeural',
      'DisplayName': 'Ubax',
      'Gender': 'Female',
      'Locale': 'so-SO'
    },
    {
      'LocalName': 'Anila',
      'ShortName': 'sq-AL-AnilaNeural',
      'DisplayName': 'Anila',
      'Gender': 'Female',
      'Locale': 'sq-AL'
    },
    {
      'LocalName': 'Ilir',
      'ShortName': 'sq-AL-IlirNeural',
      'DisplayName': 'Ilir',
      'Gender': 'Male',
      'Locale': 'sq-AL'
    },
    {
      'LocalName': 'Никола',
      'ShortName': 'sr-RS-NicholasNeural',
      'DisplayName': 'Nicholas',
      'Gender': 'Male',
      'Locale': 'sr-RS'
    },
    {
      'LocalName': 'Софија',
      'ShortName': 'sr-RS-SophieNeural',
      'DisplayName': 'Sophie',
      'Gender': 'Female',
      'Locale': 'sr-RS'
    },
    {
      'LocalName': 'Jajang',
      'ShortName': 'su-ID-JajangNeural',
      'DisplayName': 'Jajang',
      'Gender': 'Male',
      'Locale': 'su-ID'
    },
    {
      'LocalName': 'Tuti',
      'ShortName': 'su-ID-TutiNeural',
      'DisplayName': 'Tuti',
      'Gender': 'Female',
      'Locale': 'su-ID'
    },
    {
      'LocalName': 'Sofie',
      'ShortName': 'sv-SE-SofieNeural',
      'DisplayName': 'Sofie',
      'Gender': 'Female',
      'Locale': 'sv-SE'
    },
    {
      'LocalName': 'Hillevi',
      'ShortName': 'sv-SE-HilleviNeural',
      'DisplayName': 'Hillevi',
      'Gender': 'Female',
      'Locale': 'sv-SE'
    },
    {
      'LocalName': 'Mattias',
      'ShortName': 'sv-SE-MattiasNeural',
      'DisplayName': 'Mattias',
      'Gender': 'Male',
      'Locale': 'sv-SE'
    },
    {
      'LocalName': 'Rafiki',
      'ShortName': 'sw-KE-RafikiNeural',
      'DisplayName': 'Rafiki',
      'Gender': 'Male',
      'Locale': 'sw-KE'
    },
    {
      'LocalName': 'Zuri',
      'ShortName': 'sw-KE-ZuriNeural',
      'DisplayName': 'Zuri',
      'Gender': 'Female',
      'Locale': 'sw-KE'
    },
    {
      'LocalName': 'Daudi',
      'ShortName': 'sw-TZ-DaudiNeural',
      'DisplayName': 'Daudi',
      'Gender': 'Male',
      'Locale': 'sw-TZ'
    },
    {
      'LocalName': 'Rehema',
      'ShortName': 'sw-TZ-RehemaNeural',
      'DisplayName': 'Rehema',
      'Gender': 'Female',
      'Locale': 'sw-TZ'
    },
    {
      'LocalName': 'பல்லவி',
      'ShortName': 'ta-IN-PallaviNeural',
      'DisplayName': 'Pallavi',
      'Gender': 'Female',
      'Locale': 'ta-IN'
    },
    {
      'LocalName': 'வள்ளுவர்',
      'ShortName': 'ta-IN-ValluvarNeural',
      'DisplayName': 'Valluvar',
      'Gender': 'Male',
      'Locale': 'ta-IN'
    },
    {
      'LocalName': 'குமார்',
      'ShortName': 'ta-LK-KumarNeural',
      'DisplayName': 'Kumar',
      'Gender': 'Male',
      'Locale': 'ta-LK'
    },
    {
      'LocalName': 'சரண்யா',
      'ShortName': 'ta-LK-SaranyaNeural',
      'DisplayName': 'Saranya',
      'Gender': 'Female',
      'Locale': 'ta-LK'
    },
    {
      'LocalName': 'கனி',
      'ShortName': 'ta-MY-KaniNeural',
      'DisplayName': 'Kani',
      'Gender': 'Female',
      'Locale': 'ta-MY'
    },
    {
      'LocalName': 'சூர்யா',
      'ShortName': 'ta-MY-SuryaNeural',
      'DisplayName': 'Surya',
      'Gender': 'Male',
      'Locale': 'ta-MY'
    },
    {
      'LocalName': 'அன்பு',
      'ShortName': 'ta-SG-AnbuNeural',
      'DisplayName': 'Anbu',
      'Gender': 'Male',
      'Locale': 'ta-SG'
    },
    {
      'LocalName': 'வெண்பா',
      'ShortName': 'ta-SG-VenbaNeural',
      'DisplayName': 'Venba',
      'Gender': 'Female',
      'Locale': 'ta-SG'
    },
    {
      'LocalName': 'మోహన్',
      'ShortName': 'te-IN-MohanNeural',
      'DisplayName': 'Mohan',
      'Gender': 'Male',
      'Locale': 'te-IN'
    },
    {
      'LocalName': 'శ్రుతి',
      'ShortName': 'te-IN-ShrutiNeural',
      'DisplayName': 'Shruti',
      'Gender': 'Female',
      'Locale': 'te-IN'
    },
    {
      'LocalName': 'เปรมวดี',
      'ShortName': 'th-TH-PremwadeeNeural',
      'DisplayName': 'Premwadee',
      'Gender': 'Female',
      'Locale': 'th-TH'
    },
    {
      'LocalName': 'อัจฉรา',
      'ShortName': 'th-TH-AcharaNeural',
      'DisplayName': 'Achara',
      'Gender': 'Female',
      'Locale': 'th-TH'
    },
    {
      'LocalName': 'นิวัฒน์',
      'ShortName': 'th-TH-NiwatNeural',
      'DisplayName': 'Niwat',
      'Gender': 'Male',
      'Locale': 'th-TH'
    },
    {
      'LocalName': 'Ahmet',
      'ShortName': 'tr-TR-AhmetNeural',
      'DisplayName': 'Ahmet',
      'Gender': 'Male',
      'Locale': 'tr-TR'
    },
    {
      'LocalName': 'Emel',
      'ShortName': 'tr-TR-EmelNeural',
      'DisplayName': 'Emel',
      'Gender': 'Female',
      'Locale': 'tr-TR'
    },
    {
      'LocalName': 'Остап',
      'ShortName': 'uk-UA-OstapNeural',
      'DisplayName': 'Ostap',
      'Gender': 'Male',
      'Locale': 'uk-UA'
    },
    {
      'LocalName': 'Поліна',
      'ShortName': 'uk-UA-PolinaNeural',
      'DisplayName': 'Polina',
      'Gender': 'Female',
      'Locale': 'uk-UA'
    },
    {
      'LocalName': 'گل',
      'ShortName': 'ur-IN-GulNeural',
      'DisplayName': 'Gul',
      'Gender': 'Female',
      'Locale': 'ur-IN'
    },
    {
      'LocalName': 'سلمان',
      'ShortName': 'ur-IN-SalmanNeural',
      'DisplayName': 'Salman',
      'Gender': 'Male',
      'Locale': 'ur-IN'
    },
    {
      'LocalName': 'اسد',
      'ShortName': 'ur-PK-AsadNeural',
      'DisplayName': 'Asad',
      'Gender': 'Male',
      'Locale': 'ur-PK'
    },
    {
      'LocalName': 'عظمیٰ',
      'ShortName': 'ur-PK-UzmaNeural',
      'DisplayName': 'Uzma',
      'Gender': 'Female',
      'Locale': 'ur-PK'
    },
    {
      'LocalName': 'Madina',
      'ShortName': 'uz-UZ-MadinaNeural',
      'DisplayName': 'Madina',
      'Gender': 'Female',
      'Locale': 'uz-UZ'
    },
    {
      'LocalName': 'Sardor',
      'ShortName': 'uz-UZ-SardorNeural',
      'DisplayName': 'Sardor',
      'Gender': 'Male',
      'Locale': 'uz-UZ'
    },
    {
      'LocalName': 'Hoài My',
      'ShortName': 'vi-VN-HoaiMyNeural',
      'DisplayName': 'HoaiMy',
      'Gender': 'Female',
      'Locale': 'vi-VN'
    },
    {
      'LocalName': 'Nam Minh',
      'ShortName': 'vi-VN-NamMinhNeural',
      'DisplayName': 'NamMinh',
      'Gender': 'Male',
      'Locale': 'vi-VN'
    },
    {
      'LocalName': '晓彤',
      'ShortName': 'wuu-CN-XiaotongNeural',
      'DisplayName': 'Xiaotong',
      'Gender': 'Female',
      'Locale': 'wuu-CN'
    },
    {
      'LocalName': '云哲',
      'ShortName': 'wuu-CN-YunzheNeural',
      'DisplayName': 'Yunzhe',
      'Gender': 'Male',
      'Locale': 'wuu-CN'
    },
    {
      'LocalName': '晓敏',
      'ShortName': 'yue-CN-XiaoMinNeural',
      'DisplayName': 'XiaoMin',
      'Gender': 'Female',
      'Locale': 'yue-CN'
    },
    {
      'LocalName': '云松',
      'ShortName': 'yue-CN-YunSongNeural',
      'DisplayName': 'YunSong',
      'Gender': 'Male',
      'Locale': 'yue-CN'
    },
    {
      'LocalName': '晓晓',
      'ShortName': 'zh-CN-XiaoxiaoNeural',
      'DisplayName': 'Xiaoxiao',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '云扬',
      'ShortName': 'zh-CN-YunyangNeural',
      'DisplayName': 'Yunyang',
      'Gender': 'Male',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓辰',
      'ShortName': 'zh-CN-XiaochenNeural',
      'DisplayName': 'Xiaochen',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓涵',
      'ShortName': 'zh-CN-XiaohanNeural',
      'DisplayName': 'Xiaohan',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓墨',
      'ShortName': 'zh-CN-XiaomoNeural',
      'DisplayName': 'Xiaomo',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓秋',
      'ShortName': 'zh-CN-XiaoqiuNeural',
      'DisplayName': 'Xiaoqiu',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓睿',
      'ShortName': 'zh-CN-XiaoruiNeural',
      'DisplayName': 'Xiaorui',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓双',
      'ShortName': 'zh-CN-XiaoshuangNeural',
      'DisplayName': 'Xiaoshuang',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓萱',
      'ShortName': 'zh-CN-XiaoxuanNeural',
      'DisplayName': 'Xiaoxuan',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓颜',
      'ShortName': 'zh-CN-XiaoyanNeural',
      'DisplayName': 'Xiaoyan',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '晓悠',
      'ShortName': 'zh-CN-XiaoyouNeural',
      'DisplayName': 'Xiaoyou',
      'Gender': 'Female',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '云希',
      'ShortName': 'zh-CN-YunxiNeural',
      'DisplayName': 'Yunxi',
      'Gender': 'Male',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '云野',
      'ShortName': 'zh-CN-YunyeNeural',
      'DisplayName': 'Yunye',
      'Gender': 'Male',
      'Locale': 'zh-CN'
    },
    {
      'LocalName': '曉曼',
      'ShortName': 'zh-HK-HiuMaanNeural',
      'DisplayName': 'HiuMaan',
      'Gender': 'Female',
      'Locale': 'zh-HK'
    },
    {
      'LocalName': '曉佳',
      'ShortName': 'zh-HK-HiuGaaiNeural',
      'DisplayName': 'HiuGaai',
      'Gender': 'Female',
      'Locale': 'zh-HK'
    },
    {
      'LocalName': '雲龍',
      'ShortName': 'zh-HK-WanLungNeural',
      'DisplayName': 'WanLung',
      'Gender': 'Male',
      'Locale': 'zh-HK'
    },
    {
      'LocalName': '曉臻',
      'ShortName': 'zh-TW-HsiaoChenNeural',
      'DisplayName': 'HsiaoChen',
      'Gender': 'Female',
      'Locale': 'zh-TW'
    },
    {
      'LocalName': '曉雨',
      'ShortName': 'zh-TW-HsiaoYuNeural',
      'DisplayName': 'HsiaoYu',
      'Gender': 'Female',
      'Locale': 'zh-TW'
    },
    {
      'LocalName': '雲哲',
      'ShortName': 'zh-TW-YunJheNeural',
      'DisplayName': 'YunJhe',
      'Gender': 'Male',
      'Locale': 'zh-TW'
    },
    {
      'LocalName': 'Thando',
      'ShortName': 'zu-ZA-ThandoNeural',
      'DisplayName': 'Thando',
      'Gender': 'Female',
      'Locale': 'zu-ZA'
    },
    {
      'LocalName': 'Themba',
      'ShortName': 'zu-ZA-ThembaNeural',
      'DisplayName': 'Themba',
      'Gender': 'Male',
      'Locale': 'zu-ZA'
    }
  ],
  fonts: [
    {
      name: 'System',
      system: ['win', 'mac']
    },
    {
      name: 'Lora',
      system: ['win', 'mac']
    },
    {
      name: 'NotoSerif',
      system: ['win', 'mac']
    },
    {
      name: 'Crimson',
      system: ['win', 'mac']
    },
    {
      name: 'Georgia',
      system: ['win', 'mac']
    },
    {
      name: 'Roboto',
      system: ['win', 'mac']
    },
    {
      name: 'STKaiti',
      system: ['win', 'mac']
    },
    {
      name: 'STSong',
      system: ['win', 'mac']
    }
  ],
  themes: [
    {
      theme: 'default',
      autoTheme: 'day',
      mainColor: '#ffffff',
      bgColor: '#f6f6f6',
      fontColor: '#111111',
      linkColor: '#000000'
      // codeBgColor: '#f5f5f5',
    },
    {
      theme: 'yellow',
      autoTheme: 'day',
      mainColor: '#ffeecd',
      bgColor: '#f7e7c7',
      fontColor: '#4f321c',
      linkColor: '#3f2816'
      // codeBgColor: '#f5f5f5',
    },
    {
      theme: 'green',
      autoTheme: 'day',
      mainColor: '#CEE0D5',
      bgColor: '#C2D3C9',
      fontColor: '#333333',
      linkColor: '#333333'
      // codeBgColor: '#f5f5f5',
    },
    {
      theme: 'gray',
      autoTheme: 'night',
      mainColor: '#3c3c3c',
      bgColor: '#323233',
      fontColor: '#eeeeee',
      linkColor: '#ffffff'
      // codeBgColor: '#f5f5f5',
    },
    {
      theme: 'black',
      autoTheme: 'night',
      mainColor: '#151515',
      bgColor: '#111111',
      fontColor: '#eeeeee',
      linkColor: '#ffffff'
      // codeBgColor: '#555557',
    },
    {
      theme: 'aged',
      // pro: true,
      mainColor: '#ffe8bc69',
      bgColor: '#efe4ce',
      bgImg: '__MSG_@@extension_id__/assets/img/aged.jpg',
      fontColor: '#4f321c',
      linkColor: '#3f2816'
    },
    {
      theme: ' texture',
      autoTheme: 'day',
      // pro: true,
      mainColor: '#ffffff99',
      bgColor: '#f6f6f6',
      bgImg: '__MSG_@@extension_id__/assets/img/texture.jpg',
      fontColor: '#111111',
      linkColor: '#000000'
    },
    {
      theme: 'winter',
      autoTheme: 'day',
      // pro: true,
      mainColor: '#ffffff99',
      bgColor: '#f6f6f6',
      bgImg: '__MSG_@@extension_id__/assets/img/snowmoutain.jpg',
      fontColor: '#111111',
      linkColor: '#000000'
    }

  ]
}

const ClearlyEnv = window.ClearlyEnv || {}
  ; (function(ctx) {
  ctx.clearlyApp = new ClearlyApp(ClearlyEnv)
})(ClearlyEnv.debug ? window : {})

function debug() {
  if (!ClearlyEnv.debug) return
  const args = Array.prototype.slice.call(arguments, 0)
  console.debug.apply(null, ['CLEARY* |'].concat(args))
}

Sentry.init({
  dsn: 'https://3aebb481a638417da34abd41a070f02b@o83346.ingest.sentry.io/4504461258915840',
  release: ClearlyEnv.version || 'development',
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1
})
