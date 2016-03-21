import {Munger} from "./munger";

export class HtmlMunger extends Munger
{
  transform(input: string): string {
    return input;
  }
}