
import {expect} from 'chai';
import {ITokenizer} from "../lib/ITokenizer";
import {TagLibrary} from "../lib/TagLibrary";
import {TagDefinition} from "../lib/TagDefinition";
import {LowLevelTokenizer} from "../lib/LowLevelTokenizer";
import {LowLevelTokenType} from "../lib/LowLevelTokenType";
import {LowLevelToken} from "../lib/LowLevelToken";

describe('LowLevelTokenizer', function()
{
  function createTokenizer(input: string): ITokenizer
  {
    let tagLibrary = new TagLibrary();

    tagLibrary.add(new TagDefinition("tag"));
    tagLibrary.add(new TagDefinition("tag_2"));
    tagLibrary.add(new TagDefinition("i"));

    return new LowLevelTokenizer(tagLibrary, input);
  }

  function assertToken(tokenizer: ITokenizer, type: LowLevelTokenType, value: string, line: number, column: number, position: number)
  {
    let token = tokenizer.getNext();

    expect(token).not.to.be.null;
    if (token instanceof LowLevelToken)
    {
      expect(token.type).to.equal(type);
      expect(token.value).to.equal(value);
      expect(token.line).to.equal(line);
      expect(token.column).to.equal(column);
      expect(token.position).to.equal(position);
    }
  }

  function assertDone(tokenizer: ITokenizer)
  {
    let token = tokenizer.getNext();

    expect(token).to.be.null;
  }

  describe('#transform()', function()
  {
    it('zero tokens with no input', function()
    {
      let tokenizer = createTokenizer("");

      assertDone(tokenizer);
    });
    it('single text token', function()
    {
      let tokenizer = createTokenizer("foo");

      assertToken(tokenizer, LowLevelTokenType.Text, "foo", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('single open bracket', function()
    {
      let tokenizer = createTokenizer("<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('literal open bracket', function()
    {
      let tokenizer = createTokenizer("<<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('literal open brackets with text', function()
    {
      let tokenizer = createTokenizer("Text<<Text<<<<Text<<Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 6, 6);
      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 11, 11);
      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 13, 13);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 14, 14);
      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 19, 19);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 20, 20);
      assertDone(tokenizer);
    });
    it('single close bracket', function()
    {
      let tokenizer = createTokenizer(">");

      assertToken(tokenizer, LowLevelTokenType.Text, ">", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('single newline', function()
    {
      let tokenizer = createTokenizer("\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('carriage return with newline', function()
    {
      let tokenizer = createTokenizer("\r\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "\r\n", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('carriage return with text', function()
    {
      let tokenizer = createTokenizer("\rText");

      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('start tag', function()
    {
      let tokenizer = createTokenizer("<tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('less than sign', function()
    {
      let tokenizer = createTokenizer("< tag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "< tag>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign with tab', function()
    {
      let tokenizer = createTokenizer("<\ttag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<\ttag>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('illegal tag', function()
    {
      let tokenizer = createTokenizer("<#tag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<#tag>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign with newline', function()
    {
      let tokenizer = createTokenizer("<\ntag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "tag>", 1, 0, 2);
      assertDone(tokenizer);
    });
    it('less than sign with CR LF', function()
    {
      let tokenizer = createTokenizer("<\r\ntag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 2, 2);
      assertToken(tokenizer, LowLevelTokenType.Text, "tag>", 1, 0, 3);
      assertDone(tokenizer);
    });
    it('less than sign with equals', function()
    {
      let tokenizer = createTokenizer("<=tag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<=tag>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('end tag', function()
    {
      let tokenizer = createTokenizer("</tag>");

      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 2, 2);
      assertDone(tokenizer);
    });
    it('end tag with attribute', function()
    {
      let tokenizer = createTokenizer("</tag  6>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</tag  6>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('invalid end tag', function()
    {
      let tokenizer = createTokenizer("</tag=45>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</tag=45>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('empty start tag', function()
    {
      let tokenizer = createTokenizer("<>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('empty end tag', function()
    {
      let tokenizer = createTokenizer("</>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('start tag with text', function()
    {
      let tokenizer = createTokenizer("<tag>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('identifiers are legal tag names', function()
    {
      let tokenizer = createTokenizer("<tag_2>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag_2", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 7, 7);
      assertDone(tokenizer);
    });
    it('identifiers are legal attribute keys', function()
    {
      let tokenizer = createTokenizer("<tag attr_2=\"\">Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr_2", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "", 0, 12, 12);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 15, 15);
      assertDone(tokenizer);
    });
    it('end tag with text', function()
    {
      let tokenizer = createTokenizer("</tag>Text");

      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 2, 2);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 6, 6);
      assertDone(tokenizer);
    });
    it('empty start tag with text', function()
    {
      let tokenizer = createTokenizer("<>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>Text", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('empty end tag with text', function()
    {
      let tokenizer = createTokenizer("</>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>Text", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('start tag without close bracket', function()
    {
      let tokenizer = createTokenizer("<tag");

      assertToken(tokenizer, LowLevelTokenType.Text, "<tag", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('attribute without end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Error, "Unexpected end of input in attribute name.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('attribute with value without end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\"");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.Error, "Unexpected end of input in tag.", 0, 17, 17);

      assertDone(tokenizer);
    });
    it('start tag with attribute and spaces', function()
    {
      let tokenizer = createTokenizer("<tag    attr   =   \"value\"   >");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 8, 8);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 19, 19);
      assertDone(tokenizer);
    });
    it('start tag with attribute and tabs', function()
    {
      let tokenizer = createTokenizer("<tag\t\t\tattr\t\t\t=\t\t\t\"value\"\t\t\t>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 7, 7);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 18, 18);
      assertDone(tokenizer);
    });
    it('start tag with attribute and newlines', function()
    {
      let tokenizer = createTokenizer("<tag\n\n\nattr\n\n\n=\n\n\n\"value\"\n\n\n>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 3, 0, 7);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 9, 1, 18);
      assertDone(tokenizer);
    });
    it('start tag with attribute and CR LF', function()
    {
      let tokenizer = createTokenizer("<tag\r\n\r\n\r\nattr\r\n\r\n\r\n=\r\n\r\n\r\n\"value\"\r\n\r\n\r\n\>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 3, 0, 10);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 9, 1, 27);
      assertDone(tokenizer);
    });
    it('attribute without value', function()
    {
      let tokenizer = createTokenizer("<tag attr>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('attribute without value and space', function()
    {
      let tokenizer = createTokenizer("<tag attr >");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('attribute without value and no end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr ");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "Unexpected end of input in attribute.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('attribute with equals and no end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr= ");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "Unexpected end of input in attribute.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('two attributes without values', function()
    {
      let tokenizer = createTokenizer("<tag attr attr2>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('two attributes without values later in text', function()
    {
      let tokenizer = createTokenizer("A\nB\n<tag attr attr2>");

      assertToken(tokenizer, LowLevelTokenType.Text, "A", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 1, 0, 2);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 1, 1, 3);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 2, 1, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 2, 5, 9);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 2, 5, 9);
      assertDone(tokenizer);
    });
    it('two attributes without values with text', function()
    {
      let tokenizer = createTokenizer("<tag attr attr2>Text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 16, 16);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 22, 22);
      assertDone(tokenizer);
    });
    it('tag with space suffix', function()
    {
      let tokenizer = createTokenizer("<tag >");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('tag with newline suffix', function()
    {
      let tokenizer = createTokenizer("<tag\n>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('tag with CR suffix', function()
    {
      let tokenizer = createTokenizer("<tag\r>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('tag with tab suffix', function()
    {
      let tokenizer = createTokenizer("<tag\t>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertDone(tokenizer);
    });
    it('invalid tag name suffix', function()
    {
      let tokenizer = createTokenizer("<tag#>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<tag#>", 0, 0, 0);
      assertDone(tokenizer);
    });
    it('unconventional attribute name without value', function()
    {
      let tokenizer = createTokenizer ("<tag #>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('invalid attribute name', function()
    {
      let tokenizer = createTokenizer ("<tag =AAA>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Error, "'=' is not a valid attribute character.", 0, 5, 5);
      assertDone(tokenizer);
    });
    it('attribute with unusual name', function()
    {
      let tokenizer = createTokenizer("<tag attr*=\"value\">Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr*", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11, 11);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 19, 19);
      assertDone(tokenizer);
    });
    it('attribute with value without quotes', function()
    {
      let tokenizer = createTokenizer("<tag attr=value>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "Attribute values must be surrounded by double-quotes.", 0, 10, 10);
      assertDone(tokenizer);
    });
    it('attribute with value with unclosed quotes', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "Unexpected end of input in attribute value.", 0, 11, 11);
      assertDone(tokenizer);
    });
    it('attribute with value without quotes and text', function()
    {
      let tokenizer = createTokenizer("<tag attr=value>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "Attribute values must be surrounded by double-quotes.", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 16, 16);
      assertDone(tokenizer);
    });
    it('attribute with equals but not value', function()
    {
      let tokenizer = createTokenizer("<tag attr=>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 11, 11);
      assertDone(tokenizer);
    });
    it('attribute without value and text and end tag', function()
    {
      let tokenizer = createTokenizer("<tag attr>text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute does not have a value.", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "text", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 16, 16);
      assertDone(tokenizer);
    });
    it('tag with attribute', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 10, 10);
      assertDone(tokenizer);
    });
    it('tag with empty attribute', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "", 0, 10, 10);
      assertDone(tokenizer);
    });
    it('tag with two attributes', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\" attr2=\"value2\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 0, 18, 18);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 0, 24, 24);
      assertDone(tokenizer);
    });
    it('open and close tag', function()
    {
      let tokenizer = createTokenizer("<tag></tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 7, 7);
      assertDone(tokenizer);
    });
    it('nested open and close tags', function()
    {
      let tokenizer = createTokenizer("<tag><i></i></tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 0, 6, 6);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 14, 14);
      assertDone(tokenizer);
    });
    it('open and close tag with text', function()
    {
      let tokenizer = createTokenizer("<tag>Text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 11, 11);
      assertDone(tokenizer);
    });
    it('open with attributes and close tag with text', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\">Text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 1, 1);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 10, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 18, 18);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 24, 24);
      assertDone(tokenizer);
    });
    it('two lines', function()
    {
      let tokenizer = createTokenizer("A\r\nB");

      assertToken(tokenizer, LowLevelTokenType.Text, "A", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 2, 2);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 1, 0, 3);
      assertDone(tokenizer);
    });
    it('simple body', function()
    {
      let tokenizer = createTokenizer(`
<tag attr=\"value\" attr2=\"value2\">A</tag>
This is a lot of text
<tag attr=\"value\" attr2=\"value2\"><i>B</i></tag>`);

      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 1, 1, 2);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 1, 5, 6);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 1, 10, 11);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 1, 18, 19);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 1, 24, 25);
      assertToken(tokenizer, LowLevelTokenType.Text, "A", 1, 33, 34);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 1, 36, 37);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 1, 40, 41);
      assertToken(tokenizer, LowLevelTokenType.Text, "This is a lot of text", 2, 0, 42);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 2, 21, 63);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 3, 1, 65);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 3, 5, 69);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 3, 10, 74);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 3, 18, 82);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 3, 24, 88);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 3, 34, 98);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 3, 36, 100);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 3, 39, 103);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 3, 43, 107);
      assertDone(tokenizer);
    });
    it('structured nested tags', function()
    {
      let tokenizer = createTokenizer(`
<tag>
  <tag>
    <tag>
      This is a <i>lot</i> of text
    </tag>
  </tag>
</tag>

`);

      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 0, 0, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 1, 1, 2);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 1, 5, 6);
      assertToken(tokenizer, LowLevelTokenType.Text, "  ", 2, 0, 7);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 2, 3, 10);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 2, 7, 14);
      assertToken(tokenizer, LowLevelTokenType.Text, "    ", 3, 0 , 15);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 3, 5, 20);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 3, 9, 24);
      assertToken(tokenizer, LowLevelTokenType.Text, "      This is a ", 4, 0, 25);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 4, 17, 42);
      assertToken(tokenizer, LowLevelTokenType.Text, "lot", 4, 19, 44);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 4, 24, 49);
      assertToken(tokenizer, LowLevelTokenType.Text, " of text", 4, 26, 51);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 4, 34, 59);
      assertToken(tokenizer, LowLevelTokenType.Text, "    ", 5, 0, 60);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 5, 6, 66);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 5, 10, 70);
      assertToken(tokenizer, LowLevelTokenType.Text, "  ", 6, 0, 71);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 6, 4, 75);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 6, 8, 79);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 7, 2, 82);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 7, 6, 86);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "\n", 8, 0, 87);
      assertDone(tokenizer);
    })
  });
});
