/*global define*/
'use strict';

define([
    'underscore',
    'backbone',
    'EventHelper',
    'models/CyNetwork',
    'cytoscape'

], function (_, Backbone, EventHelper, CyNetwork, cytoscape) {

    var CYTOSCAPE_TAG = '#cyjs';

    var WAITING_BAR = '<div id="fadingBarsG">' +
        '<div id="fadingBarsG_1" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_2" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_3" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_4" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_5" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_6" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_7" class="fadingBarsG"></div>' +
        '<div id="fadingBarsG_8" class="fadingBarsG"></div></div>';

    var CyNetworkView = Backbone.View.extend({

        el: '#cy-network',

        currentOntology: 'NEXO',

        /**
         * Event listener.  If a term is selected, it will update the
         * @param nodeId
         */
        update: function (nodeId) {
            $(CYTOSCAPE_TAG).empty();
            $('#warning').empty();

            var currentNetwork = '';
            if (this.model !== undefined) {
                currentNetwork = this.model.get('currentNetworkName');
            } else {
                currentNetwork = 'NeXO';
            }

            if (this.currentOntology !== 'NEXO') {
                // No need to update
                return;
            }

            if (this.model === undefined || this.model === null) {
                this.model = new CyNetwork({namespace: 'nexo', termId: nodeId});
                this.model.set('currentNetworkName', 'NeXO');
            } else {
                this.model.set('termId', nodeId);
                this.model.updateURL();
            }

            console.log('TGT = ' + nodeId);
            this.render(nodeId);
        },

        render: function (nodeId) {
            $(CYTOSCAPE_TAG).cytoscape(this.initSubnetworkView(nodeId));
        },

        networkSelected: function (e) {
            var network = e[0];
            var currentNetwork = network.get('name');
            if (this.model !== undefined && currentNetwork !== undefined) {
                this.model.set('currentNetworkName', currentNetwork);
                this.model.set('currentNetwork', network);
            }
            this.currentOntology = network.get('config').ontologyType;
        },

        filterLargeNetwork: function (network) {

            var originalNodes = network.elements.nodes;
            var originalEdges = network.elements.edges;

            // Use top 500 high-scored edges
            var TH = 500;
            var edgeScores = [];
            _.each(originalEdges, function(edge) {
                edgeScores.push(edge.data.score);
            });

            var sorted = edgeScores.sort(function(a, b){return b-a;});

            console.log('Sorted:');
            console.log(sorted);
            var thScore = sorted[TH];
            console.log(thScore);

            // Build node Map
            var nodeMap = {};
            _.each(originalNodes, function(node){
                nodeMap[node.data.id] = node;
            });

            var edges = [];
            var nodeList = [];
            _.each(originalEdges, function(edge) {
                if(edge.data.score >= thScore) {
                    edges.push(edge);
                    nodeList.push(nodeMap[edge.data.source]);
                    nodeList.push(nodeMap[edge.data.target]);
                }
            });

            return {
                elements: {
                    nodes: _.uniq(nodeList),
                    edges: edges
                }
            };
        },

        loadData: function () {
            var self = this;

            console.log('Calling Raw Interaction URL ===> ' + this.model.url);

            this.model.fetch({
                success: function (data) {

                    var graph = data.attributes.graph;
                    var interactionSize = graph.elements.edges.length;

                    console.log('* Got raw interaction: ' + interactionSize);

                    // No result
                    if (interactionSize === 0) {
                        $(CYTOSCAPE_TAG).css('background-color', '#aaaaaa');
                        return;
                    } else {
                        // Active color
                        $(CYTOSCAPE_TAG).css('background-color', '#233C64');
                    }

                    // Too many results
                    if (interactionSize >= 1500) {
                        // Show warning:
                        $('#warning').append('<h2 id="too-many-warning">(Showing top 500 interactions)</h2>');

                        // Filter top 500 edges:
                        console.log('Too big to display: filtering...');
                        graph = self.filterLargeNetwork(graph);
                        console.log(graph);
                    }

                    $(CYTOSCAPE_TAG).append(WAITING_BAR);
                    var cy = self.model.get('cy');

                    EventHelper.trigger('subnetworkRendered', graph);

                    cy.load(
                        graph.elements,

                        function () {
                            console.log('Load finished.');
                            self.setNodeSelectedListener(interactionSize);
                            $('#fadingBarsG').remove();
                        });
                }
            });
        },

        setNodeSelectedListener: function (numInteractions) {
            var cy = this.model.get('cy');

            cy.$('node').on('click', function (evt) {
                var selectedNodeName = evt.cyTarget.data('name');

                console.log('CYJS CLICK ' + selectedNodeName);
                console.log(evt.cyTarget);

                EventHelper.trigger(EventHelper.SUBNETWORK_NODE_SELECTED, selectedNodeName);
            });

            cy.layout({
                name: 'cose',
                idealEdgeLength: 130,
                nodeRepulsion: 5000000
            });
        },

        initSubnetworkView: function (targetGene) {

            console.log(targetGene);

            var self = this;

            var options = {
                showOverlay: false,
                boxSelectionEnabled: false,
                minZoom: 0.1,
                maxZoom: 15,

                elements: {
                    nodes: [],
                    edges: []
                },

                ready: function () {
                    self.model.set('cy', this);
                    self.model.set('options', options);
                    self.loadData();
                },

                // Visual Style for raw interaction view.
                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'font-family': 'Roboto',
                        'font-size': '14px',
                        'font-weight': 300,
                        'content': 'data(name)',
                        'text-halign': 'right',
                        'text-valign': 'bottom',
                        'color': 'rgb(235,235,235)',
                        'width': 15,
                        'height': 15,
                        'border-width': 0,
                        'background-color': '#FFFFFF',
                        'shape': 'ellipse'
                    })
                    .selector('node:selected')
                    .css({
                        'background-color': 'rgb(255,94,25)',
                        'color': 'rgb(255,94,25)',
                        'font-size': '24px',
                        'width': 30,
                        'height': 30,
                        'shape': 'heptagon',
                        'font-weight': 700
                    })
                    .selector('node[sgd = "' + targetGene + '"]')
                    .css({
                        'background-color': '#00ee11',
                        'color': '#00ee11',
                        'font-size': '24px',
                        'width': 30,
                        'height': 30,
                        'shape': 'hexagon',
                        'font-weight': 700
                    })
                    .selector('edge')
                    .css({
                        'width': 'mapData(score, 0, 1, 0.5, 4)',
                        'color': '#999999',
                        'line-color': '#666666',
                        'line-style': 'solid',
                        'opacity': 0.6
                    })
                    .selector('edge:selected')
                    .css({
                        'width': 8,
                        'text-opacity': 1.0,
                        'content': 'data(score)',
                        'color': '#FF3377',
                        'font-size': '8px',
                        'font-weight': 100,
                        'opacity': 1
                    })
                    .selector('edge[interaction = "Co-citation"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#EE0000'
                    })
                    .selector('edge[interaction = "Co-expression"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#7fc97f'
                    })
                    .selector('edge[interaction = "Genetic interactions"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#beaed4'
                    })
                    .selector('edge[interaction = "Conditional genetic interactions"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#fdc086'
                    })
                    .selector('edge[interaction = "Protein-protein interactions (high-throughput)"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#FFFFFF'
                    })
                    .selector('edge[interaction = "Protein-protein interactions (low-throughput)"]')
                    .css({
                        'line-style': 'solid',
                        'line-color': '#6F6F6F'
                    })
                    .selector('edge[interaction = "Domain co-occurrence"]')
                    .css({
                        'line-style': 'dashed',
                        'line-color': '#ffff99'
                    })
                    .selector('edge[interaction = "Genomic context"]')
                    .css({
                        'line-style': 'dashed',
                        'line-color': '#386cb0'
                    })
                    .selector('edge[interaction = "Phylogenetic similarity"]')
                    .css({
                        'line-style': 'dashed',
                        'line-color': '#f0027f'
                    })
                    .selector('edge[interaction = "Predicted from 3D structure"]')
                    .css({
                        'line-style': 'dashed',
                        'line-color': '#bf5b17'
                    })
                };

            return options;
        }
    });
    return CyNetworkView;
});
