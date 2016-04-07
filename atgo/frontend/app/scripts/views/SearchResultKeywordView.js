/*global define*/

define([

    'underscore',
    'backbone'

], function (_, Backbone) {

    'use strict';

    return Backbone.View.extend({

        render: function () {
            var name = this.model.get(termName);
            var fullName = this.model.fullName;
            var sgd = this.model.sgd;
            var synonyms = this.model.synonyms;

            var keys = this.model.keys;

            var hits = {};






            var newRow =
                '<tr>' +
                '<td>' + name + '</td>' +
                '<td>' + fullName + '</td>' +
                '<td>' + sgd + '</td>' +
                '</tr>';

            this.$el.append(newRow);
            return this;
        }
    });
});

