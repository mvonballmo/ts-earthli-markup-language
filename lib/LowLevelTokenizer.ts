
import {LowLevelTokenType} from "./LowLevelTokenType";
import {LowLevelToken} from "./LowLevelToken";
import {ITagLibrary} from "./ITagLibrary";
import {ITokenizer} from "./ITokenizer";

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

    return this.CreateFinalToken();
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
        return this.HandleOpenTag(char);
      case LowLevelTokenType.SeekingAttributeKey:
        return this.HandleSeekingAttributeKey(char);
      case LowLevelTokenType.SeekingAttributeSeparator:
        return this.HandleSeekingAttributeSeparator(char);
      case LowLevelTokenType.SeekingAttributeValue:
        return this.HandleSeekingAttributeValue(char);
      case LowLevelTokenType.CloseTag:
        return this.HandleCloseTag(char);
      case LowLevelTokenType.AttributeKey:
        return this.HandleAttributeKey(char);
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
          return this.CreateCurrentToken();
        }
        else
        {
          this.MoveNext();
          this.ConsumeToScan();
          return new LowLevelToken(LowLevelTokenType.NewLine, "");
        }
      case "\r":
      {
        if (this.HasBuffer())
        {
          return this.SwitchStateAndCreateToken(LowLevelTokenType.NewLine);
        }
        else
        {
          this.SwitchStateAndMoveNext(LowLevelTokenType.NewLine);
        }
        break;
      }
      case "<":
      {
        if (this.HasBuffer())
        {
          this.start += 1;

          return this.SwitchStateAndCreateToken(LowLevelTokenType.OpenTag);
        }
        else
        {
          this.start += 1;
          this.SwitchStateAndMoveNext(LowLevelTokenType.OpenTag);
          break;
        }
      }
      default:
      {
        this.MoveNext();
      }
    }

    return null;
  }

  private HandleNewLine(char: string): LowLevelToken
  {
    this.SwitchStateAndMoveNext(LowLevelTokenType.Text);

    switch (char)
    {
      case "\n":
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.NewLine, "");
    }

    return null;
  }

  private HandleOpenTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case ">":
      {
        let tagName = this.PeekBuffer();
        if (this.tagLibrary.Get(tagName) != null)
        {
          return this.SwitchStateAndCreateToken(LowLevelTokenType.Text);
        }

        // Switch to processing text, including previous character
        this.start -= 1;
        this.SwitchStateAndMoveNext(LowLevelTokenType.Text);
        break;
      }
      case "<":
        this.start = this.scan;
        this.MoveNext();
        break;
      case "/":
        this.SwitchStateAndMoveNext(LowLevelTokenType.CloseTag);
        this.start = this.scan;
        break;
      case " ":
      case "\n":
      case "\r":
        if (!this.HasBuffer())
        {
          this.start -= 1;
          this.SwitchStateAndMoveNext(LowLevelTokenType.Text);
          break;
        }
        else
        {
          let token = this.CreateCurrentToken();

          this.state = LowLevelTokenType.SeekingAttributeKey;

          return token;
        }
      default:
        this.MoveNext();
        if (!LowLevelTokenizer.IsIdentifier(char))
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
        this.SwitchStateAndConsume(LowLevelTokenType.Text);
        break;
      case " ":
      case "\n":
      case "\r":
        this.MoveNext();
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

        this.SwitchStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case " ":
      case "\n":
      case "\r":
        this.MoveNext();
        break;
      case "=":
        this.SwitchStateAndConsume(LowLevelTokenType.SeekingAttributeValue);
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

        this.SwitchStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case " ":
      case "\n":
      case "\r":
        this.MoveNext();
        break;
      case "\"":
        this.SwitchStateAndConsume(LowLevelTokenType.AttributeValue);
        break;
      default:
        {
          this.ConsumeToChar(">");

          // TODO What the hell?
          this.state = 1;

          return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
        }
    }

    return null;
  }

  private HandleAttributeKey(char: string): LowLevelToken
  {
    switch (char)
    {
      case "=":
        return this.SwitchStateAndCreateToken(LowLevelTokenType.SeekingAttributeValue);
      case " ":
      case "\n":
      case "\r":
        this.MoveNext();
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
          this.MoveNext();
        }
    }

    return null;
  }

  private HandleAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      case "\"":
        return this.SwitchStateAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
      default:
        this.MoveNext();
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
          return this.SwitchStateAndCreateToken(LowLevelTokenType.Text);
        }

        // Switch to processing text, including previous character
        this.start -= 1;
        this.SwitchStateAndMoveNext(LowLevelTokenType.Text);
        break;
      }
      default:
      {
        this.MoveNext();
        if (!LowLevelTokenizer.IsAlpha(char))
        {
          this.start -= 1;
          this.state = LowLevelTokenType.Text;
        }
      }
    }

    return null;
  }

  private CreateCurrentToken()
  {
    return new LowLevelToken(this.state, this.GetBuffer());
  }

  private CreateFinalToken(): LowLevelToken
  {
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

  private SwitchStateAndCreateToken(tokenType: LowLevelTokenType)
  {
    let result = this.CreateCurrentToken();

    this.SwitchStateAndConsume(tokenType);

    return result;
  }

  private SwitchStateAndConsume(tokenType: LowLevelTokenType): void
  {
    this.SwitchStateAndMoveNext(tokenType);
    this.ConsumeToScan();
  }

  private SwitchStateAndMoveNext(state: LowLevelTokenType)
  {
    this.state = state;
    this.MoveNext();
  }

  private MoveNext()
  {
    this.scan += 1;
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
