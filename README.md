#amdclean

A build tool that converts AMD code to standard JavaScript.

`npm install amdclean`


## Use Case

**Single file** JavaScript libraries or applications that use AMD, but do not use AMD plugins (e.g. text! plugin).


## Why

Many developers like to use the AMD API to write modular JavaScript, but do not want to include a full AMD loader (e.g. [require.js](https://github.com/jrburke/requirejs)), or AMD shim (e.g. [almond.js](https://github.com/jrburke/almond)) because of file size/source code readability.

By incorporating amdclean.js into the build process, there is no need for Require or Almond.

Since AMDclean rewrites your source code into standard JavaScript, it is a great
fit for JavaScript library authors who want a tiny download in one file after using the
[RequireJS Optimizer](http://requirejs.org/docs/optimization.html).

So, you get great code cleanliness with AMD, reduced file sizes, improved code readability, and easy integration with other developers who may not use AMD.


## Restrictions

**Note:** Same restrictions as almond.js, plus a few more.

It is best used for libraries or apps that use AMD and:

* optimize all the modules into one file -- no dynamic code loading.
* include `path` alias names for each module using the `require.config()` method.
* do not use AMD loader plugins (e.g. text! plugin)
* only have **one** require.config() call.


##What is Supported

* `define()` and `require()` calls.

## Download

Node - `npm install amdclean`

Web - [Latest release](https://github.com/gfranko/amdclean/blob/master/src/amdclean.js)


## Usage

There are a few different ways that amdclean can be used including:

* With the RequireJS Optimizer

* As a standalone node module

* As a client-side library


###RequireJS Optimizer

* [Download the RequireJS optimizer](http://requirejs.org/docs/download.html#rjs).

* `npm install amdclean`

* Make sure that each of your AMD modules have a module ID `path` alias name

```javascript
paths: {

	'first': '../modules/firstModule',

	'second': '../modules/secondModule',

	'third': '../modules/thirdModule'

}
```

* Update the `onBuildWrite` property in your RequireJS build configuration file.  Like this:

```javascript
onBuildWrite: function (moduleName, path, contents) {
    return require('amdclean').clean(contents);
}
```

* Run the optimizer using [Node](http://nodejs.org) (also [works in Java](https://github.com/jrburke/r.js/blob/master/README.md)).  More details can be found in the the [r.js](https://github.com/jrburke/r.js/) repo.


###Node Module

* `npm install amdclean`

* Require the module

```javascript
var cleanAMD = require('amdclean');
```

* Call the clean method

```javascript
var code = 'define("exampleModule", function() {});'
var cleanedCode = cleanAMD.clean(code);
```


###Client-side Library

* Include all dependencies

```html
<script src="http://esprima.org/esprima.js"></script>
<script src="http://esprima.org/test/3rdparty/escodegen.browser.js"></script>
<script src="http://gregfranko.com/javascripts/estraverse.js"></script>
<script src="http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.js"></script>
<script src="http://gregfranko.com/javascripts/amdclean.js"></script>
```

* Use the global `amdclean` object and `clean()` method

```javascript
var cleanedCode = cleanamd.clean('define("example", [], function() { var a = true; });');
```

## Requirements

* [Esprima](https://github.com/ariya/esprima) 1.0+

* [Lodash](https://github.com/lodash/lodash) 2.2.1+

* [Estraverse](https://github.com/Constellation/estraverse) 1.3.1+

* [Escodegen](https://github.com/Constellation/escodegen) 0.0.27+


## How it works

amdclean uses Esprima to generate an AST (Abstract Syntax Tree) from the provided source code, estraverse to traverse and update the AST, and escodegen to generate the new standard JavaScript code.  There are a few different techniques that amdclean uses to convert AMD to standard JavaScript code:


###Define Calls

_AMD_

```javascript
define('example', [], function() {
	
});
```

_Standard_

```javascript
var example = function () {

}();
```


_AMD_

```javascript
define('example', ['example1', 'example2'], function(one, two) {
	
});
```

_Standard_

```javascript
var example = function (one, two) {
        two = example2;
        one = example1;
}();
```


_AMD_

```javascript
define('third',{
	exampleProp: 'This is an example'
});
```

_Standard_

```javascript
var third = {
	exampleProp: 'This is an example'
};
```


###Require Calls

_AMD_

```javascript
require('example', [], function() {
	var example = true;
});
```

_Standard_

```javascript
(function () {
    var example = true;
}());
```


_AMD_

```javascript
require('example', ['anotherModule'], function(anotherModule) {
	var example = true;
});
```

_Standard_

```javascript
(function (anotherModule) {
    var example = true;
}(anotherModule));
```


## Unit Tests

Work in Progress


## License

Copyright (c) 2013 Greg Franko Licensed under the MIT license.
