interface IDefaults {
  symbol: string,
  separator: string,
  decimal: string,
  formatWithSymbol: boolean,
  errorOnInvalid: boolean,
  precision: number,
  pattern: string,
  negativePattern: string
}

interface IOpts {
  increment?: number,
  useVedic?: boolean,
  groups?: RegExp
}

const defaults: IDefaults = {
  symbol: '$',
  separator: ',',
  decimal: '.',
  formatWithSymbol: false,
  errorOnInvalid: false,
  precision: 2,
  pattern: '!#',
  negativePattern: '-!#',
};

const round = (v: number) => Math.round(v);
const pow = (p: number) => Math.pow(10, p);
const rounding = (value: number, increment: number) => round(value / increment) * increment;

const groupRegex: RegExp = /(\d)(?=(\d{3})+\b)/g;
const vedicRegex: RegExp = /(\d)(?=(\d\d)+\d\b)/g;

/**
 * Create a new instance of currency.js
 * @param {number|string|currency} value
 * @param {object} [opts]
 */

class Currency {
  opts?: IOpts;
  intValue: number;
  value: number | string;
  settings: IDefaults & IOpts;
  _settings: IDefaults & IOpts;
  _precision: number;

  constructor(value: number | string | Currency, opts?: IOpts) {
    if (!(value instanceof Currency)) {
      this.value = value;
    }
      else {
        this.value = value.value;
      }
    this.opts = opts;
    
    let settings: IDefaults & IOpts = (<any>Object).assign({}, defaults, this.opts)
         , precision = pow(settings.precision)
         , v = parse(this.value, settings);

    this.intValue = v;
    this.value = v / precision;

    //Set default incremental value
    settings.increment = settings.increment || (1 / precision);

    // Support vedic numbering systems
    // see: https://en.wikipedia.org/wiki/Indian_numbering_system
    if(settings.useVedic) {
      settings.groups = vedicRegex;
    } else {
      settings.groups = groupRegex;
    }

    // Intended for internal usage only - subject to change
    this._settings = settings;
    this._precision = precision;
  }

  /**
   * Adds values together.
   * @param {number} number
   * @returns {currency}
   */
   add(number: number): Currency {
    let { intValue, _settings, _precision } = this;
    return new Currency((intValue += parse(number, _settings)) / _precision, _settings);
  }

  /**
   * Subtracts value.
   * @param {number} number
   * @returns {currency}
   */
   subtract(number: number): Currency {
    let { intValue, _settings, _precision } = this;
    return new Currency((intValue -= parse(number, _settings)) / _precision, _settings);
  }

  /**
   * Multiplies values.
   * @param {number} number
   * @returns {currency}
   */
  multiply(number: number): Currency {
    let { intValue, _settings } = this;
    return new Currency((intValue *= number) / pow(_settings.precision), _settings);
  }

  /**
   * Divides value.
   * @param {number} number
   * @returns {currency}
   */
  divide(number: number): Currency {
    let { intValue, _settings } = this;
    return new Currency(intValue /= parse(number, _settings, false), _settings);
  }

  /**
   * Takes the currency amount and distributes the values evenly. Any extra pennies
   * left over from the distribution will be stacked onto the first set of entries.
   * @param {number} count
   * @returns {array}
   */
  distribute(count: number): Array<number> {
    let { intValue, _precision, _settings } = this
      , distribution = []
      , split = Math[intValue >= 0 ? 'floor' : 'ceil'](intValue / count)
      , pennies = Math.abs(intValue - (split * count));

    for (; count !== 0; count--) {
      let item = new Currency(split / _precision, _settings);

      // Add any left over pennies
      pennies-- > 0 && (item = intValue >= 0 ? item.add(1 / _precision) : item.subtract(1 / _precision));

      distribution.push(item);
    }

    return distribution;
  }

  /**
   * Returns the dollar value.
   * @returns {number}
   */
  dollars(): number {
    return ~~this.value;
  }

  /**
   * Returns the cent value.
   * @returns {number}
   */
  cents(): number {
    let { intValue, _precision } = this;
    return ~~(intValue % _precision);
  }

  /**
   * Formats the value as a string according to the formatting settings.
   * @param {boolean} useSymbol - format with currency symbol
   * @returns {string}
   */
  format(useSymbol: boolean): string {
    let { pattern, negativePattern, formatWithSymbol, symbol, separator, decimal, groups } = this._settings
      , values = (this + '').replace(/^-/, '').split('.')
      , dollars = values[0]
      , cents = values[1];

    // set symbol formatting
    typeof(useSymbol) === 'undefined' && (useSymbol = formatWithSymbol);

    return (this.value >= 0 ? pattern : negativePattern)
      .replace('!', useSymbol ? symbol : '')
      .replace('#', `${dollars.replace(groups, '$1' + separator)}${cents ? decimal + cents : ''}`);
  }

  /**
   * Formats the value as a string according to the formatting settings.
   * @returns {string}
   */
  toString(): string {
    let { intValue, _precision, _settings } = this;
    return rounding(intValue / _precision, _settings.increment).toFixed(_settings.precision);
  }

  /**
   * Value for JSON serialization.
   * @returns {float}
   */
  toJSON(): number {
    return +this.value;
  }

}

function parse(value: number | string | Currency, opts: IDefaults & IOpts, useRounding = true): number {
  let v: number | string = 0
    , { decimal, errorOnInvalid, precision: decimals } = opts
    , precision: number = pow(decimals)
    , isNumber: boolean = typeof value === 'number';

  if (isNumber || value instanceof Currency) {
    v = ((isNumber ? value : this.value) * precision);
  } else if (typeof value === 'string') {
    let regex = new RegExp('[^-\\d' + decimal + ']', 'g')
      , decimalString = new RegExp('\\' + decimal, 'g');
    v = Number(value
          .replace(/\((.*)\)/, '-$1')   // allow negative e.g. (1.99)
          .replace(regex, '')           // replace any non numeric values
          .replace(decimalString, '.'))  // convert any decimal values
          * precision;                  // scale number to integer value
    v = v || 0;
  } else {
    if(errorOnInvalid) {
      throw Error('Invalid Input');
    }
    v = 0;
  }

  // Handle additional decimal for proper rounding.
  v = +v.toFixed(4);

  return useRounding ? round(v) : v;
}