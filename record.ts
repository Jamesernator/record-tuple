/// <reference lib="esnext"/>
import tuple from "./tuple.js";

const records = new WeakMap<ReadonlyArray<any>, Readonly<any>>();

export default function record<R extends object>(record: R): Readonly<R> {
    const key = tuple(...Object.entries(record)
        .map(([key, value]) => tuple(key, value))
        .sort(([key1], [key2]) => {
            if (key1 < key2) {
                return -1;
            } else if (key1 > key2) {
                return 1;
            }
            return 0;
        }));
    if (records.has(key)) {
        return records.get(key)!;
    }
    const recordV = Object.freeze(Object.fromEntries(key));
    records.set(key, recordV);
    return recordV as Readonly<R>;
}
