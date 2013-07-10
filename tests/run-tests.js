/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

load("vtt.js");

const FAIL = -1;

function parse(callback, done) {
  var result = 0;
  var parser = new WebVTTParser();
  parser.oncue = function (cue) {
    if (callback && !callback(null, cue))
      result = FAIL;
    if (result >= 0)
      ++result;
  }
  parser.onerror = function (msg) {
    if (callback && !callback(msg, null))
      result = FAIL;
  }
  parser.onflush = function () {
    done && done(result);
  }
  return parser;
}

function expect_line_num(num) {
  return function (error, cue) {
    return !error && cue.content.split("\n").length === num;
  }
}

function expect_field(field, value) {
  return function (error, cue) {
    return !error && cue[field] === value;
  }
}

function expect_fail(msg) {
  return function (error, cue) {
    if (!error)
      return true;
    if (error !== msg)
      print(error);
    return error === msg;
  }
}

function report(name, expected) {
  return function (result) {
    print(name + " " + ((result == expected) ? "PASS" : "FAIL"));
  };
}

function checkAllAtOnce(name, text, expected, callback) {
  parse(callback, report(name, expected)).parse(text).flush();
}

function checkStreaming(name, text, expected, callback) {
  for (var n = 0; n < text.length; ++n) {
    var parser = parse(callback, report(name + n, expected));
    parser.parse(text.substr(0, n));
    parser.parse(text.substr(n));
    parser.flush();
  }
}

function check(file, expected, callback) {
  var text = snarf(file);
  checkAllAtOnce(file, text, expected, callback);
  //checkStreaming(file, text, expected, callback);
}

check("tests/no-newline-at-end.vtt", 1);
check("tests/cue-identifier.vtt", 2);
check("tests/fail-bad-utf8.vtt", 1, expect_fail("invalid UTF8 encoding in '<v Roger Bingham>When we e-mailed—'"));
check("tests/many-comments.vtt", 2);
check("tests/one-line-comment.vtt", 2);
check("tests/example1.vtt", 13);
check("tests/line-breaks.vtt", 3);
check("tests/not-only-nested-cues.vtt", 2);
check("tests/only-nested-cues.vtt", 6);
check("tests/voice-spans.vtt", 4);
check("tests/long-line.vtt", 1, expect_line_num(1));
check("tests/two-lines.vtt", 1, expect_line_num(2));
check("tests/arrows.vtt", 1, expect_field("id", "- - > -- > - -> -- <--"));
