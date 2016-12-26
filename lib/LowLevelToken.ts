import {LowLevelTokenType} from "./LowLevelTokenType";

export class LowLevelToken
{
  constructor(type: LowLevelTokenType, value: string, line: number, column: number, position: number)
  {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.position = position;
  }

  type: LowLevelTokenType;

  value: string;

  line: number;

  column: number;

  position: number;
}
