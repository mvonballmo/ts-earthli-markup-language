import {LowLevelTokenType} from "./LowLevelTokenType";

export class LowLevelToken
{
  constructor(type: LowLevelTokenType, value: string)
  {
    this.Type = type;
    this.Value = value;
  }

  Type: LowLevelTokenType;

  Value: string;

  Line: number;

  Column: number;
}
