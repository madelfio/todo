CodeMirror.defineMode("todo", function() {
  var TOKEN_NAMES = {
    '#': 'comment', // comment
    '+': 'error',   // active
    'X': 'string'   // closed
  };

  return {
    token: function(stream) {
      if (stream.eatSpace()) {
        return null;
      }

      var ch = stream.peek();

      var token_name = TOKEN_NAMES[stream.peek()] || stream.skipToEnd();
      stream.skipToEnd();

      return token_name;
    }
  };
});
