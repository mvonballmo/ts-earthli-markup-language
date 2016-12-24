
import {Characters} from "./Characters";
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
      case Characters.NewLine:
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
      case Characters.CarriageReturn:
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
      case Characters.LessThan:
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
      case Characters.NewLine:
        this.ConsumeToScan();

        return new LowLevelToken(LowLevelTokenType.NewLine, "");
    }

    return null;
  }

  private HandleOpenTag(char: string): LowLevelToken
  {
    switch (char)
    {
      case Characters.GreaterThan:
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
      case Characters.LessThan:
        this.start = this.scan;
        this.MoveNext();
        break;
      case Characters.Slash:
        this.SwitchStateAndMoveNext(LowLevelTokenType.CloseTag);
        this.start = this.scan;
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
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
      case Characters.GreaterThan:
        this.SwitchStateAndConsume(LowLevelTokenType.Text);
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      default:
        if (LowLevelTokenizer.IsIdentifier(char))
        {
          this.state = LowLevelTokenType.AttributeKey;
        }
        else
        {
          this.RecoverFromTagError();

          return this.CreateCurrentErrorToken();
        }
    }

    return null;
  }

  private HandleSeekingAttributeSeparator(char: string): LowLevelToken
  {
    switch (char)
    {
      case Characters.GreaterThan:
        let value = this.GetBuffer();

        this.SwitchStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      case "=":
        this.SwitchStateAndConsume(LowLevelTokenType.SeekingAttributeValue);
        break;
      default:
      {
        this.RecoverFromTagError();

        return this.CreateCurrentErrorToken();
      }
    }

    return null;
  }

  private HandleSeekingAttributeValue(char: string): LowLevelToken
  {
    switch (char)
    {
      case Characters.GreaterThan:
        let value = this.GetBuffer();

        this.SwitchStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, value);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      case Characters.DoubleQuote:
        this.SwitchStateAndConsume(LowLevelTokenType.AttributeValue);
        break;
      default:
        {
          this.RecoverFromTagError();

          this.state = LowLevelTokenType.Text;

          return this.CreateCurrentErrorToken();
        }
    }

    return null;
  }

  private HandleAttributeKey(char: string): LowLevelToken
  {
    switch (char)
    {
      case Characters.Equals:
        return this.SwitchStateAndCreateToken(LowLevelTokenType.SeekingAttributeValue);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      default:
        if (!LowLevelTokenizer.IsIdentifier(char))
        {
          this.RecoverFromTagError();
          this.state = LowLevelTokenType.Text;

          return this.CreateCurrentErrorToken();
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
      case Characters.DoubleQuote:
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
      case Characters.GreaterThan:
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

  private PeekBuffer(): string
  {
    return this.input.substring(this.start, this.scan);
  }

  private GetBuffer(): string
  {
    let start = this.start;

    this.ConsumeToScan();

    return this.input.substring(start, this.scan);
  }

  private CreateCurrentToken()
  {
    return new LowLevelToken(this.state, this.GetBuffer());
  }

  private CreateCurrentErrorToken()
  {
    return new LowLevelToken(LowLevelTokenType.Error, this.GetBuffer());
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
        return this.CreateCurrentErrorToken();
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

  private ConsumeToScan(): void
  {
    this.start = this.scan;
    this.consumed = this.scan;
  }

  private SwitchStateAndMoveNext(state: LowLevelTokenType): void
  {
    this.state = state;
    this.MoveNext();
  }

  private MoveNext()
  {
    this.scan += 1;
  }

  private RecoverFromTagError()
  {
    this.ConsumeToChar(Characters.GreaterThan);
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

  private state: LowLevelTokenType;
  private start: number;
  private scan: number;
  private consumed: number;
  private input: string;
  private tagLibrary: ITagLibrary;
}
