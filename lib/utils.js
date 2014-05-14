function displayValue(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return value;
  }
}

exports.typeError = function(message, value) {

  var got;
  if (isNaN(value) && typeof(value) == 'number') {
    got = 'NaN';
  } else if (typeof(value) == 'function') {
    got = 'function';
  } else {
    got = displayValue(value) + ' (' + typeof(value) + ')';
  }

  return new Error(message + '; got ' + got);
};

exports.displayValue = displayValue;
