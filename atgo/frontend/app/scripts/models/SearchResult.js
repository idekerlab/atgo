/*global define*/


define([

    'backbone'

], function (Backbone) {

    'use strict';

    return Backbone.Model.extend({

        initialize: function () {
            console.log('Search Model initialized ########################');
        }

    });
});
