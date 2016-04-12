/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/07/15
 * Time: 14:50
 * To change this template use File | Settings | File Templates.
 */

/*global define, $*/

define([

    'bootstrap',
    'underscore',
    'backbone',
    'EventHelper',
    'collections/SearchResults',
    'views/SigmaRenderer',
    'views/SearchResultView'

], function (jquery, _, Backbone, EventHelper, SearchResults, SigmaRenderer, SearchResultView) {

    'use strict';

    var ID_SEARCH_RESULTS = '#mainpanel';
    var REGEX_ATGO_PREFIX = /atgo:/i;

    return Backbone.View.extend({

        el: ID_SEARCH_RESULTS,

        isDisplay: false,
        isAdvanced: false,

        currentNetwork: {},

        nameSpace: 'NEXO',

        events: {
            'click #search-button': 'searchButtonPressed',
            'click #clear-button': 'clearButtonPressed',
            'click #help-button': 'helpButtonPressed',
            'keypress #query': 'searchDatabase',
            'click .radio': 'searchModeChanged',

            'click #advanced-button': 'advancedButtonPressed',
            'click #enrich-submit': 'runEnrichment',
            'click #enrich-reset': 'resetButtonPressed',

            // 'mouseenter': 'show',
            'click #query': 'show',
            'click #mainpanel': 'show',
            'mouseleave': 'hide',

            'click tr': 'rowClick'
        },

        show: function() {
            this.$el.animate({width: '800px'});
            this.$('#result-table').show(600);
        },

        hide: function() {
            this.$('#result-table').hide(600);
            this.$el.animate({width: '350px'});
        },

        rowClick: function (row) {

            // Clear selection
            var tableObjects = this.$('.res-table');

            _.each(tableObjects, function (tableObject) {
                $(tableObject).find('tr').each(function () {
                    $(this).removeClass('selected');
                });
            });

            $(row.currentTarget).addClass('selected');
            var id = $(row)[0].currentTarget.firstChild.innerText;
            this.collection.trigger(EventHelper.SEARCH_RESULT_SELECTED, id);
        },

        initialize: function () {
            this.collection = new SearchResults();
            var tableObject = this.$('#result-table');
            tableObject.hide();
            var enrich = this.$('#enrich');
            enrich.hide();
        },

        /**
         * This function will be called when user switches the ontology tree.
         */
        currentNetworkChanged: function (e) {
            var currentNetwork = e.get('currentNetwork');

            var networkName = currentNetwork.get('name');
            var parts = networkName.split(' ');
            var nameSpace = parts[0].toUpperCase();
            this.nameSpace = nameSpace;
            this.currentNetwork = currentNetwork;

            // Reset search result when switching ontology tree.
            this.clearButtonPressed();
        },


        renderTermSearchResult: function(queryTerms) {
            // Add header
            this.$('#result-table').append(
                '<tr>' +
                    '<th>Term ID</th>' +
                    '<th>Name</th>' +
                    '<th>Description</th>' +
                    '<th>Synonyms</th>'+
                    '<th>Assigned Genes</th>'+
                    '<th>SGD</th>'+
                '</tr>'
            );
            var self = this;
            this.collection.each(function (result) {
                self.renderResult(result, queryTerms);
            });
            this.$('#result-table').show(600);
            this.$el.animate({width: '800px'});
        },

        renderKeywordSearchResult: function() {

            // Add header
            this.$('#result-table').append(
                '<tr><th>Term ID</th><th>Name</th><th>Description</th><th>Assigned Genes</th></tr>'
            );

            var sortedList = [];
            this.collection.each(function (result) {

                var termName = result.get('name');
                var fullName = result.get('term_name');
                var sgd = result.get('sgd');

                var entry = {
                    termName: termName,
                    fullName: fullName,
                    sgd: sgd
                };

                var singleSearchResult = new Backbone.Model(entry);
                sortedList.push(singleSearchResult);
            });

            var sorted = _.sortBy(sortedList, "termName");

            _.each(sorted, function (entry) {
                this.renderResult(entry);
            }, this);

            this.$('#result-table').show(600);
            this.$el.animate({width: '500px'});

        },

        render: function (query, searchType) {

            var resultTableElement = $('#result-table');
            resultTableElement.empty();

            // No result
            if (this.collection.size() === 0) {
                this.$('#result-table').append(
                    '<tr><td>' + 'No Match!' + '</td></tr>').slideDown(1000, 'swing');
                return;
            }

            // This should not happen!
            if (query === undefined) {
                return;
            }

            if(searchType === 'keyword') {
                this.renderKeywordSearchResult(query);
            } else {
                this.renderTermSearchResult(query);
            }
        },

        renderResult: function (result, queryTerms) {
            var resultView = new SearchResultView({
                model: result
            });
            var rendered = resultView.render(queryTerms);
            $('#result-table').append(rendered.$el.html());
        },

        search: function (query, searchByTerm) {
            var self = this;

            // Remove all results.
            this.collection.reset();
            var lowerCaseQuery = query.toLowerCase();
            lowerCaseQuery = lowerCaseQuery.replace(REGEX_ATGO_PREFIX, '');

            // if (searchByTerm) {
            var searchUrl = '/search/term/' + lowerCaseQuery;
            var searchType = 'term';
            console.log("======== Search Q: " + lowerCaseQuery);

            $.getJSON(searchUrl, function (searchResult) {
                if (searchResult !== undefined && searchResult.length !== 0) {
                    self.filter(searchResult);
                    EventHelper.trigger(EventHelper.NODES_SELECTED, self.collection.models);
                }
                var qList = lowerCaseQuery.split(/ +/g);
                var filteredList = _.filter(qList, function(q){ return q !== ''; });
                console.log("======== Q LIST");
                console.log(filteredList);

                self.render(filteredList, searchType);
            });
        },

        filter: function (searchResults) {
            var self = this;

            var keySet = [];
            _.each(searchResults, function (result) {
                var name = result.name;

                if (!_.contains(keySet, name)) {
                    self.collection.add(result);
                }
                keySet.push(name);
            });

            return keySet;
            // return searchResults[0];
        },

        searchDatabase: function (event) {
            var charCode = event.charCode;

            // Enter key
            if (charCode === 13) {
                // var byTerm = $('#byTerm')[0].checked;
                event.preventDefault();
                var query = $('#query').val();
                this.search(query, true);
            }
        },

        searchButtonPressed: function () {
            var originalQuery = $('#query').val();
            // var byTerm = $('#byTerm')[0].checked;
            var byTerm = true;

            // Ignore empty
            if (!originalQuery || originalQuery === '') {
                return;
            }
            // Validate input
            this.search(originalQuery, byTerm);
        },

        clearButtonPressed: function () {
            var resultTableElement = $('#result-table');

            // this.$el.animate({width: '350px'});

            resultTableElement.slideUp(500).empty();
            $('#query').val('');
            EventHelper.trigger(EventHelper.CLEAR);
        },

        helpButtonPressed: function () {
            window.open('../documentation.html');
        },

        advancedButtonPressed: function () {
            var advancedPanel = $('#enrich');
            advancedPanel.slideToggle(500);
            if (this.isAdvanced) {
                this.$('#advanced-button').attr('data-icon', 'd');
                this.isAdvanced = false;
            } else {
                this.$('#advanced-button').attr('data-icon', 'u');
                this.isAdvanced = true;
            }
        },

        resetButtonPressed: function () {
            $('#gene-list').val('');
            $('#enrich-table').slideUp(500).empty();
        },

        runEnrichment: function () {
            var params = this.validateEnrichParams();

            var self = this;
            $.post(
                '/enrich',
                params,
                function (result) {
                    var labelMap = self.currentNetwork.get('nodeLabel2id');
                    var ontology = self.currentNetwork.get('config').ontologyType;

                    _.each(result.results, function (res) {
                        if(ontology === 'NEXO') {
                            res.name = 'NEXO:' + res.id;
                        } else {
                            res.name = res.id;
                        }
                        res.label = labelMap[res.name];
                    });
                    EventHelper.trigger(EventHelper.ENRICHED, result);

                }
            );
        },

        validateEnrichParams: function () {
            var params = {};

            var genes = this.$('#gene-list').val();
            var pval = this.$('#pval').val();
            var minGenes = this.$('#num-genes').val();
            var ontology = this.currentNetwork.get('config').ontologyType;

            if (pval === undefined || pval === '' || pval === null) {
                pval = 0.01;
            } else {
                pval = parseFloat(pval);
            }

            if (minGenes === undefined || minGenes === '' || minGenes === null) {
                minGenes = 2;
            } else {
                minGenes = parseInt(minGenes, 10);
            }

            params.genes = genes;
            params.alpha = pval;
            params.type = ontology;
            params['min-assigned'] = minGenes;

            // Set values to the text boxes
            $('#pval').val(pval);
            $('#num-genes').val(minGenes);

            return params;
        }
    });
});
