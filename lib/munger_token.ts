import {MungerTokenType} from './munger_token_type';

export class MungerToken
{
  Type: MungerTokenType;
  
  Size: number = 0;
  
  Data: string;
  
  public IsStartTag(): boolean
  {
    return this.Type == MungerTokenType.StartTag;
  }
  
  public IsEndTag(): boolean
  {
    return this.Type == MungerTokenType.EndTag;  
  }
  
  public SetInput(input: string)
  {
    this._input = input;
  }
  
  public SetProperties(first: number, size: number, type: MungerTokenType)
  {
    this._first = first;
    this.Size = size;
    this.Type = type;

    this._data = null;
    this._name = null;
    this._tag_data = null;
  }
  
  private _first: number;
  private _name: string;
  private _tag_data: string;
  private _data: string;
  private _input: string;
}