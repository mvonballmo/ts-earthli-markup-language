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

export class LowLevelTokenizer implements ITokenizer
{
  constructor(input: string)
  {
    this.input = input;
    this.scan = 0;
    this.start = 0;
    this.state = LowLevelTokenType.Text;
  }

  GetNext(): LowLevelToken
  {
    while (this.scan < this.input.length)
    {
      let char = this.input.charAt(this.scan);
      let token = this.HandleChar(char);
      if (token != null)
      {
        return token;
      }
    }

    if (this.HasBuffer())
    {
      return new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer())        
    }

    return null;
  }

  HandleChar(char: string): LowLevelToken
  {
    switch (this.state)
    {
      case LowLevelTokenType.Text:
        return this.HandleText(char);
      case LowLevelTokenType.NewLine:
        return this.HandleNewLine(char);
      case LowLevelTokenType.StartTag:
        return this.HandleStartTag(char);
      case LowLevelTokenType.EndTag:
        return this.HandleEndTag(char);
      case LowLevelTokenType.AttributeName:
        return this.HandleAttributeName(char);
      case LowLevelTokenType.AttributeValue:
        return this.HandleAttributeValue(char);
      default:
        throw new Error("Unexpected state: " + this.state);
    }
  }

  HandleText(char: string): LowLevelToken
  {
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
          this.state = LowLevelTokenType.NewLine;
          this.scan += 1;

          return result;
        }
        else
        {
          this.state = LowLevelTokenType.NewLine;
          this.scan += 1;                
        }
        break;                
      }
      case "<":
      {
        this.state = LowLevelTokenType.StartTag;
        this.scan += 1;
        break;
      }
      default:
      {
        this.scan += 1;
      }
    }

    return null;    
  }

  HandleNewLine(char: string): LowLevelToken
  {
    this.scan += 1;
    this.state = LowLevelTokenType.Text;
    switch (char)
    {
      case "\n":
        this.start = this.scan;
        return new LowLevelToken(LowLevelTokenType.NewLine, "");              
    }

    return null;
  }

  HandleStartTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
        return new LowLevelToken(LowLevelTokenType.StartTag, this.GetBuffer());
      case "<":
        this.start = this.scan;
        this.scan += 1;
        break;
      case "/":
        this.state = LowLevelTokenType.EndTag;
        this.start = this.scan;
        this.scan += 1;
        break;
      case " ":
      case "\n":
      case "\r":            
        this.state = LowLevelTokenType.AttributeName;
        return new LowLevelToken(LowLevelTokenType.StartTag, this.GetBuffer());
      default:
        this.scan += 1;
    }

    return null;    
  }

  HandleEndTag(char: string): LowLevelToken
  {
    switch (char)
    {
      default:
        this.scan += 1;
    }

    return null;
  }

  HandleAttributeName(char: string): LowLevelToken
  {
    switch (char)
    {
      default:
        this.scan += 1;
    }

    return null;
  }

  HandleAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      default:
        this.scan += 1;
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

  private state: LowLevelTokenType;
  private start: number;
  private scan: number;
  private input: string;
}
