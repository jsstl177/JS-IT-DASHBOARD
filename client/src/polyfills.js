// Polyfills for Safari and older browsers

// String.prototype.replaceAll polyfill for Safari
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(str, newStr) {
    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }

    // If a string
    return this.replace(new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
  };
}

// Object.fromEntries polyfill for Safari
if (!Object.fromEntries) {
  Object.fromEntries = function(iterable) {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {});
  };
}

// Array.prototype.flat polyfill for Safari
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth = 1) {
    return this.reduce(function (flat, toFlatten) {
      return flat.concat(
        Array.isArray(toFlatten) && depth > 1
          ? toFlatten.flat(depth - 1)
          : toFlatten
      );
    }, []);
  };
}

// Array.prototype.flatMap polyfill for Safari
if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function(callback, thisArg) {
    return Array.prototype.map.apply(this, arguments).flat(1);
  };
}

// Optional chaining and nullish coalescing are ES2020 features
// These require transpilation by Babel, but we can add some runtime checks
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// URLSearchParams polyfill for older Safari versions
if (typeof window !== 'undefined' && !window.URLSearchParams) {
  // Basic polyfill for URLSearchParams if needed
  // This is a simplified version - in production you might want a more complete polyfill
  window.URLSearchParams = function(searchString) {
    this.params = new Map();
    if (searchString && searchString.startsWith('?')) {
      const pairs = searchString.slice(1).split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
        }
      });
    }
  };
  
  window.URLSearchParams.prototype.get = function(name) {
    return this.params.get(name) || null;
  };
  
  window.URLSearchParams.prototype.set = function(name, value) {
    this.params.set(name, value);
  };
  
  window.URLSearchParams.prototype.toString = function() {
    const pairs = [];
    this.params.forEach((value, key) => {
      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return pairs.join('&');
  };
}