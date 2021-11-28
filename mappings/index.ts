import BN from "bn.js";
import {
	DatabaseManager,
	EventContext,
	StoreContext,
	ExtrinsicContext,
} from "@subsquid/hydra-common";
import { HistoryElement } from "../generated/model";
import { Balances } from "../chain";
import {
	formatU128ToBalance,
	assignCommonHistoryElemInfo,
} from "./utils/common";
import { Logger } from "../generated/server/logger";
import { allBlockEvents } from "./utils/api";

export async function transfersHandler({
	store,
	event,
	block,
	extrinsic,
}: ExtrinsicContext & StoreContext): Promise<void> {
	Logger.log("Caught transfer extrinsic");

	const record = await assignCommonHistoryElemInfo(extrinsic, block);

	let details = new Object();

	if (record.execution.success) {
		let blockEvents = await allBlockEvents(block.height);
		// let transferEvent = blockEvents.find((e) => {
		// 	return e.method === "Transfer" && e.section === "assets";
		// });
		// const {
		// 	params: {
		// 		data: [, to, assetId, amount],
		// 	},
		// } = transferEvent;

		for (const eventRecord of blockEvents) {
			if (
				eventRecord.method === "Transfer" &&
				eventRecord.section === "assets"
			) {
				const {
					params: [from, to, assetId, amount],
				} = eventRecord;

				details = {
					from: extrinsic.signer.toString(),
					to: to.toString(),
					amount: formatU128ToBalance(amount.toString()),
					assetId: assetId.toString(),
				};
			}
		}
	} else {
		const {
			args: [assetId, to, amount],
		} = extrinsic;

		details = {
			from: extrinsic.signer.toString(),
			to: to.toString(),
			amount: formatU128ToBalance(amount.toString()),
			assetId: assetId.toString(),
		};
	}

	record.data = details;

	await store.save(record);

	Logger.log(
		`===== Saved transfer with ${extrinsic.hash?.toString()} txid =====`
	);
}
