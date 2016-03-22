/// <reference path="../lib/munger.ts"/>
/// <reference path="../typings/main.d.ts" />

var assert = require('assert');

import {MungerTokenizer} from '../lib/munger_tokenizer';
import {MungerTokenType} from '../lib/munger_token_type';

describe('MungerTokenizer', function()
{
  describe('#transform()', function()
  {
    it('should have no token available with no input', function()
    {
      var tokenizer = new MungerTokenizer();
      var token = tokenizer.GetCurrentToken();

      assert.equal(tokenizer.AreTokensAvailable(), false);
      assert.isUndefinedOrNull(token);
      assert.equal(token.Size, 0);
      assert.equal(token.Type, MungerTokenType.Text);
      assert.equal(token.Data, null);
    })
    it('should have an empty token after setting input', function()
    {
      var tokenizer = new MungerTokenizer();
      tokenizer.SetInput("foo");
      var token = tokenizer.GetCurrentToken();

      assert.equal(tokenizer.AreTokensAvailable(), false);
      assert.not.null(token, null);
      assert.equal(token.Size, 0);
      assert.equal(token.Type, MungerTokenType.Text);
      assert.equal(token.Data, null);
    })
  });
});