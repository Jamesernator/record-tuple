import WeakMultiKeyMap from "./WeakMultiKeyMap.js";

const tuples = new WeakMultiKeyMap<ReadonlyArray<any>, ReadonlyArray<any>>();

export default function tuple<V extends Array<any>>(...tuple: V): Readonly<V> {
    const key = Object.freeze([...tuple]);
    const current = tuples.get(key);
    if (current) {
        return current as Readonly<V>;
    }
    tuples.set(key, key);
    return key as Readonly<V>;
}
