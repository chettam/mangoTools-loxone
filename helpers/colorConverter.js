/**
 * Created by jean-baptisteblanc on 25/12/2015.
 */


/**
 *  Parser detect the current color format before conversion.
 * @param input
 * @returns {*}
 */

function parse(input){
  if(input.hasOwnProperty('r') &&input.hasOwnProperty('g') && input.hasOwnProperty('b')){
    return new RGB(input.r,input.g,input.b);
  } else if(input.hasOwnProperty('h') &&input.hasOwnProperty('s') && input.hasOwnProperty('v')){
    return new HSV(input.h,input.s,input.v);
  } else if(input.hasOwnProperty('c') &&input.hasOwnProperty('m') && input.hasOwnProperty('y') && input.hasOwnProperty('k')){
    return new CMYK(input.c,input.m,input.y,input.k);
  }
}


/**
 *   format HSV object
 * @param h
 * @param s
 * @param v
 * @constructor
 */
function HSV(h, s, v) {
  if (h <= 0) { h = 0; }
  if (s <= 0) { s = 0; }
  if (v <= 0) { v = 0; }

  if (h > 360) { h = 360; }
  if (s > 100) { s = 100; }
  if (v > 100) { v = 100; }

  this.h = h;
  this.s = s;
  this.v = v;
}

/**
 *  Format  RGB object
 * @param r
 * @param g
 * @param b
 * @constructor
 */
function RGB(r, g, b) {
  if (r <= 0) { r = 0; }
  if (g <= 0) { g = 0; }
  if (b <= 0) { b = 0; }

  if (r > 255) { r = 255; }
  if (g > 255) { g = 255; }
  if (b > 255) { b = 255; }

  this.r = r;
  this.g = g;
  this.b = b;
}


/**
 *  Format CMYK object
 * @param c
 * @param m
 * @param y
 * @param k
 * @constructor
 */

function CMYK(c, m, y, k) {
  if (c <= 0) { c = 0; }
  if (m <= 0) { m = 0; }
  if (y <= 0) { y = 0; }
  if (k <= 0) { k = 0; }

  if (c > 100) { c = 100; }
  if (m > 100) { m = 100; }
  if (y > 100) { y = 100; }
  if (k > 100) { k = 100; }

  this.c = c;
  this.m = m;
  this.y = y;
  this.k = k;
}

function RGBtoHSV(RGB) {
  var result = new HSV(0, 0, 0);

  r = RGB.r / 255;
  g = RGB.g / 255;
  b = RGB.b / 255;

  var minVal = Math.min(r, g, b);
  var maxVal = Math.max(r, g, b);
  var delta = maxVal - minVal;

  result.v = maxVal;

  if (delta == 0) {
    result.h = 0;
    result.s = 0;
  } else {
    result.s = delta / maxVal;
    var del_R = (((maxVal - r) / 6) + (delta / 2)) / delta;
    var del_G = (((maxVal - g) / 6) + (delta / 2)) / delta;
    var del_B = (((maxVal - b) / 6) + (delta / 2)) / delta;

    if (r == maxVal) { result.h = del_B - del_G; }
    else if (g == maxVal) { result.h = (1 / 3) + del_R - del_B; }
    else if (b == maxVal) { result.h = (2 / 3) + del_G - del_R; }

    if (result.h < 0) { result.h += 1; }
    if (result.h > 1) { result.h -= 1; }
  }

  result.h = Math.round(result.h * 360);
  result.s = Math.round(result.s * 100);
  result.v = Math.round(result.v * 100);

  return result;
}

function HSVtoRGB(HSV) {
  var result = new RGB(0, 0, 0);

  var h = HSV.h / 360;
  var s = HSV.s / 100;
  var v = HSV.v / 100;

  if (s == 0) {
    result.r = v * 255;
    result.g = v * 255;
    result.v = v * 255;
  } else {
    var_h = h * 6;
    var_i = Math.floor(var_h);
    var_1 = v * (1 - s);
    var_2 = v * (1 - s * (var_h - var_i));
    var_3 = v * (1 - s * (1 - (var_h - var_i)));

    if (var_i == 0) {
      var_r = v;
      var_g = var_3;
      var_b = var_1
    }
    else if (var_i == 1) {
      var_r = var_2;
      var_g = v;
      var_b = var_1
    }
    else if (var_i == 2) {
      var_r = var_1;
      var_g = v;
      var_b = var_3
    }
    else if (var_i == 3) {
      var_r = var_1;
      var_g = var_2;
      var_b = v
    }
    else if (var_i == 4) {
      var_r = var_3;
      var_g = var_1;
      var_b = v
    }
    else {
      var_r = v;
      var_g = var_1;
      var_b = var_2
    }

    result.r = var_r * 255;
    result.g = var_g * 255;
    result.b = var_b * 255;

    result.r = Math.round(result.r);
    result.g = Math.round(result.g);
    result.b = Math.round(result.b);
  }

  return result;
}

function CMYKtoRGB(CMYK){
  var result = new RGB(0, 0, 0);

  c = CMYK.c / 100;
  m = CMYK.m / 100;
  y = CMYK.y / 100;
  k = CMYK.k / 100;


  result.r = (1-c) *(1-k);
  result.g = (1-m) *(1-k);
  result.b = (1-y) *(1-k);

  result.r = Math.round( result.r * 255 );
  result.g = Math.round( result.g * 255 );
  result.b = Math.round( result.b * 255 );

  return result;
}
/**
 *
 * @param RGB   0-255
 * @returns {CMYK}  0-100
 * @constructor
 */

function RGBtoCMYK(RGB){

  var result = new CMYK(0, 0, 0, 0);

  r = RGB.r / 255;
  g = RGB.g / 255;
  b = RGB.b / 255;

  result.k = ( 1 - Math.max( r ,g , b));
  result.c = ( 1 - r - result.k )  / ( 1 - result.k);
  result.m = ( 1 - g - result.k  ) / ( 1 - result.k  );
  result.y = ( 1 - b - result.k  ) / ( 1 - result.k  );

  result.c = Math.round( result.c * 100 );
  result.m = Math.round( result.m * 100 );
  result.y = Math.round( result.y * 100 );
  result.k = Math.round( result.k * 100 );

  return result;
}


module.exports = {
  /*
  convert color to RGB
   */
  toRGB : function (input) {
    var color = parse(input);
    if (color instanceof RGB) { return color; }
    if (color instanceof HSV) {	return HSVtoRGB(color); }
    if (color instanceof CMYK) { return CMYKtoRGB(color); }
  },
  /*
   convert color to HSV
   */
  toHSV : function (input) {
    var color = parse(input);
    if (color instanceof HSV) { return color; }
    if (color instanceof RGB) { return RGBtoHSV(color); }
    if (color instanceof CMYK) { return RGBtoHSV(CMYKtoRGB(color)); }
  },
  /*
   convert color to CMYK
   */
  toCMYK : function (input) {
    var color = parse(input);
    if (color instanceof CMYK) { return color; }
    if (color instanceof RGB) { return RGBtoCMYK(color); }
    if (color instanceof HSV) { return RGBtoCMYK(HSVtoRGB(color)); }
  }

};
