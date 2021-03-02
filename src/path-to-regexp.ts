export interface FlagOptions {
  sensitive?: boolean | undefined
  strict?: boolean
  start?: boolean
  end?: boolean
  delimiter?: string | null
  delimiters?: string
  endsWith?: string[]
}

export interface TokenObject {
  name: string | number
  optional: boolean
  repeat: boolean
  partial: boolean
  prefix: string | null
  delimiter: string | null
  pattern: RegExp | string | null
}

export type Path = string | RegExp | Array<string | RegExp>
export type PathFunction = (data?: Object, options?: PathFunctionOptions) => string

export interface PathFunctionOptions {
  pretty?: boolean
  encode?: (value: string, token: TokenObject) => string
}

export type Tokens = string | TokenObject

class PathToRegexGenerator {
  /**
   * Default configs.
   */
  private DEFAULT_DELIMITER = '/';
  private DEFAULT_DELIMITERS = './';

  /**
   * The main path matching regexp utility.
   *
   * @type {RegExp}
   */
  private PATH_REGEXP = new RegExp(
    [
      // Match escaped characters that would otherwise appear in future matches.
      // This allows the user to escape special characters that won't transform.
      '(\\\\.)',
      // Match Express-style parameters and un-named parameters with a prefix
      // and optional suffixes. Matches appear as:
      //
      // ":test(\\d+)?" => ["test", "\d+", undefined, "?"]
      // "(\\d+)"  => [undefined, undefined, "\d+", undefined]
      '(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?',
    ].join('|'),
    'g'
  );

  pathToRegexp(path: Path, keys?: Tokens[], options?: FlagOptions) {
    if (path instanceof RegExp) {
      return this.regexpToRegexp(path, keys)
    }

    if (Array.isArray(path)) {
      return this.arrayToRegexp(/** @type {!Array} */ path, keys, options)
    }

    return this.stringToRegexp(/** @type {string} */ path, keys, options)
  }

  tokensToRegExp(tokens: Tokens[], keys?: Tokens[], options: FlagOptions = {}) {
    //   options = options || {};

    let strict = options.strict
    let start = options.start !== false
    let end = options.end !== false
    let delimiter = this.escapeString(options.delimiter || this.DEFAULT_DELIMITER)
    let delimiters = options.delimiters || this.DEFAULT_DELIMITERS
    let endsWith: string = ([] as string[])
      .concat(options.endsWith || [])
      .map(this.escapeString)
      .concat('$')
      .join('|')
    let route = start ? '^' : ''
    let isEndDelimited = tokens.length === 0

    // Iterate over the tokens and create our regexp string.
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i]

