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

    return Backbone.Collection.extend({

        comparator: function (model) {

            var termId = model.get('name');

            if(termId !== undefined && termId !== '') {
                return termId;
            } else {
                return '';
            }
            
        }
    });
});
