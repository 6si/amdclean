/*! amdclean - v2.1.0 - 2014-06-06
* http://gregfranko.com/amdclean
* Copyright (c) 2014 Greg Franko */


/*The MIT License (MIT)

Copyright (c) 2014 Greg Franko

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

;(function(esprima, estraverse, escodegen, _) {
// defaultOptions.js
// =================
// AMDclean default options
var defaultOptions, errorMsgs, defaultValues, utils, convertToIIFE, convertToIIFEDeclaration, normalizeModuleName, convertToFunctionExpression, convertToObjectDeclaration, createAst, convertDefinesAndRequires, traverseAndUpdateAst, getNormalizedModuleName, findAndStoreAllModuleIds, generateCode, clean;
defaultOptions = {
    'code': '',
    'filePath': '',
    'globalModules': [],
    'esprima': {
        'comment': true,
        'loc': true,
        'range': true,
        'tokens': true
    },
    'escodegen': {
        'comment': true,
        'format': { 'indent': { 'adjustMultilineComment': true } }
    },
    'commentCleanName': 'amdclean',
    'ignoreModules': [],
    'removeModules': [],
    'removeAllRequires': false,
    'removeUseStricts': true,
    'transformAMDChecks': true,
    'createAnonymousAMDModule': false,
    'shimOverrides': {},
    'prefixMode': 'standard',
    'prefixTransform': function (moduleName) {
        return moduleName;
    },
    'wrap': {
        'start': ';(function() {\n',
        'end': '\n}());'
    },
    'aggressiveOptimizations': false
};
// errorMsgs.js
// ============
// AMDclean error messages
errorMsgs = {
    'emptyCode': 'There is no code to generate the AST with',
    'emptyAst': function (methodName) {
        return 'An AST is not being passed to the ' + methodName + '() method';
    },
    'invalidObject': function (methodName) {
        return 'An object is not being passed as the first parameter to the ' + methodName + '() method';
    },
    'lodash': 'Make sure you have included lodash (https://github.com/lodash/lodash).',
    'esprima': 'Make sure you have included esprima (https://github.com/ariya/esprima).',
    'estraverse': 'Make sure you have included estraverse (https://github.com/Constellation/estraverse).',
    'escodegen': 'Make sure you have included escodegen (https://github.com/Constellation/escodegen).'
};
// defaultValues.js
// ================
// Stores static default values
defaultValues = {
    'dependencyBlacklist': {
        'require': 'remove',
        'exports': true,
        'module': 'remove'
    },
    'defaultLOC': {
        'start': {
            'line': 0,
            'column': 0
        }
    },
    'defaultRange': [
        0,
        0
    ]
};
// utils.js
// ========
// Abstract Syntax Tree (AST) and other helper utility methods
utils = function () {
    var utils = {
            'isDefine': function (node) {
                var expression = node.expression || {}, callee = expression.callee;
                return _.isObject(node) && node.type === 'ExpressionStatement' && expression && expression.type === 'CallExpression' && callee.type === 'Identifier' && callee.name === 'define';
            },
            'isRequire': function (node) {
                var expression = node.expression || {}, callee = expression.callee;
                return node && node.type === 'ExpressionStatement' && expression && expression.type === 'CallExpression' && callee.type === 'Identifier' && callee.name === 'require';
            },
            'isModuleExports': function (node) {
                if (!node) {
                    return false;
                }
                return node.type === 'AssignmentExpression' && node.left && node.left.type === 'MemberExpression' && node.left.object && node.left.object.type === 'Identifier' && node.left.object.name === 'module' && node.left.property && node.left.property.type === 'Identifier' && node.left.property.name === 'exports';
            },
            'isRequireExpression': function (node) {
                return node.type === 'CallExpression' && node.callee && node.callee.name === 'require';
            },
            'isObjectExpression': function (expression) {
                return expression && expression && expression.type === 'ObjectExpression';
            },
            'isFunctionExpression': function (expression) {
                return expression && expression && expression.type === 'FunctionExpression';
            },
            'isFunctionCallExpression': function (expression) {
                return expression && expression && expression.type === 'CallExpression' && expression.callee && expression.callee.type === 'FunctionExpression';
            },
            'isUseStrict': function (expression) {
                return expression && expression && expression.value === 'use strict' && expression.type === 'Literal';
            },
            'isAMDConditional': function (node) {
                if (node && node.type !== 'IfStatement' || !node.test || !node.test.left) {
                    return false;
                }
                var matchObject = {
                        'left': {
                            'operator': 'typeof',
                            'argument': {
                                'type': 'Identifier',
                                'name': 'define'
                            }
                        },
                        'right': {
                            'type': 'Literal',
                            'value': 'function'
                        }
                    };
                try {
                    return _.where(node.test, matchObject).length || _.where([node.test], matchObject).length || _.where(node.test.left, matchObject).length || _.where([node.test.left], matchObject).length;
                } catch (e) {
                    return false;
                }
            },
            'returnExpressionIdentifier': function (name) {
                return {
                    'type': 'ExpressionStatement',
                    'expression': {
                        'type': 'Identifier',
                        'name': name,
                        'range': defaultValues.defaultRange,
                        'loc': defaultValues.defaultLOC
                    },
                    'range': defaultValues.defaultRange,
                    'loc': defaultValues.defaultLOC
                };
            },
            'readFile': function (path) {
                if (typeof exports !== 'undefined') {
                    var fs = require('fs');
                    return fs.readFileSync(path, 'utf8');
                } else {
                    return '';
                }
            },
            'isRelativeFilePath': function (path) {
                var segments = path.split('/');
                return segments.length !== -1 && (segments[0] === '.' || segments[0] === '..');
            },
            convertToCamelCase: function (input, delimiter) {
                delimiter = delimiter || '_';
                return input.replace(new RegExp(delimiter + '(.)', 'g'), function (match, group1) {
                    return group1.toUpperCase();
                });
            },
            'prefixReservedWords': function (name) {
                var reservedWord = false;
                try {
                    if (name.length) {
                        eval('var ' + name + ' = 1;');
                    }
                } catch (e) {
                    reservedWord = true;
                }
                if (reservedWord === true) {
                    return '_' + name;
                } else {
                    return name;
                }
            },
            'normalizeDependencyName': function (moduleId, dep) {
                if (!moduleId || !dep || !utils.isRelativeFilePath(dep)) {
                    return dep;
                }
                var normalizePath = function (path) {
                        var segments = path.split('/'), normalizedSegments;
                        normalizedSegments = _.reduce(segments, function (memo, segment) {
                            switch (segment) {
                            case '.':
                                break;
                            case '..':
                                memo.pop();
                                break;
                            default:
                                memo.push(segment);
                            }
                            return memo;
                        }, []);
                        return normalizedSegments.join('/');
                    }, baseName = function (path) {
                        var segments = path.split('/');
                        segments.pop();
                        return segments.join('/');
                    };
                return normalizePath([
                    baseName(moduleId),
                    dep
                ].join('/'));
            }
        };
    return utils;
}();
// convertToIIFE.js
// ================
// Returns an IIFE
//  e.g. (function() { }())
convertToIIFE = function convertToIIFE(obj) {
    var callbackFuncParams = obj.callbackFuncParams, callbackFunc = obj.callbackFunc, dependencyNames = obj.dependencyNames, node = obj.node, range = node.range || defaultValues.defaultRange, loc = node.loc || defaultValues.defaultLOC;
    return {
        'type': 'ExpressionStatement',
        'expression': {
            'type': 'CallExpression',
            'callee': {
                'type': 'FunctionExpression',
                'id': null,
                'params': callbackFuncParams,
                'defaults': [],
                'body': callbackFunc.body,
                'rest': callbackFunc.rest,
                'generator': callbackFunc.generator,
                'expression': callbackFunc.expression,
                'range': range,
                'loc': loc
            },
            'arguments': dependencyNames,
            'range': range,
            'loc': loc
        },
        'range': range,
        'loc': loc
    };
};
// convertToIIFEDeclaration.js
// ===========================
// Returns a function expression that is executed immediately
// e.g. var example = function(){}()
convertToIIFEDeclaration = function convertToIIFEDeclaration(obj) {
    var moduleName = obj.moduleName, callbackFuncParams = obj.callbackFuncParams, isOptimized = obj.isOptimized, callback = obj.callbackFunc, node = obj.node, name = callback.name, type = callback.type, range = node.range || defaultValues.defaultRange, loc = node.loc || defaultValues.defaultLOC, callbackFunc = function () {
            var cbFunc = obj.callbackFunc;
            if (type === 'Identifier' && name !== 'undefined') {
                cbFunc = {
                    'type': 'FunctionExpression',
                    'id': null,
                    'params': [],
                    'defaults': [],
                    'body': {
                        'type': 'BlockStatement',
                        'body': [{
                                'type': 'ReturnStatement',
                                'argument': {
                                    'type': 'ConditionalExpression',
                                    'test': {
                                        'type': 'BinaryExpression',
                                        'operator': '===',
                                        'left': {
                                            'type': 'UnaryExpression',
                                            'operator': 'typeof',
                                            'argument': {
                                                'type': 'Identifier',
                                                'name': name,
                                                'range': range,
                                                'loc': loc
                                            },
                                            'prefix': true,
                                            'range': range,
                                            'loc': loc
                                        },
                                        'right': {
                                            'type': 'Literal',
                                            'value': 'function',
                                            'raw': '\'function\'',
                                            'range': range,
                                            'loc': loc
                                        },
                                        'range': range,
                                        'loc': loc
                                    },
                                    'consequent': {
                                        'type': 'CallExpression',
                                        'callee': {
                                            'type': 'Identifier',
                                            'name': name,
                                            'range': range,
                                            'loc': loc
                                        },
                                        'arguments': callbackFuncParams,
                                        'range': range,
                                        'loc': loc
                                    },
                                    'alternate': {
                                        'type': 'Identifier',
                                        'name': name,
                                        'range': range,
                                        'loc': loc
                                    },
                                    'range': range,
                                    'loc': loc
                                },
                                'range': range,
                                'loc': loc
                            }],
                        'range': range,
                        'loc': loc
                    },
                    'rest': null,
                    'generator': false,
                    'expression': false,
                    'range': range,
                    'loc': loc
                };
            }
            return cbFunc;
        }(), dependencyNames = obj.dependencyNames, cb = function () {
            if (callbackFunc.type === 'Literal' || callbackFunc.type === 'Identifier' && callbackFunc.name === 'undefined' || isOptimized === true) {
                return callbackFunc;
            } else {
                return {
                    'type': 'CallExpression',
                    'callee': {
                        'type': 'FunctionExpression',
                        'id': {
                            'type': 'Identifier',
                            'name': '',
                            'range': range,
                            'loc': loc
                        },
                        'params': callbackFuncParams,
                        'defaults': [],
                        'body': callbackFunc.body,
                        'rest': callbackFunc.rest,
                        'generator': callbackFunc.generator,
                        'expression': callbackFunc.expression,
                        'range': range,
                        'loc': loc
                    },
                    'arguments': dependencyNames,
                    'range': range,
                    'loc': loc
                };
            }
        }(), updatedNode = {
            'type': 'ExpressionStatement',
            'expression': {
                'type': 'AssignmentExpression',
                'operator': '=',
                'left': {
                    'type': 'Identifier',
                    'name': moduleName,
                    'range': range,
                    'loc': loc
                },
                'right': cb,
                'range': range,
                'loc': loc
            },
            'range': range,
            'loc': loc
        };
    estraverse.replace(callbackFunc, {
        'enter': function (node) {
            if (utils.isModuleExports(node)) {
                return {
                    'type': 'AssignmentExpression',
                    'operator': '=',
                    'left': {
                        'type': 'Identifier',
                        'name': 'exports'
                    },
                    'right': node.right
                };
            } else {
                return node;
            }
        }
    });
    return updatedNode;
};
// normalizeModuleName.js
// ======================
// Returns a normalized module name (removes relative file path urls)
normalizeModuleName = function normalizeModuleName(name, moduleId) {
    var amdclean = this, options = amdclean.options, prefixMode = options.prefixMode, prefixTransform = options.prefixTransform, dependencyBlacklist = defaultValues.dependencyBlacklist, prefixTransformValue, preNormalized, postNormalized;
    name = name || '';
    if (name === '{}') {
        if (dependencyBlacklist[name] === 'remove') {
            return '';
        } else {
            return name;
        }
    }
    preNormalized = utils.prefixReservedWords(name.replace(/\./g, '').replace(/[^A-Za-z0-9_$]/g, '_').replace(/^_+/, ''));
    postNormalized = prefixMode === 'camelCase' ? utils.convertToCamelCase(preNormalized) : preNormalized;
    if (_.isFunction(prefixTransform)) {
        prefixTransformValue = prefixTransform(postNormalized, moduleId);
        if (_.isString(prefixTransformValue) && prefixTransformValue.length) {
            return prefixTransformValue;
        }
    }
    return postNormalized;
};
// convertToFunctionExpression.js
// ==============================
// Returns either an IIFE or variable declaration.
// Internally calls either convertToIIFE() or convertToIIFEDeclaration()
convertToFunctionExpression = function convertToFunctionExpression(obj) {
    var amdclean = this, options = amdclean.options, ignoreModules = options.ignoreModules, node = obj.node, isDefine = obj.isDefine, isRequire = obj.isRequire, isOptimized = false, moduleName = obj.moduleName, moduleId = obj.moduleId, dependencies = obj.dependencies, depLength = dependencies.length, aggressiveOptimizations = options.aggressiveOptimizations, exportsExpressions = [], moduleExportsExpressions = [], defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = obj.range || defaultRange, loc = obj.loc || defaultLOC, callbackFunc = function () {
            var callbackFunc = obj.moduleReturnValue, body, returnStatements, firstReturnStatement, returnStatementArg;
            // If the module callback function is not empty
            if (callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length) {
                // Filter 'use strict' statements
                body = _.filter(callbackFunc.body.body, function (node) {
                    if (options.removeUseStricts === true) {
                        return !utils.isUseStrict(node.expression);
                    } else {
                        return node;
                    }
                });
                // Returns an array of all return statements
                returnStatements = _.where(body, { 'type': 'ReturnStatement' });
                exportsExpressions = _.where(body, {
                    'left': {
                        'type': 'Identifier',
                        'name': 'exports'
                    }
                });
                moduleExportsExpressions = _.where(body, {
                    'left': {
                        'type': 'MemberExpression',
                        'object': {
                            'type': 'Identifier',
                            'name': 'module'
                        },
                        'property': {
                            'type': 'Identifier',
                            'name': 'exports'
                        }
                    }
                });
                // If there is a return statement
                if (returnStatements.length) {
                    firstReturnStatement = returnStatements[0];
                    returnStatementArg = firstReturnStatement.argument;
                    // If something other than a function expression is getting returned
                    // and there is more than one AST child node in the factory function
                    // return early
                    if (!utils.isFunctionExpression(firstReturnStatement) && body.length > 1 || returnStatementArg && returnStatementArg.type === 'Identifier') {
                        return callbackFunc;
                    } else {
                        // Optimize the AMD module by setting the callback function to the return statement argument
                        callbackFunc = returnStatementArg;
                        isOptimized = true;
                        if (callbackFunc.params) {
                            depLength = callbackFunc.params.length;
                        }
                    }
                }
            } else if (callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length === 0) {
                callbackFunc = {
                    'type': 'Identifier',
                    'name': 'undefined',
                    'range': range,
                    'loc': loc
                };
                depLength = 0;
            }
            return callbackFunc;
        }(), hasReturnStatement = function () {
            var returns = [];
            if (callbackFunc && callbackFunc.body && _.isArray(callbackFunc.body.body)) {
                returns = _.where(callbackFunc.body.body, { 'type': 'ReturnStatement' });
                if (returns.length) {
                    return true;
                }
            }
            return false;
        }(), originalCallbackFuncParams, hasExportsParam = function () {
            var cbParams = callbackFunc.params || [];
            return _.where(cbParams, { 'name': 'exports' }).length;
        }(), normalizeDependencyNames = {}, dependencyNames = function () {
            var deps = [], currentName;
            _.each(dependencies, function (currentDependency) {
                currentName = normalizeModuleName.call(amdclean, utils.normalizeDependencyName(moduleId, currentDependency), moduleId);
                normalizeDependencyNames[currentName] = true;
                deps.push({
                    'type': 'Identifier',
                    'name': currentName,
                    'range': defaultRange,
                    'loc': defaultLOC
                });
            });
            return deps;
        }(),
        // Makes sure the new name is not an existing callback function dependency and/or existing local variable
        findNewParamName = function findNewParamName(name) {
            name = '_' + name + '_';
            var containsLocalVariable = function () {
                    var containsVariable = false;
                    if (normalizeDependencyNames[name]) {
                        containsVariable = true;
                    } else {
                        estraverse.traverse(callbackFunc, {
                            'enter': function (node) {
                                if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier' && node.id.name === name) {
                                    containsVariable = true;
                                }
                            }
                        });
                    }
                    return containsVariable;
                }();
            // If there is not a local variable declaration with the passed name, return the name and surround it with underscores
            // Else if there is already a local variable declaration with the passed name, recursively add more underscores surrounding it
            if (!containsLocalVariable) {
                return name;
            } else {
                return findNewParamName(name);
            }
        }, matchingRequireExpressionNames = function () {
            var matchingNames = [];
            if (hasExportsParam) {
                estraverse.traverse(callbackFunc, {
                    'enter': function (node) {
                        var variableName, expressionName;
                        if (node.type === 'VariableDeclarator' && utils.isRequireExpression(node.init)) {
                            // If both variable name and expression names are there
                            if (node.id && node.id.name && node.init && node.init['arguments'] && node.init['arguments'][0] && node.init['arguments'][0].value) {
                                variableName = node.id.name;
                                expressionName = normalizeModuleName.call(amdclean, node.init['arguments'][0].value);
                                if (!_.contains(ignoreModules, expressionName) && variableName === expressionName) {
                                    matchingNames.push({
                                        'originalName': expressionName,
                                        'newName': findNewParamName(expressionName),
                                        'range': node.range || defaultRange,
                                        'loc': node.loc || defaultLOC
                                    });
                                }
                            }
                        }
                    }
                });
            }
            return matchingNames;
        }(), matchingRequireExpressionParams = function () {
            var params = [];
            _.each(matchingRequireExpressionNames, function (currentParam) {
                params.push({
                    'type': 'Identifier',
                    'name': currentParam.newName ? currentParam.newName : currentParam,
                    'range': currentParam.range,
                    'loc': currentParam.loc
                });
            });
            return params;
        }(), callbackFuncParams = function () {
            var deps = [], currentName, cbParams = _.union(callbackFunc.params || dependencyNames || [], matchingRequireExpressionParams), mappedParameter = {};
            _.each(cbParams, function (currentParam, iterator) {
                if (currentParam) {
                    currentName = currentParam.name;
                } else {
                    currentName = dependencyNames[iterator].name;
                }
                if (currentName !== '{}' && (!hasExportsParam || defaultValues.dependencyBlacklist[currentName] !== 'remove')) {
                    deps.push({
                        'type': 'Identifier',
                        'name': currentName,
                        'range': defaultRange,
                        'loc': defaultLOC
                    });
                    // If a callback parameter is not the exact name of a stored module and there is a dependency that matches the current callback parameter
                    if (!isOptimized && aggressiveOptimizations === true && !amdclean.storedModules[currentName] && dependencyNames[iterator]) {
                        // If the current dependency has not been stored
                        if (!amdclean.callbackParameterMap[dependencyNames[iterator].name]) {
                            amdclean.callbackParameterMap[dependencyNames[iterator].name] = [{
                                    'name': currentName,
                                    'count': 1
                                }];
                        } else {
                            mappedParameter = _.where(amdclean.callbackParameterMap[dependencyNames[iterator].name], { 'name': currentName });
                            if (mappedParameter.length) {
                                mappedParameter = mappedParameter[0];
                                mappedParameter.count += 1;
                            } else {
                                amdclean.callbackParameterMap[dependencyNames[iterator].name].push({
                                    'name': currentName,
                                    'count': 1
                                });
                            }
                        }
                    }
                }
            });
            originalCallbackFuncParams = deps;
            // Only return callback function parameters that do not directly match the name of existing stored modules
            return _.filter(deps || [], function (currentParam) {
                return aggressiveOptimizations === true ? !amdclean.storedModules[currentParam.name] : true;
            });
        }(), isCommonJS = !hasReturnStatement && hasExportsParam, hasExportsAssignment = exportsExpressions.length || moduleExportsExpressions.length, dependencyNameLength, callbackFuncParamsLength;
    // Only return dependency names that do not directly match the name of existing stored modules
    dependencyNames = _.filter(dependencyNames || [], function (currentDep, iterator) {
        var mappedCallbackParameter = originalCallbackFuncParams[iterator], currentDepName = currentDep.name;
        // If the matching callback parameter matches the name of a stored module, then do not return it
        // Else if the matching callback parameter does not match the name of a stored module, return the dependency
        return aggressiveOptimizations === true ? !mappedCallbackParameter || amdclean.storedModules[mappedCallbackParameter.name] && mappedCallbackParameter.name === currentDepName ? !amdclean.storedModules[currentDepName] : !amdclean.storedModules[mappedCallbackParameter.name] : true;
    });
    dependencyNameLength = dependencyNames.length;
    callbackFuncParamsLength = callbackFuncParams.length;
    // If the module dependencies passed into the current module are greater than the used callback function parameters, do not pass the dependencies
    if (dependencyNameLength && dependencyNameLength > callbackFuncParamsLength) {
        if (dependencyNameLength - callbackFuncParamsLength < 2) {
            dependencyNames.splice(dependencyNameLength - (callbackFuncParamsLength || 1), callbackFuncParamsLength || 1);
        } else {
            dependencyNames.splice(callbackFuncParamsLength || 1, dependencyNameLength - (callbackFuncParamsLength || 1));
        }
    }
    // If it is a CommonJS module and there is an exports assignment, make sure to return the exports object
    if (isCommonJS && hasExportsAssignment) {
        callbackFunc.body.body.push({
            'type': 'ReturnStatement',
            'argument': {
                'type': 'Identifier',
                'name': 'exports',
                'range': defaultRange,
                'loc': defaultLOC
            },
            'range': defaultRange,
            'loc': defaultLOC
        });
    }
    // Makes sure to update all the local variable require expressions to any updated names
    estraverse.replace(callbackFunc, {
        'enter': function (node) {
            var normalizedModuleName, newName;
            if (utils.isRequireExpression(node)) {
                if (node['arguments'] && node['arguments'][0] && node['arguments'][0].value) {
                    normalizedModuleName = normalizeModuleName.call(amdclean, node['arguments'][0].value);
                    if (_.contains(ignoreModules, normalizedModuleName)) {
                        return node;
                    }
                    if (_.where(matchingRequireExpressionNames, { 'originalName': normalizedModuleName }).length) {
                        newName = _.where(matchingRequireExpressionNames, { 'originalName': normalizedModuleName })[0].newName;
                    }
                    return {
                        'type': 'Identifier',
                        'name': newName ? newName : normalizedModuleName,
                        'range': node.range || defaultRange,
                        'loc': node.loc || defaultLOC
                    };
                } else {
                    return node;
                }
            }
        }
    });
    if (isDefine) {
        return convertToIIFEDeclaration.call(amdclean, {
            'moduleName': moduleName,
            'dependencyNames': dependencyNames,
            'callbackFuncParams': callbackFuncParams,
            'hasExportsParam': hasExportsParam,
            'callbackFunc': callbackFunc,
            'isOptimized': isOptimized,
            'node': node
        });
    } else if (isRequire) {
        return convertToIIFE.call(amdclean, {
            'dependencyNames': dependencyNames,
            'callbackFuncParams': callbackFuncParams,
            'callbackFunc': callbackFunc,
            'node': node
        });
    }
};
// convertToObjectDeclaration.js
// =============================
// Returns an object variable declaration
// e.g. var example = { exampleProp: true }
convertToObjectDeclaration = function (obj, type) {
    var node = obj.node, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = node.range || defaultRange, loc = node.loc || defaultLOC, moduleName = obj.moduleName, moduleReturnValue = function () {
            var modReturnValue, callee, params, returnStatement, nestedReturnStatement, internalFunctionExpression;
            if (type === 'functionCallExpression') {
                modReturnValue = obj.moduleReturnValue;
                callee = modReturnValue.callee;
                params = callee.params;
                if (params && params.length && _.isArray(params) && _.where(params, { 'name': 'global' })) {
                    if (_.isObject(callee.body) && _.isArray(callee.body.body)) {
                        returnStatement = _.where(callee.body.body, { 'type': 'ReturnStatement' })[0];
                        if (_.isObject(returnStatement) && _.isObject(returnStatement.argument) && returnStatement.argument.type === 'FunctionExpression') {
                            internalFunctionExpression = returnStatement.argument;
                            if (_.isObject(internalFunctionExpression.body) && _.isArray(internalFunctionExpression.body.body)) {
                                nestedReturnStatement = _.where(internalFunctionExpression.body.body, { 'type': 'ReturnStatement' })[0];
                                if (_.isObject(nestedReturnStatement.argument) && _.isObject(nestedReturnStatement.argument.right) && _.isObject(nestedReturnStatement.argument.right.property)) {
                                    if (nestedReturnStatement.argument.right.property.name) {
                                        modReturnValue = {
                                            'type': 'MemberExpression',
                                            'computed': false,
                                            'object': {
                                                'type': 'Identifier',
                                                'name': 'window',
                                                'range': range,
                                                'loc': loc
                                            },
                                            'property': {
                                                'type': 'Identifier',
                                                'name': nestedReturnStatement.argument.right.property.name,
                                                'range': range,
                                                'loc': loc
                                            },
                                            'range': range,
                                            'loc': loc
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            }
            modReturnValue = modReturnValue || obj.moduleReturnValue;
            return modReturnValue;
        }(), updatedNode = {
            'type': 'ExpressionStatement',
            'expression': {
                'type': 'AssignmentExpression',
                'operator': '=',
                'left': {
                    'type': 'Identifier',
                    'name': moduleName,
                    'range': range,
                    'loc': loc
                },
                'right': moduleReturnValue,
                'range': range,
                'loc': loc
            },
            'range': range,
            'loc': loc
        };
    return updatedNode;
};
// createAst.js
// ============
// Returns an AST (Abstract Syntax Tree) that is generated by Esprima
createAst = function createAst(providedCode) {
    var amdclean = this, options = amdclean.options, filePath = options.filePath, code = providedCode || options.code || (filePath ? utils.readFile(filePath) : ''), esprimaOptions = options.esprima;
    if (!code) {
        throw new Error(errorMsgs.emptyCode);
    } else {
        if (!_.isPlainObject(esprima) || !_.isFunction(esprima.parse)) {
            throw new Error(errorMsgs.esprima);
        }
        return esprima.parse(code, esprimaOptions);
    }
};
// convertDefinesAndRequires.js
// ============================
//  Replaces define() and require() methods to standard JavaScript
convertDefinesAndRequires = function convertDefinesAndRequires(node, parent) {
    var amdclean = this, options = amdclean.options, moduleName, args, dependencies, moduleReturnValue, moduleId, params, isDefine = utils.isDefine(node), isRequire = utils.isRequire(node), startLineNumber, callbackFuncArg = false, type = '', shouldBeIgnored, moduleToBeIgnored, parentHasFunctionExpressionArgument, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC, range = node.range || defaultRange, loc = node.loc || defaultLOC, dependencyBlacklist = defaultValues.dependencyBlacklist;
    startLineNumber = isDefine || isRequire ? node.expression.loc.start.line : node && node.loc && node.loc.start ? node.loc.start.line : null;
    shouldBeIgnored = amdclean.matchingCommentLineNumbers[startLineNumber] || amdclean.matchingCommentLineNumbers[startLineNumber - 1];
    // If it is an AMD conditional statement
    // e.g. if(typeof define === 'function') {}
    if (utils.isAMDConditional(node)) {
        // If the AMD conditional statement should be transformed and not ignored
        if (!shouldBeIgnored && options.transformAMDChecks === true) {
            // Transform the AMD conditional statement
            // e.g. if(typeof define === 'function') {} -> if(true) {}
            node.test = {
                'type': 'Literal',
                'value': true,
                'raw': 'true',
                'range': range,
                'loc': loc
            };
            return node;
        }
        // If the AMD conditional statement should not be transformed
        if (options.transformAMDChecks === false) {
            estraverse.traverse(node, {
                'enter': function (node) {
                    if (utils.isDefine(node)) {
                        if (node.expression && node.expression.arguments && node.expression.arguments.length) {
                            // Add the module name to the ignore list
                            if (node.expression.arguments[0].type === 'Literal' && node.expression.arguments[0].value) {
                                amdclean.conditionalModulesToIgnore[node.expression.arguments[0].value] = true;
                                if (options.createAnonymousAMDModule === true) {
                                    amdclean.storedModules[node.expression.arguments[0].value] = false;
                                    node.expression.arguments.shift();
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    if (isDefine || isRequire) {
        args = Array.prototype.slice.call(node.expression['arguments'], 0);
        dependencies = function () {
            var deps = isRequire ? args[0] : args[args.length - 2], depNames = [], hasExportsParam;
            if (_.isPlainObject(deps)) {
                deps = deps.elements || [];
            } else {
                deps = [];
            }
            hasExportsParam = _.where(deps, { 'value': 'exports' }).length;
            if (_.isArray(deps) && deps.length) {
                _.each(deps, function (currentDependency) {
                    if (dependencyBlacklist[currentDependency.value] !== 'remove') {
                        if (dependencyBlacklist[currentDependency.value]) {
                            depNames.push('{}');
                        } else {
                            depNames.push(currentDependency.value);
                        }
                    } else {
                        if (!hasExportsParam) {
                            depNames.push('{}');
                        }
                    }
                });
            }
            return depNames;
        }();
        moduleReturnValue = isRequire ? args[1] : args[args.length - 1];
        moduleId = node.expression['arguments'][0].value;
        moduleName = normalizeModuleName.call(amdclean, moduleId);
        params = {
            'node': node,
            'moduleName': moduleName,
            'moduleId': moduleId,
            'dependencies': dependencies,
            'moduleReturnValue': moduleReturnValue,
            'isDefine': isDefine,
            'isRequire': isRequire,
            'range': range,
            'loc': loc
        };
        if (isDefine) {
            if (shouldBeIgnored || !moduleName || amdclean.conditionalModulesToIgnore[moduleName] === true) {
                amdclean.options.ignoreModules.push(moduleName);
                return node;
            }
            if (_.contains(options.removeModules, moduleName)) {
                amdclean.storedModules[moduleName] = false;
                // Remove the current module from the source
                return { 'type': 'EmptyStatement' };
            }
            if (_.isObject(options.shimOverrides) && options.shimOverrides[moduleName]) {
                params.moduleReturnValue = createAst.call(amdclean, options.shimOverrides[moduleName]);
                if (_.isArray(params.moduleReturnValue.body) && _.isObject(params.moduleReturnValue.body[0])) {
                    if (_.isObject(params.moduleReturnValue.body[0].expression)) {
                        params.moduleReturnValue = params.moduleReturnValue.body[0].expression;
                        type = 'objectExpression';
                    }
                } else {
                    params.moduleReturnValue = moduleReturnValue;
                }
            }
            if (params.moduleReturnValue && params.moduleReturnValue.type === 'Identifier') {
                type = 'functionExpression';
            }
            if (_.contains(options.ignoreModules, moduleName)) {
                return node;
            } else if (utils.isFunctionExpression(moduleReturnValue) || type === 'functionExpression') {
                return convertToFunctionExpression.call(amdclean, params);
            } else if (utils.isObjectExpression(moduleReturnValue) || type === 'objectExpression') {
                return convertToObjectDeclaration.call(amdclean, params);
            } else if (utils.isFunctionCallExpression(moduleReturnValue)) {
                return convertToObjectDeclaration.call(amdclean, params, 'functionCallExpression');
            }
        } else if (isRequire) {
            if (shouldBeIgnored) {
                return node;
            }
            callbackFuncArg = _.isArray(node.expression['arguments']) && node.expression['arguments'].length ? node.expression['arguments'][1] && node.expression['arguments'][1].body && node.expression['arguments'][1].body.body && node.expression['arguments'][1].body.body.length : false;
            if (options.removeAllRequires !== true && callbackFuncArg) {
                return convertToFunctionExpression.call(amdclean, params);
            } else {
                // Remove the require include statement from the source
                return {
                    'type': 'EmptyStatement',
                    'range': range,
                    'loc': loc
                };
            }
        }
    } else {
        // If the node is a function expression that has an exports parameter and does not return anything, return exports
        if (node.type === 'FunctionExpression' && _.isArray(node.params) && _.where(node.params, {
                'type': 'Identifier',
                'name': 'exports'
            }).length && _.isObject(node.body) && _.isArray(node.body.body) && !_.where(node.body.body, {
                'type': 'ReturnStatement',
                'argument': { 'type': 'Identifier' }
            }).length) {
            parentHasFunctionExpressionArgument = function () {
                if (!parent || !parent.arguments) {
                    return false;
                }
                if (parent && parent.arguments && parent.arguments.length) {
                    return _.where(parent.arguments, { 'type': 'FunctionExpression' }).length;
                }
                return false;
            }();
            if (parentHasFunctionExpressionArgument) {
                // Adds the logical expression, 'exports = exports || {}', to the beginning of the function expression
                node.body.body.unshift({
                    'type': 'ExpressionStatement',
                    'expression': {
                        'type': 'AssignmentExpression',
                        'operator': '=',
                        'left': {
                            'type': 'Identifier',
                            'name': 'exports',
                            'range': defaultRange,
                            'loc': defaultLOC
                        },
                        'right': {
                            'type': 'LogicalExpression',
                            'operator': '||',
                            'left': {
                                'type': 'Identifier',
                                'name': 'exports',
                                'range': defaultRange,
                                'loc': defaultLOC
                            },
                            'right': {
                                'type': 'ObjectExpression',
                                'properties': [],
                                'range': defaultRange,
                                'loc': defaultLOC
                            },
                            'range': defaultRange,
                            'loc': defaultLOC
                        },
                        'range': defaultRange,
                        'loc': defaultLOC
                    },
                    'range': defaultRange,
                    'loc': defaultLOC
                });
            }
            // Adds the return statement, 'return exports', to the end of the function expression 
            node.body.body.push({
                'type': 'ReturnStatement',
                'argument': {
                    'type': 'Identifier',
                    'name': 'exports',
                    'range': defaultRange,
                    'loc': defaultLOC
                },
                'range': defaultRange,
                'loc': defaultLOC
            });
        }
        return node;
    }
};
// traverseAndUpdateAst.js
// =======================
// Uses Estraverse to traverse the AST and convert all define() and require() methods to standard JavaScript
traverseAndUpdateAst = function traverseAndUpdateAst(obj) {
    var amdclean = this, options = amdclean.options, ast = obj.ast;
    if (!_.isPlainObject(obj)) {
        throw new Error(errorMsgs.invalidObject('traverseAndUpdateAst'));
    }
    if (!ast) {
        throw new Error(errorMsgs.emptyAst('traverseAndUpdateAst'));
    }
    if (!_.isPlainObject(estraverse) || !_.isFunction(estraverse.replace)) {
        throw new Error(errorMsgs.estraverse);
    }
    estraverse.replace(ast, {
        'enter': function (node, parent) {
            var ignoreComments;
            if (node.type === 'Program') {
                ignoreComments = function () {
                    var arr = [], currentLineNumber;
                    amdclean.comments = node.comments;
                    _.each(node.comments, function (currentComment) {
                        var currentCommentValue = currentComment.value.trim();
                        if (currentCommentValue === options.commentCleanName) {
                            arr.push(currentComment);
                        }
                    });
                    return arr;
                }();
                _.each(ignoreComments, function (currentComment) {
                    currentLineNumber = currentComment.loc.start.line;
                    amdclean.matchingCommentLineNumbers[currentLineNumber] = true;
                });
                return node;
            }
            return convertDefinesAndRequires.call(amdclean, node, parent);
        },
        'leave': function (node) {
            return node;
        }
    });
    return ast;
};
// getNormalizedModuleName.js
// ==========================
// Retrieves the module id if the current node is a define() method
getNormalizedModuleName = function getNormalizedModuleName(node) {
    if (!utils.isDefine(node)) {
        return;
    }
    var amdclean = this, moduleId = node.expression['arguments'][0].value, moduleName = normalizeModuleName.call(amdclean, moduleId);
    return moduleName;
};
// findAndStoreAllModuleIds.js
// ===========================
// Uses Estraverse to traverse the AST so that all of the module ids can be found and stored in an object
findAndStoreAllModuleIds = function findAndStoreAllModuleIds(ast) {
    var amdclean = this;
    if (!ast) {
        throw new Error(errorMsgs.emptyAst('findAndStoreAllModuleIds'));
    }
    if (!_.isPlainObject(estraverse) || !_.isFunction(estraverse.traverse)) {
        throw new Error(errorMsgs.estraverse);
    }
    estraverse.traverse(ast, {
        'enter': function (node, parent) {
            var moduleName = getNormalizedModuleName.call(amdclean, node, parent);
            // If the current module has not been stored, store it
            if (moduleName && !amdclean.storedModules[moduleName]) {
                amdclean.storedModules[moduleName] = true;
            }
        }
    });
};
// generateCode.js
// ===============
// Returns standard JavaScript generated by Escodegen
generateCode = function generateCode(ast) {
    var amdclean = this, options = amdclean.options, esprimaOptions = options.esprima || {}, escodegenOptions = options.escodegen || {};
    if (!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
        throw new Error(errorMsgs.escodegen);
    }
    // Check if both the esprima and escodegen comment options are set to true
    if (esprimaOptions.comment === true && escodegenOptions.comment === true) {
        try {
            // Needed to keep source code comments when generating the code with escodegen
            ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
        } catch (e) {
        }
    }
    return escodegen.generate(ast, escodegenOptions);
};
// clean.js
// ========
// Removes any AMD and/or CommonJS trace from the provided source code
clean = function clean() {
    var amdclean = this, options = amdclean.options, ignoreModules = options.ignoreModules, originalAst = {}, ast = {}, generatedCode, declarations = [], hoistedVariables = {}, hoistedCallbackParameters = {}, defaultRange = defaultValues.defaultRange, defaultLOC = defaultValues.defaultLOC;
    // Creates and stores an AST representation of the code
    originalAst = createAst.call(amdclean);
    // Loops through the AST, finds all module ids, and stores them in the current instance storedModules property
    findAndStoreAllModuleIds.call(amdclean, originalAst);
    // Traverses the AST and removes any AMD trace
    ast = traverseAndUpdateAst.call(amdclean, { ast: originalAst });
    // Post Clean Up
    // Removes all empty statements from the source so that there are no single semicolons and
    // Makes sure that all require() CommonJS calls are converted
    // And all aggressive optimizations (if the option is turned on) are handled
    if (ast && _.isArray(ast.body)) {
        estraverse.replace(ast, {
            enter: function (node, parent) {
                var normalizedModuleName, assignmentName = node && node.left && node.left.name ? node.left.name : '', cb = node.right, assignmentNodes = [], assignments = {}, mappedParameters = _.filter(amdclean.callbackParameterMap[assignmentName], function (currentParameter) {
                        return currentParameter && currentParameter.count > 1;
                    }), mappedCbDependencyNames, mappedCbParameterNames, paramsToRemove = [];
                if (node === undefined || node.type === 'EmptyStatement') {
                    _.each(parent.body, function (currentNode, iterator) {
                        if (currentNode === undefined || currentNode.type === 'EmptyStatement') {
                            parent.body.splice(iterator, 1);
                        }
                    });
                } else if (utils.isRequireExpression(node)) {
                    if (node['arguments'] && node['arguments'][0] && node['arguments'][0].value) {
                        normalizedModuleName = normalizeModuleName.call(amdclean, node['arguments'][0].value);
                        if (ignoreModules.indexOf(normalizedModuleName) === -1) {
                            return {
                                'type': 'Identifier',
                                'name': normalizedModuleName,
                                'range': node.range || defaultRange,
                                'loc': node.loc || defaultLOC
                            };
                        } else {
                            return node;
                        }
                    } else {
                        return node;
                    }
                } else if (options.aggressiveOptimizations === true && node.type === 'AssignmentExpression' && assignmentName) {
                    // The names of all of the current callback function parameters
                    mappedCbParameterNames = _.map(cb && cb.callee && cb.callee.params ? cb.callee.params : [], function (currentParam) {
                        return currentParam.name;
                    });
                    // The names of all of the current callback function dependencies
                    mappedCbDependencyNames = _.map(cb.arguments, function (currentArg) {
                        return currentArg.name;
                    });
                    // Loop through the dependency names
                    _.each(mappedCbDependencyNames, function (currentDependencyName) {
                        // Nested loop to see if any of the dependency names map to a callback parameter
                        _.each(amdclean.callbackParameterMap[currentDependencyName], function (currentMapping) {
                            var mappedName = currentMapping.name, mappedCount = currentMapping.count;
                            // Loops through all of the callback function parameter names to see if any of the parameters should be removed
                            _.each(mappedCbParameterNames, function (currentParameterName, iterator) {
                                if (mappedCount > 1 && mappedName === currentParameterName) {
                                    paramsToRemove.push(iterator);
                                }
                            });
                        });
                    });
                    _.each(paramsToRemove, function (currentParam) {
                        cb.arguments.splice(currentParam, currentParam + 1);
                        cb.callee.params.splice(currentParam, currentParam + 1);
                    });
                    // If the current Assignment Expression is a mapped callback parameter
                    if (amdclean.callbackParameterMap[assignmentName]) {
                        node.right = function () {
                            // If aggressive optimizations are turned on, the mapped parameter is used more than once, and there are mapped dependencies to be removed
                            if (options.aggressiveOptimizations === true && mappedParameters.length) {
                                // All of the necessary assignment nodes
                                assignmentNodes = _.map(mappedParameters, function (currentDependency, iterator) {
                                    return {
                                        'type': 'AssignmentExpression',
                                        'operator': '=',
                                        'left': {
                                            'type': 'Identifier',
                                            'name': currentDependency.name,
                                            'range': defaultRange,
                                            'loc': defaultLOC
                                        },
                                        'right': iterator < mappedParameters.length - 1 ? {
                                            'range': defaultRange,
                                            'loc': defaultLOC
                                        } : cb,
                                        'range': defaultRange,
                                        'loc': defaultLOC
                                    };
                                });
                                // Creates an object containing all of the assignment expressions
                                assignments = _.reduce(assignmentNodes, function (result, assignment) {
                                    result.right = assignment;
                                    return result;
                                });
                                // The constructed assignment object node
                                return assignmentNodes.length ? assignments : cb;
                            } else {
                                return cb;
                            }
                        }();
                        return node;
                    }
                }
            }
        });
    }
    // Makes any necessary modules global by appending a global instantiation to the code
    // eg: window.exampleModule = exampleModule;
    if (_.isArray(options.globalModules)) {
        _.each(options.globalModules, function (currentModule) {
            if (_.isString(currentModule) && currentModule.length) {
                ast.body.push({
                    'type': 'ExpressionStatement',
                    'expression': {
                        'type': 'AssignmentExpression',
                        'operator': '=',
                        'left': {
                            'type': 'MemberExpression',
                            'computed': false,
                            'object': {
                                'type': 'Identifier',
                                'name': 'window',
                                'range': defaultRange,
                                'loc': defaultLOC
                            },
                            'property': {
                                'type': 'Identifier',
                                'name': currentModule,
                                'range': defaultRange,
                                'loc': defaultLOC
                            },
                            'range': defaultRange,
                            'loc': defaultLOC
                        },
                        'right': {
                            'type': 'Identifier',
                            'name': currentModule,
                            'range': defaultRange,
                            'loc': defaultLOC
                        },
                        'range': defaultRange,
                        'loc': defaultLOC
                    },
                    'range': defaultRange,
                    'loc': defaultLOC
                });
            }
        });
    }
    hoistedCallbackParameters = function () {
        var obj = {}, callbackParameterMap = amdclean.callbackParameterMap, currentParameterName;
        _.each(callbackParameterMap, function (mappedParameters) {
            _.each(mappedParameters, function (currentParameter) {
                if (currentParameter.count > 1) {
                    currentParameterName = currentParameter.name;
                    obj[currentParameterName] = true;
                }
            });
        });
        return obj;
    }();
    // Hoists all modules and necessary callback parameters
    hoistedVariables = _.merge(_.cloneDeep(_.reduce(amdclean.storedModules, function (storedModules, key, val) {
        if (key !== false) {
            storedModules[val] = true;
        }
        return storedModules;
    }, {})), hoistedCallbackParameters);
    // Creates variable declarations for each AMD module/callback parameter that needs to be hoisted
    _.each(hoistedVariables, function (moduleValue, moduleName) {
        if (!_.contains(options.ignoreModules, moduleName)) {
            declarations.push({
                'type': 'VariableDeclarator',
                'id': {
                    'type': 'Identifier',
                    'name': moduleName,
                    'range': defaultRange,
                    'loc': defaultLOC
                },
                'init': null,
                'range': defaultRange,
                'loc': defaultLOC
            });
        }
    });
    // If there are declarations, the declarations are preprended to the beginning of the code block
    if (declarations.length) {
        ast.body.unshift({
            'type': 'VariableDeclaration',
            'declarations': declarations,
            'kind': 'var',
            'range': defaultRange,
            'loc': defaultLOC
        });
    }
    // Converts the updated AST to a string of code
    generatedCode = generateCode.call(amdclean, ast);
    // If there is a wrap option specified
    if (_.isObject(options.wrap)) {
        if (_.isString(options.wrap.start) && options.wrap.start.length) {
            generatedCode = options.wrap.start + generatedCode;
        }
        if (_.isString(options.wrap.end) && options.wrap.end.length) {
            generatedCode = generatedCode + options.wrap.end;
        }
    }
    return generatedCode;
};
// index.js
// ========
// Wraps AMDclean in the UMD pattern to support being loaded in multiple environments,
// Sets all of the third-party dependencies
// And exposes the public API
(function () {
    (function (root, factory, undefined) {
        
        // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, and plain browser loading
        if (typeof define === 'function' && define.amd) {
            if (typeof exports !== 'undefined') {
                factory.env = 'node';
            } else {
                factory.env = 'web';
            }
            factory.amd = true;
            define([
                'esprima',
                'estraverse',
                'escodegen',
                'underscore'
            ], function (esprima, estraverse, escodegen, underscore) {
                return factory({
                    'esprima': esprima,
                    'estraverse': estraverse,
                    'escodegen': escodegen,
                    'underscore': underscore
                }, root);
            });
        } else if (typeof exports !== 'undefined') {
            factory.env = 'node';
            module.exports = factory(null, root);
        } else {
            factory.env = 'web';
            root.amdclean = factory(null, root);
        }
    }(this, function cleanamd(amdDependencies, context) {
        
        // Environment - either node or web
        var codeEnv = cleanamd.env,
            // AMDclean constructor function
            AMDclean = function (options, overloadedOptions) {
                if (!esprima) {
                    throw new Error(errorMsgs.esprima);
                } else if (!estraverse) {
                    throw new Error(errorMsgs.estraverse);
                } else if (!escodegen) {
                    throw new Error(errorMsgs.escodegen);
                } else if (!_) {
                    throw new Error(errorMsgs.lodash);
                }
                var defaultOptions = _.cloneDeep(this.defaultOptions || {}), userOptions = options || overloadedOptions || {};
                if (!_.isPlainObject(options) && _.isString(options)) {
                    userOptions = _.merge({ 'code': options }, _.isObject(overloadedOptions) ? overloadedOptions : {});
                }
                // storedModules
                // -------------
                // An object that will store all of the user module names
                this.storedModules = {};
                // callbackParameterMap
                // --------------------
                // An object that will store all of the user module callback parameters (that are used and also do not match the exact name of the dependencies they are representing) and the dependencies that they map to
                this.callbackParameterMap = {};
                // conditionalModulesToIgnore
                // --------------------------
                // An object that will store any modules that should be ignored (not cleaned)
                this.conditionalModulesToIgnore = {};
                // matchingCommentLineNumbers
                // --------------------------
                // An object that stores any comments that match the commentCleanName option
                this.matchingCommentLineNumbers = {};
                // comments
                // --------
                // All of the stored program comments
                this.comments = [];
                // options
                // -------
                // Merged user options and default options
                this.options = _.merge(defaultOptions, userOptions);
            },
            // The object that is publicly accessible
            publicAPI = {
                'VERSION': '2.1.0',
                'clean': function (options, overloadedOptions) {
                    // Creates a new AMDclean instance
                    var amdclean = new AMDclean(options, overloadedOptions), cleanedCode = amdclean.clean();
                    // returns the cleaned code
                    return cleanedCode;
                }
            };
        // AMDclean prototype object
        AMDclean.prototype = {
            'env': codeEnv,
            'clean': clean,
            'defaultOptions': defaultOptions
        };
        amdDependencies = amdDependencies || {};
        // Third-Party Dependencies
        // Note: These dependencies are hoisted to the top (as local variables) at build time (Look in the gulpfile.js file and the AMDclean wrap option for more details)
        esprima = function () {
            if (cleanamd.amd && amdDependencies.esprima && amdDependencies.esprima.parse) {
                return amdDependencies.esprima;
            } else if (context && context.esprima && context.esprima.parse) {
                return context.esprima;
            } else if (codeEnv === 'node') {
                return require('esprima');
            }
        }();
        estraverse = function () {
            if (cleanamd.amd && amdDependencies.estraverse && amdDependencies.estraverse.traverse) {
                return amdDependencies.estraverse;
            } else if (context && context.estraverse && context.estraverse.traverse) {
                return context.estraverse;
            } else if (codeEnv === 'node') {
                return require('estraverse');
            }
        }();
        escodegen = function () {
            if (cleanamd.amd && amdDependencies.escodegen && amdDependencies.escodegen.generate) {
                return amdDependencies.escodegen;
            } else if (context && context.escodegen && context.escodegen.generate) {
                return context.escodegen;
            } else if (codeEnv === 'node') {
                return require('escodegen');
            }
        }();
        _ = function () {
            if (cleanamd.amd && amdDependencies.underscore) {
                return amdDependencies.underscore;
            } else if (context && context._) {
                return context._;
            } else if (codeEnv === 'node') {
                return require('lodash');
            }
        }();
        return publicAPI;
    }));
}());}(typeof esprima !== "undefined" ? esprima: null, typeof estraverse !== "undefined" ? estraverse: null, typeof escodegen !== "undefined" ? escodegen: null, typeof _ !== "undefined" ? _ : null));