      if (typeof token === 'string') {
        route += this.escapeString(token)
        isEndDelimited = i === tokens.length - 1 && delimiters.indexOf(token[token.length - 1]) > -1
      } else {
        let capture = token.repeat
          ? '(?:' + token.pattern + ')(?:' + this.escapeString(token.delimiter) + '(?:' + token.pattern + '))*'
          : token.pattern

        if (keys) keys.push(token)

        if (token.optional) {
          if (token.partial) {
            route += this.escapeString(token.prefix) + '(' + capture + ')?'
          } else {
            route += '(?:' + this.escapeString(token.prefix) + '(' + capture + '))?'
          }
        } else {
          route += this.escapeString(token.prefix) + '(' + capture + ')'
        }
      }
    }

    if (end) {
      if (!strict) route += '(?:' + delimiter + ')?'

      route += endsWith === '$' ? '$' : '(?=' + endsWith + ')'
    } else {
      if (!strict) route += '(?:' + delimiter + '(?=' + endsWith + '))?'
      if (!isEndDelimited) route += '(?=' + delimiter + '|' + endsWith + ')'
    }

    return new RegExp(route, this.flags(options))
  }

  private stringToRegexp(path: string, keys?: Tokens[], options?: FlagOptions) {
    return this.tokensToRegExp(this.parse(path, options), keys, options)
  }

  private arrayToRegexp(path: (string | RegExp)[], keys?: Tokens[], options?: FlagOptions) {
    const parts: string[] = []

    for (let i = 0; i < path.length; i++) {
      parts.push(this.pathToRegexp(path[i], keys, options).source)
    }

    return new RegExp('(?:' + parts.join('|') + ')', this.flags(options))
  }

  /**
   * Pull out keys from a regexp.
   *
   * @param  {!RegExp} path
   * @param  {Array=}  keys
   * @return {!RegExp}
   */
  private regexpToRegexp(path: RegExp, keys?: Tokens[]) {
    if (!keys) return path

    // Use a negative lookahead to match only capturing groups.
    const groups = path.source.match(/\((?!\?)/g)

    if (groups) {
      for (let i = 0; i < groups.length; i++) {
        keys.push({
          name: i,
          prefix: null,
          delimiter: null,
          optional: false,
          repeat: false,
          partial: false,
          pattern: null,
        })
      }
    }

    return path
  }

  /**
   * Parse a string for the raw tokens.
   *
   * @param  {string}  str
   * @param  {Object=} options
   * @return {!Array}
   */
  parse(str: string, options: FlagOptions = {}): Tokens[] {
    let tokens: Tokens[] = []
    let key = 0
    let index = 0
    let path = ''
    let defaultDelimiter = (options && options.delimiter) || this.DEFAULT_DELIMITER
    let delimiters = (options && options.delimiters) || this.DEFAULT_DELIMITERS
    let pathEscaped = false
    let res: RegExpExecArray | null | undefined

    while ((res = this.PATH_REGEXP.exec(str)) !== null) {
      let m = res[0]
      let escaped = res[1]
      let offset = res.index
      path += str.slice(index, offset)
      index = offset + m.length

      // Ignore already escaped sequences.
      if (escaped) {
        path += escaped[1]
        pathEscaped = true
        continue
      }

      let prev = ''
      let next = str[index]
      let name = res[2]
      let capture = res[3]
      let group = res[4]
      let modifier = res[5]

      if (!pathEscaped && path.length) {
        let k = path.length - 1

        if (delimiters.indexOf(path[k]) > -1) {
          prev = path[k]
          path = path.slice(0, k)
        }
      }

      // Push the current path onto the tokens.
      if (path) {
        tokens.push(path)
        path = ''
        pathEscaped = false
      }

      let partial = prev !== '' && next !== undefined && next !== prev
      let repeat = modifier === '+' || modifier === '*'
      let optional = modifier === '?' || modifier === '*'
      let delimiter = prev || defaultDelimiter
      let pattern = capture || group

      tokens.push({
        name: name || key++,
        prefix: prev,
        delimiter: delimiter,
        optional: optional,
        repeat: repeat,
        partial: partial,
        pattern: pattern ? this.escapeGroup(pattern) : '[^' + this.escapeString(delimiter) + ']+?',
      })
    }

    // Push any remaining characters.
    if (path || index < str.length) {
      tokens.push(path + str.substr(index))
    }

    return tokens
  }

  /**
   * Compile a string to a template function for the path.
   *
   * @param  {string}             str
   * @param  {Object=}            options
   * @return {!function(Object=, Object=)}
   */
  compile(str: string, options?: FlagOptions) {
    return this.tokensToFunction(this.parse(str, options))
  }

  /**
   * Expose a method for transforming tokens into the path function.
   */
  tokensToFunction(tokens: Tokens[]) {
    // Compile all the tokens into regexps.
    const matches = new Array(tokens.length)

    // Compile all the patterns before compilation.
    for (let i = 0; i < tokens.length; i++) {
      const current = tokens[i]
      if (typeof current === 'object') {
        matches[i] = new RegExp('^(?:' + current.pattern + ')$')
      }
    }

    return function (data?: any, options?: PathFunctionOptions) {
      let path = ''
      let encode = (options && options.encode) || encodeURIComponent

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i]

        if (typeof token === 'string') {
          path += token
          continue
        }

        let value = data ? data[token.name] : undefined
        let segment

        if (Array.isArray(value)) {
          if (!token.repeat) {
            throw new TypeError('Expected "' + token.name + '" to not repeat, but got array')
          }

          if (value.length === 0) {
            if (token.optional) continue

            throw new TypeError('Expected "' + token.name + '" to not be empty')
          }

          for (let j = 0; j < value.length; j++) {
            segment = encode(value[j], token)

            if (!matches[i].test(segment)) {
              throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '"')
            }

            path += (j === 0 ? token.prefix : token.delimiter) + segment
          }

          continue
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          segment = encode(String(value), token)

          if (!matches[i].test(segment)) {
            throw new TypeError(
              'Expected "' + token.name + '" to match "' + token.pattern + '", but got "' + segment + '"'
            )
          }

          path += token.prefix + segment
          continue
        }

        if (token.optional) {
          // Prepend partial segment prefixes.
          if (token.partial) path += token.prefix

          continue
        }

        throw new TypeError('Expected "' + token.name + '" to be ' + (token.repeat ? 'an array' : 'a string'))
      }

      return path
    }
  }

  /**
   * Escape a regular expression string.
   *
   * @param  {string} str
   * @return {string}
   */
  private escapeString(str: string | null) {
    if (str === null) {
      str = ''
    }
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
  }

  /**
   * Escape the capturing group by escaping special characters and meaning.
   *
   * @param  {string} group
   * @return {string}
   */
  private escapeGroup(group: string) {
    return group.replace(/([=!:$/()])/g, '\\$1')
  }

  /**
   * Get the flags for a regexp from the options.
   *
   * @param  {Object} options
   * @return {string}
   */
  private flags(options?: { sensitive?: boolean }) {
    return options && options.sensitive ? '' : 'i'
  }
}

export const pathToRegexp = new PathToRegexGenerator()
