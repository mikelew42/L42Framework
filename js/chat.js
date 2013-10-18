//// Stack Trace Until

// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Oyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)
/*global module, exports, define, ActiveXObject*/
(function(global, factory) {
	if (typeof exports === 'object') {
		// Node
		module.exports = factory();
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(factory);
	} else {
		// Browser globals
		global.printStackTrace = factory();
	}
}(this, function() {
	/**
	 * Main function giving a function stack trace with a forced or passed in Error
	 *
	 * @cfg {Error} e The error to create a stacktrace from (optional)
	 * @cfg {Boolean} guess If we should try to resolve the names of anonymous functions
	 * @return {Array} of Strings with functions, lines, files, and arguments where possible
	 */
	function printStackTrace(options) {
		options = options || {guess: true};
		var ex = options.e || null, guess = !!options.guess;
		var p = new printStackTrace.implementation(), result = p.run(ex);
		return (guess) ? p.guessAnonymousFunctions(result) : result;
	}

	printStackTrace.implementation = function() {
	};

	printStackTrace.implementation.prototype = {
		/**
		 * @param {Error} ex The error to create a stacktrace from (optional)
		 * @param {String} mode Forced mode (optional, mostly for unit tests)
		 */
		run: function(ex, mode) {
			ex = ex || this.createException();
			// examine exception properties w/o debugger
			//for (var prop in ex) {alert("Ex['" + prop + "']=" + ex[prop]);}
			mode = mode || this.mode(ex);
			if (mode === 'other') {
				return this.other(arguments.callee);
			} else {
				return this[mode](ex);
			}
		},

		createException: function() {
			try {
				this.undef();
			} catch (e) {
				return e;
			}
		},

		/**
		 * Mode could differ for different exception, e.g.
		 * exceptions in Chrome may or may not have arguments or stack.
		 *
		 * @return {String} mode of operation for the exception
		 */
		mode: function(e) {
			if (e['arguments'] && e.stack) {
				return 'chrome';
			} else if (e.stack && e.sourceURL) {
				return 'safari';
			} else if (e.stack && e.number) {
				return 'ie';
			} else if (e.stack && e.fileName) {
				return 'firefox';
			} else if (e.message && e['opera#sourceloc']) {
				// e.message.indexOf("Backtrace:") > -1 -> opera9
				// 'opera#sourceloc' in e -> opera9, opera10a
				// !e.stacktrace -> opera9
				if (!e.stacktrace) {
					return 'opera9'; // use e.message
				}
				if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
					// e.message may have more stack entries than e.stacktrace
					return 'opera9'; // use e.message
				}
				return 'opera10a'; // use e.stacktrace
			} else if (e.message && e.stack && e.stacktrace) {
				// e.stacktrace && e.stack -> opera10b
				if (e.stacktrace.indexOf("called from line") < 0) {
					return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
				}
				// e.stacktrace && e.stack -> opera11
				return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
			} else if (e.stack && !e.fileName) {
				// Chrome 27 does not have e.arguments as earlier versions,
				// but still does not have e.fileName as Firefox
				return 'chrome';
			}
			return 'other';
		},

		/**
		 * Given a context, function name, and callback function, overwrite it so that it calls
		 * printStackTrace() first with a callback and then runs the rest of the body.
		 *
		 * @param {Object} context of execution (e.g. window)
		 * @param {String} functionName to instrument
		 * @param {Function} callback function to call with a stack trace on invocation
		 */
		instrumentFunction: function(context, functionName, callback) {
			context = context || window;
			var original = context[functionName];
			context[functionName] = function instrumented() {
				callback.call(this, printStackTrace().slice(4));
				return context[functionName]._instrumented.apply(this, arguments);
			};
			context[functionName]._instrumented = original;
		},

		/**
		 * Given a context and function name of a function that has been
		 * instrumented, revert the function to it's original (non-instrumented)
		 * state.
		 *
		 * @param {Object} context of execution (e.g. window)
		 * @param {String} functionName to de-instrument
		 */
		deinstrumentFunction: function(context, functionName) {
			if (context[functionName].constructor === Function &&
				context[functionName]._instrumented &&
				context[functionName]._instrumented.constructor === Function) {
				context[functionName] = context[functionName]._instrumented;
			}
		},

		/**
		 * Given an Error object, return a formatted Array based on Chrome's stack string.
		 *
		 * @param e - Error object to inspect
		 * @return Array<String> of function calls, files and line numbers
		 */
		chrome: function(e) {
			return (e.stack + '\n')
				.replace(/^\s+(at eval )?at\s+/gm, '') // remove 'at' and indentation
				.replace(/^([^\(]+?)([\n$])/gm, '{anonymous}() ($1)$2')
				.replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}() ($1)')
				.replace(/^(.+) \((.+)\)$/gm, '$1@$2')
				.split('\n')
				.slice(1, -1);
		},

		/**
		 * Given an Error object, return a formatted Array based on Safari's stack string.
		 *
		 * @param e - Error object to inspect
		 * @return Array<String> of function calls, files and line numbers
		 */
		safari: function(e) {
			return e.stack.replace(/\[native code\]\n/m, '')
				.replace(/^(?=\w+Error\:).*$\n/m, '')
				.replace(/^@/gm, '{anonymous}()@')
				.split('\n');
		},

		/**
		 * Given an Error object, return a formatted Array based on IE's stack string.
		 *
		 * @param e - Error object to inspect
		 * @return Array<String> of function calls, files and line numbers
		 */
		ie: function(e) {
			return e.stack
				.replace(/^\s*at\s+(.*)$/gm, '$1')
				.replace(/^Anonymous function\s+/gm, '{anonymous}() ')
				.replace(/^(.+)\s+\((.+)\)$/gm, '$1@$2')
				.split('\n')
				.slice(1);
		},

		/**
		 * Given an Error object, return a formatted Array based on Firefox's stack string.
		 *
		 * @param e - Error object to inspect
		 * @return Array<String> of function calls, files and line numbers
		 */
		firefox: function(e) {
			return e.stack.replace(/(?:\n@:0)?\s+$/m, '')
				.replace(/^(?:\((\S*)\))?@/gm, '{anonymous}($1)@')
				.split('\n');
		},

		opera11: function(e) {
			var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
			var lines = e.stacktrace.split('\n'), result = [];

			for (var i = 0, len = lines.length; i < len; i += 2) {
				var match = lineRE.exec(lines[i]);
				if (match) {
					var location = match[4] + ':' + match[1] + ':' + match[2];
					var fnName = match[3] || "global code";
					fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
					result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
				}
			}

			return result;
		},

		opera10b: function(e) {
			// "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
			// "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
			// "@file://localhost/G:/js/test/functional/testcase1.html:15"
			var lineRE = /^(.*)@(.+):(\d+)$/;
			var lines = e.stacktrace.split('\n'), result = [];

			for (var i = 0, len = lines.length; i < len; i++) {
				var match = lineRE.exec(lines[i]);
				if (match) {
					var fnName = match[1] ? (match[1] + '()') : "global code";
					result.push(fnName + '@' + match[2] + ':' + match[3]);
				}
			}

			return result;
		},

		/**
		 * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
		 *
		 * @param e - Error object to inspect
		 * @return Array<String> of function calls, files and line numbers
		 */
		opera10a: function(e) {
			// "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
			// "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
			var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
			var lines = e.stacktrace.split('\n'), result = [];

			for (var i = 0, len = lines.length; i < len; i += 2) {
				var match = lineRE.exec(lines[i]);
				if (match) {
					var fnName = match[3] || ANON;
					result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
				}
			}

			return result;
		},

		// Opera 7.x-9.2x only!
		opera9: function(e) {
			// "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
			// "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
			var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
			var lines = e.message.split('\n'), result = [];

			for (var i = 2, len = lines.length; i < len; i += 2) {
				var match = lineRE.exec(lines[i]);
				if (match) {
					result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
				}
			}

			return result;
		},

		// Safari 5-, IE 9-, and others
		other: function(curr) {
			var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
			while (curr && curr['arguments'] && stack.length < maxStackSize) {
				fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
				args = Array.prototype.slice.call(curr['arguments'] || []);
				stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
				curr = curr.caller;
			}
			return stack;
		},

		/**
		 * Given arguments array as a String, substituting type names for non-string types.
		 *
		 * @param {Arguments,Array} args
		 * @return {String} stringified arguments
		 */
		stringifyArguments: function(args) {
			var result = [];
			var slice = Array.prototype.slice;
			for (var i = 0; i < args.length; ++i) {
				var arg = args[i];
				if (arg === undefined) {
					result[i] = 'undefined';
				} else if (arg === null) {
					result[i] = 'null';
				} else if (arg.constructor) {
					if (arg.constructor === Array) {
						if (arg.length < 3) {
							result[i] = '[' + this.stringifyArguments(arg) + ']';
						} else {
							result[i] = '[' + this.stringifyArguments(slice.call(arg, 0, 1)) + '...' + this.stringifyArguments(slice.call(arg, -1)) + ']';
						}
					} else if (arg.constructor === Object) {
						result[i] = '#object';
					} else if (arg.constructor === Function) {
						result[i] = '#function';
					} else if (arg.constructor === String) {
						result[i] = '"' + arg + '"';
					} else if (arg.constructor === Number) {
						result[i] = arg;
					}
				}
			}
			return result.join(',');
		},

		sourceCache: {},

		/**
		 * @return the text from a given URL
		 */
		ajax: function(url) {
			var req = this.createXMLHTTPObject();
			if (req) {
				try {
					req.open('GET', url, false);
					//req.overrideMimeType('text/plain');
					//req.overrideMimeType('text/javascript');
					req.send(null);
					//return req.status == 200 ? req.responseText : '';
					return req.responseText;
				} catch (e) {
				}
			}
			return '';
		},

		/**
		 * Try XHR methods in order and store XHR factory.
		 *
		 * @return <Function> XHR function or equivalent
		 */
		createXMLHTTPObject: function() {
			var xmlhttp, XMLHttpFactories = [
				function() {
					return new XMLHttpRequest();
				}, function() {
					return new ActiveXObject('Msxml2.XMLHTTP');
				}, function() {
					return new ActiveXObject('Msxml3.XMLHTTP');
				}, function() {
					return new ActiveXObject('Microsoft.XMLHTTP');
				}
			];
			for (var i = 0; i < XMLHttpFactories.length; i++) {
				try {
					xmlhttp = XMLHttpFactories[i]();
					// Use memoization to cache the factory
					this.createXMLHTTPObject = XMLHttpFactories[i];
					return xmlhttp;
				} catch (e) {
				}
			}
		},

		/**
		 * Given a URL, check if it is in the same domain (so we can get the source
		 * via Ajax).
		 *
		 * @param url <String> source url
		 * @return <Boolean> False if we need a cross-domain request
		 */
		isSameDomain: function(url) {
			return typeof location !== "undefined" && url.indexOf(location.hostname) !== -1; // location may not be defined, e.g. when running from nodejs.
		},

		/**
		 * Get source code from given URL if in the same domain.
		 *
		 * @param url <String> JS source URL
		 * @return <Array> Array of source code lines
		 */
		getSource: function(url) {
			// TODO reuse source from script tags?
			if (!(url in this.sourceCache)) {
				this.sourceCache[url] = this.ajax(url).split('\n');
			}
			return this.sourceCache[url];
		},

		guessAnonymousFunctions: function(stack) {
			for (var i = 0; i < stack.length; ++i) {
				var reStack = /\{anonymous\}\(.*\)@(.*)/,
					reRef = /^(.*?)(?::(\d+))(?::(\d+))?(?: -- .+)?$/,
					frame = stack[i], ref = reStack.exec(frame);

				if (ref) {
					var m = reRef.exec(ref[1]);
					if (m) { // If falsey, we did not get any file/line information
						var file = m[1], lineno = m[2], charno = m[3] || 0;
						if (file && this.isSameDomain(file) && lineno) {
							var functionName = this.guessAnonymousFunction(file, lineno, charno);
							stack[i] = frame.replace('{anonymous}', functionName);
						}
					}
				}
			}
			return stack;
		},

		guessAnonymousFunction: function(url, lineNo, charNo) {
			var ret;
			try {
				ret = this.findFunctionName(this.getSource(url), lineNo);
			} catch (e) {
				ret = 'getSource failed with url: ' + url + ', exception: ' + e.toString();
			}
			return ret;
		},

		findFunctionName: function(source, lineNo) {
			// FIXME findFunctionName fails for compressed source
			// (more than one function on the same line)
			// function {name}({args}) m[1]=name m[2]=args
			var reFunctionDeclaration = /function\s+([^(]*?)\s*\(([^)]*)\)/;
			// {name} = function ({args}) TODO args capture
			// /['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*function(?:[^(]*)/
			var reFunctionExpression = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/;
			// {name} = eval()
			var reFunctionEvaluation = /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/;
			// Walk backwards in the source lines until we find
			// the line which matches one of the patterns above
			var code = "", line, maxLines = Math.min(lineNo, 20), m, commentPos;
			for (var i = 0; i < maxLines; ++i) {
				// lineNo is 1-based, source[] is 0-based
				line = source[lineNo - i - 1];
				commentPos = line.indexOf('//');
				if (commentPos >= 0) {
					line = line.substr(0, commentPos);
				}
				// TODO check other types of comments? Commented code may lead to false positive
				if (line) {
					code = line + code;
					m = reFunctionExpression.exec(code);
					if (m && m[1]) {
						return m[1];
					}
					m = reFunctionDeclaration.exec(code);
					if (m && m[1]) {
						//return m[1] + "(" + (m[2] || "") + ")";
						return m[1];
					}
					m = reFunctionEvaluation.exec(code);
					if (m && m[1]) {
						return m[1];
					}
				}
			}
			return '(?)';
		}
	};

	return printStackTrace;
}));


