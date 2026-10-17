const QuasarLoadedResources = new Set();

async function QuasarHtmlDom(whom, where) {
    const GeneralTemplateModule = await import (`../components/general.js`);
    let templateModule = null;
    try{
        templateModule = await import (`../components/${whom}.js`)
    } catch (e) {
        templateModule = null
    }
    // Race Condition Error Bypass
    const QuasarWaitForElementPromise = (selector, timeout = 10000) => {
        return new Promise((resolve) => {

            const QuasarWaitForElement = document.querySelector(selector);
            if (QuasarWaitForElement) return resolve(QuasarWaitForElement);

            const observer = new MutationObserver(() => {
                const target = document.querySelector(selector);
                if (target) {observer.disconnect();resolve(target);}
            });

            observer.observe(document.documentElement, {childList: true, subtree: true});

            setTimeout(() => {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }, timeout);

        });
    };

    async function QuasarInit() {
        const targetElement = await QuasarWaitForElementPromise(where);
        if (targetElement) targetElement.innerHTML = templateModule ? templateModule['template'] : GeneralTemplateModule['QuasarErrorWhom'];
    }

    // Hydration Error Bypass
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', QuasarInit);
    } else {
        QuasarInit();
    }
}

async function QuasarScriptorium(whom, where, css, js) {
    if (css && css !== 'null' && !QuasarLoadedResources.has(css)) {
        let staticStyle = document.createElement('link');
        staticStyle.className = "quasar-static-css";
        staticStyle.rel = "stylesheet";
        staticStyle.as = "style";
        staticStyle.href = css;
        document.head.appendChild(staticStyle);
        QuasarLoadedResources.add(css);
    }
    if (whom && where && whom !== 'null' && where !== 'null') {
        await QuasarHtmlDom(whom, where)
    }
    if (js && js !== 'null' && !QuasarLoadedResources.has(js)) {
        let staticJs = document.createElement('script');
        staticJs.className = "quasar-static-js";
        staticJs.src = js;
        document.body.appendChild(staticJs);
        QuasarLoadedResources.add(js);
    }
}

const QuasarElements = document.querySelectorAll('[quasar-observer]');

const QuasarScriptoriumObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const QuasarKetterdam = entry.target.getAttribute('quasar-observer');
            if (QuasarKetterdam) {
                const [whom, where, css, js] = QuasarKetterdam.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                QuasarScriptorium(whom, where, css, js);
                entry.target.removeAttribute('quasar-observer');
            }
            observer.unobserve(entry.target);
        }
    });
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {QuasarElements.forEach(o => QuasarScriptoriumObserver.observe(o))});
} else {
    QuasarElements.forEach(o => QuasarScriptoriumObserver.observe(o))
}