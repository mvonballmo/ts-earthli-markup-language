import {ITagDefinition} from "./ITagDefinition";

export interface ITagLibrary
{
  get(name: string): ITagDefinition;
}
