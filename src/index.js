'use strict';
function grayMapFactory(esriBundle) {
    return function (element) {
        console.info('made a map');
        return esriBundle.Map(element, { basemap: 'gray', zoom: 6, center: [-100, 50] });
    };
}

function initAll(esriBundle) {
    return {
        grayMap: grayMapFactory(esriBundle)
    };
}

module.exports = function (esriLoaderUrl, window) {

    // esriDeps is an array pairing ESRI JSAPI dependencies with their imported names
    // in esriBundle
    const esriDeps = [
        ['esri/map', 'Map'],
        ['esri/layers/FeatureLayer', 'FeatureLayer'],
        ['esri/layers/GraphicsLayer', 'GraphicsLayer'],
        ['esri/layers/WMSLayer', 'WmsLayer'],
    ];

    function makeDojoRequests() {
        return new Promise(function (resolve, reject) {
            window.require(esriDeps.map(deps => deps[0]), function () {
                const esriBundle = {};

                // iterate over arguments to avoid creating an ugly giant function call
                // arguments is not an array so we do this the hard way
                for (let i = 0; i < arguments.length; ++i) {
                    esriBundle[esriDeps[i][1]] = arguments[i];
                }
                resolve(esriBundle);
            });
            window.require.on('error', reject);
        });
    }

    return new Promise(function (resolve, reject) {
        const oScript = window.document.createElement('script');
        const oHead = window.document.head || window.document.getElementsByTagName('head')[0];

        oScript.type = 'text\/javascript';
        oScript.onerror = err => reject(err);
        oScript.onload = () => resolve();
        oHead.appendChild(oScript);
        oScript.src = esriLoaderUrl; //'//ec.cloudapp.net/~aly/esri/dojo/dojo.js';
        console.log('made a promise');
    }).then(makeDojoRequests).then(initAll);
};
