import WeakValueMap from "./WeakValueMap.js";

type Head<T extends Array<any> | ReadonlyArray<any>>
    = T extends [infer R, ...Array<any>] ? R
    : never;

type Tail<T extends Array<any> | ReadonlyArray<any>>
    = T extends [any, ...infer R] ? R
    : never;

export default class WeakMultiKeyMap<
    Key extends Array<any> | ReadonlyArray<any>,
    Value extends object,
> {
    readonly #map = new WeakValueMap<Head<Key>, WeakMultiKeyMap<Tail<Key>, Value>>();
    readonly #onEmpty: () => void;
    // TODO: When TypeScript supports static private change this to static
    // private and use the WeakArrayMap itself as the holdings
    readonly #valueFinalizer = new FinalizationRegistry(() => {
        if (!this.#value?.deref()) {
            this.#value = undefined;
            if (this.#map.isEmpty) {
                this.#onEmpty();
            }
        }
    });

    #value?: WeakRef<Value>;

    constructor(onEmpty: () => void=() => {}) {
        this.#onEmpty = onEmpty;
    }

    get isEmpty(): boolean {
        return this.#value === undefined && this.#map.isEmpty;
    }

    get(key: Key): Value | undefined {
        if (key.length === 0) {
            return this.#value?.deref();
        }
        const [head, ...rest] = key;
        return this.#map.get(head)?.get(rest as Tail<Key>);
    }

    has(key: Key): boolean {
        if (key.length === 0) {
            return Boolean(this.#value?.deref());
        }
        const [head, ...rest] = key;
        return Boolean(this.#map.get(head)?.has(rest as Tail<Key>));
    }

    set(key: Key, value: Value): void {
        if (key.length === 0) {
            const weakRef = new WeakRef(value);
            if (this.#value) {
                this.#valueFinalizer.unregister(this.#value);
            }
            this.#value = weakRef;
            this.#valueFinalizer.register(value, undefined, weakRef);
            return;
        }
        const [head, ...rest] = key;
        if (!this.#map.has(head)) {
            this.#map.set(head, new WeakMultiKeyMap(() => {
                this.#map.delete(head);
                if (this.#map.isEmpty && !this.#value) {
                    this.#onEmpty();
                }
            }));
        }
        const subMap = this.#map.get(head)!;
        subMap.set(rest as Tail<Key>, value);
    }

    delete(key: Key): void {
        if (key.length === 0) {
            if (this.#value) {
                this.#valueFinalizer.unregister(this.#value);
            }
            this.#value = undefined;
            if (this.#map.isEmpty) {
                this.#onEmpty();
            }
        }
        const [head, ...rest] = key;
        this.#map.get(head)?.delete(rest as Tail<Key>);
    }
}
