import {HighLevelToken} from "./HighLevelToken";
import {ITokenizer} from "./ITokenizer";
import {LowLevelToken} from "./LowLevelToken";

export class HighLevelTokenizer implements ITokenizer<HighLevelToken>
{
  constructor(private lowLevelTokenizer: ITokenizer<LowLevelToken>)
  {
  }

  getNext()
  {
    let lowLevelToken = this.lowLevelTokenizer.getNext();
    while (lowLevelToken != null)
    {
      let highLevelToken = this.handleToken(lowLevelToken);
      if (highLevelToken != null)
      {
        return highLevelToken;
      }

      lowLevelToken = this.lowLevelTokenizer.getNext();
    }

    return null;
  }

  private handleToken(lowLevelToken: LowLevelToken)
  {
    return new HighLevelToken(lowLevelToken);
  }
}