;(function($){
    $(document).ready(function(){


        /*$(document).on('dblclick', '[data-twyg]', function(){
            var $this = $(this),
                $textarea = $('<textarea></textarea>').html($this.outerHTML()),
                twyg = new Twyg();

            $this.replaceWith($textarea);
            $textarea.redactor(twyg.get('redactorSettings'));
            twyg.setRedactor( $textarea.data('redactor') );
            return false;
        });

        $('.chat-input').each(function(){
            var $self = $(this),
                $textarea = $self.children('textarea'),
                $submit = $self.next('.chat-submit'),
                twyg = new Twyg();

            $textarea.redactor(twyg.get('redactorSettings'));
            twyg.setRedactor( $textarea.data('redactor'));
            $submit.click(function(){
                var html = $textarea.data('redactor').getCode();

                $.ajax({
                    type: 'POST',
                    data: { newComment: html, ajaxAction: 'newComment' },
                    success: function(res){
                        wpxDebugInit($(res));
                        $('.chat-stream').html(res);
                        $textarea.data('redactor').setCode('');
                    }
                });
            });
        });
*/
    });
})(jQuery);

;(function(_, $, Backbone, window, undefined){

	/*
	 * Handler isn't necessary.  You can just call this to activate the click.clickOff event.
	 */
	$.fn.clickOff = function(handler){
		return this.each(function(){
			var $self = $(this),
				docClick,
				hit = false;

			$self.off('click.clickOffSelf clickOff');

			if (docClick = $self.data('clickOffDocClickHandler'))
				$(document).off('click.clickOffDoc', docClick);

			if (handler && handler === 'off')
				return true;

			docClick = function(){
				//console.log('wtfucking fuck');
				//console.trace();
				!hit &&	$self.trigger('clickOff');
				hit = false;
			};

			if (typeof handler === "function")
				$self.on('clickOff', handler);

			$self.on('click.clickOffSelf', function(){
				//console.log('selfie, hit = true!');
				hit = true;
			});

			$(document).on('click.clickOffDoc', docClick);

			$self.data('clickOffDocClickHandler', docClick); // save for removal later
		});
	};

    $.fn.outerHTML = function() {
        return jQuery('<div />').append(this.eq(0).clone()).html();
    };

	$.fn.twyg = function(options){
		return this.each(function(){
			TwygCreate($(this), options);
		});
	};

	$(document).ready(function(){
		jLogOpen('chat.js', 561, 'Twyg Auto Init');
		$('[data-twyg-init]').each(function(){
			var $self = $(this),
				options = $self.data('twygInit');

			$self.twyg(options);
		});
		jLogEnd();
	});
	var twygs = []; // priority indexed array of twygs.

var AddTwyg;
	window.AddTwyg = AddTwyg = function(twyg, priority){
		if (!priority)
			priority = 50;

		if (!twygs[priority])
			twygs[priority] = [];

		twygs[priority].push(twyg);
	};

window.allTwygs = [];  // debugging
var TwygCreate;
	window.TwygCreate = TwygCreate = function($el, options){
		var returnTwyg;
		for (var priority in twygs){
			for (var i in twygs[priority]){
				if ( (returnTwyg = twygs[priority][i].create($el, options)) ){
					window.allTwygs.push(returnTwyg);
					return returnTwyg;
				}
			}
		}
		return false;
	};

var twygDefaults = {
	factory: false,  // the twyg instances are used as factories.  this should be false unless you're using AddTwyg
	selector: '*, .twyg',
	autoActivate: false,
	permaedit: false,
	CE: false
};
	// use an AMD loader to load wydgyts before Twyg?  Or add them after Twyg.
var Twyg;
	window.Twyg = Twyg = Backbone.Model.extend({
		defaults: $.extend({}, twygDefaults),
		$el: $('<div></div>'),
		children: [],
		name: 'Twyg',
		// with my extend, initialize wont have $el yet
		initialize: function(){
			//jLog('chat.js', 616, '.initialize() args', arguments, this);
			this.children = []; // make sure this is reset for all sub classes
			//console.log( this.cid + ' ' + this.get('selector') + ' Twyg.initialize()');

			this.name = "Twyg[" + this.cid + "][" + this.get('selector') + "]";
			if (this.get('$el')){
				this.$el = this.get('$el');
				this.$el.data('twyg', this);
			}

			if (!this.get('factory')){
				this.editProxy = $.proxy(this.edit, this);
				this.exitProxy = $.proxy(this.exit, this);
				this.activateProxy = $.proxy(this.activate, this);
				this.deactivateProxy = $.proxy(this.deactivate, this);
				this.initializeChildren();
				this.getParentTwyg();
				if (this.get('autoActivate'))
					this.activate();

				if (this.get('permaedit'))
					this.edit();

				jLogValue('chat.js', 634, 'this.get("permaedit")', this.get('permaedit'), this);

				//jLogEnd('chat.js', 639, '/.initialize no return', {}, this);
			}
		},
		getParentTwyg: function(){
			var parentTwyg;

			this.$el.parents().each(function(){
				var $self = $(this),
					twyg = $self.data('twyg');

				if (twyg){
					// export this match
					parentTwyg = twyg;
					// return false to stop the each loop
					return false;
				}
			});

			this.parent = parentTwyg;
		},
		addActivateClickHandler: function(){
			this.$el.on('click', this.activateProxy);
		},
		removeActivateClickHandler: function(){
			this.$el.off('click', this.activateProxy);
		},
		addClickOffDeactivateHandler: function(){
			this.$el.clickOff('off').clickOff().on('clickOff', this.deactivateProxy);
		},
		removeClickOffDeactivateHandler: function(){
			this.$el.clickOff('off');
		},
		set$el: function($el){
			this.$el = $el;
			this.init$el($el);
		},
		removeParentClickOff: function(){
			var $parent = this.$el.parent(),
				parentTwyg;

			if (parentTwyg = $parent.data('twyg'))
				parentTwyg.$el.clickOff('off');
		},
		activate: function(){
			//jLog('.activate', this, arguments);
			console.log(this.cid + ' ' + this.get('selector') + ' Twyg.activate()');
			this.$el.addClass('twyg-active');
			this.$el.on('click.twygEdit', this.editProxy);

			var caller_line = (new Error).stack.split("\n")[4];
			var index = caller_line.indexOf("at ");
			var clean = caller_line.slice(index+2, caller_line.length);
			//console.log('caller_line.indexOf(":", - ' + caller_line);
			//console.log('clean: ' + clean);

			var ex;
			ex = this.createException();
			//console.log(ex.line);
			//console.log(ex.name);
			//console.log();
			//console.log((ex.stack + '\n')
			//	.replace(/^\s+(at eval )?at\s+/gm, '')); //replace(/^([^\(]+?)([\n$])/gm, '{anonymous}() ($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}() ($1)')
				//.replace(/^(.+) \((.+)\)$/gm, '$1@$2').split('\n')
				//.slice(1, -1)); // remove 'at' and indentation
			return false;
		},
		createException: function(){
			try {
				this.neverGonnaBeDeFiNeD();
			} catch(e){
				return e;
			}
		},
		edit: function(){
			console.log(this.cid + ' ' + this.get('selector') + ' Twyg.edit()');

			if (!this.get('permaedit')){
				console.log('not permaedit, onclickOff, exit ');
				this.addClickOff();
			}

			// remove edit click handler
			this.$el.off('click.twygEdit', this.editProxy);

			// remove parent clickOff handler
			this.removeParentClickOff();

			// this is DOM based
			// it could be a deactivateParent(deep) call, because the parent should already be deactivated...
			// or, a this.parentTwyg.deactivateChildren()...  but i'm not sure if we want DOM siblings, or parentTwyg siblings.
			// we haven't really skipped any levels.  The tricky part will be when there are gaps w/o twygs.  However, I don't really
			// think that should happen.  If there are uneditable or non-twyg items, they should be inside another twyg.  This way, all
			// content is editable and removable.
			this.deactivateSelfAndSiblings();

			// While keeping siblings active, you can have 2 editable at the same time.
			// 		This is only due to the fact that the active=>edit handler prevents the clickoff from the other editables
			// When 2 twygs are editable, if you clickoff and its not prevented, then both editables will cycle their exits, one level at a time.
			//this.deactivate();
			console.log(this.cid + ' ' + this.get('selector') + ' Twyg.edit() activateChildren(): ');
			this.activateChildren();

			this.$el.addClass('twyg-edit');
			if (this.get('CE'))
				this.$el.attr('contenteditable', true);

			return false;
		},
		exit: function(){
			console.log(this.cid + ' ' + this.get('selector') + ' Twyg.exit()');
			//console.trace();
			if (this.get('permaedit'))
				return true; // let this bubble.. .omfg

			this.$el.clickOff('off').removeClass('twyg-edit').attr('contenteditable', null);

			// deactivate self and children (we want self back on, but this is for lack of a better method)
			this.deactivate(true);
			// reactivate self and siblings
			this.activateSelfAndSiblings();

			// add parent clickoff back again
			this.addParentClickOff();

			return false;
		},
		addParentClickOff: function(){
			var $parent = this.$el.parent(),
				parentTwyg;

			if (parentTwyg = $parent.data('twyg'))
				parentTwyg.addClickOff();
		},
		addClickOff: function(){
			this.$el.clickOff(this.exitProxy);
		},
		activateSelfAndSiblings: function(){
			var $parent = this.$el.parent();

			$parent.children().each(function(){
				var $self = $(this),
					twyg = $self.data('twyg');

				if (twyg){
					twyg.activate();
				}
			});
		},
		activateChildren: function(){
			for (var i in this.children)
				this.children[i].activate();
		},
		initializeChildren: function(options){
			$.extend(options, { });
			var twyg = this;
			this.$el.children().each(function(){
				var $child = $(this),
					child = TwygCreate($child, options);
				if (child)
					twyg.children.push(child);
			});
		},
		deactivate: function(children){
			!children && (children = false);
			console.log( this.cid + ' Twyg.deactivate(children=' + children + ')');

			this.$el.removeClass('twyg-active');

			// remove edit click handler
			this.$el.off('click.twygEdit', this.editProxy);


			//this.$el.css('border', '1px solid orange');
			if (children)
				this.deactivateChildren();
			return false;
		},
		deactivateSelfAndSiblings: function(deep){
			!deep && (deep = false);
			//console.log(this.cid + ' ' + this.get('selector') + ' Twyg.deactivateSelfAndSiblings()');
			var $parent = this.$el.parent();

			//console.log($parent.children());
			$parent.children().each(function(){
				var $self = $(this),
					twyg = $self.data('twyg');

				if (twyg){
					twyg.deactivate(deep);
				}

			});
		},
		deactivateChildren: function(){
			for (var i in this.children)
				this.children[i].deactivate();
		},
		logChildren: function(){
			console.log(this.cid + ' ' + this.get('selector') + ' Twyg.children: ')
			console.log(this.children);
		},
		create: function($el, options){
		//	console.log(this.cid + ' ' + this.get('selector') + ' Twyg...create()');
			if ($el.data('twyg')){
				return false;
			}

			if (!this.$elMatch($el))
				return false;

			return new this.constructor($.extend({ $el: $el }, options));
		},
		$elMatch: function($el){
			return $el.is(this.get('selector'));
		}
	});

// maybe make these elements / wydgyt constructors as properties of the Twyg to keep global namespace limited
var TwygP;
window.TwygP = TwygP = Twyg.extend({
	defaults: $.extend({}, twygDefaults, { selector: 'p', CE: true }),
	initialize: function(){
		Twyg.prototype.initialize.call(this);
	}
})

var TwygDiv;
window.TwygDiv = TwygDiv = Twyg.extend({
	defaults: $.extend({}, twygDefaults, { selector: 'div' }),
	initialize: function(){
		Twyg.prototype.initialize.call(this);
	}
});

var Wydgyt1;
	Wydgyt1 = window.Wydgyt1 = Twyg.extend({
		defaults: {
			factory: false,  // the twyg instances are used as factories.  this should be false unless you're using AddTwyg
			selector: '.twyg-wydgyt1',
			autoActivate: true,
			clickOut: true, // set to false for chat and other permaedit entry twygs
			activationEvent: 'dblclick', // only initialized on deactivation?
			acceptableChildren: {}
		},
		initialize: function(){
			console.log('Wydgyt1 initialized and ready!');
		}
	});

var TwygList;
	TwygList = window.TwygList = Twyg.extend({
		defaults: {
			factory: false,  // the twyg instances are used as factories.  this should be false unless you're using AddTwyg
			selector: 'ul',
			autoActivate: true,
			clickOut: true, // set to false for chat and other permaedit entry twygs
			activationEvent: 'dblclick', // only initialized on deactivation?
			acceptableChildren: {}
		},
		initialize: function(){
			console.log('TwygList initialized and ready!');
		}
	});

	// setup twyg factories
	AddTwyg(new TwygP({ factory: true  }), 100);
	AddTwyg(new TwygDiv( { factory: true }), 100);
	/*

	 var Wydygt;
	 Wydgyt = window.Wydgyt = Backbone.Model.extend({
	 defaults: {
	 selector: '.wydgyt'
	 },
	 $el: $('<div></div>'), // this isn't ready until AFTER initialize!
	 initialize: function(){}

	 });
	 // Elements and Wydgyts should be the same.
	 // Its very likely I'd want to add functionality to elements in the same manner as wydgyts...
	 var TwygElement;
	 window.TwygElement = TwygElement = Wydgyt.extend({
	 defaults: {
	 selector: 'element', //needs to be overridden
	 acceptableChildren: ['a', 'img', 'span', 'i', 'b', 'strong', 'em',
	 'p', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div']
	 },
	 initialize: function(){}

	 });


    window.Twyg = Twyg = Backbone.Model.extend({
        defaults: {
            redactor: {},
            wydgyt1: {},
            redactorSettings: {
                redactorPlugins: {},
                buttonsCustom: {
                    twyg: {
                        title: 'Twyg',
                        func: 'show',
                        dropdown: {
                            twyg1: { title: 'Twyg1', func: 'twyg1' }
                        }
                    }
                },
                buttonsAdd: [ '|', 'twyg'],
                customMethods: {
                    twyg1: function(){ console.log('twyg1: just a test'); }
                }
            }
        },
        initialize: function(){
            this.initRedactorPlugins();
        },
        initRedactorPlugins: function(){
            var wydgyt1 = new Wydgyt1({twyg: this}),
                redactorSettings = this.get('redactorSettings');

            this.set('wydgyt1', wydgyt1);

            wydgyt1.set('twyg', this);

            $.extend(redactorSettings.redactorPlugins, {
                twyg: this,
                wydgyt1: wydgyt1
            });

            $.extend(redactorSettings.buttonsCustom.twyg.dropdown, {
                wydgyt1: wydgyt1.get('twygRedactorDropdown')
            });

            $.extend(redactorSettings.customMethods, {
                wydgyt1: wydgyt1.getRedactorCallback()
            });
        },
        setRedactor: function(redactor){
            this.set('redactor', redactor);
            this.get('wydgyt1').set('redactor', redactor);
        }
    });
    window.Wydgyt1 = Wydgyt1 = Backbone.Model.extend({
        defaults: {
            instances: [],
            redactor: {},
            twyg: {},
            twygRedactorDropdown: { title: 'Wydgyt1', func: 'wydgyt1' }
        },
        initialize: function(){

        },
        // this becomes the Redactor!!
        getRedactorCallback: function(){
            return $.proxy(this.redactorCallback, this);
        },

        redactorCallback: function(){
            //console.log(this);
            //console.log(this.get('redactor'));
            var redactor = this.get('redactor'),
                instances = this.get('instances'),
                newInstance = new Wydgyt1Instance({ wydgyt: this });

            instances.push(newInstance);

            redactor.insertHtml( newInstance.get('view').$el.outerHTML() );

            var $textarea = redactor.$el;
            redactor.destroy();
            $textarea.remove();
            delete($textarea);
            var $contents = $($textarea.val());
            $('.chat-input').prepend($contents).attr('data-twyg', '1');
        },

        initFromHtml: function($el){
            this.view = new Wydgyt1View({ el: $el, model: this });
        },
        createNew: function(){
            this.view = new Wydgyt1View({model: this});
        },
        insertBefore: function($el){
            this.view.$el.insertBefore($el);
        },
        insertAfter: function($el){
            this.view.$el.insertAfter($el);
        }
    });
    window.Wydgyt1Instance = Wydgyt1Instance = Backbone.Model.extend({
        defaults: {},
        initialize: function(){
            if (!this.get('view'))
                this.set('view', new Wydgyt1View());
        }
    });
    window.WydgytView = Wydgyt1View = Backbone.View.extend({
        initialize: function(){
            if (!this.$el.hasClass('wydgyt1')) {
               this.setElement(    $( _.template( $('#wydgyt1-template').html() )() )    );
            }
        }
    });
    */
})(_, jQuery, Backbone, window, undefined);