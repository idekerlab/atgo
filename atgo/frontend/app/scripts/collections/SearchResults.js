/**
 * Created with JetBrains WebStorm.
 * User: kono
 * Date: 2013/07/15
 * Time: 14:57
 * To change this template use File | Settings | File Templates.
 */

/*global define*/

define([

    'backbone'

], function (Backbone) {

    'use strict';

    var REGEX_GENE = /^[A-Za-z]/;

    return Backbone.Collection.extend({

        comparator: function (model1, model2) {

            var termId1 = model1.get('name');
            var termId2 = model2.get('name');

            if(termId1 === undefined && termId1 === '') {
                termId1 = '';
            }
            if(termId2 === undefined && termId2 === '') {
                termId2 = '';
            }

            var isGene1 = REGEX_GENE.test(termId1);
            var isGene2 = REGEX_GENE.test(termId2);

            // case 1: both of them are gene names
            if(isGene1 && isGene2 === false) {
                return -1;
            }

            if(isGene1 === false && isGene2) {
                return 1;
            }

            return termId1.localeCompare(termId2);

        }
    });
});
