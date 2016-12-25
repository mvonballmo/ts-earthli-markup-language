import {LowLevelToken} from "./LowLevelToken";

export interface ITokenizer
{
  getNext(): LowLevelToken | null;
}
