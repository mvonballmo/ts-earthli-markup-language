import { ITokenizer, LowLevelTokenizer, LowLevelTokenType } from '../lib/LowLevelTokenizer';

import {expect} from 'chai';

describe('LowLevelTokenizer', function()
{
  function createTokenizer(input: string): ITokenizer
  {
    return new LowLevelTokenizer(input);
  }

  function assertToken(tokenizer: ITokenizer, type: LowLevelTokenType, value: string, line: number, column: number)
  {
    var token = tokenizer.GetNext();

    expect(token).not.to.be.null;
    expect(token.Type).to.equal(type);
    // expect(token.Line).to.equal(line);
    // expect(token.Column).to.equal(column);
  }

  function assertDone(tokenizer: ITokenizer)
  {
    var token = tokenizer.GetNext();

    expect(token).to.be.null;
  }

  describe('#transform()', function()
  {
    it('zero tokens with no input', function()
    {
      var tokenizer = createTokenizer("");

      assertDone(tokenizer);
    })
    it('single text token', function()
    {
      var tokenizer = createTokenizer("foo");

      assertToken(tokenizer, LowLevelTokenType.Text, "foo", 0, 0);
      assertDone(tokenizer);
    })
    it('single open bracket', function()
    {
      var tokenizer = createTokenizer("<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0);
      assertDone(tokenizer);
    })
    it('literal open bracket', function()
    {
      var tokenizer = createTokenizer("<<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0);
      assertDone(tokenizer);
    })
    it('single close bracket', function()
    {
      var tokenizer = createTokenizer(">");

      assertToken(tokenizer, LowLevelTokenType.Text, ">", 0, 0);
      assertDone(tokenizer);
    })
    it('single newline', function()
    {
      var tokenizer = createTokenizer("\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 0);
      assertDone(tokenizer);
    })
    it('carriage return with newline', function()
    {
      var tokenizer = createTokenizer("\r\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 1);
      assertDone(tokenizer);
    })
    it('start tag', function()
    {
      var tokenizer = createTokenizer("<tag>");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertDone(tokenizer);
    })
    it('end tag', function()
    {
      var tokenizer = createTokenizer("</tag>");

      assertToken(tokenizer, LowLevelTokenType.EndTag, "tag", 0, 0);
      assertDone(tokenizer);
    })
    it('empty start tag', function()
    {
      var tokenizer = createTokenizer("<>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>", 0, 0);
      assertDone(tokenizer);
    })
    it('empty end tag', function()
    {
      var tokenizer = createTokenizer("</>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>", 0, 0);
      assertDone(tokenizer);
    })
    it('start tag with text', function()
    {
      var tokenizer = createTokenizer("<tag>Text");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 5);
      assertDone(tokenizer);
    })
    it('end tag with text', function()
    {
      var tokenizer = createTokenizer("</tag>Text");

      assertToken(tokenizer, LowLevelTokenType.EndTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 6);
      assertDone(tokenizer);
    })
    it('empty start tag with text', function()
    {
      var tokenizer = createTokenizer("<>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>Text", 0, 0);
      assertDone(tokenizer);
    })
    it('empty end tag with text', function()
    {
      var tokenizer = createTokenizer("</>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>Text", 0, 0);
      assertDone(tokenizer);
    })
    it('start tag without close bracket', function()
    {
      var tokenizer = createTokenizer("<tag");

      assertToken(tokenizer, LowLevelTokenType.Text, "<tag", 0, 0);
      assertDone(tokenizer);
    })
    it('attribute without end bracket', function()
    {
      var tokenizer = createTokenizer("<tag attr");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attr", 0, 5);
      assertDone(tokenizer);
    })
    it('attribute with value without end bracket', function()
    {
      var tokenizer = createTokenizer("<tag attr=\"value\"");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeName, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 16);
      
      assertDone(tokenizer);
    })
    it('attribute without value', function()
    {
      var tokenizer = createTokenizer("<tag attr>");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute 'attr' does not have a value.", 0, 5);
      assertDone(tokenizer);
    })
    it('attribute with value without quotes', function()
    {
      var tokenizer = createTokenizer("<tag attr=value>");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeName, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 10);
      assertDone(tokenizer);
    })
    it('attribute without value and text and end tag', function()
    {
      var tokenizer = createTokenizer("<tag attr>text</tag>");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute 'attr' does not have a value.", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "text", 0, 10);
      assertToken(tokenizer, LowLevelTokenType.EndTag, "tag", 0, 14);
      assertDone(tokenizer);
    })
    it('start tag with attribute', function()
    {
      var tokenizer = createTokenizer("<tag attr=\"value\">");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeName, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    })
    it('start tag with two attributes', function()
    {
      var tokenizer = createTokenizer("<tag attr=\"value\" attr2=\"value2\">");

      assertToken(tokenizer, LowLevelTokenType.StartTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeName, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.AttributeName, "attr2", 0, 19);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 0, 27);
      assertDone(tokenizer);
    })
    it('two lines', function()
    {
      var tokenizer = createTokenizer("A\r\nB");

      assertToken(tokenizer, LowLevelTokenType.Text, "A", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 1, 0);
      assertDone(tokenizer);
    })
  });
});
