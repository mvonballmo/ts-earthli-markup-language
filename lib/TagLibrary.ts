import {ITagDefinition} from "./ITagDefinition";
import {ITagLibrary} from "./ITagLibrary";

export class TagLibrary implements ITagLibrary
{
  Add(tagDefinition: ITagDefinition): void
  {
    this.tags[tagDefinition.Name] = tagDefinition;
  }

  Get(name: string): ITagDefinition
  {
    return this.tags[name];
  }

  private tags: {[key:string]: ITagDefinition} = {};
}
