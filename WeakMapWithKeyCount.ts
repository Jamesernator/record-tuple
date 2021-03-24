
export default class WeakMapWithKeyCount<Key extends object, Value> {
    #entryCount = 0;
    readonly #onKeyCollected?: () => void;
    readonly #weakMap = new WeakMap<Key, Value>();
    readonly #keyFinalizationRegistry = new FinalizationRegistry(() => {
        this.#entryCount -= 1;
        this.#onKeyCollected?.();
    });

    constructor(onKeyCollected?: () => void) {
        this.#onKeyCollected = onKeyCollected;
    }

    get weakMap(): WeakMap<Key, Value> {
        return this.#weakMap;
    }

    get size(): number {
        return this.#entryCount;
    }

    get(key: Key): Value | undefined {
        return this.#weakMap.get(key);
    }

    set(key: Key, value: Value): this {
        if (!this.#weakMap.has(key)) {
            this.#entryCount += 1;
        }
        this.#weakMap.set(key, value);
        this.#keyFinalizationRegistry.register(key, undefined, key);
        return this;
    }

    delete(key: Key): boolean {
        const res = this.#weakMap.delete(key);
        this.#keyFinalizationRegistry.unregister(key);
        if (res) {
            this.#entryCount -= 1;
        }
        return res;
    }
}
