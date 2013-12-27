
/**
 * Module dependencies
 */

var cheerio = require('cheerio')
 , through = require('through')

function noop () {}

/**
 * Generic parser for transforming
 * html to a specified format
 *
 * @api public
 * @param {Object} opts - optional
 */

module.exports = parser;
function parser (opts) {
  var stream = through(write, noop, opts);
  var filters = [];
  var excluded = [];
  var rootSelector = 'body';

  stream.use = use;
  stream.root = root;
  stream.exclude = exclude;

  return stream;

  function root (selector) {
    rootSelector = selector;
    return this;
  }

  function use (fn) {
    if ('function' == typeof fn) {
      filters.push(fn);
    }

    return this;
  }

  function exclude (selector) {
    if ('object' == typeof selector) {
      selector.map(exclude);
      return this;
    }

    selector = selector.split(',');

    if (selector.length > 1) {
      selector.map(exclude);
      return this;
    }

    selector = selector[0];

    if (-1 == excluded.indexOf(selector)) {
      excluded.push(selector);
    }

    return this;
  }

  function write (chunk) {
    var $ = cheerio.load(String(chunk));
    var nodes = null;
    var lines = null;
    var all = null;

    if (0 != $(rootSelector).length) {
      nodes = $(rootSelector);
    } else {
      nodes = $('*');
    }


    excluded.map(function remove (s) {
      var node = nodes.find(s);

      if (node.children().length) {
        node.children().remove();
      }

      node.remove();
    });

    all = nodes.find('*');

    // transform each node
    all.each(applyFilters);

    lines = nodes.map(function () {
      return this.text();
    });

    lines.map(function (line) {
      stream.push(line);
    });

    function applyFilters () {
      var fns = filters.slice();
      var fn = null;

      while (null != (fn = fns.shift())) {
        fn.call(this, this[0]);
      }
    }
  }
}
