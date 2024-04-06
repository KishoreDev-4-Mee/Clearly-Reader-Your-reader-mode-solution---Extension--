(function () {

	const importPath = /*@__PURE__*/ JSON.parse('"content-script/index.js"');

	import(chrome.runtime.getURL(importPath));

})();
