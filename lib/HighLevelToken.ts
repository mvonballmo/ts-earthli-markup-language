import {HighLevelTokenType} from "./HighLevelTokenType";
import {Token} from "./Token";
import {LowLevelToken} from "./LowLevelToken";

export class HighLevelToken extends Token<HighLevelTokenType>
{
  constructor(public token: LowLevelToken)
  {
    // TODO we probably want to toss the common base class
    super(HighLevelTokenType.Text, token.value, token.line, token.column, token.position);
  }

  attributes: { key: LowLevelToken, value: LowLevelToken }[];

  errors: LowLevelToken[];
}
