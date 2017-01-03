import {EndTagBehavior} from "./EndTagBehavior";
import {NewLineBehavior} from "./NewLineBehavior";
import {FormatBehavior} from "./FormatBehavior";

export interface ITagDefinition
{
  readonly name: string;

  readonly format: FormatBehavior;

  readonly newLines: NewLineBehavior;

  readonly endTag: EndTagBehavior;
}



