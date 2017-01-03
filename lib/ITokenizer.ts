export interface ITokenizer<TToken>
{
  getNext(): TToken | null;
}
