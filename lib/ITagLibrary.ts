import {ITagDefinition} from "./ITagDefinition";

export interface ITagLibrary
{
  Get(name: string): ITagDefinition;
}
