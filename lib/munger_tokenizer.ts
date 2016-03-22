import {MungerToken} from "./munger_token";
import {MungerTokenType} from "./munger_token_type";

export class MungerTokenizer
{
  // TODO Move these settings to a separate options object
  
  OpenTagCharacter: string = '<';
  
  CloseTagCharacter: string = '>';
  
  EndTagCharacter: string = '/';
  
  constructor()
  {
    this._currentToken = this.MakeToken();
    this._firstCharacterExpression = new RegExp('^[a-zA-Z_]$').compile();
  }
  
  public SetInput(input: string)
  {
    this._input = input;
    this._currentToken.SetInput(input);
  }
  
  public AreTokensAvailable(): boolean
  {
    return this._position != null;
  }
  
  public GetCurrentToken(): MungerToken
  {
    return this._currentToken;
  }
  
  public ReadNextToken()
  {
    this._position = this._input.indexOf(this.OpenTagCharacter, this._position);
    
    if (this._position >= 0) 
    {
      if (this._position < this._size - 1) 
      {
        var firstTagCharacter = this._input[this._position + 1];
        
        if (this.IsTagCharacter(firstTagCharacter)) 
        {
          var endOfTag = this._input.indexOf(this.CloseTagCharacter, this._position + 1);
          if (endOfTag > 0) 
          {
            // There is at least an entire tag in the input stream.
            // If the current text block is non-empty, set that as the next token
            // Otherwise, extract the token.
            
            if (this._position != this._startOfTextBlock)
            {
              this.SetCurrentToken(this._startOfTextBlock, this._position - this._startOfTextBlock, MungerTokenType.Text);
              this._startOfTextBlock = this._position;
            }
            else
            {
              this.SetCurrentToken(this._position, endOfTag - this._position, this.GetTagTokenType(firstTagCharacter));
              
              // If there is more text remaining, go to the next character
              // and mark the start of the next text block
              
              if (endOfTag < this._size - 1)
              {
                this._position = endOfTag + 1;
                this._startOfTextBlock = this._position;
              }
              else
              {
                this.Abort();
              }
            }
          }
          else
          {
            this.SetLastToken();
          }
        }
        else
        {
          if (firstTagCharacter == this.OpenTagCharacter) 
          {
            if (this._position != this._startOfTextBlock)
            {
              this.SetCurrentToken(this._startOfTextBlock, this._position - this._startOfTextBlock, MungerTokenType.Text);
              this._startOfTextBlock = this._position;
            }
            else
            {
              this._position += 1;
              this.SetCurrentToken(this._position, 1, MungerTokenType.Text);
              this._position += 1;
              this._startOfTextBlock = this._position;
            }
          }
          else
          {
            this._position += 1;
            this.ReadNextToken();
          }
        }
      }
      else
      {
        // Open tag was the final character
        
        this.SetLastToken();
      }
    }
    else
    {
      // No more tags
      
      this.SetLastToken();
    }
  }
  
  protected Abort()
  {
    this._position = null;
  }
  
  protected SetCurrentToken(first: number, count: number, type: MungerTokenType)
  {
    this._currentToken.SetProperties(first, count, type);
  }
  
  protected SetLastToken()
  {
    this.SetCurrentToken(this._startOfTextBlock, this._size - this._startOfTextBlock, MungerTokenType.Text);
    this.Abort();
  }
  
  protected IsTagCharacter(c: string): boolean
  {
    return this._firstCharacterExpression.test(c);
  }
  
  protected MakeToken(): MungerToken
  {
    return new MungerToken();  
  }
  
  private GetTagTokenType(firstTagCharacter: string)
  {
    return firstTagCharacter == this.EndTagCharacter ? MungerTokenType.EndTag : MungerTokenType.StartTag;
  }
  
  private _input: string;
  private _size: number;
  private _position: number;
  private _startOfTextBlock: number;
  private _currentToken: MungerToken;
  private _firstCharacterExpression: RegExp;
}