/**
 * Class Description
 * @class [ClassName]
 */
var [ClassName] = Class.create();
[ClassName].prototype = {
    initialize: function() {
        this.logPrefix = '[ClassName]: ';
    },

    /**
     * Public method description
     * @param {string} param1 - Description
     * @return {boolean} success
     */
    processLogic: function(param1) {
        if (!param1) return false;

        try {
            this._helperMethod(param1);
            return true;
        } catch (e) {
            gs.error(this.logPrefix + e.message);
            return false;
        }
    },

    /** @private */
    _helperMethod: function(data) {
        // Logic here
    },

    type: '[ClassName]'
};
