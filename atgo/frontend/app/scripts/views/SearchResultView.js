/*global define*/

define([

    'underscore',
    'backbone'

], function (_, Backbone) {

    'use strict';

    return Backbone.View.extend({

        render: function (queryTerms) {
            var self = this;
            var ORDERED_TERM_NAMES = ['name', 'term_name', 'full_name', 'synonyms', 'assigned_genes', 'sgd'];

            var newRow = '<tr>';
            _.each(ORDERED_TERM_NAMES, function(key) {
                var val = self.model.get(key);
                var originalLen = 0;

                // Special case: Assigned genes - This can be hundreds of entries!
                if(key === 'assigned_genes') {
                    if(val === undefined) {
                        val = '-';
                    } else {
                        originalLen = val.length;
                        var filtered = _.filter(val, function(geneName){
                            for(var i=0;i<queryTerms.length; i++) {
                                if(geneName.indexOf(queryTerms[i]) > -1) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        if(filtered.length === 0) {
                            // No Match.  Use first 5
                            if(originalLen > 5) {
                                var firstFive = [];
                                for(var j=0; j<5; j++) {
                                    firstFive.push(val[j]);
                                }
                                val = firstFive;
                            }
                        } else {
                            val = filtered;
                        }
                    }
                } else if(val === undefined) {
                    val = '-';
                }

                if(Array.isArray(val)) {
                    val =  _.reduce(val, function(memo, entry){ return memo + entry + ', '; }, '');
                    val = val.substring(0, val.length-2);
                    if(key === 'assigned_genes') {
                        if(originalLen > 5) {
                            val += ' (' + originalLen + ' genes)';
                        }
                    }
                }
                newRow += '<td>' + self.highlight(val, queryTerms) + '</td>';
            });

            newRow += '</tr>';

            this.$el.append(newRow);
            return this;
        },

        highlight: function(value, queryTerms) {
            var highlighted = value;
            _.each(queryTerms, function (qVal) {
                var regex = new RegExp(qVal, 'gi');
                var found = highlighted.match(regex);
                var targets = _.unique(found);
                console.log("MATCH: ");
                console.log(targets);
                _.each(targets, function(target) {
                    var regex2 = new RegExp(target, 'gi');
                    highlighted = highlighted.replace(regex2, '<strong>' + target + '</strong>');
                });
            });
            return highlighted;
        }
    });
});
