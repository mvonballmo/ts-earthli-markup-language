
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

  getNext()
  {
    while (this.scan < this.input.length)
    {
      let char = this.input.charAt(this.scan);
      let token = this.handleChar(char);
      if (token != null)
      {
        return token;
      }
    }

    return this.createFinalToken();
  }

  private handleChar(char: string)
  {
    switch (this.state)
    {
      case LowLevelTokenType.Text:
        return this.handleText(char);
      case LowLevelTokenType.NewLine:
        return this.handleNewLine(char);
      case LowLevelTokenType.OpenTag:
        return this.handleOpenTag(char);
      case LowLevelTokenType.SeekingAttributeKey:
        return this.handleSeekingAttributeKey(char);
      case LowLevelTokenType.SeekingAttributeSeparator:
        return this.handleSeekingAttributeSeparator(char);
      case LowLevelTokenType.SeekingAttributeValue:
        return this.handleSeekingAttributeValue(char);
      case LowLevelTokenType.CloseTag:
        return this.handleCloseTag(char);
      case LowLevelTokenType.AttributeKey:
        return this.handleAttributeKey(char);
      case LowLevelTokenType.AttributeValue:
        return this.handleAttributeValue(char);
      case LowLevelTokenType.Error:
        return this.handleError(char);
    }
  }

  private handleText(char: string)
  {
    switch (char)
    {
      case Characters.NewLine:
      {
        if (this.hasBuffer())
        {
          return this.createToken(LowLevelTokenType.Text);
        }

        this.moveNext();
        this.updateConsumed();
        return new LowLevelToken(LowLevelTokenType.NewLine, "");
      }
      case Characters.CarriageReturn:
      {
        if (this.hasBuffer())
        {
          return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.NewLine);
        }

        this.setStateAndMoveNext(LowLevelTokenType.NewLine);
        break;
      }
      case Characters.LessThan:
      {
        if (this.hasBuffer())
        {
          let result = this.createToken(LowLevelTokenType.Text);

          this.setStateAndMoveNext(LowLevelTokenType.OpenTag);

          return result;
        }

        this.setStateAndMoveNext(LowLevelTokenType.OpenTag);
        break;
      }
      default:
      {
        this.moveNext();
      }
    }

    return null;
  }

  private handleNewLine(char: string)
  {
    if (char === Characters.NewLine)
    {
      this.setStateAndConsume(LowLevelTokenType.Text);

      return new LowLevelToken(LowLevelTokenType.NewLine, "");
    }

    this.skipCharacter();
    this.updateConsumed();
    this.setStateAndMoveNext(LowLevelTokenType.Text);

    return null;
  }

  private handleOpenTag(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
      {
        let tagName = this.input.substring(this.consumed + 1, this.scan);
        if (this.tagLibrary.get(tagName) != null)
        {
          this.skipCharacter(); // "<"

          return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.Text);
        }

        this.setTextState();
        break;
      }
      case Characters.LessThan:
        this.skipCharacter();
        this.setStateAndMoveNext(LowLevelTokenType.Text);

        return this.createToken(LowLevelTokenType.Text);
      case Characters.Slash:
        this.setStateAndMoveNext(LowLevelTokenType.CloseTag);
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        if (this.getBufferSize() > 1)
        {
          this.skipCharacter();  // "<"

          return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
        }

        this.setState(LowLevelTokenType.Text);
        break;
      default:
      {
        this.moveNext();
        if (!this.isIdentifier(char))
        {
          this.setTextState();
        }
      }
    }

    return null;
  }

  private handleSeekingAttributeKey(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.setStateAndConsume(LowLevelTokenType.Text);
        break;
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.moveNext();
        this.skipCharacter();
        break;
      default:
        if (this.isIdentifier(char))
        {
          this.setState(LowLevelTokenType.AttributeKey);
        }
        else
        {
          this.setStateAndConsume(LowLevelTokenType.Error);

          return new LowLevelToken(LowLevelTokenType.Error, `'${char}' is not a valid attribute character.`);
        }
    }

    return null;
  }

  private handleSeekingAttributeSeparator(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.setStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, 'attribute does not have a value.');
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.moveNext();
        break;
      case Characters.Equals:
        this.setStateAndConsume(LowLevelTokenType.SeekingAttributeValue);
        break;
      default:
      {
        this.setStateAndConsume(LowLevelTokenType.Error);

        return new LowLevelToken(LowLevelTokenType.Error, 'attribute does not have a value.');
      }
    }

    return null;
  }

  private handleSeekingAttributeValue(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.setStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, `attribute does not have a value.`);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        this.moveNext();
        break;
      case Characters.DoubleQuote:
        this.setStateAndConsume(LowLevelTokenType.AttributeValue);
        break;
      default:
        this.setState(LowLevelTokenType.Error);

        return new LowLevelToken(this.state, "Attribute values must be surrounded in double-quotes.");
    }

    return null;
  }

  private handleAttributeKey(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        this.setStateAndConsume(LowLevelTokenType.Text);

        return new LowLevelToken(LowLevelTokenType.Error, `attribute does not have a value.`);
      case Characters.Equals:
        return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeValue);
      case Characters.Space:
      case Characters.Tab:
      case Characters.NewLine:
      case Characters.CarriageReturn:
        return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeSeparator);
      default:
        this.moveNext();
    }

    return null;
  }

  private handleAttributeValue(char: string)
  {
    switch (char)
    {
      case Characters.DoubleQuote:
        return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
      default:
        this.moveNext();
    }

    return null;
  }

  private handleCloseTag(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
      {
        let tagName = this.input.substring(this.consumed + 2, this.scan);
        if (this.tagLibrary.get(tagName) != null)
        {
          this.skipCharacter(); // "<"
          this.skipCharacter(); // "/"

          return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.Text);
        }

        this.setTextState();
        break;
      }
      default:
      {
        this.moveNext();
        if (!this.isAlpha(char))
        {
          this.setState(LowLevelTokenType.Text);
        }
      }
    }

    return null;
  }

  private handleError(char: string)
  {
    this.moveNext();

    switch (char)
    {
      case Characters.GreaterThan:
        this.updateConsumed();
        this.setState(LowLevelTokenType.Text);
        break;
    }

    return null;
  }

  private isAlpha(char: string)
  {
    return char.search(/[A-Za-z]+/) != -1;
  }

  private isIdentifier(char: string)
  {
    return char.search(/[^=]+/) != -1;
  }

  private hasBuffer()
  {
    return this.getBufferSize() > 0;
  }

  private getBufferSize()
  {
    return this.scan - this.consumed;
  }

  private createToken(tokenType: LowLevelTokenType)
  {
    let start = this.consumed;

    this.updateConsumed();

    let value = this.input.substring(start, this.scan);

    return new LowLevelToken(tokenType, value);
  }

  private createFinalToken()
  {
    switch (this.state)
    {
      case LowLevelTokenType.AttributeKey:
        return this.createFinalErrorToken("Unexpected end of input in attribute name.");
      case LowLevelTokenType.AttributeValue:
        return this.createFinalErrorToken("Unexpected end of input in attribute value.");
      case LowLevelTokenType.SeekingAttributeKey:
        return this.createFinalErrorToken("Unexpected end of input in tag.");
      case LowLevelTokenType.SeekingAttributeSeparator:
        return this.createFinalErrorToken("Unexpected end of input in attribute.");
      case LowLevelTokenType.SeekingAttributeValue:
        return this.createFinalErrorToken("Unexpected end of input in attribute.");
      default:
      {
        if (this.hasBuffer())
        {
          return this.createToken(LowLevelTokenType.Text);
        }
      }
    }

    return null;
  }

  private createFinalErrorToken(errorMessage: string)
  {
    this.setState(LowLevelTokenType.Text);
    this.updateConsumed();

    return new LowLevelToken(LowLevelTokenType.Error, errorMessage);
  }

  private setTextState()
  {
    this.setStateAndMoveNext(LowLevelTokenType.Text);
  }

  private setStateAndConsumeAndCreateToken(tokenType: LowLevelTokenType)
  {
    let result = this.createToken(this.state);

    this.setStateAndConsume(tokenType);

    return result;
  }

  private setStateAndConsume(tokenType: LowLevelTokenType)
  {
    this.setStateAndMoveNext(tokenType);
    this.updateConsumed();
  }

  private updateConsumed(): void
  {
    this.consumed = this.scan;
  }

  private setStateAndMoveNext(state: LowLevelTokenType)
  {
    this.setState(state);
    this.moveNext();
  }

  private setState(state: LowLevelTokenType)
  {
    this.state = state;
  }

  private moveNext()
  {
    this.scan += 1;
  }

  private skipCharacter()
  {
    this.consumed += 1;
  }

  private input: string;
  private state: LowLevelTokenType;
  private scan: number;
  private consumed: number;
  private tagLibrary: ITagLibrary;
}