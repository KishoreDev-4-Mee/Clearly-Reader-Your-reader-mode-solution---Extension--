import { E as EVENT_TYPE, c as client, M as Messenger, Z as getUserConfig, _ as saveUserConfig, b as debug, $ as logout } from './chunks/client-72dd7af9.js';

const DEFAULT_READER_CONFIG = {
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
};

// import axios from 'axios'
// import '@types/chrome'
const MANIFEST$1 = chrome.runtime.getManifest();
async function getToken() {
    const config = await getUserConfig();
    return config.accountToken;
}
async function request(fn, data, options) {
    const endpoint = 'https://api.clearlyreader.com';
    const token = await getToken();
    debug('fetch', `${endpoint}/api/${fn}`, data, JSON.stringify(data), token, MANIFEST$1.version);
    return fetch(`${endpoint}/api/${fn}`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
        headers: options?.headers || {
            'content-type': 'application/json',
            'x-clearly-token': token,
            'x-clearly-version': MANIFEST$1.version,
            'x-clearly-app': 'extension'
        }
    })
        .then(async (res) => {
        const json = await res.json();
        debug('fetch response', `${endpoint}/api/${fn}`, json);
        return json;
    })
        .catch(err => {
        return { code: 'API_ERR', message: err.message };
    });
}

class BackgroundMessenger extends Messenger {
    async sendMessage(message, receiver, current = true) {
        if (!receiver) {
            if (current) {
                client.getCurrentTab().then((result) => {
                    if (!result?.id)
                        return;
                    return chrome.tabs.sendMessage(result.id, message);
                }).catch((e) => {
                    console.log('get tab failed', e);
                });
            }
            else {
                const tabs = await client.getAllTabs();
                tabs?.forEach(tab => {
                    if (!tab.id)
                        return;
                    chrome.tabs.sendMessage(tab.id, message);
                });
            }
            return;
        }
        try {
            return await chrome.tabs.sendMessage(receiver, message);
        }
        catch (e) {
            console.log('send message failed from background', e);
        }
    }
}
const backgroundMessenger = new BackgroundMessenger();
backgroundMessenger.on(EVENT_TYPE.FORWARD, (message) => {
    let receiver = message?.data?.receiver;
    if (!receiver) {
        client.getCurrentTab().then((result) => {
            if (!result?.id)
                return;
            receiver = result.id;
            backgroundMessenger.sendMessage(receiver, message.data.message);
        }).catch((e) => {
            console.log('get tab failed', e);
        });
        return;
    }
    backgroundMessenger.sendMessage(receiver, message.data.message);
});

