import {ITagDefinition} from "./ITagDefinition";
import {FormatBehavior} from "./FormatBehavior";
import {NewLineBehavior} from "./NewLineBehavior";
import {EndTagBehavior} from "./EndTagBehavior";

export class TagDefinition implements ITagDefinition
{
  //noinspection JSUnusedGlobalSymbols
  constructor(
    public name: string,
    public format: FormatBehavior = FormatBehavior.Block,
    public newLines: NewLineBehavior = NewLineBehavior.Trim,
    public endTag: EndTagBehavior = EndTagBehavior.Required)
  {
  }
}