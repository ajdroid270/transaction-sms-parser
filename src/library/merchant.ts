import { upiHandles, upiKeywords } from "./constants";
import type { TMessageType } from "./interface";
import { getNextWords, getProcessedMessage, isNumber } from "./utils";

const extractMerchantInfo = (message: TMessageType) => {
	const processedMessage = getProcessedMessage(message);
  const messageString = processedMessage.join(" ");
	const transactionDetails: {
		merchant: string | null;
		referenceNo: string | null;
	} = {
		merchant: null,
		referenceNo: null,
	};
	if (processedMessage.includes("vpa")) {
		const idx = processedMessage.indexOf("vpa");
		// if keyword vpa is not the last one
		if (idx < processedMessage.length - 1) {
			const nextStr = processedMessage[idx + 1];
			const [name] = nextStr.replaceAll(/\(|\)/gi, " ").split(" ");
			transactionDetails.merchant = name;
		}
	}

  let match = "";
  let matchIndex = -1;
	for (let i = 0; i < upiKeywords.length; i += 1) {
		const keyword = upiKeywords[i];
    const idx = messageString.indexOf(keyword);
    if (idx > 0) {
      matchIndex = idx;
      match = keyword;
      break;
		}
	}

  if (match) {
    if (match === "upi-") {
      const regex = /upi-([0-9]+)-([a-zA-Z0-9\s]+)/i;
      const matchResult = messageString.match(regex);

      if (matchResult) {
        transactionDetails.referenceNo = matchResult[1]; // Extracted reference number
        transactionDetails.merchant = matchResult[2].trim(); // Extracted merchant name
      }
    } else if (match === "upi:") {
      try {
        const upiRegex = /upi:([0-9]+)/i;
        const matchResult = messageString.match(upiRegex);
        if (matchResult) {
          transactionDetails.referenceNo = matchResult[1]; // Extract reference number
        }

        // Extract merchant name based on "credited" and preceding semicolon
        const creditedRegex = /;([^;]+)\s+credited/i;
        const creditedMatch = messageString.match(creditedRegex);
        if (creditedMatch) {
          transactionDetails.merchant = creditedMatch[1].trim();
        }
      } catch (error) {
        console.error("Error parsing UPI message: ", error);
      }
    } else {
      const nextWord = getNextWords(messageString, match);
      if (isNumber(nextWord)) {
        transactionDetails.referenceNo = nextWord;
      } else if (transactionDetails.merchant) {
        const [longestNumeric] = nextWord
          .split(/[^0-9]/gi)
          .sort((a, b) => b.length - a.length)[0];
        if (longestNumeric) {
          transactionDetails.referenceNo = longestNumeric;
        }
      } else {
        transactionDetails.merchant = nextWord;
      }

      if (!transactionDetails.merchant) {
        const upiRegex = new RegExp(
          `[a-zA-Z0-9_-]+(${upiHandles.join("|")})`,
          "gi",
        );
        const matches = messageString.match(upiRegex);
        if (matches && matches.length > 0) {
          const merchant = matches[0].split(" ").pop(); // return only first match
          transactionDetails.merchant = merchant ?? null;
        }
      }
    }
	}

	/* const additionalKeywords = ['at', 'to', 'info'];
  if (!merchantInfo.merchantName && !merchantInfo.transactionId) {
    for (let i = 0; i < additionalKeywords.length; i += 1) {
      const nextWord = getNextWords(messageString, additionalKeywords[i], 2);

      if (nextWord) {
        merchantInfo.merchantName = nextWord;
        break;
      }
    }
  } */
	return transactionDetails;
};

export default extractMerchantInfo;
