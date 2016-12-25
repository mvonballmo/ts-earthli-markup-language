
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
    this.consumed = 0;
    this.state = LowLevelTokenType.Text;
  }

  GetNext()
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

  private HandleChar(char: string)
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
      case LowLevelTokenType.Error:
        return this.HandleError(char);
    }
  }

  private HandleText(char: string)
  {
    switch (char)
    {
      case Characters.NewLine:
      {
        if (this.HasBuffer())
        {
          return this.CreateToken(LowLevelTokenType.Text);
        }

        this.MoveNext();
        this.ConsumeToScan();
        return new LowLevelToken(LowLevelTokenType.NewLine, "");
      }
      case Characters.CarriageReturn:
      {
        if (this.HasBuffer())
        {
          return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.NewLine);
        }

        this.SetStateAndMoveNext(LowLevelTokenType.NewLine);
        break;
      }
      case Characters.LessThan:
      {
        if (this.HasBuffer())
        {
          let result = this.CreateToken(LowLevelTokenType.Text);

          this.SetStateAndMoveNext(LowLevelTokenType.OpenTag);

          return result;
        }

        this.SetStateAndMoveNext(LowLevelTokenType.OpenTag);
        break;
      }
      default:
      {
        this.MoveNext();
      }
    }

    return null;
  }

  private HandleNewLine(char: string)
  {
    if (char === Characters.NewLine)
    {
      this.SetStateAndConsume(LowLevelTokenType.Text);

      return new LowLevelToken(LowLevelTokenType.NewLine, "");
    }

    this.IgnoreFirstCharacter();
    this.ConsumeToScan();
    this.SetStateAndMoveNext(LowLevelTokenType.Text);

    return null;
  }

  private HandleOpenTag(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
      {
        let tagName = this.input.substring(this.consumed + 1, this.scan);
        if (this.tagLibrary.Get(tagName) != null)
        {
          this.IgnoreFirstCharacter(); // "<"

          return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.Text);
        }

        this.SetTextState();
        break;
      }
      case Characters.LessThan:
        this.IgnoreFirstCharacter();
        this.SetStateAndMoveNext(LowLevelTokenType.Text);

        return this.CreateToken(LowLevelTokenType.Text);
      case Characters.Slash:
        this.SetStateAndMoveNext(LowLevelTokenType.CloseTag);
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        if (this.getBufferSize() > 1)
        {
          this.IgnoreFirstCharacter();  // "<"

          return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
        }

        this.SetState(LowLevelTokenType.Text);
        break;
      default:
      {
        this.MoveNext();
        if (!this.IsIdentifier(char))
        {
          this.SetTextState();
        }
      }
    }

    return null;
  }

  private HandleSeekingAttributeKey(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.SetStateAndConsume(LowLevelTokenType.Text);
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        this.IgnoreFirstCharacter();
        break;
      default:
        if (this.IsIdentifier(char))
        {
          this.SetState(LowLevelTokenType.AttributeKey);
        }
        else
        {
          this.SetStateAndConsume(LowLevelTokenType.Error);

          return new LowLevelToken(LowLevelTokenType.Error, `'${char}' is not a valid attribute character.`);
        }
    }

    return null;
  }

  private HandleSeekingAttributeSeparator(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.SetStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, 'attribute does not have a value.');
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      case Characters.Equals:
        this.SetStateAndConsume(LowLevelTokenType.SeekingAttributeValue);
        break;
      default:
      {
        this.SetStateAndConsume(LowLevelTokenType.Error);

        return new LowLevelToken(LowLevelTokenType.Error, 'attribute does not have a value.');
      }
    }

    return null;
  }

  private HandleSeekingAttributeValue(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.SetStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, `attribute does not have a value.`);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.MoveNext();
        break;
      case Characters.DoubleQuote:
        this.SetStateAndConsume(LowLevelTokenType.AttributeValue);
        break;
      default:
        this.SetState(LowLevelTokenType.Error);

        return new LowLevelToken(this.state, "Attribute values must be surrounded in double-quotes.");
    }

    return null;
  }

  private HandleAttributeKey(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.SetStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, `attribute does not have a value.`);
      case Characters.Equals:
        return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeValue);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeSeparator);
      default:
        this.MoveNext();
    }

    return null;
  }

  private HandleAttributeValue(char: string)
  {
    switch (char)
    {
      case Characters.DoubleQuote:
        return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
      default:
        this.MoveNext();
    }

    return null;
  }

  private HandleCloseTag(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
      {
        let tagName = this.input.substring(this.consumed + 2, this.scan);
        if (this.tagLibrary.Get(tagName) != null)
        {
          this.IgnoreFirstCharacter(); // "<"
          this.IgnoreFirstCharacter(); // "/"

          return this.SetStateAndConsumeAndCreateToken(LowLevelTokenType.Text);
        }

        this.SetTextState();
        break;
      }
      default:
      {
        this.MoveNext();
        if (!this.IsAlpha(char))
        {
          this.SetState(LowLevelTokenType.Text);
        }
      }
    }

    return null;
  }

  private HandleError(char: string)
  {
    this.MoveNext();

    switch (char)
    {
      case Characters.GreaterThan:
        this.ConsumeToScan();
        this.SetState(LowLevelTokenType.Text);
        break;
    }

    return null;
  }

  private IsAlpha(char: string)
  {
    return char.search(/[A-Za-z]+/) != -1;
  }

  private IsIdentifier(char: string)
  {
    return char.search(/[^=]+/) != -1;
  }

  private HasBuffer()
  {
    return this.getBufferSize() > 0;
  }

  private getBufferSize()
  {
    return this.scan - this.consumed;
  }

  private CreateToken(tokenType: LowLevelTokenType)
  {
    let start = this.consumed;

    this.ConsumeToScan();

    let value = this.input.substring(start, this.scan);

    return new LowLevelToken(tokenType, value);
  }

  private CreateFinalToken()
  {
    switch (this.state)
    {
      case LowLevelTokenType.AttributeKey:
        return this.CreateFinalErrorToken("Unexpected end of input in attribute name.");
      case LowLevelTokenType.AttributeValue:
        return this.CreateFinalErrorToken("Unexpected end of input in attribute value.");
      case LowLevelTokenType.SeekingAttributeKey:
        return this.CreateFinalErrorToken("Unexpected end of input in tag.");
      case LowLevelTokenType.SeekingAttributeSeparator:
        return this.CreateFinalErrorToken("Unexpected end of input in attribute.");
      case LowLevelTokenType.SeekingAttributeValue:
        return this.CreateFinalErrorToken("Unexpected end of input in attribute.");
      default:
      {
        if (this.HasBuffer())
        {
          return this.CreateToken(LowLevelTokenType.Text);
        }
      }
    }

    return null;
  }

  private CreateFinalErrorToken(errorMessage: string)
  {
    this.SetState(LowLevelTokenType.Text);
    this.ConsumeToScan();

    return new LowLevelToken(LowLevelTokenType.Error, errorMessage);
  }

  private SetTextState()
  {
    this.SetStateAndMoveNext(LowLevelTokenType.Text);
  }

  private SetStateAndConsumeAndCreateToken(tokenType: LowLevelTokenType)
  {
    let result = this.CreateToken(this.state);

    this.SetStateAndConsume(tokenType);

    return result;
  }

  private SetStateAndConsume(tokenType: LowLevelTokenType)
  {
    this.SetStateAndMoveNext(tokenType);
    this.ConsumeToScan();
  }

  private ConsumeToScan(): void
  {
    this.consumed = this.scan;
  }

  private SetStateAndMoveNext(state: LowLevelTokenType)
  {
    this.SetState(state);
    this.MoveNext();
  }

  private SetState(state: LowLevelTokenType)
  {
    this.state = state;
  }

  private MoveNext()
  {
    this.scan += 1;
  }

  private IgnoreFirstCharacter()
  {
    this.consumed += 1;
  }

  private input: string;
  private state: LowLevelTokenType;
  private scan: number;
  private consumed: number;
  private tagLibrary: ITagLibrary;
}