/**
 * Client-callable Script Include — extends AbstractAjaxProcessor.
 * Use global.AbstractAjaxProcessor for Scoped apps; AbstractAjaxProcessor for Global.
 * Always return a JSON string for complex data.
 */
var [ClassName] = Class.create();
[ClassName].prototype = Object.extendsObject(global.AbstractAjaxProcessor, {

    /**
     * Example client-callable method.
     * Called from client via: ga.addParam('sysparm_name', 'getDetails');
     * @return {string} JSON string with status and data
     */
    getDetails: function() {
        var result = {
            status: 'error',
            data: {}
        };

        var paramID = this.getParameter('sysparm_id');

        if (!paramID) {
            return JSON.stringify(result);
        }

        try {
            // Logic here — use getValue(), never dot-walk
            result.status = 'success';
            result.data = { id: paramID };
        } catch (e) {
            gs.error('[ClassName].getDetails: ' + e.message);
        }

        return JSON.stringify(result);
    },

    type: '[ClassName]'
});
