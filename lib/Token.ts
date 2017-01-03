export class Token<TType>
{
  constructor(type: TType, value: string, line: number, column: number, position: number)
  {
    this.type = type;
    this.value = value;
    this.line = line;
    this.column = column;
    this.position = position;
  }

  readonly type: TType;

  readonly value: string;

  readonly line: number;

  readonly column: number;

  readonly position: number;
}
