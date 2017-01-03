import {HighLevelToken} from "./HighLevelToken";
import {ITokenizer} from "./ITokenizer";
import {LowLevelToken} from "./LowLevelToken";
import {HighLevelTokenType} from "./HighLevelTokenType";

export class HtmlFormatter
{
  constructor(private highLevelTokenizer: ITokenizer<HighLevelToken>)
  {
  }

  public getFormattedText()
  {
    let formattedText = "";
    let errors: LowLevelToken[] = [];

    let highLevelToken = this.highLevelTokenizer.getNext();
    while (highLevelToken != null)
    {
      let fragment = this.handleToken(highLevelToken);
      if (fragment != null)
      {
        formattedText += fragment;
      }

      if (highLevelToken.type === HighLevelTokenType.Error)
      {
        // TODO scour all of the attributes for errors as well.
        // Or maybe we want to plug in at the lower level ... ?

        errors.push(highLevelToken.token);
      }

      highLevelToken = this.highLevelTokenizer.getNext();
    }

    return { formattedText: formattedText, errors: errors };
  }

  private handleToken(highLevelToken: HighLevelToken)
  {
    // TODO calculate proper return value

    return highLevelToken.value;
  }
}