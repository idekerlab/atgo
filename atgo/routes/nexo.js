/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/05/07
 * Time: 13:37
 * To change this template use File | Settings | File Templates.
 */

/* global exports */

var request = require("request");
var async = require('async');

var _ = require("underscore");

var BASE_URL = "http://rexster:8182/graphs/atgo/";

var ENRICH_URL = "http://localhost:5000/enrich";

var ROOTS = {
    atgo: "1"
};

var EMPTY_OBJ = {};
var EMPTY_ARRAY = [];
var EMPTY_CYNETWORK = {
    graph: {
        elements: {
            nodes: [],
            edges: []
        }
    }
};


// TODO: change to interaction TH.
var GENE_COUNT_THRESHOLD = 500;

var GraphUtil = function () {
};

GraphUtil.prototype = {

    generateInteractions: function (paths) {
        var nodeList = paths[0];
        var edgeList = paths[1];

        console.log("# of nodes = " + nodeList.length);
        console.log("# of edges = " + edgeList.length);

        // console.log(paths);

        var graph = {
            elements: {
                nodes: [],
                edges: []
            }
        };


        // Create node map
        var id2name = {};

        var nodeLength = nodeList.length;
        for (var i = 0; i < nodeLength; i++) {
            var n = nodeList[i];
            var newNode = {
                data: {
                    id: n._id,
                    name: n.name,
                    sgd: n.sgd,
                    fullName: n.full_name
                }
            };
            graph.elements.nodes.push(newNode);
            id2name[(n._id).toString()] = n.name;
        }

        var edgeLength = edgeList.length;
        for (var i = 0; i < edgeLength; i++) {
            var edge = edgeList[i];

            var interactionType = edge._label;
            var pub = edge.publication;

            var source = edge._outV;
            var target = edge._inV;
            var score = parseFloat(edge.score.toPrecision(4));

            var newEdge = {
                data: {
                    id: id2name[source.toString()] + " (" + interactionType + ") " + id2name[target.toString()],
                    source: source,
                    target: target,
                    sourceName: id2name[source.toString()],
                    targetName: id2name[target.toString()],
                    interaction: interactionType,
                    publication: pub,
                    score: score
                }
            };

            graph.elements.edges.push(newEdge);
        }
        return graph;
    },

    edgeListGenerator: function (graphJson) {

        var pathList = [];

        for (var key in graphJson) {
            var path = graphJson[key];
            pathList.push(this.parseEdge(path));
        }

        console.log("PATH LIST:");
        console.log(pathList);

        return pathList;
    },

    parseEdge: function (path) {
        var nodeList = [];

        _.each(path, function (graphObject) {
            if (graphObject['_type'] === "vertex") {
                nodeList.push(graphObject.name);
            }
        });

        return nodeList;

    },

    parsePathEntry: function (nodes, edges, graph, path) {
        var pathLength = path.length;

        var node = {};

        for (var i = 0; i < pathLength; i++) {
            var graphObject = path[i];
            if (graphObject['_type'] === "vertex") {

                node.data = {};
                node.data.id = graphObject.name;
                if (i === 0) {
                    node.data["type"] = "start";
                } else {
                    node.data["type"] = "path";
                }
                if (_.contains(nodes, node.data.id) == false) {
                    graph.elements.nodes.push(node);
                    nodes.push(node.data.id);
                }
            } else {
                var sourceName = node.data.id;
                var target = path[i + 1];
                var targetName = "";
                if (target['_type'] != "vertex") {
                    var ex = new Error("Wrong input JSON.");
                    throw ex;
                } else {
                    targetName = target.name;
                }

                var edgeName = sourceName + " (" + graphObject._label + ") " + targetName;
                if (_.contains(edges, edgeName) == false) {

                    var edge = {
                        data: {
                            id: edgeName,
                            interaction: graphObject._label,
                            source: sourceName,
                            target: targetName
                        }
                    };
                    graph.elements.edges.push(edge);
                    edges.push(edgeName);
                }

                node = {};
            }
        }
    }
};

var graphUtil = new GraphUtil();

var Validator = function () {
};