const config = {
    scheme: 'clearly/v22',
    version: '230209',
    showWebApp: false,
    websites: {
        'nytimes.com/': {
            authorName: ['.last-byline'],
            ignoreElements: ['[data-testid=photoviewer-overlay]'],
        },
        'medium.com/': {
            authorName: ['.pw-author a'],
            contentElem: 'section'
        },
        'tumblr.com/': {
            authorName: [/"author":"(.*?)"/]
        },
        'zhuanlan.zhuanlan.zhihu.com/': {
            authorName: ['.AuthorInfo-content .UserLink-link']
        },
        'zhihu.com/question/': {
            contentType: 'qa',
            contentElem: '.QuestionPage',
            extractElems: ['.QuestionRichText', '.RichContent-inner'],
            extractElemsJoiner: '<hr>'
        },
        'jianshu.com/': {
            contentElem: 'section article',
            authorName: ['section span a']
        },
        'csdn.net/': {
            contentElem: 'article',
            authorName: ['.follow-nickName']
        },
        'techcrunch.com/': {
            authorName: ['.article__byline a'],
            contentElem: '.article-content'
        },
        'digitaltrends.com/': {
            authorName: ['a.author']
        },
        'theverge.com/': {
            authorName: ['.c-byline__author-name'],
            contentElem: '.duet--article--article-body-component-container'
        },
        'nbcnews.com/': {
            authorName: ['.byline-name a']
        },
        'huffpost.com/': {
            authorName: ['.entry-wirepartner__byline']
        },
        'reuters.com/': {
            authorName: ['[rel=author]']
        },
        'cnn.com/': {
            authorName: ['.metadata__byline__author a']
        },
        'foxnews.com/': {
            authorName: ['.author-byline a']
        },
        'washingtonpost.com/': {
            authorName: ['a.author-name']
        },
        'wsj.com/': {
            authorName: ['a.author-name'],
            contentElem: '.article-content'
        },
        'abcnews.go.com/': {
            authorName: ['.Byline__Author']
        },
        'bbc.com/': {
            authorName: ['article header strong']
        },
        'mashable.com/': {
            contentElem: 'main article',
            authorName: ['h1 ~ div .underline-link']
        },
        'vox.com/': {
            authorName: ['.c-byline__author-name']
        },
        'cnet.com/': {
            authorName: ['.c-globalAuthor_link']
        },
        'engadget.com/': {
            authorName: ['[data-component="VerticalAuthorInfo"] a[class*=engadgetSteelGray]']
        },
        'entertainment14.net/': {
            titleElem: '.entry-title',
            contentElem: '.entry-content'
        },
        'mp.weixin.qq.com/': {
            authorName: ['.rich_media_meta_text'],
            contentElem: '.rich_media_content '
        },
        'sspai.com/': {
            authorName: ['.nickname'],
            contentElem: '.content'
        },
        'woshipm.com/': {
            authorName: ['.ui-captionStrong']
        },
        '36kr.com/': {
            authorName: ['.title-icon-item']
        },
        'infzm.com/': {
            authorName: ['.nfzm-content__author']
        },
        'cnbeta.com/': {
            authorName: ['.source']
        },
        'huxiu.com/': {
            authorName: ['.author-info__username']
        },
        'sciencedirect.com/': {
            contentElem: 'article'
        },
        'wattpad.com/': {
            contentElem: '.part-content pre'
        },
        'pcmag.com/': {
            contentElem: 'article'
        },
        'cntraveler.com/gallery': {
            contentElem: '[data-attribute-verso-pattern="gallery-body"]'
        },
        'plato.stanford.edu/entries': {
            contentElem: '#article'
        },
        'utgd.net/': {
            contentElem: '.content-inner'
        },
        'wikipedia.org/wiki/': {
            contentElem: '#mw-content-text'
        },
        'officesnapshots.com/': {
            contentElem: '.post',
            excludeElems: ['.photo-sidebar', '.signup-modal-button', '.tooltip-garage']
        },
        'yuque.com/': {
            contentElem: '.ne-viewer-body',
            excludeElems: ['.ne-ui-image-ocr-mask', '.ne-ui-image-inner-button-wrap']
        },
        'lifehacker.com/': {
            contentElem: '.js_post-content',
            excludeElems: ['.js_related-stories-inset', '.instream-native-video', '#sidebar_wrapper', '.js_ad-dynamic', '.js_commerce-inset-permalink', '.ad-unit', '.ad-mobile']
        },
        'lifewire.com/': {
            contentElem: '.structured-content'
        },
        'mondiplo.com/': {
            contentElem: '#content'
        },
        'stackoverflow.com/questions/': {
            contentType: 'qa',
            contentElem: '#mainbar',
            extractElems: ['.js-post-body'],
            extractElemsJoiner: '<hr>'
        },
        'segmentfault.com/q/': {
            contentType: 'qa',
            contentElem: '#questionMain',
            extractElems: ['.article-content'],
            extractElemsJoiner: '<hr>'
        },
        'github.com/*/*/issues/': {
            contentType: 'discussion',
            contentElem: '.Layout-main',
            extractElems: ['.comment-body'],
            extractElemsJoiner: '<hr>'
        },
        'github.com/*/*/discussions/': {
            contentType: 'discussion',
            contentElem: '.discussion',
            extractElems: ['.comment-body'],
            extractElemsJoiner: '<hr>'
        },
        'github.com/*/*/wiki': {
            contentElem: '.Layout-main'
        },
        'reddit.com/r/*/comments': {
            contentType: 'discussion',
            contentElem: 'div[tabindex="0"] + div',
            extractElems: ['.RichTextJSON-root', '[testid="comment"]'],
            extractElemsJoiner: '<hr>'
        },
        'developer.aliyun.com/article/': {
            contentElem: '.article-inner'
        },
        'cloud.tencent.com/developer/article/': {
            contentElem: '.J-articleContent'
        },
        'www.youtube.com/': {
            readable: false
        },
        'accounts.google.com/': {
            readable: false
        },
        'myaccount.google.com/': {
            readable: false
        },
        'translate.google.com/': {
            readable: false
        },
        'mail.google.com/': {
            readable: false
        },
        'drive.google.com/': {
            readable: false
        },
        'docs.google.com/': {
            readable: false
        },
        'spreadsheet.google.com/': {
            readable: false
        }
    }
};

