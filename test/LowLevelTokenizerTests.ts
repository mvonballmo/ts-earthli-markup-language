
import {expect} from 'chai';
import {ITokenizer} from "../lib/ITokenizer";
import {TagLibrary} from "../lib/TagLibrary";
import {TagDefinition} from "../lib/TagDefinition";
import {LowLevelTokenizer} from "../lib/LowLevelTokenizer";
import {LowLevelTokenType} from "../lib/LowLevelTokenType";

describe('LowLevelTokenizer', function()
{
  function createTokenizer(input: string): ITokenizer
  {
    let tagLibrary = new TagLibrary();

    tagLibrary.Add(new TagDefinition("tag"));
    tagLibrary.Add(new TagDefinition("tag_2"));
    tagLibrary.Add(new TagDefinition("i"));

    return new LowLevelTokenizer(tagLibrary, input);
  }

  function assertToken(tokenizer: ITokenizer, type: LowLevelTokenType, value: string, line: number, column: number)
  {
    let token = tokenizer.GetNext();

    expect(token).not.to.be.null;
    expect(token.Type).to.equal(type);
    // expect(token.Value).to.equal(value);
    // expect(token.Line).to.equal(line);
    // expect(token.Column).to.equal(column);
  }

  function assertDone(tokenizer: ITokenizer)
  {
    let token = tokenizer.GetNext();

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

      assertToken(tokenizer, LowLevelTokenType.Text, "foo", 0, 0);
      assertDone(tokenizer);
    });
    it('single open bracket', function()
    {
      let tokenizer = createTokenizer("<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0);
      assertDone(tokenizer);
    });
    it('literal open bracket', function()
    {
      let tokenizer = createTokenizer("<<");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0);
      assertDone(tokenizer);
    });
    it('single close bracket', function()
    {
      let tokenizer = createTokenizer(">");

      assertToken(tokenizer, LowLevelTokenType.Text, ">", 0, 0);
      assertDone(tokenizer);
    });
    it('single newline', function()
    {
        let tokenizer = createTokenizer("\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 0);
      assertDone(tokenizer);
    });
    it('carriage return with newline', function()
    {
      let tokenizer = createTokenizer("\r\n");

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 1);
      assertDone(tokenizer);
    });
    it('carriage return with text', function()
    {
      let tokenizer = createTokenizer("\rText");

      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 1);
      assertDone(tokenizer);
    });
    it('start tag', function()
    {
      let tokenizer = createTokenizer("<tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign', function()
    {
      let tokenizer = createTokenizer("< tag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "< tag>", 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign with tab', function()
    {
      let tokenizer = createTokenizer("<\ttag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<\ttag>", 0, 0);
      assertDone(tokenizer);
    });
    it('illegal tag', function()
    {
      let tokenizer = createTokenizer("<#tag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<#tag>", 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign with newline', function()
    {
      let tokenizer = createTokenizer("<\ntag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<\ntag>", 0, 0);
      assertDone(tokenizer);
    });
    it('less than sign with CR LF', function()
    {
      let tokenizer = createTokenizer("<\r\ntag>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "tag>", 0, 0);
      assertDone(tokenizer);
    });
    it('end tag', function()
    {
      let tokenizer = createTokenizer("</tag>");

      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('end tag', function()
    {
      let tokenizer = createTokenizer("</tag  6>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</tag  6>", 0, 0);
      assertDone(tokenizer);
    });
    it('invalid end tag', function()
    {
      let tokenizer = createTokenizer("</tag=45>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</tag=45>", 0, 0);
      assertDone(tokenizer);
    });
    it('empty start tag', function()
    {
      let tokenizer = createTokenizer("<>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>", 0, 0);
      assertDone(tokenizer);
    });
    it('empty end tag', function()
    {
      let tokenizer = createTokenizer("</>");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>", 0, 0);
      assertDone(tokenizer);
    });
    it('start tag with text', function()
    {
      let tokenizer = createTokenizer("<tag>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 5);
      assertDone(tokenizer);
    });
    it('identifiers are legal tag names', function()
    {
      let tokenizer = createTokenizer("<tag_2>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag_2", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 7);
      assertDone(tokenizer);
    });
    it('identifiers are legal attribute keys', function()
    {
      let tokenizer = createTokenizer("<tag attr_2=\"\">Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 14);
      assertDone(tokenizer);
    });
    it('end tag with text', function()
    {
      let tokenizer = createTokenizer("</tag>Text");

      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 6);
      assertDone(tokenizer);
    });
    it('empty start tag with text', function()
    {
      let tokenizer = createTokenizer("<>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "<>Text", 0, 0);
      assertDone(tokenizer);
    });
    it('empty end tag with text', function()
    {
      let tokenizer = createTokenizer("</>Text");

      assertToken(tokenizer, LowLevelTokenType.Text, "</>Text", 0, 0);
      assertDone(tokenizer);
    });
    it('start tag without close bracket', function()
    {
      let tokenizer = createTokenizer("<tag");

      assertToken(tokenizer, LowLevelTokenType.Text, "<tag", 0, 0);
      assertDone(tokenizer);
    });
    it('attribute without end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attr", 0, 5);
      assertDone(tokenizer);
    });
    it('attribute with value without end bracket', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\"");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 16);

      assertDone(tokenizer);
    });
    it('start tag with attribute and spaces', function()
    {
      let tokenizer = createTokenizer("<tag    attr   =   \"value\"   >");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    });
    it('start tag with attribute and tabs', function()
    {
      let tokenizer = createTokenizer("<tag\t\t\tattr\t\t\t=\t\t\t\"value\"\t\t\t>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    });
    it('start tag with attribute and newlines', function()
    {
      let tokenizer = createTokenizer("<tag\n\n\nattr\n\n\n=\n\n\n\"value\"\n\n\n>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    });
    it('start tag with attribute and CR LF', function()
    {
      let tokenizer = createTokenizer("<tag\r\n\r\n\r\nattr\r\n\r\n\r\n=\r\n\r\n\r\n\"value\"\r\n\r\n\r\n\>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    });
    it('attribute without value', function()
    {
      let tokenizer = createTokenizer("<tag attr>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute 'attr' does not have a value.", 0, 5);
      assertDone(tokenizer);
    });
    it('tag with space suffix', function()
    {
      let tokenizer = createTokenizer("<tag >");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('tag with newline suffix', function()
    {
      let tokenizer = createTokenizer("<tag\n>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('tag with CR suffix', function()
    {
      let tokenizer = createTokenizer("<tag\r>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('tag with tab suffix', function()
    {
      let tokenizer = createTokenizer("<tag\t>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('invalid tag name suffix', function()
    {
      let tokenizer = createTokenizer("<tag#>");

      assertToken(tokenizer, LowLevelTokenType.Text, "<tag#>", 0, 0);
      assertDone(tokenizer);
    });
    it('invalid attribute name prefix', function()
    {
      let tokenizer = createTokenizer("<tag #>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "'#' is not a legal attribute character.", 0, 5);
      assertDone(tokenizer);
    });
    it('attribute with invalid name', function()
    {
      let tokenizer = createTokenizer("<tag attr*=\"value\">Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "'attr*' is not a valid attribute name.", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 19);
      assertDone(tokenizer);
    });
    it('attribute with value without quotes', function()
    {
      let tokenizer = createTokenizer("<tag attr=value>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 10);
      assertDone(tokenizer);
    });
    it('attribute with value without quotes and text', function()
    {
      let tokenizer = createTokenizer("<tag attr=value>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 17);
      assertDone(tokenizer);
    });
    it('attribute with equals but not value', function()
    {
      let tokenizer = createTokenizer("<tag attr=>Text");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Error, "", 0, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 17);
      assertDone(tokenizer);
    });
    it('attribute without value and text and end tag', function()
    {
      let tokenizer = createTokenizer("<tag attr>text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Error, "attribute 'attr' does not have a value.", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.Text, "text", 0, 10);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 14);
      assertDone(tokenizer);
    });
    it('tag with attribute', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertDone(tokenizer);
    });
    it('tag with empty attribute', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "", 0, 11);
      assertDone(tokenizer);
    });
    it('tag with two attributes', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\" attr2=\"value2\">");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 0, 19);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 0, 27);
      assertDone(tokenizer);
    });
    it('open and close tag', function()
    {
      let tokenizer = createTokenizer("<tag></tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('nested open and close tags', function()
    {
      let tokenizer = createTokenizer("<tag><i></i></tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 0, 8);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 12);
      assertDone(tokenizer);
    });
    it('open and close tag with text', function()
    {
      let tokenizer = createTokenizer("<tag>Text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 11);
      assertDone(tokenizer);
    });
    it('open with attributes and close tag with text', function()
    {
      let tokenizer = createTokenizer("<tag attr=\"value\">Text</tag>");

      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 0, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 0, 11);
      assertToken(tokenizer, LowLevelTokenType.Text, "Text", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 0, 0);
      assertDone(tokenizer);
    });
    it('two lines', function()
    {
      let tokenizer = createTokenizer("A\r\nB");

      assertToken(tokenizer, LowLevelTokenType.Text, "A", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 1);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 1, 0);
      assertDone(tokenizer);
    });
    it('simple body', function()
    {
      let tokenizer = createTokenizer(`
<tag attr=\"value\" attr2=\"value2\">A</tag>
This is a lot of text
<tag attr=\"value\" attr2=\"value2\"><i>B</i></tag>`);

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 1, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 1, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 1, 11);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 1, 19);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 1, 27);
      assertToken(tokenizer, LowLevelTokenType.Text, "A", 1, 35);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 1, 36);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 1, 42);
      assertToken(tokenizer, LowLevelTokenType.Text, "This is a lot of text", 2, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 2, 22);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 3, 0);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr", 3, 5);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value", 3, 11);
      assertToken(tokenizer, LowLevelTokenType.AttributeKey, "attr2", 3, 19);
      assertToken(tokenizer, LowLevelTokenType.AttributeValue, "value2", 3, 27);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 3, 35);
      assertToken(tokenizer, LowLevelTokenType.Text, "B", 3, 38);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 3, 39);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 3, 43);
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

      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 0, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 1, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 1, 0);
      assertToken(tokenizer, LowLevelTokenType.Text, "  ", 2, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 2, 2);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 2, 7);
      assertToken(tokenizer, LowLevelTokenType.Text, "    ", 3, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "tag", 3, 4);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 3, 9);
      assertToken(tokenizer, LowLevelTokenType.Text, "      This is a ", 4, 0);
      assertToken(tokenizer, LowLevelTokenType.OpenTag, "i", 4, 17);
      assertToken(tokenizer, LowLevelTokenType.Text, "lot", 4, 20);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "i", 4, 23);
      assertToken(tokenizer, LowLevelTokenType.Text, " of text", 4, 27);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 4, 28);
      assertToken(tokenizer, LowLevelTokenType.Text, "    ", 5, 0);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 5, 4);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 5, 10);
      assertToken(tokenizer, LowLevelTokenType.Text, "  ", 6, 0);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 6, 2);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 6, 8);
      assertToken(tokenizer, LowLevelTokenType.CloseTag, "tag", 7, 0);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 7, 6);
      assertToken(tokenizer, LowLevelTokenType.NewLine, "", 8, 0);
      assertDone(tokenizer);
    })
  });
});
