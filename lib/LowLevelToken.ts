import {LowLevelTokenType} from "./LowLevelTokenType";

export class LowLevelToken
{
  constructor(type: LowLevelTokenType, value: string, line: number, column: number)
  {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
  }

  type: LowLevelTokenType;

  value: string;

  line: number;

  column: number;
}
