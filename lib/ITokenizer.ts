import {LowLevelToken} from "./LowLevelToken";

export interface ITokenizer
{
  GetNext(): LowLevelToken | null;
}