let background;
// import * as Sentry from '@sentry/browser'
function ga(action, v, url, d) {
    const args = [action, v, url, d].filter(item => item).map(item => {
        if (typeof item !== 'string') {
            return JSON.stringify(item);
        }
        return item;
    });
    if (background) {
        background.execute(EVENT_TYPE.GA, args);
    }
}
const MANIFEST = chrome.runtime.getManifest();
class ApiError extends Error {
    code = '';
}
class Background {
    uuid = '';
    speakTabId = 0;
    currentTabId = 0;
    manifest;
    CLEARLY_CONFIG = {};
    constructor() {
        this.init();
    }
    execute(eventName, args, current = true) {
        backgroundMessenger.sendMessage({
            event: eventName,
            data: args
        }, undefined, current);
    }
    /**
       * Get full config
       *
       * @param {*} data
       * @returns
       */
    async getConfig(data) {
        return {
            clearlyConfig: this.CLEARLY_CONFIG,
            readerConfig: { ...DEFAULT_READER_CONFIG, ...await getUserConfig() },
            client: {
                app: 'extension',
                version: MANIFEST.version
            },
            autoOpen: await this.getAutoOpen(data)
        };
    }
    updateClearlyConfig() {
        return this.api('getChromeConfig', { version: this.CLEARLY_CONFIG ? this.CLEARLY_CONFIG.version : null })
            .then(data => {
            if (this.CLEARLY_CONFIG.scheme === data.scheme) {
                this.CLEARLY_CONFIG = data;
                chrome.storage.local.set({ 'system-config': this.CLEARLY_CONFIG });
                return this.CLEARLY_CONFIG;
            }
            return false;
        })
            .catch(_ => false);
    }
    getClearlyConfig() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['clearly-config'], (result) => {
                if (!result['clearly-config']) {
                    return this.updateClearlyConfig().then(config => resolve(config));
                }
                resolve(result['clearly-config']);
            });
        });
    }
    getAutoOpen({ url }) {
        if (!url)
            return false;
        const urlObj = new URL(url);
        const site = urlObj.hostname;
        const dir = '/' + urlObj.pathname.split('/')[1];
        const availableOptions = [
            { mode: '', value: 'off' },
            { mode: 'site', value: '(this site)' },
            { mode: 'dir', value: '(this site)' + dir }
        ];
        if (dir === '/') {
            availableOptions.pop();
        }
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([`auto-rule.${site}`], (result) => {
                const value = result[`auto-rule.${site}`] || '';
                let ret;
                if (value.includes(dir + '|'))
                    ret = { ...availableOptions[2], availableOptions };
                else if (value === '*')
                    ret = { ...availableOptions[1], availableOptions };
                else
                    ret = { ...availableOptions[0], availableOptions };
                resolve(ret);
            });
        });
    }
    setAutoOpen({ url, mode = 'site' }) {
        if (!url)
            return false;
        const urlObj = new URL(url);
        const site = urlObj.hostname;
        const dir = '/' + urlObj.pathname.split('/')[1];
        const key = `auto-rule.${site}`;
        console.debug('setAutoOpen ready', key, mode, site, dir);
        const availableOptions = [
            { mode: '', value: 'off' },
            { mode: 'site', value: site },
            { mode: 'dir', value: site + dir }
        ];
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([key], (result) => {
                let value = result[key] || '';
                let ret;
                if (mode === 'site') {
                    value = '*';
                    ret = { ...availableOptions[1], availableOptions };
                }
                else if (mode === 'dir') {
                    value = value + dir + '|';
                    ret = { ...availableOptions[2], availableOptions };
                }
                else {
                    value = false;
                    ret = { ...availableOptions[0], availableOptions };
                }
                console.debug('setAutoOpen storage', key, value, ret);
                if (value) {
                    chrome.storage.local.set({ [key]: value });
                }
                else {
                    chrome.storage.local.remove(key);
                }
                resolve(ret);
            });
        });
    }
    /**
     * Submit feedback
     *
     * @param {Object} data
     */
    submitFeedback(data) {
        return this.api('submitFeedback', data);
    }
    // Get system fonts
    getSystemFonts() {
        return new Promise((resolve, reject) => {
            chrome.fontSettings.getFontList(resolve);
        });
    }
    // callBackground 要用到
    async getUserConfig() {
        return await getUserConfig();
    }
    async saveUserConfig(config) {
        return await saveUserConfig(config);
    }
    // callBackground 要用到
    async logout() {
        debug('logout');
        await logout();
        this.onLogout();
    }
    showEditShortcuts() {
        chrome.tabs.create({
            url: 'chrome://extensions/shortcuts'
        });
    }
    /**
     * Update icon
     *
     * @param {*} data
     */
    updateIcon({ status, tabId }) {
        status = status || 'default';
        chrome.action.setIcon({
            path: {
                16: `/assets/icons/${status}/ic_16.png`,
                32: `/assets/icons/${status}/ic_32.png`,
                48: `/assets/icons/${status}/ic_48.png`,
                128: `/assets/icons/${status}/ic_128.png`
            },
            tabId
        });
    }
    /**
     * Detect language
     *
     * @param {Object} data
     */
    detectLanguage({ tabId }) {
        return new Promise((resolve, reject) => {
            chrome.tabs.detectLanguage(tabId, lang => {
                if (chrome.runtime.lastError)
                    resolve(null);
                resolve(lang);
            });
        });
    }
    /**
     * Toggle clearly
     */
    toggle() {
        this.execute(EVENT_TYPE.TOGGLE);
    }
    saveToQueue() {
        this.execute(EVENT_TYPE.SAVE_TO_QUEUE);
    }
    async callApi({ fn, data }) {
        return request(fn, data);
    }
    /**
       * Call server api
       *
       * @param {String} fn
       * @param {Object} data
       */
    async api(fn, data) {
        return this.callApi({ fn, data })
            .then(res => {
            if (!res || (res.code && res.code === 'OK') || !res.data) {
                if (res && ['INVALID_TOKEN', 'AUTH_REQUIRED'].includes(res.code)) {
                    saveUserConfig({
                        accountEmail: null,
                        accountToken: null,
                        accountPlanId: null,
                        syncAt: null
                    });
                }
                const err = new ApiError(`api error: ${res.code}`);
                err.code = res.code;
                // err.code = res.code
                throw err;
            }
            const data = res.data;
            return data;
        });
    }
    loginFromToken({ token }) {
        return request('refreshToken', { force: true }, {
            headers: {
                'content-type': 'application/json',
                'x-clearly-token': token,
                'x-clearly-version': this.manifest?.version,
                'x-clearly-app': 'extension'
            }
        }).then((res) => {
            const data = res.data;
            if (data && data.token) {
                const config = {
                    accountEmail: data.email,
                    accountToken: data.token,
                    accountPlanId: data.planId,
                    accountPlanExpiredAt: data.planExpiredAt
                };
                saveUserConfig(config);
                this.onLogin();
                return config;
            }
        });
    }
    async onLogin() {
        this.execute(EVENT_TYPE.ON_LOGIN, [], false);
    }
    async onLogout() {
        this.execute(EVENT_TYPE.ON_LOGOUT, [], false);
    }
    async refreshToken(update) {
        const userConfig = await getUserConfig();
        if (!userConfig || !userConfig.accountToken)
            return false;
        return this.api('refreshToken').then(data => {
            if (data && data.token) {
                const config = {
                    accountEmail: data.email,
                    accountToken: data.token,
                    accountPlanId: data.planId,
                    accountPlanExpiredAt: data.planExpiredAt
                };
                if (update) {
                    saveUserConfig(config);
                    this.onLogin();
                }
                return config;
            }
        });
    }
    /**
     * Send mesasge to content and app
     *
     * @param {Object} data
     * @returns
     */
    sendMessage(data) {
        if (!this.speakTabId)
            return;
        chrome.tabs.get(this.speakTabId, (tab) => {
            if (!tab) {
                console.warn(`tab ${this.speakTabId}`);
                return;
            }
            chrome.tabs.sendMessage(this.speakTabId, { ...data, frame: true });
            if (chrome.runtime.lastError) {
                console.debug('lastError', chrome.runtime.lastError.message);
            }
        });
    }
    /**
     * Receive message and dispatch
     *
     * @param {Object} request
     * @param {Object} sender
     * @param {Object} sendResponse
     * @returns
     */
    handleMessage(request, sender, sendResponse) {
        console.debug('handleMessage', request);
        const tabId = sender.tab && sender.tab.id;
        if (typeof this[request.type] === 'function') {
            console.log('request data', { ...request, tabId });
            const ret = this[request.type]({ ...request, tabId });
            if (ret instanceof Promise) {
                ret.then(result => sendResponse({ result }))
                    .catch(error => sendResponse({ error: error.message }));
                return true;
            }
            else {
                sendResponse(ret);
            }
        }
    }
    /**
     * Register chrome
     */
    init() {
        this.manifest = MANIFEST;
        console.log('init background');
        if (chrome.tts) {
            chrome.tts.isSpeaking((speaking) => {
                if (speaking)
                    chrome.tts.stop();
            });
        }
        if (chrome.contextMenus) {
            chrome.contextMenus.removeAll();
            chrome.contextMenus.onClicked.addListener((info, tab) => {
                console.log('menu', info, tab);
                if (info.menuItemId === 'open-clearly') {
                    ga('send', 'event', 'App', 'Open with context');
                    this.toggle();
                }
                if (info.menuItemId === 'clip-selection') {
                    this.execute(EVENT_TYPE.CLIP_MARK, info.selectionText);
                }
                if (info.menuItemId === 'clip-image') {
                    this.execute(EVENT_TYPE.CLIP_IMAGE, info.srcUrl);
                }
                if (info.menuItemId === 'open-with-clearly') {
                    chrome.tabs.create({
                        url: info.linkUrl + '#clearly'
                    });
                }
            });
            chrome.contextMenus.create({
                id: 'clip-selection',
                title: 'Clip Selection',
                contexts: ['selection']
            });
            chrome.contextMenus.create({
                id: 'clip-image',
                title: 'Clip Image',
                contexts: ['image']
            });
            chrome.contextMenus.create({
                id: 'open-clearly',
                title: 'Open Clearly',
                contexts: ['page', 'selection', 'image', 'video'],
                documentUrlPatterns: ['http://*/*', 'https://*/*']
            });
            chrome.contextMenus.create({
                id: 'open-with-clearly',
                title: 'Open with Clearly',
                contexts: ['link'],
            });
        }
        // chrome.commands.onCommand.addListener((command) => {
        //   switch (command) {
        //     case 'toggle':
        //       ga('send', 'event', 'App', 'Open with shortcut')
        //       this.toggle()
        //       break
        //   }
        // })
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        chrome.action.onClicked.addListener(() => {
            ga('send', 'event', 'App', 'Open with icon');
            // this.saveToQueue()
            this.toggle();
        });
        // Init
        // chrome.tabs.query({ lastFocusedWindow: true, active: true }, (tabs) => {
        //   if (!tabs[0]) return
        //   this.currentTabId = tabs[0].id
        // })
        // Update
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            console.debug('TAB UPDATE', { tabId, changeInfo });
            if (changeInfo.status === 'loading') {
                // $('#menu-speak').removeClass('menu-actived')
                // $('#menu-speak-icon').addClass('ri-volume-down-line')
                // $('#menu-speak-icon').removeClass('ri-volume-mute-fill')
                // if (this.config.speechMSEngine) {
                //   this.speechMSPlayer && this.speechMSPlayer.pause()
                //   this.speechMSWords = []
                // } else {
                //   window.speechSynthesis.cancel()
                // }
                tabId === this.speakTabId && chrome.tts.stop();
            }
        });
        chrome.tabs.onRemoved.addListener(tabId => {
            console.debug('TAB REMOVE', { tabId });
            if (tabId === this.speakTabId) {
                chrome.tts.stop();
            }
        });
        chrome.tabs.onActivated.addListener(tabInfo => {
            console.debug('TAB ACTIVATED', tabInfo);
            this.currentTabId = tabInfo.tabId;
        });
        chrome.runtime.onInstalled.addListener(details => {
            if (details.reason === 'install') {
                chrome.tabs.create({ url: 'https://clearlyreader.com/r/install?v=' + this.manifest?.version, selected: true });
            }
            else if (details.reason === 'update') ;
        });
        chrome.runtime.setUninstallURL('https://clearlyreader.com/r/uninstall?v=' + this.manifest.version);
        this.setup();
    }
    /**
       * Setup
       */
    async setup() {
        ga('create', 'UA-92398359-4', 'auto');
        ga('set', 'checkProtocolTask', null);
        chrome.storage.local.get('uuid', (data) => {
            let uuid = data.uuid;
            if (!uuid) {
                uuid = Background.uuidv4();
                chrome.storage.local.set({ uuid });
            }
            this.uuid = uuid;
            if (this.uuid) {
                ga('set', 'userId', this.uuid);
            }
        });
        if (this.uuid) {
            ga('set', 'userId', this.uuid);
        }
        ga('send', 'pageview', { page: '/exteension/' + this.manifest?.version });
        this.CLEARLY_CONFIG = config;
        console.debug('clearly config version', this.CLEARLY_CONFIG.version);
        this.updateClearlyConfig();
        this.getUserConfig();
        this.refreshToken(true);
    }
    /**
       * Get google token
       */
    static googleToken() {
        return Math.random().toString().substr(2, 7) + '.' + Math.random().toString().substr(2, 7);
    }
    static uuidv4() {
        return ('' + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }
    /**
       * Build hash
       * @param {String} str
       */
    static hashCode(str) {
        let hash = 0;
        let i;
        let chr;
        if (str.length === 0)
            return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
    /**
       * Bootstrap
       */
    static bootstrap() {
        return new Background();
    }
}
background = new Background();
// background = new Background()
// export default background
