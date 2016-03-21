/**
 * Created by marco on 21/03/2016.
 */

///<reference path="../lib/munger.ts"/>
/// <reference path="../typings/main.d.ts" />

var assert = require('assert');

import {HtmlMunger} from '../lib/html_munger';

describe('HtmlMunger', function()
{
  describe('#transform()', function()
  {
    it('should leave plain text untouched', function()
    {
      var m = new HtmlMunger();

      var output = m.transform("plain text");
      assert.equal(output, '<p>plain text</p>\n');
    })
    it('should convert single quotes to HTML entities', function()
    {
      var m = new HtmlMunger();
      
      var output = m.transform("''cause that's wrong'");
      assert.equal(output, '<p>&lsquo;&lsquo;cause that&rsquo;s wrong&rsquo;</p>\n');
    })
  });
});