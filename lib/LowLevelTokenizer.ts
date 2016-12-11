import {MungerToken} from "./munger_token";
import {MungerTokenType} from "./munger_token_type";

export enum LowLevelTokenType
{
  Text,
  NewLine,
  StartTag,
  EndTag,
  AttributeName,
  AttributeValue,
  Error
}

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

export interface ITokenizer
{
  GetNext(): LowLevelToken;
}

enum State
{
  Text,
  Newline,
  Tag,
  Attribute
}

export class LowLevelTokenizer implements ITokenizer
{
  constructor(input: string)
  {
    this.input = input;
    this.scan = 0;
    this.start = 0;
    this.state = State.Text;
  }

  GetNext(): LowLevelToken
  {
    while (this.scan < this.input.length)
    {
      let char = this.input.charAt(this.scan);

      switch (this.state)
      {
        case State.Text:
          switch (char)
          {
            case "\n":
              if (this.HasBuffer())
              {
                return new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer())
              }
              else
              {
                this.start += 1;
                this.scan += 1;
                return new LowLevelToken(LowLevelTokenType.NewLine, "");                  
              }
            case "\r":
            {
              if (this.HasBuffer())
              {
                let result = new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer());
                this.state = State.Newline;
                this.scan += 1;

                return result;
              }
              else
              {
                this.state = State.Newline;
                this.scan += 1;                
              }
              break;                
            }
            case "<":
            {
              this.state = State.Tag;
              this.scan += 1;
              break;
            }
            default:
            {
              this.scan += 1;
            }
          }
          break;
        case State.Newline:
        {
          this.scan += 1;
          this.state = State.Text;
          switch (char)
          {
            case "\n":
              this.start = this.scan;
              return new LowLevelToken(LowLevelTokenType.NewLine, "");              
          }
          break;
        }
        case State.Tag:
          switch (char)
          {
            case ">":
              this.start = this.scan;
              return new LowLevelToken(LowLevelTokenType.NewLine, "<");              
            case " ":
            case "\n":
            case "\r":            
              this.state = State.Attribute;
              return new LowLevelToken(LowLevelTokenType.StartTag, this.GetBuffer());
          }
          break;
      }
    }

    if (this.HasBuffer())
    {
      return new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer())        
    }

    return null;
  }

  HasBuffer(): boolean
  {
    return this.scan > this.start;
  }

  GetBuffer(): string
  {
    let start = this.start;
    this.start = this.scan;

    return this.input.substring(start, this.scan);
  }

  private state: State;
  private start: number;
  private scan: number;
  private input: string;
}
