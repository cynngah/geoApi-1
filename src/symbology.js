/* jshint maxcomplexity: false */
'use strict';

/**
* Will generate a symbology config node for a ESRI feature service.
* Uses the information from the feature layers renderer JSON definition
*
* @param {Object} renderer renderer object from feature layer endpoint
* @param {Object} legend object that maps legend label to data url of legend image
* @returns {Object} an JSON config object for feature symbology
*/
function createSymbologyConfig(renderer, legend) {
    // getting renderer class type from prototype object and get rid of unnecessary prefixes with split
    const symbArr = Object.getPrototypeOf(renderer).declaredClass.split('\.');

    // TODO: Change the way you get declared class; seems like it'd be easy to break if they change stuff;
    const symbType = symbArr[2];
    const symb = {
        type: symbType
    };

    const legendLookup = labelObj(legend);

    switch (symb.type) {
        case 'SimpleRenderer':
            symb.label = renderer.label;
            symb.imageUrl = legendLookup[renderer.label].icon;

            break;

        case 'UniqueValueRenderer':
            if (renderer.defaultLabel) {
                symb.defaultImageUrl = legendLookup[renderer.defaultLabel];
            }
            symb.field1 = renderer.attributeField;
            symb.field2 = renderer.attributeField2;
            symb.field3 = renderer.attributeField3;
            symb.valueMaps = renderer.infos.map(uvi => {
                return {
                    label: uvi.label,
                    value: uvi.value,
                    imageUrl: legendLookup[uvi.label].icon
                };
            });

            break;
        case 'ClassBreaksRenderer':
            if (renderer.defaultLabel) {
                symb.defaultImageUrl = legendLookup[renderer.defaultLabel];
            }
            symb.field = renderer.attributeField;
            symb.minValue = renderer.infos[0].minValue;
            symb.rangeMaps = renderer.infos.map(cbi => {
                return {
                    label: cbi.label,
                    maxValue: cbi.maxValue,
                    imageUrl: legendLookup[cbi.label].icon
                };
            });

            break;
        default:

            // Renderer we dont support
            console.log('encountered unsupported renderer type: ' + symb.type);

        // TODO make a stupid basic renderer to prevent things from breaking?
    }

    return symb;
}

/**
* Given a feature data object return the image URL for that feature/graphic object.
*
* @method getGraphicIcon
* @param {Object} fData feature data object
* @param {Object} layerConfig layer config for feature
* @param {Integer} oid of attribute that needs icon fetching
* @return {String} imageUrl Url to the features symbology image
*/
function getGraphicIcon(fData, layerConfig, oid) {
    const symbolConfig = layerConfig;
    let img = '';
    let graphicKey;

    // find node in layerregistry.attribs
    switch (symbolConfig.type) {
        case 'SimpleRenderer':
            return symbolConfig.imageUrl;

        case 'UniqueValueRenderer':
            const oidIdx = fData.oidIndex[oid];

            // make a key value for the graphic in question, using comma-space delimiter if multiple fields
            graphicKey = fData.features[oidIdx].attributes[symbolConfig.field1];

            // all key values are stored as strings.  if the attribute is in a numeric column, we must convert it to a string to ensure the === operator still works.
            if (typeof graphicKey !== 'string') {
                graphicKey = graphicKey.toString();
            }

            if (symbolConfig.field2) {
                graphicKey = graphicKey + ', ' + fData.attributes[symbolConfig.field2];
                if (symbolConfig.field3) {
                    graphicKey = graphicKey + ', ' + fData.attributes[symbolConfig.field3];
                }
            }

            // search the value maps for a matching entry.  if no match found, use the default image
            symbolConfig.valueMaps.every(maps => {
                if (maps.value === graphicKey) {
                    img = maps.imageUrl;
                    return false; // break loop
                }
                return true; // keep looping
            });

            if (img === '') {
                img = symbolConfig.defaultImageUrl;
            }

            return img;

        case 'ClassBreaksRenderer':
            let gVal = fData.attributes[symbolConfig.field];

            // find where the value exists in the range
            let lower = symbolConfig.minValue;

            if (gVal < lower) {
                img = symbolConfig.defaultImageUrl;
            } else {

                // a trick to prime the first loop iteration
                // the first low value is inclusive.  every other low value is exclusive.
                // if we have entered this else bracket, we know we are not below the first lower limit.
                // so we reduce lower by 1 to make the first exclusive test inclusive
                let upper = lower - 1;

                symbolConfig.rangeMaps.every(rangeMap => {
                    lower = upper;
                    upper = rangeMap.maxValue;
                    if ((gVal > lower) && (gVal <= upper)) {
                        img = rangeMap.imageUrl;
                        return false; // break loop
                    }
                    return true; // keep looping
                });

                if (img === '') {
                    // no match in defined ranges.
                    img = symbolConfig.defaultImageUrl;
                }
            }

            return img;

        default:
            return symbolConfig.icons['default'].imageUrl;
    }
}

/**
* Takes array and make a JSON object such that labels are the toplevel keys
*
* @param {Array} array that needs to be parsed into JSON obj
* @returns {Object} an JSON config object where labels are toplevel keys
*/
function labelObj(array) {
    const finalObj = {};

    array.forEach(o => {
        finalObj[o.name] = o;
    });
    return finalObj;
}

/**
* Takes the lod list and finds level as close to and above scale limit
*
* @param {Array} lods array which contains all of the lods in config
* @param {Integer} maxScale object largest zoom level for said layer
* @returns {Number} current LOD
*/
function getZoomLevel(lods, maxScale) {
    // Find level as close to and above scaleLimit
    const scaleLimit = maxScale; // maxScale obj in returned config
    let found = false;
    let currentLod = Math.ceil(lods.length / 2);
    let lowLod = 0;
    let highLod = lods.length - 1;

    if (maxScale === 0) {
        return lods.length - 1;
    }

    // Binary Search
    while (!found) {
        if (lods[currentLod].scale >= scaleLimit) {
            lowLod = currentLod;
        } else {
            highLod = currentLod;
        }
        currentLod = Math.floor((highLod + lowLod) / 2);
        if (highLod === lowLod + 1) {
            found = true;
        }
    }
    return currentLod;
}

module.exports = function () {
    return {
        createSymbologyConfig,
        getGraphicIcon,
        getZoomLevel
    };
};
