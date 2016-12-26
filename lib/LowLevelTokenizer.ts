
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
    this.line = 0;
    this.column = 0;
    this.columnConsumed = 0;
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

        return this.createToken(LowLevelTokenType.NewLine);
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
      this.setStateAndMoveNext(LowLevelTokenType.Text);

      return this.createToken(LowLevelTokenType.NewLine);
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
      case Characters.CarriageReturn:
        if (this.getBufferSize() > 1)
        {
          this.skipCharacter();  // "<"

          return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);
        }

        this.setState(LowLevelTokenType.Text);
        break;
      case Characters.NewLine:
        if (this.getBufferSize() > 1)
        {
          this.skipCharacter();  // "<"

          let result = this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeKey);

          this.increaseLine();

          return result;
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
      case Characters.CarriageReturn:
        this.moveNext();
        this.skipCharacter();
        break;
      case Characters.NewLine:
        this.moveNext();
        this.skipCharacter();
        this.increaseLine();
        break;
      default:
        if (this.isIdentifier(char))
        {
          this.setState(LowLevelTokenType.AttributeKey);
        }
        else
        {
          let result = this.createErrorToken(`'${char}' is not a valid attribute character.`);

          this.setStateAndConsume(LowLevelTokenType.Error);

          return result;
        }
    }

    return null;
  }

  private handleSeekingAttributeSeparator(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        let column = this.lastToken != null ? this.lastToken.column : undefined;
        let position = this.lastToken != null ? this.lastToken.position : undefined;
        let result = this.createErrorToken("attribute does not have a value.", column, position);

        this.setStateAndConsume(LowLevelTokenType.Text);

        return result;
      case Characters.Space:
      case Characters.Tab:
      case Characters.CarriageReturn:
        this.moveNext();
        break;
      case Characters.NewLine:
        this.moveNext();
        this.increaseLine();
        break;
      case Characters.Equals:
        this.setStateAndConsume(LowLevelTokenType.SeekingAttributeValue);
        break;
      default:
      {
        let column = this.lastToken != null ? this.lastToken.column : undefined;
        let position = this.lastToken != null ? this.lastToken.position : undefined;
        let result = this.createErrorToken("attribute does not have a value.", column, position);

        this.setStateAndConsume(LowLevelTokenType.Error);

        return result;
      }
    }

    return null;
  }

  private handleSeekingAttributeValue(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        let result = this.createErrorToken("attribute does not have a value.");

        this.setStateAndConsume(LowLevelTokenType.Text);

        return result;
      case Characters.Space:
      case Characters.Tab:
      case Characters.CarriageReturn:
        this.moveNext();
        break;
      case Characters.NewLine:
        this.increaseLine();
        this.moveNext();
        break;
      case Characters.DoubleQuote:
        this.setStateAndConsume(LowLevelTokenType.AttributeValue);
        break;
      default:
        this.setState(LowLevelTokenType.Error);

        return this.createErrorToken("Attribute values must be surrounded by double-quotes.");
    }

    return null;
  }

  private handleAttributeKey(char: string)
  {
    switch (char)
    {
      case Characters.GreaterThan:
        let result = this.createErrorToken("attribute does not have a value.");

        this.setStateAndConsume(LowLevelTokenType.Text);

        return result;
      case Characters.Equals:
        return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeValue);
      case Characters.Space:
      case Characters.Tab:
      case Characters.CarriageReturn:
        return this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeSeparator);
      case Characters.NewLine:
      {
        let result = this.setStateAndConsumeAndCreateToken(LowLevelTokenType.SeekingAttributeSeparator);

        this.increaseLine();

        return result;
      }
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
        this.column -= 1;
        let result = this.createToken(this.state, this.consumed - 1);

        this.setStateAndConsume(LowLevelTokenType.SeekingAttributeKey);
        this.column += 1;

        return result;
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

  private createToken(tokenType: LowLevelTokenType, position?: number)
  {
    let consumed = this.consumed;
    let column = this.column;

    position = position || consumed;

    this.updateConsumed();

    let value = this.input.substring(consumed, this.scan);

    let result = this.lastToken = new LowLevelToken(tokenType, value, this.line, column, position);

    if (tokenType === LowLevelTokenType.NewLine)
    {
      this.increaseLine();
    }

    return result;
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

    let result = this.createErrorToken(errorMessage);

    this.updateConsumed();

    return result;
  }

  private createErrorToken(errorMessage: string, column?: number, position?: number)
  {
    return this.lastToken = new LowLevelToken(LowLevelTokenType.Error, errorMessage, this.line, column || this.column, position || this.consumed);
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
    this.column += this.scan - this.columnConsumed;
    this.consumed = this.scan;
    this.columnConsumed = this.consumed;
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
    this.columnConsumed += 1;
    this.column += 1;
  }

  private increaseLine()
  {
    this.line += 1;
    this.column = 0;
    this.columnConsumed = this.scan;
  }

  private input: string;
  private state: LowLevelTokenType;
  private scan: number;
  private consumed: number;
  private columnConsumed: number;
  private line: number;
  private column: number;
  private lastToken: LowLevelToken;
  private tagLibrary: ITagLibrary;
}