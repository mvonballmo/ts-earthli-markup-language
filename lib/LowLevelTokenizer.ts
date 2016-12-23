export enum LowLevelTokenType
{
  Text,
  NewLine,
  OpenTag,
  SeekingAttributeKey,
  SeekingAttributeSeparator,
  SeekingAttributeValue,
  AttributeKey,
  AttributeValue,
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
      case LowLevelTokenType.AttributeKey:
      case LowLevelTokenType.AttributeValue:
      case LowLevelTokenType.SeekingAttributeKey:
      case LowLevelTokenType.SeekingAttributeSeparator:
      case LowLevelTokenType.SeekingAttributeValue:
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

  private HandleChar(char: string): LowLevelToken
  {
    switch (this.state)
    {
      case LowLevelTokenType.Text:
        return this.HandleText(char);
      case LowLevelTokenType.NewLine:
        return this.HandleNewLine(char);
      case LowLevelTokenType.OpenTag:
        return this.HandleStartOpenTag(char);
      case LowLevelTokenType.SeekingAttributeKey:
        return this.HandleSeekingAttributeKey(char);
      case LowLevelTokenType.SeekingAttributeSeparator:
        return this.HandleSeekingAttributeSeparator(char);
      case LowLevelTokenType.SeekingAttributeValue:
        return this.HandleSeekingAttributeValue(char);
      case LowLevelTokenType.CloseTag:
        return this.HandleCloseTag(char);
      case LowLevelTokenType.AttributeKey:
        return this.HandleAttributeName(char);
      case LowLevelTokenType.AttributeValue:
        return this.HandleAttributeValue(char);
      default:
        throw new Error(`Unexpected state: ${this.state}`);
    }
  }

  private HandleText(char: string): LowLevelToken
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
        if (this.HasBuffer())
        {
          let result = new LowLevelToken(LowLevelTokenType.Text, this.GetBuffer());

          this.state = LowLevelTokenType.OpenTag;
          this.start += 1;
          this.scan += 1;

          return result;
        }
        else
        {
          this.state = LowLevelTokenType.OpenTag;
          this.start += 1;
          this.scan += 1;
          break;
        }
      }
      default:
      {
        this.scan += 1;
      }
    }

    return null;
  }

  private HandleNewLine(char: string): LowLevelToken
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

  private HandleStartOpenTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
      {
        let tagName = this.PeekBuffer();
        if (this.tagLibrary.Get(tagName) != null)
        {
          let result = new LowLevelToken(LowLevelTokenType.OpenTag, this.GetBuffer());
          this.state = LowLevelTokenType.Text;
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
        this.state = LowLevelTokenType.SeekingAttributeKey;
        return new LowLevelToken(LowLevelTokenType.OpenTag, this.GetBuffer());
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

  private HandleSeekingAttributeKey(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
        this.state = LowLevelTokenType.Text;
        this.scan += 1;
        this.ConsumeToScan();
        break;
      case " ":
      case "\n":
      case "\r":
        this.scan += 1;
        break;
      default:
        if (LowLevelTokenizer.IsIdentifier(char))
        {
          this.state = LowLevelTokenType.AttributeKey;
        }
        else
        {
          this.ConsumeToChar(">");

          return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
        }
    }

    return null;
  }

  private HandleSeekingAttributeSeparator(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
        let value = this.GetBuffer();

        this.state = LowLevelTokenType.Text;
        this.scan += 1;
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case " ":
      case "\n":
      case "\r":
        this.scan += 1;
        break;
      case "=":
        this.scan += 1;
        this.ConsumeToScan();
        this.state = LowLevelTokenType.SeekingAttributeValue;
        break;
      default:
      {
        this.ConsumeToChar(">");

        return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
      }
    }

    return null;
  }

  private HandleSeekingAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
        let value = this.GetBuffer();

        this.state = LowLevelTokenType.Text;
        this.scan += 1;
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case " ":
      case "\n":
      case "\r":
        this.scan += 1;
        break;
      case "\"":
        this.scan += 1;
        this.ConsumeToScan();
        this.state = LowLevelTokenType.AttributeValue;
        break;
      default:
        {
          this.ConsumeToChar(">");
          this.state = 1;

          return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
        }
    }

    return null;
  }

  private HandleCloseTag(char: string): LowLevelToken
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
          this.state = LowLevelTokenType.Text;
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

  private HandleAttributeName(char: string): LowLevelToken
  {
    switch (char)
    {
      case "=":
        let value = this.GetBuffer();

        this.state = LowLevelTokenType.SeekingAttributeValue;
        this.scan += 1;
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.AttributeKey, value);
      case " ":
      case "\n":
      case "\r":
        this.scan += 1;
        break;
      default:
        if (!LowLevelTokenizer.IsIdentifier(char))
        {
          this.ConsumeToChar(">");
          this.state = LowLevelTokenType.Text;

          return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
        }
        else
        {
          this.scan += 1;
        }
    }

    return null;
  }

  private HandleAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      case "\"":
        let buffer = this.GetBuffer();
        this.state = LowLevelTokenType.SeekingAttributeKey;
        this.scan += 1;
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.AttributeValue, buffer);
      default:
        this.scan += 1;
    }

    return null;
  }

  private static IsAlpha(char: string): boolean
  {
    return char.search(/[A-Za-z]+/) != -1;
  }

  private static IsIdentifier(char: string): boolean
  {
    return char.search(/[A-Za-z0-9_]+/) != -1;
  }

  private HasBuffer(): boolean
  {
    return this.scan > this.start;
  }

  private GetBuffer(): string
  {
    let start = this.start;

    this.ConsumeToScan();

    return this.input.substring(start, this.scan);
  }

  private ConsumeToChar(charToSeek: string)
  {
    while (this.scan < this.input.length)
    {
      let char = this.input.charAt(this.scan);

      this.scan += 1;

      if (char == charToSeek)
      {
        this.ConsumeToScan();
        break;
      }
    }
  }

  private ConsumeToScan(): void
  {
    this.start = this.scan;
    this.consumed = this.scan;
  }

  private PeekBuffer(): string
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
