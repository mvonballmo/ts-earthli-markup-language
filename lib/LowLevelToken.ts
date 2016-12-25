import {LowLevelTokenType} from "./LowLevelTokenType";

export class LowLevelToken
{
  constructor(type: LowLevelTokenType, value: string)
  {
    this.type = type;
    this.value = value;
  }

  type: LowLevelTokenType;

  value: string;

  line: number;

  column: number;
}