Validator.prototype = {

    validate: function (id) {
        // Validation
        if (id === undefined || id === null || id === "") {
            return false;
        }

        var parts = id.split(":");
        if (parts.length === 2) {
            return true;
        } else if (id.match(/S/)) {
            return true;
        }

        return false;
    },

    validateQuery: function (id) {
        "use strict";
        return !(id === undefined || id === "");
    }

};

var validator = new Validator();

/**
 * Supported IDs are:
 *  - Ontology terms (NAMESPACE:ID)
 *  - SGD ID
 * @param req
 * @param res
 */
exports.getByID = function (req, res) {
    "use strict";

    var id = req.params.id;

    //if (!validator.validate(id)) {
    //    console.log("INVALID: " + id);
    //    res.json(EMPTY_OBJ);
    //    return;
    //}

    // URL to get node by ID from Rexter
    var fullUrl = BASE_URL + "vertices?key=name&value=" + id.toUpperCase();

    var options = {
        url: fullUrl,
        headers: {
            'Accept': 'application/json'
        }
    };

    request.get(options, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;

            if (resultArray instanceof Array && resultArray.length !== 0) {
                res.json(resultArray[0]);
            } else {
                res.json(EMPTY_OBJ);
            }
        } else {
            console.warn('Could not get data for: ' + id);
            res.json(EMPTY_OBJ);
        }
    });
};

