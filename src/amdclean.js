/*! amdclean - v2.0.0 - 2014-05-12
* http://gregfranko.com/amdclean
* Copyright (c) 2014 Greg Franko; Licensed MIT */

(function (root, factory, undefined) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, and plain browser loading
    if (typeof define === 'function' && define.amd) {
        if(typeof exports !== 'undefined') {
            factory.env = 'node';
        } else {
            factory.env = 'web';
        }
        factory.amd = true;
        define(['esprima', 'estraverse', 'escodegen', 'underscore'], function(esprima, estraverse, escodegen, underscore) {
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
}(this, function cleanamd(amdDependencies, scope) {
    'use strict';
    amdDependencies = amdDependencies || {};
    // Environment - either node or web
    var codeEnv = cleanamd.env,
        that = scope,
        // Third-Party Dependencies
        esprima = function() {
            if(cleanamd.amd && amdDependencies.esprima && amdDependencies.esprima.parse) {
                return amdDependencies.esprima;
            } else if(that && that.esprima && that.esprima.parse) {
                return that.esprima;
            } else if(codeEnv === 'node') {
                return require('esprima');
            }
        }(),
        estraverse = function() {
            if(cleanamd.amd && amdDependencies.estraverse && amdDependencies.estraverse.traverse) {
                return amdDependencies.estraverse;
            } else if(that && that.estraverse && that.estraverse.traverse) {
                return that.estraverse;
            } else if(codeEnv === 'node') {
                return require('estraverse');
            }
        }(),
        escodegen = function() {
            if(cleanamd.amd && amdDependencies.escodegen && amdDependencies.escodegen.generate) {
                return amdDependencies.escodegen;
            } else if(that && that.escodegen && that.escodegen.generate) {
                return that.escodegen;
            } else if(codeEnv === 'node') {
                return require('escodegen');
            }
        }(),
        _ = function() {
            if(cleanamd.amd && amdDependencies.underscore) {
                return amdDependencies.underscore;
            } else if(that && that._) {
                return that._;
            } else if(codeEnv === 'node') {
                return require('lodash');
            }
        }(),
        fs = codeEnv === 'node' ? require('fs'): {}, // End Third-Party Dependencies
        // The Public API object
        publicAPI = {
            // Current project version number
            'VERSION': '2.0.0',
            // Default Options
            'defaultOptions': {
                // The source code you would like to be 'cleaned'
                'code': '',
                // The relative file path of the file to be cleaned.  Use this option if you are not using the code option.
                // Hint: Use the __dirname trick
                'filePath': '',
                // The modules that you would like to set as window properties
                // An array of strings (module names)
                'globalModules': [],
                // All esprima API options are supported: http://esprima.org/doc/
                'esprima': {
                    'comment': true,
                    'loc': true,
                    'range': true,
                    'tokens': true
                },
                // All escodegen API options are supported: https://github.com/Constellation/escodegen/wiki/API
                'escodegen': {
                    'comment': true,
                    'format': {
                      'indent': {
                        'adjustMultilineComment': true
                      }
                    }
                },
                // If there is a comment (that contains the following text) on the same line or one line above a specific module, the module will not be removed
                'commentCleanName': 'amdclean',
                // The ids of all of the modules that you would not like to be 'cleaned'
                'ignoreModules': [],
                // Determines which modules will be removed from the cleaned code
                'removeModules': [],
                // Determines if all of the require() method calls will be removed
                'removeAllRequires': false,
                // Determines if all of the 'use strict' statements will be removed
                'removeUseStricts': true,
                // Determines if conditional AMD checks are transformed
                // e.g. if(typeof define == 'function') {} -> if(true) {}
                'transformAMDChecks': true,
                // Allows you to pass an expression that will override shimmed modules return values
                // e.g. { 'backbone': 'window.Backbone' }
                'shimOverrides': {},
                // Determines how to prefix a module name with when a non-JavaScript compatible character is found 
                // 'standard' or 'camelCase'
                // 'standard' example: 'utils/example' -> 'utils_example'
                // 'camelCase' example: 'utils/example' -> 'utilsExample'
                'prefixMode': 'standard',
                // A function hook that allows you add your own custom logic to how each module name is prefixed/normalized
                'prefixTransform': function(moduleName) {
                    return moduleName;
                },
                // Wrap any build bundle in a start and end text specified by wrap
                // This should only be used when using the onModuleBundleComplete RequireJS Optimizer build hook
                // If it is used with the onBuildWrite RequireJS Optimizer build hook, each module will get wrapped
                'wrap': {
                    'start': '',
                    'end': ''
                },
                // Determines if certain aggressive file size optimization techniques will be used to transform the soure code
                'aggressiveOptimizations': false
            },
            // Environment - either node or web
            'env': codeEnv,
            // All of the error messages presented to users
            'errorMsgs': {
                // The user has not supplied the cliean method with any code
                'emptyCode': 'There is no code to generate the AST with',
                // An AST has not been correctly returned by Esprima
                'emptyAst': function(methodName) {
                    return 'An AST is not being passed to the ' + methodName + '() method';
                },
                // A parameter is not an object literal (which is expected)
                'invalidObject': function(methodName) {
                    return 'An object is not being passed as the first parameter to the ' + methodName + '() method';
                },
                // Third-party dependencies have not been included on the page
                'lodash': 'There is not an _.isPlainObject() method.  Make sure you have included lodash (https://github.com/lodash/lodash).',
                'esprima': 'There is not an esprima.parse() method.  Make sure you have included esprima (https://github.com/ariya/esprima).',
                'estraverse': 'There is not an estraverse.replace() method.  Make sure you have included estraverse (https://github.com/Constellation/estraverse).',
                'escodegen': 'There is not an escodegen.generate() method.  Make sure you have included escodegen (https://github.com/Constellation/escodegen).'
            },
            // storedModules
            // -------------
            // An object that will store all of the user module names
            'storedModules': {},
            // callbackParameterMap
            // --------------------
            // An object that will store all of the user module callback parameters (that are used and also do not match the exact name of the dependencies they are representing) and the dependencies that they map to
            'callbackParameterMap': {},
            // dependencyBlacklist
            // -------------------
            //  Variable names that are not allowed as dependencies to functions
            'dependencyBlacklist': {
                'require': 'remove',
                'exports': true,
                'module': 'remove'
            },
            // defaultLOC
            // ----------
            //  Default line of code property
            'defaultLOC': {
                'start': {
                    'line': 0,
                    'column': 0
                }
            },
            // defaultRange
            // ------------
            //  Default range property
            'defaultRange': [0, 0],
            // readFile
            // --------
            //  Synchronous file reading for node
            'readFile': function(path) {
                if(publicAPI.env !== 'node') {
                    return '';
                }
                return fs.readFileSync(path, 'utf8');
            },
            // isDefine
            // --------
            //  Returns if the current AST node is a define() method call
            'isDefine': function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return (_.isObject(node) &&
                    node.type === 'ExpressionStatement' &&
                    _.isObject(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'define');
            },
            // isRequire
            // ---------
            //  Returns if the current AST node is a require() method call
            'isRequire': function(node) {
                var expression = node.expression || {},
                    callee = expression.callee;
                return (_.isObject(node) &&
                    node.type === 'ExpressionStatement' &&
                    _.isObject(expression) &&
                    expression.type === 'CallExpression' &&
                    callee.type === 'Identifier' &&
                    callee.name === 'require');
            },
            // isRequireExpression
            // -------------------
            //  Returns if the current AST node is a require() call expression
            //  e.g. var example = require('someModule');
            'isRequireExpression': function(node) {
                return (node.type === 'CallExpression' &&
                    node.callee &&
                    node.callee.name === 'require');
            },
            // isObjectExpression
            // ------------------
            //  Returns if the current AST node is an object literal
            'isObjectExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'ObjectExpression');
            },
            // isFunctionExpression
            // --------------------
            //  Returns if the current AST node is a function
            'isFunctionExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'FunctionExpression');
            },
            // isFunctionCallExpression
            // ------------------------
            //  Returns if the current AST node is a function call expression
            'isFunctionCallExpression': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'CallExpression' &&
                    _.isPlainObject(expression.callee) &&
                    expression.callee.type === 'FunctionExpression');
            },
            // isUseStrict
            // -----------
            //  Returns if the current AST node is a 'use strict' expression
            //  e.g. 'use strict'
            'isUseStrict': function(expression) {
                return (expression &&
                    _.isPlainObject(expression) &&
                    expression.type === 'Literal' &&
                    expression.value === 'use strict');
            },
            // isAMDConditional
            // ----------------
            //  Returns if the current AST node is an if statement AMD check
            //  e.g. if(typeof define === 'function') {}
            'isAMDConditional': function(node) {
                if(publicAPI.options.transformAMDChecks !== true || (node && node.type !== 'IfStatement' ||
                    !_.isObject(node.test) ||
                    !_.isObject(node.test.left) ||
                    _.isNull(node.test.left.value))) {
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
                return (_.where(node.test, matchObject).length ||
                    _.where([node.test], matchObject).length ||
                    _.where(node.test.left, matchObject).length ||
                    _.where([node.test.left], matchObject).length);
            },
            // convertToCamelCase
            // ------------------
            //  Converts a delimited string to camel case
            //  e.g. some_str -> someStr
            convertToCamelCase: function(input, delimiter) {
                delimiter = delimiter || '_';
                return input.replace(new RegExp(delimiter + '(.)', 'g'), function(match, group1) {
                    return group1.toUpperCase();
                });
            },
            // prefixReservedWords
            // -------------------
            //  Converts a reserved word in JavaScript with an underscore
            //  e.g. class -> _class
            'prefixReservedWords': function(name) {
                var reservedWord = false;
                try {
                    if(name.length) {
                        eval('var ' + name + ' = 1;');
                    }
                } catch (e) {
                  reservedWord = true;
                }
                if(reservedWord === true) {
                    return '_' + name;
                } else {
                    return name;
                }
            },
            // normalizeModuleName
            // -------------------
            //  Returns a normalized module name (removes relative file path urls)
            'normalizeModuleName': function(name, moduleId) {
                var pre_normalized,
                    post_normalized,
                    prefixMode = publicAPI.options.prefixMode,
                    prefixTransform = publicAPI.options.prefixTransform,
                    prefixTransformValue;
                name = name || '';
                if(name === '{}') {
                    if(publicAPI.dependencyBlacklist[name] === 'remove') {
                        return '';
                    } else {
                        return name;
                    }
                }
                pre_normalized = publicAPI.prefixReservedWords(name.replace(/\./g,'').
                    replace(/[^A-Za-z0-9_$]/g,'_').
                    replace(/^_+/,''));
                post_normalized = prefixMode === 'camelCase' ? publicAPI.convertToCamelCase(pre_normalized) : pre_normalized;
                if(_.isFunction(prefixTransform)) {
                    prefixTransformValue = prefixTransform(post_normalized, moduleId);
                    if(_.isString(prefixTransformValue) && prefixTransformValue.length) {
                        return prefixTransformValue;
                    }
                }
                return post_normalized;
            },
            // returnExpressionIdentifier
            // --------------------------
            //  Returns a single identifier
            //  e.g. module
            'returnExpressionIdentifier': function(name) {
                return {
                    'type': 'ExpressionStatement',
                    'expression': {
                        'type': 'Identifier',
                        'name': name,
                        'range': publicAPI.defaultRange,
                        'loc': publicAPI.defaultLOC
                    },
                    'range': publicAPI.defaultRange,
                    'loc': publicAPI.defaultLOC
                };
            },
            // convertToObjectDeclaration
            // --------------------------
            //  Returns an object variable declaration
            //  e.g. var example = { exampleProp: true }
            'convertToObjectDeclaration': function(obj, type) {
                var node = obj.node,
                    moduleName  = obj.moduleName,
                    moduleReturnValue = (function() {
                        var modReturnValue,
                            callee,
                            params,
                            returnStatement,
                            nestedReturnStatement,
                            internalFunctionExpression;
                        if(type === 'functionCallExpression') {
                            modReturnValue = obj.moduleReturnValue;
                            callee = modReturnValue.callee;
                            params = callee.params;
                            if(params && params.length && _.isArray(params) && _.where(params, { 'name': 'global' })) {
                                if(_.isObject(callee.body)) {
                                    if(_.isArray(callee.body.body)) {
                                        returnStatement = _.where(callee.body.body, { 'type': 'ReturnStatement' })[0];
                                        if(_.isObject(returnStatement) && _.isObject(returnStatement.argument) && returnStatement.argument.type === 'FunctionExpression') {
                                            internalFunctionExpression = returnStatement.argument;
                                            if(_.isObject(internalFunctionExpression.body) && _.isArray(internalFunctionExpression.body.body)) {
                                                nestedReturnStatement = _.where(internalFunctionExpression.body.body, { 'type': 'ReturnStatement' })[0];
                                                if(_.isObject(nestedReturnStatement.argument) && _.isObject(nestedReturnStatement.argument.right) && _.isObject(nestedReturnStatement.argument.right.property)) {
                                                    if(nestedReturnStatement.argument.right.property.name) {
                                                        modReturnValue = {
                                                            'type': 'MemberExpression',
                                                            'computed': false,
                                                            'object': {
                                                                'type': 'Identifier',
                                                                'name': 'window',
                                                                'range': publicAPI.defaultRange,
                                                                'loc': publicAPI.defaultLOC
                                                            },
                                                            'property': {
                                                                'type': 'Identifier',
                                                                'name': nestedReturnStatement.argument.right.property.name,
                                                                'range': publicAPI.defaultRange,
                                                                'loc': publicAPI.defaultLOC
                                                            },
                                                            'range': publicAPI.defaultRange,
                                                            'loc': publicAPI.defaultLOC
                                                        };
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        modReturnValue = modReturnValue || obj.moduleReturnValue;
                        return modReturnValue;
                    }()),
                    options = publicAPI.options,
                    updatedNode = {
                        'type': 'ExpressionStatement',
                        'expression': {
                            'type': 'AssignmentExpression',
                            'operator': '=',
                            'left': {
                                'type': 'Identifier',
                                'name': moduleName,
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            },
                            'right': moduleReturnValue,
                            'range': publicAPI.defaultRange,
                            'loc': publicAPI.defaultLOC
                        },
                        'range': publicAPI.defaultRange,
                        'loc': publicAPI.defaultLOC
                    };
                return updatedNode;
            },
            // convertToIIFE
            // -------------
            //  Returns an IIFE
            //  e.g. (function() { }())
            'convertToIIFE': function(obj) {
                var callbackFuncParams = obj.callbackFuncParams,
                    callbackFunc = obj.callbackFunc,
                    dependencyNames = obj.dependencyNames;

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
                            'range': (callbackFunc.range || publicAPI.defaultRange),
                            'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                        },
                        'arguments': dependencyNames,
                        'range': (callbackFunc.range || publicAPI.defaultRange),
                        'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                    },
                    'range': (callbackFunc.range || publicAPI.defaultRange),
                    'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                };
            },
            // convertToIIFEDeclaration
            // ------------------------
            //  Returns a function expression that is executed immediately
            //  e.g. var example = function(){}()
            'convertToIIFEDeclaration': function(obj) {
                var moduleName = obj.moduleName,
                    callbackFuncParams = obj.callbackFuncParams,
                    isOptimized = obj.isOptimized,
                    callbackFunc = (function() {
                        var cbFunc = obj.callbackFunc;
                        if(cbFunc.type === 'Identifier' && cbFunc.name !== 'undefined') {
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
                                            'type': 'CallExpression',
                                            'callee': {
                                                'type': 'Identifier',
                                                'name': cbFunc.name,
                                                'range': (cbFunc.range || publicAPI.defaultRange),
                                                'loc': (cbFunc.loc || publicAPI.defaultLOC)
                                            },
                                            'arguments': callbackFuncParams,
                                            'range': (cbFunc.range || publicAPI.defaultRange),
                                            'loc': (cbFunc.loc || publicAPI.defaultLOC)
                                        },
                                        'range': (cbFunc.range || publicAPI.defaultRange),
                                        'loc': (cbFunc.loc || publicAPI.defaultLOC)
                                    }],
                                    'range': (cbFunc.range || publicAPI.defaultRange),
                                    'loc': (cbFunc.loc || publicAPI.defaultLOC)
                                },
                                'rest': null,
                                'generator': false,
                                'expression': false,
                                'range': (cbFunc.range || publicAPI.defaultRange),
                                'loc': (cbFunc.loc || publicAPI.defaultLOC)
                            };
                        }
                        return cbFunc;
                    }()),
                    dependencyNames = obj.dependencyNames,
                    options = publicAPI.options,
                    cb = (function() {
                        if(callbackFunc.type === 'Literal' || (callbackFunc.type === 'Identifier' && callbackFunc.name === 'undefined') || isOptimized === true) {
                            return callbackFunc;
                        } else {
                            return {
                                'type': 'CallExpression',
                                'callee': {
                                    'type': 'FunctionExpression',
                                    'id': {
                                        'type': 'Identifier',
                                        'name': '',
                                        'range': (callbackFunc.range || publicAPI.defaultRange),
                                        'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                                    },
                                    'params': callbackFuncParams,
                                    'defaults': [],
                                    'body': callbackFunc.body,
                                    'rest': callbackFunc.rest,
                                    'generator': callbackFunc.generator,
                                    'expression': callbackFunc.expression,
                                    'range': (callbackFunc.range || publicAPI.defaultRange),
                                    'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                                },
                                'arguments': dependencyNames,
                                'range': (callbackFunc.range || publicAPI.defaultRange),
                                'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                            };
                        }
                    }()),
                    updatedNode = {
                        'type': 'ExpressionStatement',
                        'expression': {
                            'type': 'AssignmentExpression',
                            'operator': '=',
                            'left': {
                                'type': 'Identifier',
                                'name': moduleName,
                                'range': (callbackFunc.range || publicAPI.defaultRange),
                                'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                            },
                            'right': cb,
                            'range': (callbackFunc.range || publicAPI.defaultRange),
                            'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                        },
                        'range': (callbackFunc.range || publicAPI.defaultRange),
                        'loc': (callbackFunc.loc || publicAPI.defaultLOC)
                    };
                return updatedNode;
            },
            // isRelativeFilePath
            // ------------------
            //  Returns a boolean that determines if the file path provided is a relative file path
            //  e.g. ../exampleModule -> true
            isRelativeFilePath: function(path) {
                var segments = path.split('/');
                return segments.length !== -1 && (segments[0] === '.' || segments[0] === '..');
            },
            // normalizeDependencyName
            // -----------------------
            //  Returns a normalized dependency name that handles relative file paths
            'normalizeDependencyName': function(moduleId, dep) {
                if(!moduleId || !dep || !publicAPI.isRelativeFilePath(dep)) {
                    return dep;
                }

                var normalizePath = function(path) {
                    var segments = path.split('/'),
                        normalizedSegments;

                    normalizedSegments = _.reduce(segments, function(memo, segment) {
                        switch(segment) {
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
                },
                    baseName = function(path) {
                        var segments = path.split('/');

                        segments.pop();
                        return segments.join('/');
                    };
                return normalizePath([baseName(moduleId), dep].join('/'));
            },
            // convertToFunctionExpression
            // ---------------------------
            //  Returns either an IIFE or variable declaration.
            //  Internally calls either convertToIIFE() or convertToIIFEDeclaration()
            'convertToFunctionExpression': function(obj) {
                var isDefine = obj.isDefine,
                    isRequire = obj.isRequire,
                    isOptimized = false,
                    node = obj.node,
                    moduleName  = obj.moduleName,
                    moduleId = obj.moduleId,
                    dependencies = obj.dependencies,
                    depLength = dependencies.length,
                    options = publicAPI.options,
                    aggressiveOptimizations = options.aggressiveOptimizations,
                    dependencyNames = function() {
                        var deps = [],
                            currentName;
                        _.each(dependencies, function(currentDependency, iterator) {
                            currentName = publicAPI.normalizeModuleName(publicAPI.normalizeDependencyName(moduleId, currentDependency), moduleId);
                            deps.push({
                                'type': 'Identifier',
                                'name': currentName,
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            });
                        });
                        return deps;
                    }(),
                    callbackFunc = function() {
                        var callbackFunc = obj.moduleReturnValue,
                            body,
                            returnStatements,
                            firstReturnStatement,
                            returnStatementArg;
                        // If the module has NO dependencies and the callback function is not empty
                        if(!depLength && callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length) {
                            // Filter 'use strict' statements
                            body = _.filter(callbackFunc.body.body, function(node) {
                                if(publicAPI.options.removeUseStricts === true) return !publicAPI.isUseStrict(node.expression);
                                else return node;
                            });
                            // Returns an array of all return statements
                            returnStatements = _.where(body, { 'type': 'ReturnStatement' });
                            // If there is a return statement
                            if(returnStatements.length) {
                                firstReturnStatement = returnStatements[0];
                                returnStatementArg = firstReturnStatement.argument;
                                // If something other than a function expression is getting returned
                                // and there is more than one AST child node in the factory function
                                // return early
                                if((!publicAPI.isFunctionExpression(firstReturnStatement) && body.length > 1) || (returnStatementArg && returnStatementArg.type === 'Identifier')) {
                                    return callbackFunc;
                                } else {
                                    // Optimize the AMD module by setting the callback function to the return statement argument
                                    callbackFunc = returnStatementArg;
                                    isOptimized = true;
                                    if(callbackFunc.params) {
                                        depLength = callbackFunc.params.length;
                                    }
                                }
                            }
                        } else if(callbackFunc && callbackFunc.type === 'FunctionExpression' && callbackFunc.body && _.isArray(callbackFunc.body.body) && callbackFunc.body.body.length === 0) {
                            callbackFunc = {
                                'type': 'Identifier',
                                'name': 'undefined',
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            };
                            depLength = 0;
                        }
                        return callbackFunc;
                    }(),
                    hasReturnStatement = function() {
                        var returns = [];
                        if(callbackFunc && callbackFunc.body && _.isArray(callbackFunc.body.body)) {
                            returns = _.where(callbackFunc.body.body, { 'type': 'ReturnStatement' });
                            if(returns.length) {
                                return true;
                            }
                        }
                        return false;
                    }(),
                    hasExportsParam = false,
                    originalCallbackFuncParams,
                    callbackFuncParams = function() {
                        var deps = [],
                            currentName,
                            cbParams = callbackFunc.params || dependencyNames || [],
                            mappedParameter = {};
                        _.each(cbParams, function(currentParam, iterator) {
                            if(currentParam) {
                                currentName = currentParam.name;
                            } else {
                                currentName = dependencyNames[iterator].name;
                            }
                            if(currentName === 'exports') {
                                hasExportsParam = true;
                            }
                            if(currentName !== '{}' && publicAPI.dependencyBlacklist[currentName] !== 'remove') {
                                deps.push({
                                    'type': 'Identifier',
                                    'name': currentName,
                                    'range': publicAPI.defaultRange,
                                    'loc': publicAPI.defaultLOC
                                });

                                // If a callback parameter is not the exact name of a stored module and there is a dependency that matches the current callback parameter
                                if(options.aggressiveOptimizations === true && !publicAPI.storedModules[currentName] && dependencyNames[iterator]) {
                                    // If the current dependency has not been stored
                                    if(!publicAPI.callbackParameterMap[dependencyNames[iterator].name]) {
                                        publicAPI.callbackParameterMap[dependencyNames[iterator].name] = [
                                            {
                                                'name': currentName,
                                                'count': 1
                                            }
                                        ];
                                    } else {
                                        mappedParameter = _.where(publicAPI.callbackParameterMap[dependencyNames[iterator].name], {
                                            'name': currentName
                                        });
                                        if(mappedParameter.length) {
                                            mappedParameter = mappedParameter[0];
                                            mappedParameter.count += 1;
                                        } else {
                                            publicAPI.callbackParameterMap[dependencyNames[iterator].name].push({
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
                        return _.filter(deps || [], function(currentParam) {
                            return !publicAPI.storedModules[currentParam.name];
                        });
                    }(),
                    dependencyNameLength,
                    callbackFuncParamsLength;

                // Only return dependency names that do not directly match the name of existing stored modules
                dependencyNames = _.filter(dependencyNames || [], function(currentDep, iterator) {
                    var mappedCallbackParameter = originalCallbackFuncParams[iterator],
                        currentDepName = currentDep.name;
                    // If the matching callback parameter matches the name of a stored module, then do not return it
                    // Else if the matching callback parameter does not match the name of a stored module, return the dependency
                    return !mappedCallbackParameter ||  publicAPI.storedModules[mappedCallbackParameter.name] && mappedCallbackParameter.name === currentDepName ? !publicAPI.storedModules[currentDepName] : !publicAPI.storedModules[mappedCallbackParameter.name];
                });

                dependencyNameLength = dependencyNames.length;
                callbackFuncParamsLength = callbackFuncParams.length;

                // If the module dependencies passed into the current module are greater than the used callback function parameters, do not pass the dependencies
                if(dependencyNameLength && dependencyNameLength > callbackFuncParamsLength) {
                    dependencyNames.splice((dependencyNameLength - callbackFuncParamsLength), callbackFuncParamsLength);
                }

                if(!hasReturnStatement && hasExportsParam) {
                    callbackFunc.body.body.push({
                        'type': 'ReturnStatement',
                        'argument': {
                            'type': 'Identifier',
                            'name': 'exports',
                            'range': publicAPI.defaultRange,
                            'loc': publicAPI.defaultLOC
                        },
                        'range': publicAPI.defaultRange,
                        'loc': publicAPI.defaultLOC
                    });
                }

                if(isDefine) {
                    return publicAPI.convertToIIFEDeclaration({
                        moduleName: moduleName,
                        dependencyNames: dependencyNames,
                        callbackFuncParams: callbackFuncParams,
                        hasExportsParam: hasExportsParam,
                        callbackFunc: callbackFunc,
                        isOptimized: isOptimized
                    });
                } else if(isRequire) {
                    return publicAPI.convertToIIFE({
                        dependencyNames: dependencyNames,
                        callbackFuncParams: callbackFuncParams,
                        callbackFunc: callbackFunc
                    });
                }
            },
            // getNormalizedModuleName
            // -----------------------
            // Retrieves the module id if the current node is a define() method
            'getNormalizedModuleName': function(node, parent) {
                if(!publicAPI.isDefine(node)) {
                    return;
                }
                var moduleId = node.expression['arguments'][0].value,
                    moduleName = publicAPI.normalizeModuleName(moduleId);
                return moduleName;
            },
            // convertDefinesAndRequires
            // -------------------------
            //  Replaces define() and require() methods to standard JavaScript
            'convertDefinesAndRequires': function(node, parent) {
                var moduleName,
                    args,
                    dependencies,
                    moduleReturnValue,
                    moduleId,
                    params,
                    isDefine = publicAPI.isDefine(node),
                    isRequire = publicAPI.isRequire(node),
                    startLineNumber,
                    comments,
                    currentLineNumber,
                    lineNumberObj = {},
                    callbackFuncArg = false,
                    type = '',
                    options = publicAPI.options,
                    shouldBeIgnored;
                if(node.type === 'Program') {
                    comments = (function() {
                        var arr = [];
                        _.each(node.comments, function(currentComment, iterator) {
                            var currentCommentValue = (currentComment.value).trim();
                            if(currentCommentValue === options.commentCleanName) {
                                arr.push(currentComment);
                            }
                        });
                        return arr;
                    }());
                    _.each(comments, function(currentComment, iterator) {
                        currentLineNumber = currentComment.loc.start.line;
                        lineNumberObj[currentLineNumber] = true;
                    });
                    publicAPI.commentLineNumbers = lineNumberObj;
                }
                startLineNumber = isDefine || isRequire ? node.expression.loc.start.line : node && node.loc && node.loc.start ? node.loc.start.line : null;
                shouldBeIgnored = (publicAPI.commentLineNumbers[startLineNumber] || publicAPI.commentLineNumbers['' + (parseInt(startLineNumber, 10) - 1)]);
                if(!shouldBeIgnored && publicAPI.isAMDConditional(node)) {
                    node.test = {
                        'type': 'Literal',
                        'value': true,
                        'raw': 'true',
                        'range': publicAPI.defaultRange,
                        'loc': publicAPI.defaultLOC
                    };
                    return node;
                }
                if(isDefine || isRequire) {
                    args = Array.prototype.slice.call(node.expression['arguments'], 0);
                    dependencies = (function() {
                        var deps = isRequire ? args[0] : args[args.length - 2],
                            depNames = [];
                        if(_.isPlainObject(deps)) {
                            deps = deps.elements || [];
                        } else {
                            deps = [];
                        }
                        if(Array.isArray(deps) && deps.length) {
                            _.each(deps, function(currentDependency) {
                                if(publicAPI.dependencyBlacklist[currentDependency.value] !== 'remove') {
                                    if(publicAPI.dependencyBlacklist[currentDependency.value]) {
                                        if(publicAPI.dependencyBlacklist[currentDependency.value] !== 'remove') {
                                            depNames.push('{}');
                                        }
                                    } else {
                                        depNames.push(currentDependency.value);
                                    }
                                }
                            });
                        }
                        return depNames;
                    }());
                    moduleReturnValue = isRequire ? args[1] : args[args.length - 1];
                    moduleId = node.expression['arguments'][0].value;
                    moduleName = publicAPI.normalizeModuleName(moduleId);
                    params = {
                            node: node,
                            moduleName: moduleName,
                            moduleId: moduleId,
                            dependencies: dependencies,
                            moduleReturnValue: moduleReturnValue,
                            isDefine: isDefine,
                            isRequire: isRequire
                    };
                    if(isDefine) {
                        if(shouldBeIgnored) {
                            publicAPI.options.ignoreModules.push(moduleName);
                            return node;
                        }
                        if(_.contains(options.removeModules, moduleName)) {
                            // Remove the current module from the source
                            return {
                                type: 'EmptyStatement'
                            };
                        }
                        if(_.isObject(options.shimOverrides) && options.shimOverrides[moduleName]) {
                            params.moduleReturnValue = publicAPI.createAst({
                                'code': options.shimOverrides[moduleName]
                            });
                            if(_.isArray(params.moduleReturnValue.body) && _.isObject(params.moduleReturnValue.body[0])) {
                                if(_.isObject(params.moduleReturnValue.body[0].expression)) {
                                    params.moduleReturnValue = params.moduleReturnValue.body[0].expression;
                                    type = 'objectExpression';
                                }
                            } else {
                                params.moduleReturnValue = moduleReturnValue;
                            }
                        }
                        if(params.moduleReturnValue && params.moduleReturnValue.type === 'Identifier') {
                            type = 'functionExpression';
                        }
                        if(_.contains(options.ignoreModules, moduleName)) {
                            return node;
                        } else if(publicAPI.isFunctionExpression(moduleReturnValue) || type === 'functionExpression') {
                            return publicAPI.convertToFunctionExpression(params);
                        } else if(publicAPI.isObjectExpression(moduleReturnValue) || type === 'objectExpression') {
                            return publicAPI.convertToObjectDeclaration(params);
                        } else if(publicAPI.isFunctionCallExpression(moduleReturnValue)) {
                            return publicAPI.convertToObjectDeclaration(params, 'functionCallExpression');
                        }
                    } else if(isRequire) {
                        if(shouldBeIgnored) {
                            return node;
                        }
                        callbackFuncArg = _.isArray(node.expression['arguments']) && node.expression['arguments'].length ? node.expression['arguments'][1] && node.expression['arguments'][1].body && node.expression['arguments'][1].body.body && node.expression['arguments'][1].body.body.length : false;
                        if(options.removeAllRequires !== true && callbackFuncArg) {
                            return publicAPI.convertToFunctionExpression(params);
                        } else {
                            // Remove the require include statement from the source
                            return {
                                type: 'EmptyStatement'
                            };
                        }
                    }
                } else {
                    // If the node is a function expression that has an exports parameter and does not return anything, return exports
                    if(node.type === 'FunctionExpression' &&
                        _.isArray(node.params) &&
                        _.where(node.params, { 'type': 'Identifier', 'name': 'exports' }).length &&
                        _.isObject(node.body) &&
                        _.isArray(node.body.body) &&
                        !_.where(node.body.body, {
                            'type': 'ReturnStatement',
                            'argument': {
                                'type': 'Identifier'
                            }
                        }).length) {
                        // Adds the logical expression, 'exports = exports || {}', to the beginning of the function expression
                        node.body.body.unshift({
                            'type': 'ExpressionStatement',
                            'expression': {
                                'type': 'AssignmentExpression',
                                'operator': '=',
                                'left': {
                                    'type': 'Identifier',
                                    'name': 'exports',
                                    'range': publicAPI.defaultRange,
                                    'loc': publicAPI.defaultLOC
                                },
                                'right': {
                                    'type': 'LogicalExpression',
                                    'operator': '||',
                                    'left': {
                                        'type': 'Identifier',
                                        'name': 'exports',
                                        'range': publicAPI.defaultRange,
                                        'loc': publicAPI.defaultLOC
                                    },
                                    'right': {
                                        'type': 'ObjectExpression',
                                        'properties': [],
                                        'range': publicAPI.defaultRange,
                                        'loc': publicAPI.defaultLOC
                                    },
                                    'range': publicAPI.defaultRange,
                                    'loc': publicAPI.defaultLOC
                                },
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            },
                            'range': publicAPI.defaultRange,
                            'loc': publicAPI.defaultLOC
                        });
                        // Adds the return statement, 'return exports', to the end of the function expression 
                        node.body.body.push({
                            'type': 'ReturnStatement',
                            'argument': {
                                'type': 'Identifier',
                                'name': 'exports',
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            },
                            'range': publicAPI.defaultRange,
                            'loc': publicAPI.defaultLOC
                        });
                    }
                    return node;
                }
            },
            // createAst
            // ---------
            //  Returns an AST (Abstract Syntax Tree) that is generated by Esprima
            'createAst': function(obj) {
                var filePath = obj.filePath,
                    code = obj.code || (filePath && publicAPI.env === 'node' ? publicAPI.readFile(filePath) : ''),
                    esprimaOptions = publicAPI.options.esprima;
                if(!code) {
                    throw new Error(publicAPI.errorMsgs.emptyCode);
                } else {
                    if(!_.isPlainObject(esprima) || !_.isFunction(esprima.parse)) {
                        throw new Error(publicAPI.errorMsgs.esprima);
                    }
                    return esprima.parse(code, esprimaOptions);
                }
            },
            // findAndStoreAllModuleIds
            // ------------------------
            //  Uses Estraverse to traverse the AST so that all of the module ids can be found and stored in an object
            'findAndStoreAllModuleIds': function(ast) {
                if(!ast) {
                    throw new Error(publicAPI.errorMsgs.emptyAst('findAndStoreAllModuleIds'));
                }
                if(!_.isPlainObject(estraverse) || !_.isFunction(estraverse.traverse)) {
                    throw new Error(publicAPI.errorMsgs.estraverse);
                }
                estraverse.traverse(ast, {
                    'enter': function(node, parent) {
                        var moduleName = publicAPI.getNormalizedModuleName(node, parent);
                        // If the current module has not been stored, store it
                        if(moduleName && !publicAPI.storedModules[moduleName]) {
                            publicAPI.storedModules[moduleName] = true;
                        }
                    }
                });
            },
            // traverseAndUpdateAst
            // --------------------
            //  Uses Estraverse to traverse the AST and convert all define() and require() methods to standard JavaScript
            'traverseAndUpdateAst': function(obj) {
                if(!_.isPlainObject(obj)) {
                    throw new Error(publicAPI.errorMsgs.invalidObject('traverseAndUpdateAst'));
                }
                var ast = obj.ast;
                if(!ast) {
                    throw new Error(publicAPI.errorMsgs.emptyAst('traverseAndUpdateAst'));
                }
                if(!_.isPlainObject(estraverse) || !_.isFunction(estraverse.replace)) {
                    throw new Error(publicAPI.errorMsgs.estraverse);
                }
                estraverse.replace(ast, {
                    'enter': function(node, parent) {
                        return publicAPI.convertDefinesAndRequires(node, parent);
                    },
                    'leave': function(node, parent) {
                        return node;
                    }
                });
                return ast;
            },
            // generateCode
            // ------------
            //  Returns standard JavaScript generated by Escodegen
            'generateCode': function(ast, options) {
                var esprimaOptions = options.esprima || {},
                    escodegenOptions = options.escodegen || {};
                if(!_.isPlainObject(escodegen) || !_.isFunction(escodegen.generate)) {
                    throw new Error(publicAPI.errorMsgs.escodegen);
                }
                // Check if both the esprima and escodegen comment options are set to true
                if(esprimaOptions.comment === true && escodegenOptions.comment === true) {
                    try {
                        // Needed to keep source code comments when generating the code with escodegen
                        ast = escodegen.attachComments(ast, ast.comments, ast.tokens);
                    } catch(e) {
                        if(console && console.log) {
                            // There was an error when attaching comments
                            console.log('There was an error attaching comments: ', e);
                        }
                    }
                }
                return escodegen.generate(ast, escodegenOptions);
            },
            // clean
            // -----
            //  Creates an AST using Esprima, traverse and updates the AST using Estraverse, and generates standard JavaScript using Escodegen.
            'clean': function(obj) {
                var code = {},
                    ast = {},
                    options = {},
                    defaultOptions = _.cloneDeep(publicAPI.defaultOptions || {}),
                    userOptions = obj || {},
                    mergedOptions = _.merge(defaultOptions, userOptions),
                    generatedCode,
                    originalAst,
                    declarations = [],
                    hoistedVariables = {},
                    hoistedCallbackParameters = {};
                publicAPI.options = options = mergedOptions;
                if(!_ || !_.isPlainObject) {
                    throw new Error(publicAPI.errorMsgs.lodash);
                }
                if(!_.isPlainObject(obj) && _.isString(obj)) {
                    code.code = obj;
                } else if(_.isPlainObject(obj)) {
                    code = obj;
                } else {
                    throw new Error(publicAPI.errorMsgs.invalidObject('clean'));
                }
                // Creates and stores an AST representation of the code
                originalAst = publicAPI.createAst(code);
                // Loops through the AST, finds all module ids, and stores them inside of publicAPI.storedModules
                publicAPI.findAndStoreAllModuleIds(originalAst);
                // Traverse the AST and removes any AMD trace
                ast = publicAPI.traverseAndUpdateAst({
                    ast: originalAst
                });

                // Post Clean Up
                // Removes all empty statements from the source so that there are no single semicolons and
                // Makes sure that all require() CommonJS calls are converted
                // And all aggressive optimizations (if the option is turned on) are handled
                if(ast && _.isArray(ast.body)) {
                    estraverse.replace(ast, {
                        enter: function(node, parent) {
                            var normalizedModuleName,
                                assignmentName = node && node.left && node.left.name ? node.left.name : '',
                                cb = node.right,
                                assignmentNodes = [],
                                assignments = {},
                                mappedParameters = _.filter(publicAPI.callbackParameterMap[assignmentName], function(currentParameter) {
                                    return currentParameter && currentParameter.count > 1;
                                }),
                                mappedCbDependencyNames,
                                mappedCbParameterNames,
                                paramsToRemove = [];
                            if(node === undefined || node.type === 'EmptyStatement') {
                                _.each(parent.body, function(currentNode, iterator) {
                                    if(currentNode === undefined || currentNode.type === 'EmptyStatement') {
                                        parent.body.splice(iterator, 1);
                                    }
                                });
                            } else if(publicAPI.isRequireExpression(node)) {
                                if(node['arguments'] && node['arguments'][0] && node['arguments'][0].value) {
                                    normalizedModuleName = publicAPI.normalizeModuleName(node['arguments'][0].value);
                                    return {
                                        'type': 'Identifier',
                                        'name': normalizedModuleName,
                                        'range': publicAPI.defaultRange,
                                        'loc': publicAPI.defaultLOC
                                    };
                                } else {
                                    return node;
                                }
                            } else if(options.aggressiveOptimizations === true && node.type === 'AssignmentExpression' && assignmentName) {
                                // The names of all of the current callback function parameters
                                mappedCbParameterNames = _.map((cb && cb.callee && cb.callee.params ? cb.callee.params : []), function(currentParam) {
                                    return currentParam.name;
                                });
                                // The names of all of the current callback function dependencies
                                mappedCbDependencyNames = _.map(cb.arguments, function(currentArg) {
                                    return currentArg.name;
                                });
                                // Loop through the dependency names
                                _.each(mappedCbDependencyNames, function(currentDependencyName) {
                                    // Nested loop to see if any of the dependency names map to a callback parameter
                                    _.each(publicAPI.callbackParameterMap[currentDependencyName], function(currentMapping) {
                                        var mappedName  = currentMapping.name,
                                            mappedCount = currentMapping.count;
                                        // Loops through all of the callback function parameter names to see if any of the parameters should be removed
                                        _.each(mappedCbParameterNames, function(currentParameterName, iterator) {
                                            if(mappedCount > 1 && mappedName === currentParameterName) {
                                                paramsToRemove.push(iterator);
                                            }
                                        });
                                    });
                                });
                                _.each(paramsToRemove, function(currentParam) {
                                    cb.arguments.splice(currentParam, currentParam + 1);
                                    cb.callee.params.splice(currentParam, currentParam + 1);
                                });
                                // If the current Assignment Expression is a mapped callback parameter
                                if(publicAPI.callbackParameterMap[assignmentName]) {
                                    node.right = function() {
                                        // If aggressive optimizations are turned on, the mapped parameter is used more than once, and there are mapped dependencies to be removed
                                        if(options.aggressiveOptimizations === true && mappedParameters.length) {
                                            // All of the necessary assignment nodes
                                            assignmentNodes = _.map(mappedParameters, function(currentDependency, iterator) {
                                                return {
                                                    'type': 'AssignmentExpression',
                                                    'operator': '=',
                                                    'left': {
                                                        'type': 'Identifier',
                                                        'name': currentDependency.name,
                                                        'range': publicAPI.defaultRange,
                                                        'loc': publicAPI.defaultLOC
                                                    },
                                                    'right': (iterator < mappedParameters.length - 1) ? {
                                                        'range': publicAPI.defaultRange,
                                                        'loc': publicAPI.defaultLOC
                                                    } : cb,
                                                    'range': publicAPI.defaultRange,
                                                    'loc': publicAPI.defaultLOC
                                                };
                                            });
                                            // Creates an object containing all of the assignment expressions
                                            assignments = _.reduce(assignmentNodes, function(result, assignment, key) {
                                                result.right =  assignment;
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
                if(_.isArray(options.globalModules)) {
                    _.each(options.globalModules, function(currentModule) {
                        if(_.isString(currentModule) && currentModule.length) {
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
                                            'range': publicAPI.defaultRange,
                                            'loc': publicAPI.defaultLOC
                                        },
                                        'property': {
                                            'type': 'Identifier',
                                            'name': currentModule,
                                            'range': publicAPI.defaultRange,
                                            'loc': publicAPI.defaultLOC
                                        },
                                        'range': publicAPI.defaultRange,
                                        'loc': publicAPI.defaultLOC
                                    },
                                    'right': {
                                        'type': 'Identifier',
                                        'name': currentModule,
                                        'range': publicAPI.defaultRange,
                                        'loc': publicAPI.defaultLOC
                                    },
                                    'range': publicAPI.defaultRange,
                                    'loc': publicAPI.defaultLOC
                                },
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            });
                        }
                    });
                }

                hoistedCallbackParameters = function() {
                    var obj = {},
                        callbackParameterMap = publicAPI.callbackParameterMap,
                        count,
                        currentParameterName;
                    _.each(callbackParameterMap, function(mappedParameters) {
                        _.each(mappedParameters, function(currentParameter) {
                            if(currentParameter.count > 1) {
                                currentParameterName = currentParameter.name;
                                obj[currentParameterName] = true;
                            }
                        });
                    });
                    return obj;
                }();

                // Hoists all modules and necessary callback parameters
                hoistedVariables = _.merge(_.cloneDeep(publicAPI.storedModules), hoistedCallbackParameters);

                // Creates variable declarations for each AMD module/callback parameter that needs to be hoisted
                _.each(hoistedVariables, function(moduleValue, moduleName) {
                    if(!_.contains(publicAPI.options.ignoreModules, moduleName)) {
                        declarations.push({
                            'type': 'VariableDeclarator',
                            'id': {
                                'type': 'Identifier',
                                'name': moduleName,
                                'range': publicAPI.defaultRange,
                                'loc': publicAPI.defaultLOC
                            },
                            'init': null,
                            'range': publicAPI.defaultRange,
                            'loc': publicAPI.defaultLOC
                        });
                    }
                });

                // If there are declarations, the declarations are preprended to the beginning of the code block
                if(declarations.length) {
                    ast.body.unshift({
                        'type': 'VariableDeclaration',
                        'declarations': declarations,
                        'kind': 'var',
                        'range': publicAPI.defaultRange,
                        'loc': publicAPI.defaultLOC
                    });
                }

                // Resets all of the stored modules
                publicAPI.storedModules = {};

                // Resets all of the stored callback parameter/dependency mappings
                publicAPI.callbackParameterMap = {};

                // Converts the updated AST to a string of code
                generatedCode = publicAPI.generateCode(ast, options);

                // If there is a wrap option specified
                if(_.isObject(publicAPI.options.wrap)) {
                    if(_.isString(publicAPI.options.wrap.start) && publicAPI.options.wrap.start.length) {
                        generatedCode = publicAPI.options.wrap.start + generatedCode;
                    }
                    if(_.isString(publicAPI.options.wrap.end) && publicAPI.options.wrap.end.length) {
                        generatedCode = generatedCode + publicAPI.options.wrap.end;
                    }
                }
                return generatedCode;
            }
        };
        return publicAPI;
})); // End of amdclean module