export enum LowLevelTokenType
{
  Text,
  NewLine,
  StartOpenTag,
  AttributeName,
  OpenQuote,
  AttributeValue,
  CloseQuote,
  EndOpenTag,
  CloseTag,
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

export interface ITagDefinition
{
  Name: string;
}

export class TagDefinition implements ITagDefinition
{
  constructor(name: string)
  {
    this.Name = name;
  }

  Name: string;
}

export interface ITagLibrary
{
  Get(name: string): ITagDefinition;
}

export class TagLibrary implements ITagLibrary
{
  Add(tagDefinition: ITagDefinition): void
  {
    this.tags[tagDefinition.Name] = tagDefinition;
  }

  Get(name: string): ITagDefinition
  {
    return this.tags[name];
  }

  private tags: {[key:string]: ITagDefinition} = {};
}

export interface ITokenizer
{
  GetNext(): LowLevelToken;
}

export class LowLevelTokenizer implements ITokenizer
{
  constructor(tagLibrary: ITagLibrary, input: string)
  {
    this.tagLibrary = tagLibrary;
    this.input = input;
    this.scan = 0;
    this.start = 0;
    this.consumed = 0;
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

    this.start = this.consumed;

    switch (this.state)
    {
      case LowLevelTokenType.AttributeName:
        this.state = LowLevelTokenType.Text;
        return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
      default:
      {
        if (this.HasBuffer())
        {
          return new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer());
        }
      }
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
      case LowLevelTokenType.StartOpenTag:
        return this.HandleStartOpenTag(char);
      case LowLevelTokenType.CloseTag:
        return this.HandleCloseTag(char);
      case LowLevelTokenType.AttributeName:
        return this.HandleAttributeName(char);
      case LowLevelTokenType.AttributeValue:
        return this.HandleAttributeValue(char);
      default:
        throw new Error(`Unexpected state: ${this.state}`);
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
          this.scan += 1;
          this.ConsumeToScan();
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
        this.state = LowLevelTokenType.StartOpenTag;
        this.start += 1;
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
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.NewLine, "");
    }

    return null;
  }

  HandleStartOpenTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
      {
        let tagName = this.PeekBuffer();
        if (this.tagLibrary.Get(tagName) != null)
        {
          let result = new LowLevelToken(LowLevelTokenType.StartOpenTag, this.GetBuffer());
          this.scan += 1;
          this.ConsumeToScan();
          return result;
        }

        // Switch to processing text, including previous character
        this.scan += 1;
        this.start -= 1;
        this.state = LowLevelTokenType.Text;
        break;
      }
      case "<":
        this.start = this.scan;
        this.scan += 1;
        break;
      case "/":
        this.state = LowLevelTokenType.CloseTag;
        this.scan += 1;
        this.start = this.scan;
        break;
      case " ":
      case "\n":
      case "\r":
        this.state = LowLevelTokenType.AttributeName;
        return new LowLevelToken(LowLevelTokenType.StartOpenTag, this.GetBuffer());
      default:
        this.scan += 1;
        if (!LowLevelTokenizer.IsAlpha(char))
        {
          this.start -= 1;
          this.state = LowLevelTokenType.Text;
        }
    }

    return null;
  }

  HandleCloseTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
      {
        let tagName = this.PeekBuffer();
        if (this.tagLibrary.Get(tagName) != null)
        {
          let result = new LowLevelToken(LowLevelTokenType.CloseTag, this.GetBuffer());
          this.scan += 1;
          this.ConsumeToScan();
          return result;
        }

        // Switch to processing text, including previous character
        this.scan += 1;
        this.start -= 1;
        this.state = LowLevelTokenType.Text;
        break;
      }
      default:
      {
        this.scan += 1;
        if (!LowLevelTokenizer.IsAlpha(char))
        {
          this.start -= 1;
          this.state = LowLevelTokenType.Text;
        }
      }
    }

    return null;
  }

  HandleAttributeName(char: string): LowLevelToken
  {
    switch (char)
    {
      case "=":
        this.state = LowLevelTokenType.AttributeValue;
        return new LowLevelToken(LowLevelTokenType.AttributeName, this.GetBuffer());
      default:
        this.scan += 1;        
    }

    return null;
  }

  HandleAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      case "\"":            
        this.state = LowLevelTokenType.AttributeValue;
        return new LowLevelToken(LowLevelTokenType.AttributeName, this.GetBuffer());
      default:
        this.scan += 1;
    }

    return null;
  }

  static IsAlpha(char: string): boolean
  {
    return char.search(/[A-Za-z]+/) != -1;
  }

  HasBuffer(): boolean
  {
    return this.scan > this.start;
  }

  GetBuffer(): string
  {
    let start = this.start;

    this.ConsumeToScan();

    return this.input.substring(start, this.scan);
  }

  ConsumeToScan(): void
  {
    this.start = this.scan;
    this.consumed = this.scan;
  }

  PeekBuffer(): string
  {
    return this.input.substring(this.start, this.scan);
  }

  private state: LowLevelTokenType;
  private start: number;
  private scan: number;
  private consumed: number;
  private input: string;
  private tagLibrary: ITagLibrary;
}
