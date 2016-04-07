/*global define*/
'use strict';

define([
    'backbone'
], function (Backbone) {

    var NodeDetails = Backbone.Model.extend({

        initialize: function () {

            console.log('@@@@@@@@@@@@@@@@@@@ ND initialized ########################');
            var self = this;
            var styleFile = self.get('styleFileLocation');
            console.log(styleFile);

            $.getJSON(styleFile, function (configObject) {
                console.log('@@@@@@@@@@@@@@@@@@@ GOT STYLE');
                self.set('style', configObject);
                console.log(self.get('style'));
            })
            .fail(function( jqxhr, textStatus, error ) {
                var err = textStatus + ', ' + error;
                console.log( '!!!!!!!!!!!!!!!Request Failed: ' + err );
            });
        },

        getDetails: function (selectedNodeId) {
            if (selectedNodeId === null ||
                selectedNodeId === undefined ||
                selectedNodeId === '') {
                return;
            }

            this.url = '/' + selectedNodeId;
            this.id = selectedNodeId;

            var self = this;
            console.log('Updating node detail model...');

            this.fetch({
                success: function (data) {

                    var attr = data.attributes;
                    for (var key in attr) {
                        self.set(key, attr[key]);
                    }

                    self.trigger('change');
                }
            });
        }
    });

    return NodeDetails;
});
