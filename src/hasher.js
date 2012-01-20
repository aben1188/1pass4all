/**
 *  Secure hash functions(currently support SHA256 and SHA224)
 *
 * Reference: http://en.wikipedia.org/wiki/SHA-2
 */

// utilities
function str2bin(str) {
    var bin = Array();
    for(var i = 0; i < str.length * 8; i += 8) {
        bin[i >> 5] |= (str.charCodeAt(i >> 3) & 0xFF) << (24 - (i & 0x1F));
    }
    return bin;
}

function bin2hex(bin) {
    var table = "0123456789abcdef";
    var hex = "";
    for(var i = 0; i < bin.length * 4; ++i) {
        hex += table.charAt((bin[i >> 2] >> (((3 - (i & 3)) << 3) + 4)) & 0xF);
        hex += table.charAt((bin[i >> 2] >> ((3 - (i & 3)) << 3)) & 0xF);
    }
    return hex;
}

function shortenBitBlock(intArray, longBits, shortBits) {
    var result = [];
    var mask = (1 << shortBits) - 1;
    var index = intArray.length - 1;
    for (var bits = longBits; bits > 0; bits -= shortBits) {
        var n = intArray[index];
        var shift = shortBits;
        if (bits < shortBits && --index >= 0) { // borrow from higher 32-bit
            n |= ((intArray[index] & ((1 << (shortBits - bits)) - 1)) << bits);
            shift -= bits;
            bits += longBits;
        }
        result.unshift(n & mask);
        if (index < 0) break;
        intArray[index] >>>= shift;
    }
    //if (result.length != 32) alert("NOT 32 bit!");
    return result;
}

function add(x, y) { // handle overflow
    return (x & 0x7FFFFFFF) + (y & 0x7FFFFFFF) ^ x & 0x80000000 ^ y & 0x80000000;
}

function rightRotate(n, bits) {
    return (n >>> bits) | (n << (32 - bits)); 
}

if (!Array.prototype.map) { // for IE
    Array.prototype.map = function(fun, thisObj) {
        var len = this.length;
        var res = new Array(len);
        var scope = thisObj || window;
        for (var i = 0; i < len; ++i) {
            if (i in this)
                res[i] = fun.call(scope, this[i], i, this);
        }
        return res;
    };
}

// hahsers
var hasher = {
    sha256: function(message, is224) {
        function hash(message, bitlen, is224) {
            var x=0;

            var H = is224 ? [0xC1059ED8, 0x367CD507, 0x3070DD17, 0xF70E5939,
                             0xFFC00B31, 0x68581511, 0x64F98FA7, 0xBEFA4FA4]
                          : [0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
                             0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19];
            var K = [0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
                     0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
                     0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
                     0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
                     0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
                     0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
                     0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
                     0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
                     0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
                     0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
                     0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
                     0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
                     0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
                     0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
                     0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
                     0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2];
            var w = new Array(64);
            // pre-processing
            message[bitlen >> 5] |= 0x80 << (24 - (bitlen & 0x1F));
            message[((bitlen + 64 >> 9) << 4) + 15] = bitlen;
            // process the message in successive 512-bit chunks
            for (var msgIndex = 0; msgIndex < message.length; msgIndex += 16) {
                var a = H[0];
                var b = H[1];
                var c = H[2];
                var d = H[3];
                var e = H[4];
                var f = H[5];
                var g = H[6];
                var h = H[7];
                for (var i = 0; i < 64; ++i) {
                    if (i < 16) // original words
                        w[i] = message[i + msgIndex];
                    else { // extended words
                        var s0 = rightRotate(w[i - 15], 7)
                            ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                        var s1 = rightRotate(w[i - 2], 17)
                            ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                        w[i] = add(add(add(s1, w[i - 7]), s0), w[i - 16]);
                    }
                    // start shuffling
                    var s0 = rightRotate(a, 2) 
                        ^ rightRotate(a, 13) ^ rightRotate(a, 22);
                    var maj = (a & b) ^ (a & c) ^ (b & c);
                    var t2 = add(s0, maj);
                    var s1 = rightRotate(e, 6) 
                        ^ rightRotate(e, 11) ^ rightRotate(e, 25);
                    var ch = (e & f) ^ ((~e) & g);
                    var t1 = add(add(add(add(h, s1), ch), K[i]), w[i]);
                    h = g;
                    g = f;
                    f = e;
                    e = add(d, t1);
                    d = c;
                    c = b;
                    b = a;
                    a = add(t1, t2);
                }
                H[0] = add(a, H[0]);
                H[1] = add(b, H[1]);
                H[2] = add(c, H[2]);
                H[3] = add(d, H[3]);
                H[4] = add(e, H[4]);
                H[5] = add(f, H[5]);
                H[6] = add(g, H[6]);
                H[7] = add(h, H[7]);
            }
            return is224 ? H.slice(0, 7) : H;
        }

        return hash(str2bin(message), message.length << 3, is224);
    },

    sha256InHex: function(message, is224) {
        return bin2hex(this.sha256(message, is224));
    },

    sha224In94: function(message) {
        var hashed = this.sha256(message, true);
        var bits = shortenBitBlock(hashed, 32, 7);
        bits = bits.map(function(n) { return n < 94 ? String.fromCharCode(33 + n) : "" });
        return bits.join("");
    }
};