exports.getByQuery = function (req, res) {
    "use strict";

    var nameSpace = req.params.namespace;
    var rawQuery = req.params.query;
    console.log('Query = ' + rawQuery);
    console.log('NameSpace = ' + nameSpace);

    // Validate
    if (validator.validateQuery(rawQuery) === false) {
        res.json(EMPTY_ARRAY);
        return;
    }

    var phrase = rawQuery.match(/"[^"]*(?:""[^"]*)*"/g);
    console.log(phrase);

    var queryArray = [];

    var queryString = "";
    var wordsString = rawQuery;
    _.each(phrase, function (entry) {
        console.log("PH =: " + entry);
        var noQ = entry.replace(/\"/g, "");
        queryArray.push(noQ);
        noQ = noQ.replace(" ", "?");
        console.log("PH2 =: " + noQ);
        queryString = queryString + "*" + noQ + "* ";
        wordsString = wordsString.replace(entry, "");
        console.log("Cur string =: " + queryString);
    });

    console.log("Phrase string =: " + queryString);

    var words = wordsString.split(/ +/);
    var wordsCount = words.length;
    var idx = 0;
    _.each(words, function (word) {
        if (word !== "") {
            queryArray.push(word);
            if (idx === 0 && queryString === "") {
                queryString = queryString + "*" + word + "* ";
            } else {
                queryString = queryString + "AND *" + word + "* ";
            }
        }
    });


    queryString = queryString.replace(/:/, "?");
    queryString = queryString.substring(0, queryString.length - 1);

    console.log("Final String = " + queryString);
    var fullUrl = BASE_URL + "tp/gremlin?params={query:'" + queryString + "'}&script=keywordSearch()&load=[bykeyword]"
        + "&rexster.returnKeys=[name,label,BP Definition,CC Definition,MF Definition," +
        "BP Annotation,CC Annotation,MF Annotation,SGD Gene Description,def]";

    console.log('FULL URL = ' + fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            try {
                var results = JSON.parse(body);
            } catch (ex) {
                console.log("Could not parse JSON: " + ex);
                res.json(EMPTY_ARRAY);
                return;
            }

            var resultArray = results.results;
            if (resultArray !== null && resultArray !== undefined && resultArray.length !== 0) {
                // Filter result
                var filteredResults = [];
                _.each(resultArray, function (entry) {
                    if (entry.name.indexOf(nameSpace) !== -1) {
                        filteredResults.push(entry);
                    }
                });

                filteredResults.unshift({queryArray: queryArray});
                res.json(filteredResults);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });

    function processResult() {

    }
};

exports.getByNames = function (req, res) {

    "use strict";
    var TH = 500;

    var names = req.params.names;
    var nameList = names.split(' ');
    var numberOfNames = nameList.length;

    var taskArray = [];

    if (numberOfNames > TH) {
        var blocks = Math.floor(numberOfNames / TH);
        var mod = numberOfNames % TH;

        var idx = 0;
        for (var i = 1; i <= blocks; i++) {
            var nameBlock = '';
            var maxIdx = i * TH;
            for (idx; idx < maxIdx; idx++) {

                nameBlock += nameList[idx] + ' ';
            }

            var blockUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + nameBlock + "')" +
                "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
            taskArray.push(
                function (callback) {
                    fetch(blockUrl, callback);
                }
            );
        }

        var lastBlock = '';
        for(idx; idx<numberOfNames; idx++) {
            lastBlock += nameList[idx] + ' ';
        }

        var lastUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + lastBlock + "')" +
            "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
        taskArray.push(
            function (callback) {
                fetch(lastUrl, callback);
            }
        );


    } else {
        var fullUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex').query('name', '" + names + "')" +
            "&rexster.returnKeys=[name,Assigned Genes,Assigned Orfs]";
        taskArray.push(
            function (callback) {
                fetch(fullUrl, callback);
            }
        );
    }


    async.parallel(

        taskArray,

        function (err, results) {
            if (err) {
                console.log(err);
                res.json(EMPTY_ARRAY);
            } else {
                var genes = [];
                _.each(results, function(result) {
                    genes = genes.concat(result);
                });

                res.json(genes);
            }
        });


    function fetch(fullUrl, callback) {
        request.get(fullUrl, function (err, rest_res, body) {
            if (!err) {
                var results = {};
                try {
                    results = JSON.parse(body);
                } catch (ex) {
                    console.error("Parse error: " + ex);
                    callback(null, EMPTY_ARRAY);
                }

                var resultArray = results.results;
                if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                    callback(null, resultArray);
                } else {
                    callback(null, EMPTY_ARRAY);
                }
            } else {
                console.error("ERROR! " + err.toString());
                callback(null, EMPTY_ARRAY);
            }
        });
    }
};


exports.getByGeneQuery = function (req, res) {

    "use strict";

    var rawQuery = req.params.query;
    console.log('Query = ' + rawQuery);

    // Validate
    if (validator.validateQuery(rawQuery) === false) {
        res.json(EMPTY_ARRAY);
        return;
    }

    var geneIds = rawQuery.split(/ +/g);
    var query = "";

    for (var i = 0; i < geneIds.length; i++) {
        if (i === geneIds.length - 1) {
            query += "*" + geneIds[i] + "*";
        } else {
            query += "*" + geneIds[i] + "* AND ";
        }
    }

    var fullUrl = BASE_URL + "tp/gremlin?params={query='" + query + "'}&script=search()&load=[bygene]" +
        "&rexster.returnKeys=[name,label,Assigned Genes,Assigned Orfs,Assigned Gene Synonyms]";
    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.searchByTerm = function (req, res) {

    "use strict";

    var REGEX_ATGO_ID = /^\d+?/;

    var rawQuery = req.params.query;
    console.log('Query = ' + rawQuery);

    // Validate
    if (rawQuery === undefined || rawQuery === '') {
        res.json(EMPTY_ARRAY);
        return;
    }

    var geneIds = rawQuery.split(/ +/g);
    var query = "";

    for (var i = 0; i < geneIds.length; i++) {
        var q = geneIds[i];

        if(!REGEX_ATGO_ID.test(q)) {
            q = "*" + q + "*";
        }

        if (i === geneIds.length - 1) {
            query += q;
        } else {
            query += q + " AND ";
        }
    }

    var fullUrl = BASE_URL + "tp/gremlin?params={query='" + query + "'}&script=searchByTerm()&load=[byterm]";
    console.log(fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.getByKeyword = function (req, res) {

    'use strict';

    var rawQuery = req.params.query;
    console.log('Keyword Query = ' + rawQuery);

    // Validate
    if (rawQuery === undefined || rawQuery === '') {
        res.json(EMPTY_ARRAY);
        return;
    }

    var geneIds = rawQuery.split(/ +/g);
    var query = "";

    for (var i = 0; i < geneIds.length; i++) {
        if (i === geneIds.length - 1) {
            query += "*" + geneIds[i] + "*";
        } else {
            query += "*" + geneIds[i] + "* AND ";
        }
    }

    var fullUrl = BASE_URL + "tp/gremlin?params={query='" + query + "'}&script=keywordSearch()&load=[bykeyword]";

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};

exports.getRawInteractions = function (req, res) {
    "use strict";

    var id = req.params.id;

    // Get all assigned genes for the given ontology term
    var fullUrl = BASE_URL + "indices/Vertex?key=name&value=" + id.toLowerCase() + "&rexster.returnKeys=[name, assigned_genes]";

    console.log(fullUrl);

    request.get(fullUrl, function (err, rest_res, body) {
        if (!err) {
            var results = [];
            try {
                results = JSON.parse(body);
            } catch (ex) {
                res.json(EMPTY_CYNETWORK);
            }

            var resultArray = results.results;
            if (resultArray !== undefined && resultArray instanceof Array && resultArray.length !== 0) {

                // Assume there is only one term for query
                var queryTerm = resultArray[0];
                var isGene = false;

                var geneArray = [];
                if(queryTerm['assigned_genes'] === undefined) {
                    // This is a gene node:
                    geneArray.push(queryTerm['name']);
                    isGene = true;
                } else {
                    geneArray = queryTerm["assigned_genes"];
                }

                if(geneArray === undefined || geneArray.length === 0) {
                    res.json(EMPTY_CYNETWORK);
                    return;
                }

                var geneString = geneArray.toString();
                var genes = geneString.replace(/,/g, " ");
                genes = genes.toLowerCase();

                // Too many results
                var numGenes = genes.split(" ").length;
                if (numGenes > GENE_COUNT_THRESHOLD) {
                    console.log("TOO MANY inputs: " + numGenes);
                    res.json(EMPTY_CYNETWORK);
                    return;
                } else {
                    console.log("Got assigned genes: " + numGenes);
                }

                var nextUrl = '';

                if(isGene) {
                    nextUrl = BASE_URL + "tp/gremlin?params={query='" + genes +
                      "'}&script=getRawInteractionsForGenes()&load=[getinteractions]";

                } else {
                    nextUrl = BASE_URL + "tp/gremlin?params={query='" + genes +
                      "'}&script=getRawInteractions()&load=[getinteractions]";
                }

                console.log(nextUrl);

                request.get(nextUrl, function (err2, rest_res2, body2) {
                    if (!err2) {
                        var results = [];
                        try {
                            results = JSON.parse(body2);
                        } catch (ex2) {
                            res.json(EMPTY_CYNETWORK);
                            return;
                        }

                        var resultArray = results.results;
                        if (resultArray !== undefined && resultArray.length !== 0) {
                            var graph = graphUtil.generateInteractions(resultArray);
                            var returnValue = {
                                graph: graph
                            };
                            res.json(returnValue);
                        } else {
                            res.json(EMPTY_CYNETWORK);
                        }
                    } else {
                        res.json(EMPTY_CYNETWORK);
                    }
                });
            } else {
                res.json(EMPTY_CYNETWORK);
            }
        } else {
            console.error("Error loading raw interactions.");
            res.json(EMPTY_CYNETWORK);
        }
    });
};

exports.getPath = function (req, res) {
    "use strict";

    var id = req.params.id;

    var ns = "";
    if (id.match(/S/)) {
        ns = "NEXO";
    } else {
        ns = id.split(":")[0];
    }

    id = id.toLowerCase();

    var self = this;
    async.parallel([
        function (callback) {
            findPath(callback);
        },
        function (callback) {
            getNeighbor(callback);
        }
    ], function (err, results) {
        if (err) {
            console.log("Error in Path finding function.");
            console.log(err);
            res.json(EMPTY_ARRAY);
        } else {
            console.log("Found Path:");
            console.log(results);

            // Shortest path to the root.
            var mainPath = results[0];

            // First neighbours
            _.each(results[1], function (neighbor) {
                mainPath.push([id, neighbor]);
            });
            res.json(mainPath);
        }
    });

    /**
     * Get parents and children.  This includes both child term(s) and additional_gene_association
     * edges.
     *
     * @param callback
     */
    function getNeighbor(callback) {

        // Get all TERMS connected FROM this term node
        var url = BASE_URL + "tp/gremlin?script=g.idx('Vertex')[[name: '" + id + "']]" +
            ".outE.filter{it.label == 'child_of'}.inV&rexster.returnKeys=[name]";

        console.log("Neighbour:");
        console.log(url);

        request.get(url, function (err, rest_res, body) {
            if (!err) {
                var results = JSON.parse(body);
                var resultArray = results.results;
                if (resultArray !== undefined && resultArray.length !== 0) {
                    // Simply extract node IDs.  Those are 1st neighbor.
                    var neighborList = [];
                    _.each(resultArray, function (neighbor) {
                        neighborList.push(neighbor.name);
                    });
                    callback(null, neighborList);
                } else {
                    callback(null, EMPTY_ARRAY);
                }
            }
        });
    }

    function findPath(callback) {

        var rootNode = ROOTS.atgo;

        var nexoUrl = BASE_URL + "tp/gremlin?script=g.idx('Vertex')[[name: '" + id + "']]" +
            ".as('x').outE.filter{it.label == 'child_of'}" +
            ".inV.loop('x'){it.loops < 15}" +
            "{it.object.name=='" + rootNode + "'}.path&rexster.returnKeys=[name]";

        console.log(nexoUrl);

        request.get(nexoUrl, function (err, rest_res, body) {
            if (!err) {
                var results = JSON.parse(body);
                var resultArray = results.results;
                if (resultArray !== undefined && resultArray.length !== 0) {
                    callback(null, graphUtil.edgeListGenerator(resultArray));
                } else {
                    callback(null, EMPTY_ARRAY);
                }
            }
        });
    }
};


exports.getGeneNames = function (req, res) {
    "use strict";

    console.log('@@@@@@@ GET GENES @@@@@@@@');

    var id = req.params.id;
    var getGraphUrl = BASE_URL + "tp/gremlin?script=";

    getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
        ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}" +
        ".inV&rexster.returnKeys=[name]";

    console.log('@@@@@@@ ger genes URL = ' + getGraphUrl);

    request.get(getGraphUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};


//
// Handle POST for list of genes.
//
exports.getGeneNamesByPost = function (req, res) {
    'use strict';

    var id = req.params.id;

    var getGraphUrl = BASE_URL + "tp/gremlin?script=";

    getGraphUrl = getGraphUrl + "g.V.has('name', '" + id + "')" +
        ".as('x').outE.filter{it.label != 'raw_interaction'}.filter{it.label != 'additional_gene_association'}" +
        ".inV&rexster.returnKeys=[name]";

    console.log('URL = ' + getGraphUrl);

    request.get(getGraphUrl, function (err, rest_res, body) {
        if (!err) {
            var results = JSON.parse(body);
            var resultArray = results.results;
            if (resultArray !== undefined && resultArray.length !== 0) {
                res.json(resultArray);
            } else {
                res.json(EMPTY_ARRAY);
            }
        }
    });
};


exports.enrich = function (req, res) {
    'use strict';

    var genes = req.body.genes;
    var alphaStr = req.body.alpha;
    var ontologyType = req.body.type;

    var min = req.body['min-assigned'];

    var alpha = 0.01;

    if (alphaStr === undefined) {
        alpha = 0.01;
    } else {
        alpha = parseFloat(alphaStr);
    }

    if (ontologyType === undefined) {
        ontologyType = 'NEXO';
    }

    var parameter = {
        form: {
            'genes': genes,
            'alpha': alpha,
            'min-assigned': min,
            'type': ontologyType
        }
    };

    request.post(
        ENRICH_URL,
        parameter,
        function (err, rest_res, body) {
            if (!err) {
                console.log(body);
                var resultObj = {};
                try {
                    resultObj = JSON.parse(body);
                } catch (ex) {
                    console.warn("Could not parse enrich result: " + resultObj);
                    res.json(EMPTY_OBJ);
                    return;
                }

                console.log(resultObj);

                if (resultObj === undefined) {
                    res.json(EMPTY_OBJ);
                } else {
                    res.json(resultObj);
                }
            }
        });
};