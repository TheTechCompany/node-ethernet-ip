/*
 * SerialNumber constructor
 * @public
 *
 * @param {number} value The little endian encoded number
 * @param {number} size The size of the serial number space in bits
 */
export class SerialNumber {


    serialBits : number;
    serialBytes: number;
    _value: number;
    _modulo: number;
    _half : number;
    _maxAdd: number;
    number: number;

    constructor(value: number, size: number){
        value = typeof value !== "undefined" ? value : 0;
        size = typeof size !== "undefined" ? size : 32;
    
        this.serialBits = size;
        this.serialBytes = size / 8;
        this._value = value;
        this._modulo = Math.pow(2, this.serialBits);
        this._half = Math.pow(2, this.serialBits - 1);
        this._maxAdd = this._half - 1;
        this.number = this._value % this._modulo;
    }
   

    /*
    * Equality comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    eq (that) {
        return this.number === that.number;
    };

    /*
    * Not equal comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    ne (that) {
        return this.number !== that.number;
    };

    /*
    * Less than comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    lt (that) {
        return (this.number < that.number && (that.number - this.number < this._half)) ||
                (this.number > that.number && (this.number - that.number > this._half));
    };

    /*
    * Greater than comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    gt (that) {
        return (this.number < that.number && (that.number - this.number > this._half)) ||
                (this.number > that.number && (this.number - that.number < this._half));
    };

    /*
    * Less than or equal comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    le (that) {
        return this.eq(that) || this.lt(that);
    };

    /*
    * Greater than or equal comparison with another SerialNumber
    * @public
    *
    * @param {SerialNumber} that SerialNumber to make comparison with
    * @return {boolean} comparison
    */
    ge (that) {
        return this.eq(that) || this.gt(that);
    };

    /*
    * Addition operation on two SerialNumbers
    * @public
    *
    * @param {SerialNumber} that Add this SerialNumber to the receiver
    * @return {number} value of addition
    */
    add (that) {
        if (!this.additionOpValid.call(this, that)) {
            throw Error("Addition of this value outside [0 .. maxAdd] range");
        } else {
            this.number = (this.number + that.number) % this._modulo;
            return this.number;
        }
    };

    /*
    * Return the number
    * @public
    *
    * @param {object} options Optional
    *  - {string} encoding Provide 'BE' to get number as big endian
    *  - {number} radix
    *  - {boolean} string Provide false to get number as integer
    */
    getNumber (options) {
        options = typeof options !== "undefined" ? options : {};
        options.radix = options.radix ? options.radix : 10;
        options.string = options.string !== undefined ? options.string : true;

        var number = this.number.toString(options.radix);

        if (options.encoding === "BE") {
            var buf = new Buffer(this.serialBytes);
            buf.writeUIntLE(this.number, 0, this.serialBytes);
            number = buf.readUIntBE(0, this.serialBytes).toString(options.radix);
        }

        if (options.string) {
            return number;
        } else {
            console.log(number);
            return parseInt(number, options.radix);
        }
    };

    /*
    * Return the serial space
    * @public
    *
    * @params {boolean} bytes Return serial space as bytes instead of bits
    * @return {number} bits|bytes as integer
    */
    getSpace(bytes) {
        if (bytes) {
            return this.serialBytes;
        } else {
            return this.serialBits;
        }
    };

    /*
    * Override default toString method
    * @public
    */
    toString() {
        return "<number=" + this.number + ", bits=" + this.serialBits + ">";
    };



    /*
    * Test if addition op valid for two SerialNumbers
    * @private
    *
    * @param {SerialNumber} that Test if addition possible with receiver
    * @return {boolean} result of test
    */
    additionOpValid(that) {
        return that.number > 0 && that.number <= this._maxAdd;
    }

}

