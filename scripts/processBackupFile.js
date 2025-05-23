import fs from "node:fs/promises";
import path from "node:path";
import csv from "csvtojson";
import writeXlsxFile from "write-excel-file/node";
import { getTransactionInfo } from "../dist/lib.js";

const root = new URL("..", import.meta.url);

const smsBackupsPath = new URL("data/csv", root);
// console.log(smsBackupsPath);

const output = new URL("data/filtered.xlsx", root);
const ignored = new URL("data/ignored.xlsx", root);

const isTransaction = (transactionObj) => {
	const {
		account: { type, name, number },
		transaction,
	} = transactionObj;

	// Valid transaction message should contain account info and transaction info atleast
	if (type && (name || number) && transaction.amount && transaction.type) {
		return true;
	}
	return false;
};

const headers = [
	{
		value: "name",
	},
	{
		value: "message",
	},
	{
		value: "accountType",
	},
	{
		value: "accountName",
	},
	{
		value: "accountNo",
	},
	{
		value: "transactionAmount",
	},
	{
		value: "transactionType",
	},
	{
		value: "transactionId",
	},
	{
		value: "merchantName",
	},
	{
		value: "balanceAvailable",
	},
	{
		value: "balanceOutstanding",
	},
];

async function processSMS(dirPath) {
	const files = await fs.readdir(dirPath);
	const csvObjs = [];

	for (const file of files) {
		if (file.endsWith(".csv")) {
			const jsonArr = await csv().fromFile(
				path.join(smsBackupsPath.pathname, file),
			);
			// console.log(jsonArr)
			csvObjs.push(...jsonArr);
		}
	}

	const filteredData = [];
	filteredData.push(headers);
	const ignoredData = [];

	// console.log(csvObjs);

	csvObjs.forEach((obj, index) => {
		const isPersonalMessage = /\d+/.test(obj.phoneNumber);
		const containsOtp = /(otp | one time password)/gi.test(
			obj.message?.toLowerCase(),
		);
		const transactionObj = getTransactionInfo(obj.message);
		const messageSet = new Set();

		if (index === 0) {
			ignoredData.push(Object.keys(obj).map((key) => ({ value: key })));
		}

		if (
			!isPersonalMessage &&
			!containsOtp &&
			isTransaction(transactionObj) &&
			!messageSet.has(obj.message)
		) {
			messageSet.add(obj.message);
			filteredData.push([
				{ value: "" },
				{ value: obj.message },
				{ value: transactionObj.account.type },
				{ value: transactionObj.account.name },
				{ value: transactionObj.account.number },
				{ value: transactionObj.transaction.amount },
				{ value: transactionObj.transaction.type },
				{ value: transactionObj.transaction.referenceNo },
				{ value: transactionObj.transaction.merchant },
				{ value: transactionObj.balance.available },
				{ value: transactionObj.balance.outstanding },
			]);
		} else {
			ignoredData.push(Object.values(obj).map((val) => ({ value: val })));
		}
	});

	// console.log(filteredData);

	writeXlsxFile(filteredData, {
		filePath: output,
	});

	writeXlsxFile(ignoredData, {
		filePath: ignored,
	});
}

processSMS(smsBackupsPath);
