import {
	SubstrateEvent,
	SubstrateExtrinsic,
	EventInfo,
	SubstrateBlock,
	DatabaseManager,
} from "@subsquid/hydra-common";
import { HistoryElement } from "../../generated/model";
import BN from "bn.js";
import { Logger } from "../../generated/server/logger";
import { allBlockEvents, allExtrinsicEvents } from "./api";

export const formatU128ToBalance = (
	u128: string,
	decimals: number = 18
): string => {
	let padded = u128.padStart(decimals + 1, "0");
	return `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`;
};

// export const getExtrinsicId = (extrinsic: SubstrateExtrinsic): string => {
//     return `${extrinsic.block.block.hash.toString()}-${extrinsic.idx.toString()}`;
// }

export const assignCommonHistoryElemInfo = async (
	extrinsic: SubstrateExtrinsic,
	block: SubstrateBlock
) => {
	const record = new HistoryElement();
	record.id = extrinsic.hash?.toString() || "";
	record.blockHeight = new BN(block.height);
	record.blockHash = block.hash.toString();
	record.module = extrinsic?.section.toString() || "";
	record.method = extrinsic?.method.toString() || "";
	record.address = extrinsic?.signer.toString() || "";
	record.timestamp = parseInt((block.timestamp / 1000).toFixed(0));
	let events = await allExtrinsicEvents(extrinsic.hash ?? "");
	record.networkFee = events.find(
		(e) => e.method === "FeeWithdrawn"
	)?.params[1].value;

	let failedExecutionEvent = events.find((e) => e.method === "ExtrinsicFailed");

	if (failedExecutionEvent) {
		record.execution = {
			success: false,
		};

		const error = failedExecutionEvent?.params[0].value;

		if ((error as any).isModule) {
			const parsed_error = JSON.parse(error.toString());

			record.execution.error = {
				moduleErrorId: parsed_error.module.error,
				moduleErrorIndex: parsed_error.module.index,
			};
		} else {
			// Other, CannotLookup, BadOrigin, no extra info
			record.execution.error = {
				nonModuleErrorMessage: error.toString(),
			};
		}
	} else {
		record.execution = {
			success: true,
		};
	}

	return record;
};

async function getOrCreate<T extends { id: string }>(
	store: DatabaseManager,
	entityConstructor: EntityConstructor<T>,
	id: string
): Promise<T> {
	let e = await store.get(entityConstructor, {
		where: { id },
	});

	if (e == null) {
		e = new entityConstructor();
		e.id = id;
	}

	return e;
}

type EntityConstructor<T> = {
	new (...args: any[]): T;
};
