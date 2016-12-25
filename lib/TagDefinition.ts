import {ITagDefinition} from "./ITagDefinition";

export class TagDefinition implements ITagDefinition
{
  constructor(name: string)
  {
    this.name = name;
  }

  name: string;
}
