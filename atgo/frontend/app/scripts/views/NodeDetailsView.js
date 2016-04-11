/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/07/15
 * Time: 15:08
 * To change this template use File | Settings | File Templates.
 */

/*global define*/
'use strict';

define([

    'underscore',
    'backbone',
    'models/NodeDetails',
    'highcharts'

], function (_, Backbone, NodeDetails) {

    var STYLE_FILE = '/dist/style.json';

    var ID_SUMMARY_PANEL = '#summary-panel';

    var QUICK_GO_API = 'http://www.ebi.ac.uk/QuickGO/GTerm?id=';
    var SGD_API = 'http://www.yeastgenome.org/locus/';
    var PUBMED_LINK = 'http://www.ncbi.nlm.nih.gov/pubmed/?term=';
    var SMD_LINK = 'http://smd.princeton.edu/';
    var GEO_LINK = 'http://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=';

    var REGEX_PUBMED = /^\d/;
    var REGEX_SMD = /Stanford Microarray Database/i;
    var REGEX_GEO = /^GSE/;

    var EMPTY_RECORD = 'N/A';

    var ID_NODE_DETAILS = '#details';

    var LABEL_ATTRIBUTE_NAME = 'term_name';
    var ASSIGNED_GENE_ATTRIBUTE_NAME = 'assigned_genes';

    var TARGETS = {
        'Biological Process': '',
        'BP Annotation': 'Name',
        'BP Definition': 'Definition',
        'Cellular Component': '',
        'CC Annotation': 'Name',
        'CC Definition': 'Definition',
        'Molecular Function': '',
        'MF Annotation': 'Name',
        'MF Definition': 'Definition'
    };

    var TARGETS_GENE = {
        name: 'Gene ID',
        'Assigned Genes': 'Gene Name',
        'Assigned Orfs': 'ORF Name',
        'SGD Gene Description': 'Description'
    };

    var NodeDetailsView = Backbone.View.extend({

        el: ID_SUMMARY_PANEL,

        events: {
            'click #close-button': 'hide',
            'hover #term-summary': 'showHover',
            'hover #genes': 'showHover',
            'hover #interactions': 'showHover',

            'click #result-tab a': 'tabClicked'
        },

        isDisplayed: false,

        currentOntology: 'NEXO',

        initialize: function () {
            this.model = new NodeDetails({styleFileLocation: STYLE_FILE});
            this.listenTo(this.model, 'change', this.render);

            this.$el.find('.float-ui').hide();
        },

        tabClicked: function(e) {
            e.preventDefault();
            $(this).tab('show');
        },


        showHover: function () {
            var t = 0;
            var self = this;
            clearTimeout(t);
            this.$el.find('.float-ui').fadeIn(500);

            t = setTimeout(function () {
                self.$el.find('.float-ui').fadeOut(500);
            }, 2000);
        },

        render: function () {
            var conf = this.model.get('style');
            console.log(conf.raw_interactions);

            this.$(ID_NODE_DETAILS).empty();
            this.$('#genes').empty();
            var itrPanel = this.$('#interactions');
            itrPanel.empty();

            // Draw Title
            var entryId = this.model.get('name');
            this.nexoRenderer(entryId);

            return this;
        },

        interactionRenderer: function (graph) {
            var edges = graph.elements.edges;
            var edgeData = [];
            _.each(edges, function(edge){
                edgeData.push(edge.data);
            });

            // Sort edge by score:
            var sortedEdges = _.sortBy(edgeData, 'score');
            var itrPanel = this.$('#interactions');

            itrPanel.append(this.writeInteractions(sortedEdges));

            // Render Genes Tab
            this.renderGenes(graph.elements.nodes);
        },

        writeInteractions: function(sortedEdges) {
            var summary = '<table class="table table-striped">';
            summary += '<thead><tr><th>Interaction Strength</th><th>Interacting Pair</th>' +
                '<th>Interaction Type</th><th>Source Publication</th></tr></thead>';
            summary += '<tbody>';

            var self = this;
            _.each(sortedEdges.reverse(), function (edge) {
                var sourceName = edge.sourceName;
                var targetName = edge.targetName;
                var interactingPair = sourceName + ' - ' + targetName;
                var pubmedId = edge.publication;
                var pubmedLink = self.replaceNonePubmedId(pubmedId);
                var score = edge.score;
                var itr = edge.interaction;

                summary += '<tr><td>' + score + '</td><td>'
                    + interactingPair + '</td><td>' + itr + '</td><td>'
                    + pubmedLink + '</td></tr>';
            });
            summary += '</tbody></table>';
            return summary;
        },

        replaceNonePubmedId: function (id) {
            if(id === undefined) {
                return '-';
            }

            if(REGEX_PUBMED.test(id)) {
                return '<a href=' + PUBMED_LINK + id + ' target="_blank">' + id + '</a>';
            }

            // Special cases
            if(REGEX_SMD.test(id)) {
                // This is standford microarray DB
                return '<a href=' + SMD_LINK + ' target="_blank">' + id + '</a>';
            }

            if(REGEX_GEO.test(id)) {
                return '<a href=' + GEO_LINK + ' target="_blank">' + id + '</a>';
            }

            return id;
        },


        renderGenes: function (nodes) {


            if (nodes.length === 0) {
                return;
            }

            var genes = [];
            _.each(nodes, function(node) {
                genes.push(node.data);
            });

            var sortedGenes= _.sortBy(genes, 'name');
            var genesTab = $('#genes');

            var table = '<table class=\'table table-striped\'>' +
                '<tr><th>Symbol</th><th>Description</th><th>SGD ID</th></tr>';

            _.each(sortedGenes, function (g) {
                table += '<tr><td><a href="' + SGD_API + g.sgd + '/overview"' + ' target=_blank>' + g.name
                    + '</a></td><td>' + g.fullName + '</td><td>' + g.sgd +'</td></tr>';
            });

            table += '</table>';
            genesTab.append(table);
        },

        nexoRenderer: function (id) {
            // Renderer for Gene List Tab
            console.log('------------- summary MODEL ------------');
            console.log(this.model);

            var label = this.model.get(LABEL_ATTRIBUTE_NAME);
            var style = this.model.get('style');
            var sgdId = this.model.get('sgd');
            var details = this.model.get('full_name');

            var checkId = parseInt(id, 10);
            if(isNaN(checkId)) {
                // This is a gene entry
                this.renderGeneSummary(label, sgdId, details);
            } else {
                this.renderTermSummary(id, label);
            }

            this.renderLegend(style);
        },

        renderGeneSummary: function(label, sgd, details) {

            if(details === undefined) {
                details = '-';
            }

            // Main title
            this.$('.headertext').empty().append(label);

            // Render raw interaction network view
            this.$('#subnetwork-view').show();

            // Setup summary table
            this.$(ID_NODE_DETAILS).append('<div id="term-summary"></div>');

            // Render Summary Table
            var summary = '<table class="table">';
            summary += '<tr><th>SGD ID</th><th>Details</th></tr>';
            summary += '<tr><td><a href="' + SGD_API + sgd + '/overview" target="_blank">' + sgd + '</a>'
                + '</td><td>' + details + '</td></tr></table>';

            this.$('#term-summary').append(summary);
        },

        renderTermSummary: function(id, label) {
            if (label === undefined || label === null || label === '') {
                label = id;
            }

            // If integer, it's an AtgO ID.
            var testLabel = parseInt(label, 10);
            if(isNaN(testLabel) === false) {
                label = 'AtgO:' + label;
            }

            // Main title
            this.$('.headertext').empty().append(label);

            // Render raw interaction network view
            this.$('#subnetwork-view').show();

            // Setup summary table
            this.$(ID_NODE_DETAILS).append('<div id="term-summary"></div>');

            // Render Summary Table
            var score = this.model.get('similarity_score');
            if(score === undefined ) {
                score = '-';
            } else {
                score = score.toFixed(3);
            }


            var summary = '<h3>Term ID: ' + id + '</h3>';
            summary += '<table class="table">';
            summary += '<tr><th>Term Size</th><th>Term Similarity Score</th></tr>';
            summary += '<tr><td>' + this.model.get('term_size')
                + '</td><td>' + score + '</td></tr></table>';

            this.$('#term-summary').append(summary);
        },

        renderLegend: function(style) {
            var edgeStyle = style['raw_interactions']['edge-types'];

            var legendTable = '<h3>Legend</h3>';
            legendTable += '<h4>Interaction Strength:</h4>';
            legendTable += '<table class="table">';
            legendTable += '<tr><th>Low</th><th>High</th></tr>';
            legendTable += '<tr><td>' + this.getLine('solid', '#888888', 2)
                + '</td><td>' + this.getLine('solid', '#888888', 15) +'</td></tr></table>';

            legendTable += '<h4>Interaction Types:</h4>';
            legendTable += '<table class="table table-hover">';

            var self = this;
            _.each(edgeStyle, function(entry) {
                var key = entry.key;
                var vals = entry.value;
                var lineColor = vals['line-color'];
                var lineType = vals['line-style'];

                legendTable += '<tr><td><h4>' + key + '</h4></td><td>'
                    + self.getLine(lineType, lineColor, 12)
                    + '</td></tr>';

            });

            legendTable += '</table>';

            this.$('#term-summary').append(legendTable);
        },

        getLine: function(lineType, lineColor, w) {
            var line = '<svg version="1.1" width="100%" height="20px">';

            if(lineType === 'solid') {
                line += '<line x1="10" x2="200" y1="12" y2="12" ' +
                    'stroke="' + lineColor + '" stroke-width="' + w + '" ' +
                    'stroke-linecap="square" /></svg>';
            } else if(lineType === 'dotted') {
                line += '<line x1="10" x2="200" y1="12" y2="12" ' +
                    'stroke="' + lineColor + '" stroke-width="' + w + '" ' +
                    'stroke-linecap="square" stroke-dasharray="1, 13"/></svg>';

            } else {
                line += '<line x1="10" x2="200" y1="12" y2="12" ' +
                    'stroke="' + lineColor + '" stroke-width="' + w + '" ' +
                    'stroke-linecap="square" stroke-dasharray="25, 15"/></svg>';
            }
            return line;
        },

        renderSingleValueChart: function (min, max, valueArray, title, categoryArray, domElement) {

            domElement.highcharts({
                colors: [
                    '#52A2C5',
                    '#2B7A9B',
                    '#FF5E19',
                    '#80699B',
                    '#3D96AE',
                    '#DB843D',
                    '#92A8CD',
                    '#A47D7C',
                    '#B5CA92'
                ],
                chart: {
                    type: 'bar',
                    height: 220,
                    spacingBottom: 15,
                    spacingTop: 0,
                    backgroundColor: 'rgba(255,255,255,0)'
                },


                title: {
                    text: null
                },
                xAxis: {
                    categories: [''],
                    labels: {
                        style: {
                            fontSize: '12px',
                            fontWeight: 700,
                            fontFamily: 'Roboto'
                        }
                    }
                },
                yAxis: [
                    {
                        min: min,
                        max: max,
                        title: {
                            text: 'Term Robustness',
                            style: {
                                fontFamily: 'Roboto',
                                color: '#FF5E19'
                            }
                        },
                        labels: {
                            style: {
                                fontSize: '12px',
                                fontFamily: 'Roboto',
                                color: '#FF5E19',
                                fontWeight: 300
                            }
                        },
                        opposite: true
                    },
                    {
                        min: 0,
                        max: 1,
                        title: {
                            text: 'Interaction Density & Bootstrap'
                        }
                    }
                ],
                series: [
                    {

                        yAxis: 1,
                        data: [valueArray[1]],
                        name: categoryArray[1],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 400,
                                fontSize: '12px',
                                fontFamily: 'Roboto'
                            }
                        }
                    },
                    {

                        yAxis: 1,
                        data: [valueArray[2]],
                        name: categoryArray[2],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 400,
                                fontSize: '12px',
                                fontFamily: 'Lato'
                            }
                        }
                    },
                    {

                        yAxis: 0,
                        data: [valueArray[0]],
                        name: categoryArray[0],
                        dataLabels: {
                            enabled: true,
                            color: '#FF5E19',
                            align: 'left',
                            x: 3,
                            y: 0,
                            style: {
                                fontWeight: 700,
                                fontSize: '14px',
                                fontFamily: 'Roboto'
                            }
                        }
                    }
                ],
                plotOptions: {

                    series: {
                        animation: false,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        pointWidth: 27
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: true
                },
                tooltip: {
                    shared: true,
                    useHTML: true,
                    followPointer: true,
                    hideDelay: 0,
                    headerFormat: '<small>{point.key}</small><table>',
                    pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                        '<td style="text-align: right"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>'
                }
            });
        },


        renderScores: function () {
            var bp = this.model.get('BP Score');
            var cc = this.model.get('CC Score');
            var mf = this.model.get('MF Score');

            bp = Math.round(bp * 100) / 100;
            cc = Math.round(cc * 100) / 100;
            mf = Math.round(mf * 100) / 100;

            $('#go-chart').highcharts({
                chart: {
                    type: 'bar',
                    animation: false,
                    height: 150,
                    spacingBottom: 15,
                    spacingTop: 0,
                    backgroundColor: 'rgba(255,255,255,0)'
                },

                title: {
                    text: null
                },
                xAxis: {
                    categories: ['Biological Process', 'Cellular Component', 'Molecular Function'],
                    labels: {
                        style: {
                            fontSize: '12px',
                            fontWeight: 300,
                            fontFamily: 'Roboto'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    max: 1.0,
                    title: {
                        text: null
                    }
                },
                series: [
                    {
                        data: [bp, cc, mf],
                        dataLabels: {
                            enabled: true,
                            color: '#343434',
                            align: 'right',
                            x: 40,
                            y: 0,
                            style: {
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'Roboto'
                            }
                        }
                    }
                ],
                plotOptions: {
                    series: {
                        animation: false,
                        pointPadding: 0,
                        groupPadding: 0,
                        borderWidth: 0,
                        pointWidth: 27
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    enabled: false
                }
            });
        },

        processEntry: function (allValues) {

            for (var tableKey in TARGETS) {
                var tableValue = this.model.get(tableKey);
                if (tableValue === null || tableValue === '' || tableValue === undefined) {
                    tableValue = EMPTY_RECORD;
                }

                if (tableKey === 'Best Alignment GO Term ID' && tableValue !== EMPTY_RECORD) {
                    tableValue = '<a href="' + QUICK_GO_API + tableValue + '" target="_blank">' + tableValue + '</a>';
                }

                if (tableKey === 'Biological Process' || tableKey === 'Cellular Component' || tableKey === 'Molecular Function') {
                    allValues += '</table><h4>' + tableKey + '</h4><table class=\'table table-striped\'>';
                } else {
                    allValues += '<tr><td style="width: 120px">' + TARGETS[tableKey] + '</td><td>' + tableValue + '</td></tr>';
                }
            }

            return allValues;
        },

        processGeneEntry: function (allValues) {

            allValues += '<table class=\'table table-striped\'>';
            for (var tableKey in TARGETS_GENE) {
                var tableValue = this.model.get(tableKey);
                if (tableValue === null || tableValue === '') {
                    tableValue = EMPTY_RECORD;
                }

                if (tableKey === 'name') {
                    tableValue = '<a href="' + SGD_API + tableValue + '" target="_blank">' + tableValue + '</a>';
                } else if (tableKey === 'SGD Gene Description') {
                    var descriptionList = '<ul>';
                    var entries = tableValue.split(';');
                    for (var i = 0; i < entries.length; i++) {
                        descriptionList += '<li>' + entries[i] + '</li>';
                    }
                    descriptionList += '</ul>';
                    tableValue = descriptionList;
                }
                allValues += '<tr><td style="width: 120px">' + TARGETS_GENE[tableKey] + '</td><td>' + tableValue + '</td></tr>';
            }

            return allValues;
        },


        networkSelected: function (e) {
            if(e === undefined) {
                return;
            }

            var network = e[0];
            this.currentOntology = network.get('config').ontologyType;
            console.log('1. SUMMARY: view switched: ' + this.currentOntology);

        },

        show: function () {
            var self = this;
            this.$el.show(400, 'swing', function () {
                if (!self.isDisplayed) {
                    self.isDisplayed = true;
                }
            });
        },

        hide: function () {
            var self = this;
            this.$el.hide(400, 'swing', function () {
                self.isDisplayed = false;
            });
        }
    });

    return NodeDetailsView;
});
