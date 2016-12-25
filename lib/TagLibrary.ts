import {ITagDefinition} from "./ITagDefinition";
import {ITagLibrary} from "./ITagLibrary";

export class TagLibrary implements ITagLibrary
{
  add(tagDefinition: ITagDefinition): void
  {
    this.tags[tagDefinition.name] = tagDefinition;
  }

  get(name: string): ITagDefinition
  {
    return this.tags[name];
  }

  private tags: {[key:string]: ITagDefinition} = {};
}
