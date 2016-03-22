/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';
import {MungerTokenizer} from '../lib/munger_tokenizer';
import {MungerTokenType} from '../lib/munger_token_type';

describe('MungerTokenizer', function()
{
  describe('#transform()', function()
  {
    it('should have no token available with no input', function()
    {
      var tokenizer = new MungerTokenizer();

      expect(tokenizer.AreTokensAvailable()).to.be.false;
      
      var token = tokenizer.GetCurrentToken();

      expect(token).not.to.be.null;
      expect(token.Size).to.equal(0);
      expect(token.Type).to.equal(MungerTokenType.Text);
      expect(token.Data).to.equal(null);
    })
    it('should have no token available with empty input', function()
    {
      var tokenizer = new MungerTokenizer();
      tokenizer.SetInput("");

      expect(tokenizer.AreTokensAvailable()).to.be.false;
      
      var token = tokenizer.GetCurrentToken();

      expect(token).not.to.be.null;
      expect(token.Size).to.equal(0);
      expect(token.Type).to.equal(MungerTokenType.Text);
      expect(token.Data).to.equal(null);
    })
    it('should have an empty token after setting input', function()
    {
      var tokenizer = new MungerTokenizer();
      tokenizer.SetInput("foo");

      expect(tokenizer.AreTokensAvailable()).to.be.false;

      var token = tokenizer.GetCurrentToken();

      expect(token).not.to.be.null;
      expect(token.Size).to.equal(0);
      expect(token.Type).to.equal(MungerTokenType.Text);
      expect(token.Data).to.equal(null);
    })
    it('should have an open tag token after setting open tag', function()
    {
      var tokenizer = new MungerTokenizer();
      tokenizer.SetInput("<");

      expect(tokenizer.AreTokensAvailable()).to.be.false;

      var token = tokenizer.GetCurrentToken();

      expect(token).not.to.be.null;
      expect(token.Size).to.equal(0);
      expect(token.Type).to.equal(MungerTokenType.Text);
      expect(token.Data).to.equal(null);
    })
    it('should have a text token after setting close tag', function()
    {
      var tokenizer = new MungerTokenizer();
      tokenizer.SetInput(">");

      expect(tokenizer.AreTokensAvailable()).to.be.false;

      var token = tokenizer.GetCurrentToken();

      expect(token).not.to.be.null;
      expect(token.Size).to.equal(0);
      expect(token.Type).to.equal(MungerTokenType.Text);
      expect(token.Data).to.equal(null);
    })
  });
});