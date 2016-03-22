/// <reference path="../typings/main.d.ts" />

import {expect} from 'chai';
import {HtmlMunger} from '../lib/html_munger';

describe('HtmlMunger', function()
{
  describe('#transform()', function()
  {
    it('should leave plain text untouched', function()
    {
      var m = new HtmlMunger();

      var output = m.transform("plain text");
      
      expect(output).to.equal('<p>plain text</p>\n');
    })
    it('should convert single quotes to HTML entities', function()
    {
      var m = new HtmlMunger();
      
      var output = m.transform("''cause that's wrong'");
      expect(output).to.equal('<p>&lsquo;&lsquo;cause that&rsquo;s wrong&rsquo;</p>\n');
    })
  });
});