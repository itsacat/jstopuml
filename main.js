var doctrine = require("doctrine");
var fs = require('fs');
var recursiveReadSync = require('recursive-readdir-sync');
var glob = require('glob');
var lodash = require('lodash');

//var filesPath = glob.sync('../collectivoo/blocks/l-app/**/*.js');
var filesPath = glob.sync('../quiz/blocks/l-quiz/**/*.js');
//var filesPath = glob.sync('../sber-together/**/b-card.js');
var classStorage = {};

filesPath.map(function(filePath) {
    var file = fs.readFileSync(filePath, 'utf8');
    if (file.indexOf('goog.provide') >= 0 || file.indexOf('goog.module') >= 0) {
        var jsclass = {
            file: file
        };

        if (file.indexOf('goog.provide') >= 0)
            var namespace = file.match(/goog.provide\('(.*)'\);/)[1];

        if (file.indexOf('goog.module') >= 0)
            namespace = file.match(/goog.module\('(.*)'\);/)[1];

        classStorage[namespace] = jsclass;
    }
});

for (var j in classStorage) {
    var jsclass = classStorage[j];
    var file = jsclass.file;
    delete jsclass.file;

    var regex = /[^\S\r\n]*\/(?:\*{2})([\W\w]+?)\*\/([\W\w]+?)?(?=\s+\/\*{1,2}|$)/g;

    var matches, jsdocs = [];
    while (matches = regex.exec(file)) {
        jsdocs.push(matches[1]);
    }

    jsdocs.map(function(jsdoc) {
        var tags = doctrine.parse(jsdoc, { unwrap: true }).tags;

        tags.map(function(tag) {
            if (tag.title == 'extends') {
                jsclass.extends = tag.type.name;
            }

            if (tag.title == 'type' && (tag.type.name || tag.type.applications)) {
                jsclass.associations = jsclass.associations ? jsclass.associations : [];

                if (tag.type.name && !isBaseType(tag.type.name)) {
                    jsclass.associations.push(tag.type.name);
                }

                if (tag.type.applications && !isBaseType(tag.type.applications[0].name)) {
                    jsclass.associations.push(tag.type.applications[0].name);
                }

                //TODO перечисления через |
            }
        })
    });

    if (jsclass.associations) {
        jsclass.associations = lodash.uniq(jsclass.associations);
    }
}

function isBaseType(type) {
    if (type == 'string' ||
        type == 'String' ||
        type == 'object' ||
        type == 'Object' ||
        type == 'number' ||
        type == 'Number' ||
        type == 'array' ||
        type == 'Array' ||
        type == 'bool' ||
        type == 'Bool' ||
        type == 'boolean' ||
        type == 'Boolean' ||
        type == 'int'
        )
        return true;
}

function getName(namespace) {
    if (namespace == undefined || namespace.indexOf('.') == -1) {
        return namespace;
    } else {
        return namespace.split('.').pop();
    }
}

var umlText = '@startuml\n';
for (var namespace in classStorage) {
    var jsclass = classStorage[namespace];

    if (getName(namespace) !== 'View') {
        if (jsclass.extends) {
            if (jsclass.extends == 'cl.iControl.Control') {
                umlText += 'class ' + getName(namespace);
                umlText += ' <extend ' + getName(jsclass.extends) + '>';

            } else {
                umlText += 'class ' + getName(jsclass.extends) + ' <|-- ' + getName(namespace);
            }
            umlText += '\n';
        }


        if (jsclass.associations) {
            jsclass.associations.forEach(function (association) {
                if (getName(association) !== 'View') {
                    umlText += getName(namespace) + ' --> ' + getName(association);
                    umlText += '\n';
                }
            })
        }

        umlText += '\n';
    }
}

umlText += '@enduml';


//console.log(classStorage);
fs.writeFileSync('uml.pu', umlText, 'utf8');
